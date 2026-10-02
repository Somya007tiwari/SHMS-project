const { query, transaction } = require('../config/database');

class DoctorLeave {
  static async create({ doctorId, startDate, endDate, startTime, endTime, reason }) {
    return transaction(async (client) => {
      // 1. Insert leave
      const result = await client.query(
        `INSERT INTO doctor_leaves 
          (doctor_id, start_date, end_date, start_time, end_time, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          doctorId,
          startDate,
          endDate,
          startTime || null,
          endTime || null,
          reason || null,
        ]
      );
      const leave = result.rows[0];

      // 2. Query affected active appointments (pending or approved)
      let timeCondition = '';
      const params = [doctorId, startDate, endDate];

      if (startTime && endTime) {
        timeCondition = ' AND appointment_time >= $4 AND appointment_time <= $5';
        params.push(startTime, endTime);
      }

      const affectedRes = await client.query(
        `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason,
                pu.first_name || ' ' || pu.last_name as patient_name,
                pu.email as patient_email, pu.phone as patient_phone
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE a.doctor_id = $1
           AND a.appointment_date >= $2
           AND a.appointment_date <= $3
           AND a.status IN ('pending', 'approved')
           ${timeCondition}
         ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
        params
      );

      const affectedAppointments = affectedRes.rows;

      // 3. Mark affected appointments as needs_reschedule
      if (affectedAppointments.length > 0) {
        const affectedIds = affectedAppointments.map((a) => a.id);
        try {
          await client.query(
            `UPDATE appointments
             SET status = 'needs_reschedule', updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [affectedIds]
          );
        } catch (updateErr) {
          console.warn('Could not update status to needs_reschedule:', updateErr.message);
        }
      }

      return {
        leave,
        affectedCount: affectedAppointments.length,
        affectedAppointments,
      };
    });
  }

  static async getByDoctorId(doctorId) {
    const result = await query(
      `SELECT * FROM doctor_leaves
       WHERE doctor_id = $1
       ORDER BY start_date ASC, start_time ASC`,
      [doctorId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT * FROM doctor_leaves WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async delete(id, doctorId) {
    const result = await query(
      `DELETE FROM doctor_leaves
       WHERE id = $1 AND doctor_id = $2
       RETURNING *`,
      [id, doctorId]
    );
    return result.rows[0] || null;
  }

  static async checkLeaveForDate(doctorId, date) {
    const result = await query(
      `SELECT * FROM doctor_leaves
       WHERE doctor_id = $1
         AND start_date <= $2
         AND end_date >= $2`,
      [doctorId, date]
    );
    return result.rows;
  }

  static async isSlotInLeave(doctorId, date, time) {
    const leaves = await this.checkLeaveForDate(doctorId, date);
    if (!leaves || leaves.length === 0) return false;

    for (const leave of leaves) {
      // If no start_time and end_time, it's a full-day leave
      if (!leave.start_time || !leave.end_time) {
        return true;
      }
      // Partial-day leave comparison
      const slotTime = String(time).substring(0, 5);
      const leaveStart = String(leave.start_time).substring(0, 5);
      const leaveEnd = String(leave.end_time).substring(0, 5);

      if (slotTime >= leaveStart && slotTime <= leaveEnd) {
        return true;
      }
    }

    return false;
  }
}

module.exports = DoctorLeave;
