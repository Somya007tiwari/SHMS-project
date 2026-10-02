const { query } = require('../config/database');

class Appointment {
  static async findById(id) {
    const result = await query(
      `SELECT a.*,
        pu.id as patient_user_id,
        du.id as doctor_user_id,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.email as patient_email, pu.phone as patient_phone,
        pu.profile_image_url as patient_image,
        du.first_name || ' ' || du.last_name as doctor_name,
        du.email as doctor_email,
        du.profile_image_url as doctor_image,
        doc.specialization,
        dep.name as department_name,
        p.id as patient_profile_id,
        p.gender as patient_gender, p.blood_group as patient_blood_group,
        p.date_of_birth as patient_dob
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const result = await query(
      `INSERT INTO appointments 
        (patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, symptoms, consultation_fee, is_first_visit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.patientId, data.doctorId, data.departmentId,
        data.appointmentDate, data.appointmentTime,
        data.reason, data.symptoms, data.consultationFee,
        data.isFirstVisit !== false
      ]
    );
    return result.rows[0];
  }

  static async createWithLock(data) {
    const { transaction } = require('../config/database');
    const DoctorLeave = require('./DoctorLeave');

    return transaction(async (client) => {
      // 1. Lock doctor row & verify availability
      const docRes = await client.query(
        'SELECT id, is_available, consultation_fee, department_id FROM doctors WHERE id = $1 FOR UPDATE',
        [data.doctorId]
      );
      const doctor = docRes.rows[0];
      if (!doctor) {
        const err = new Error('Doctor not found');
        err.statusCode = 404;
        throw err;
      }
      if (!doctor.is_available) {
        const err = new Error('Doctor is not currently available');
        err.statusCode = 400;
        throw err;
      }

      // Check if doctor is on leave
      const isLeave = await DoctorLeave.isSlotInLeave(data.doctorId, data.appointmentDate, data.appointmentTime);
      if (isLeave) {
        const err = new Error('Doctor is on leave during this date and time slot.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock & check patient duplicate booking at same date and time
      const patientCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE patient_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status IN ('pending', 'approved', 'completed', 'needs_reschedule')
         FOR UPDATE`,
        [data.patientId, data.appointmentDate, data.appointmentTime]
      );
      if (patientCheck.rows.length > 0) {
        const err = new Error('You already have an appointment booked at this date and time.');
        err.statusCode = 409;
        throw err;
      }

      // 3. Lock & check doctor slot availability
      const slotCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status IN ('pending', 'approved', 'completed', 'needs_reschedule')
         FOR UPDATE`,
        [data.doctorId, data.appointmentDate, data.appointmentTime]
      );
      if (slotCheck.rows.length > 0) {
        const err = new Error('This slot was just booked. Please pick another.');
        err.statusCode = 409;
        throw err;
      }

      // 4. Insert appointment
      try {
        const result = await client.query(
          `INSERT INTO appointments 
            (patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, symptoms, consultation_fee, is_first_visit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            data.patientId,
            data.doctorId,
            doctor.department_id || data.departmentId || null,
            data.appointmentDate,
            data.appointmentTime,
            data.reason,
            data.symptoms || null,
            doctor.consultation_fee || 0,
            data.isFirstVisit !== false
          ]
        );
        return result.rows[0];
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          const err = new Error('This slot was just booked. Please pick another.');
          err.statusCode = 409;
          throw err;
        }
        throw dbErr;
      }
    });
  }

  static async rescheduleWithLock({ appointmentId, patientId, newDate, newTime }) {
    const { transaction } = require('../config/database');
    const DoctorLeave = require('./DoctorLeave');

    return transaction(async (client) => {
      // 1. Lock appointment row
      const apptRes = await client.query(
        `SELECT a.*, du.first_name || ' ' || du.last_name as doctor_name
         FROM appointments a
         JOIN doctors doc ON a.doctor_id = doc.id
         JOIN users du ON doc.user_id = du.id
         WHERE a.id = $1 FOR UPDATE`,
        [appointmentId]
      );
      const appt = apptRes.rows[0];
      if (!appt) {
        const err = new Error('Appointment not found');
        err.statusCode = 404;
        throw err;
      }

      // Check ownership if patient
      if (patientId && appt.patient_id !== patientId) {
        const err = new Error('Access denied. You can only reschedule your own appointments.');
        err.statusCode = 403;
        throw err;
      }

      // Check status: pending, approved, or needs_reschedule
      const validStatuses = ['pending', 'approved', 'needs_reschedule'];
      if (!validStatuses.includes(appt.status)) {
        const err = new Error(`Only pending, approved, or needs_reschedule appointments can be rescheduled. Current status: ${appt.status}`);
        err.statusCode = 400;
        throw err;
      }

      // Check limit: reschedule_count < 2
      const currentCount = parseInt(appt.reschedule_count || 0, 10);
      if (currentCount >= 2) {
        const err = new Error('Maximum reschedule limit (2 times) reached for this appointment.');
        err.statusCode = 400;
        throw err;
      }

      // Check advance notice: at least 2 hours in future
      const now = new Date();
      const apptDateStr = new Date(appt.appointment_date).toISOString().split('T')[0];
      const apptTimeStr = String(appt.appointment_time).substring(0, 5);
      const apptDateTime = new Date(`${apptDateStr}T${apptTimeStr}:00`);
      const minNoticeTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      if (apptDateTime < minNoticeTime) {
        const err = new Error('Appointments can only be rescheduled at least 2 hours in advance.');
        err.statusCode = 400;
        throw err;
      }

      // Check target date/time not in the past
      const targetDateTime = new Date(`${newDate}T${newTime}:00`);
      if (targetDateTime < now) {
        const err = new Error('Cannot reschedule to a past date or time.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock doctor row & check availability
      const docRes = await client.query(
        'SELECT id, is_available FROM doctors WHERE id = $1 FOR UPDATE',
        [appt.doctor_id]
      );
      const doctor = docRes.rows[0];
      if (!doctor || !doctor.is_available) {
        const err = new Error('Doctor is not currently available');
        err.statusCode = 400;
        throw err;
      }

      // 3. Check if target slot falls inside doctor leave
      const isLeave = await DoctorLeave.isSlotInLeave(appt.doctor_id, newDate, newTime);
      if (isLeave) {
        const err = new Error('Doctor is on leave during the selected date and time.');
        err.statusCode = 400;
        throw err;
      }

      // 4. Check if new slot is booked by ANOTHER appointment
      const slotCheck = await client.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
           AND id != $4
           AND status IN ('pending', 'approved', 'completed', 'needs_reschedule')
         FOR UPDATE`,
        [appt.doctor_id, newDate, newTime, appointmentId]
      );
      if (slotCheck.rows.length > 0) {
        const err = new Error('This slot is already booked by another patient. Please pick another.');
        err.statusCode = 409;
        throw err;
      }

      // 5. Update appointment
      try {
        const updateRes = await client.query(
          `UPDATE appointments
           SET appointment_date = $1,
               appointment_time = $2,
               status = 'pending',
               reschedule_count = reschedule_count + 1,
               rescheduled_from_id = $3,
               updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [newDate, newTime, appt.id, appointmentId]
        );
        return updateRes.rows[0];
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          const err = new Error('This slot is no longer available. Please select another time.');
          err.statusCode = 409;
          throw err;
        }
        throw dbErr;
      }
    });
  }

  static async updateStatus(id, status, additionalData = {}) {
    const result = await query(
      `UPDATE appointments SET status = $1, rejection_reason = $2, notes = $3
       WHERE id = $4 RETURNING *`,
      [status, additionalData.rejectionReason || null, additionalData.notes || null, id]
    );
    return result.rows[0];
  }

  static async checkSlotAvailability(doctorId, date, time) {
    const result = await query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status IN ('pending', 'approved', 'completed', 'needs_reschedule')`,
      [doctorId, date, time]
    );
    return parseInt(result.rows[0].count) === 0;
  }

  static async getBookedSlots(doctorId, date) {
    const result = await query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2
       AND status NOT IN ('rejected', 'cancelled')`,
      [doctorId, date]
    );
    return result.rows.map(r => r.appointment_time.substring(0, 5));
  }

  static async getByPatient(patientId, { page = 1, limit = 10, status }) {
    let whereClause = 'WHERE a.patient_id = $1';
    const params = [patientId];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*, 
        du.first_name || ' ' || du.last_name as doctor_name,
        du.profile_image_url as doctor_image,
        doc.specialization,
        dep.name as department_name,
        dr.id as review_id,
        dr.rating as review_rating,
        dr.comment as review_comment,
        (dr.id IS NOT NULL) as has_review,
        (a.status = 'completed' AND dr.id IS NULL) as can_review,
        COALESCE(a.reschedule_count, 0) as reschedule_count,
        (
          a.status IN ('pending', 'approved', 'needs_reschedule')
          AND COALESCE(a.reschedule_count, 0) < 2
          AND (a.appointment_date + a.appointment_time) > (NOW() + INTERVAL '2 hours')
        ) as can_reschedule
       FROM appointments a
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN doctor_reviews dr ON dr.appointment_id = a.id AND dr.patient_id = a.patient_id
       ${whereClause}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getByDoctor(doctorId, { page = 1, limit = 10, status, date }) {
    let whereClause = 'WHERE a.doctor_id = $1';
    const params = [doctorId];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }
    if (date) {
      whereClause += ` AND a.appointment_date = $${paramCount++}`;
      params.push(date);
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.phone as patient_phone, pu.profile_image_url as patient_image,
        p.blood_group, p.gender, p.date_of_birth,
        COALESCE(a.reschedule_count, 0) as reschedule_count
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY a.appointment_date ASC, a.appointment_time ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getAll({ page = 1, limit = 10, status, doctorId, patientId, fromDate, toDate }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) { whereClause += ` AND a.status = $${paramCount++}`; params.push(status); }
    if (doctorId) { whereClause += ` AND a.doctor_id = $${paramCount++}`; params.push(doctorId); }
    if (patientId) { whereClause += ` AND a.patient_id = $${paramCount++}`; params.push(patientId); }
    if (fromDate) { whereClause += ` AND a.appointment_date >= $${paramCount++}`; params.push(fromDate); }
    if (toDate) { whereClause += ` AND a.appointment_date <= $${paramCount++}`; params.push(toDate); }

    const offset = (page - 1) * limit;
    const countResult = await query(`SELECT COUNT(*) FROM appointments a ${whereClause}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        du.first_name || ' ' || du.last_name as doctor_name,
        dep.name as department_name,
        COALESCE(a.reschedule_count, 0) as reschedule_count
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       ${whereClause}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }
}

module.exports = Appointment;
