const { query, transaction } = require('../config/database');

class QueueToken {
  /**
   * Helper: Get current IST date string (YYYY-MM-DD) in Asia/Kolkata timezone
   */
  static getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  static async findByAppointmentId(appointmentId) {
    try {
      const result = await query(
        `SELECT qt.*, 
                a.appointment_date, a.appointment_time, a.patient_id, a.doctor_id,
                doc.room_number, doc.specialization,
                du.first_name || ' ' || du.last_name as doctor_name
         FROM queue_tokens qt
         JOIN appointments a ON qt.appointment_id = a.id
         JOIN doctors doc ON qt.doctor_id = doc.id
         JOIN users du ON doc.user_id = du.id
         WHERE qt.appointment_id = $1`,
        [appointmentId]
      );
      return result.rows[0] || null;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async checkInTransaction(appointmentId, doctorId, queueDate) {
    try {
      return await transaction(async (client) => {
        // 1. Check if token already exists for appointment
        const existingRes = await client.query(
          `SELECT * FROM queue_tokens WHERE appointment_id = $1 FOR UPDATE`,
          [appointmentId]
        );
        if (existingRes.rows.length > 0) {
          return { token: existingRes.rows[0], isNew: false };
        }

        // 2. Lock and get next token_number for this doctor & queue_date
        const maxRes = await client.query(
          `SELECT COALESCE(MAX(token_number), 0) + 1 as next_token
           FROM queue_tokens
           WHERE doctor_id = $1 AND queue_date = $2
           FOR UPDATE`,
          [doctorId, queueDate]
        );

        const nextToken = parseInt(maxRes.rows[0].next_token, 10);

        // 3. Insert new queue token
        const insertRes = await client.query(
          `INSERT INTO queue_tokens 
            (appointment_id, doctor_id, queue_date, token_number, status, checked_in_at)
           VALUES ($1, $2, $3, $4, 'waiting', NOW())
           RETURNING *`,
          [appointmentId, doctorId, queueDate, nextToken]
        );

        return { token: insertRes.rows[0], isNew: true };
      });
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async getDoctorTodayQueue(doctorId, queueDate) {
    try {
      const result = await query(
        `SELECT qt.*,
                a.appointment_time, a.reason,
                pu.first_name || ' ' || pu.last_name as patient_name,
                pu.phone as patient_phone,
                pu.profile_image_url as patient_image,
                p.blood_group, p.gender, p.date_of_birth
         FROM queue_tokens qt
         JOIN appointments a ON qt.appointment_id = a.id
         JOIN patients p ON a.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE qt.doctor_id = $1 AND qt.queue_date = $2
         ORDER BY qt.token_number ASC`,
        [doctorId, queueDate]
      );
      return result.rows;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async callNextToken(doctorId, queueDate) {
    try {
      return await transaction(async (client) => {
        // 1. Check if doctor currently has a patient in consultation
        const currentRes = await client.query(
          `SELECT token_number FROM queue_tokens
           WHERE doctor_id = $1 AND queue_date = $2 AND status = 'in_consultation'
           FOR UPDATE`,
          [doctorId, queueDate]
        );

        if (currentRes.rows.length > 0) {
          const err = new Error(`Currently serving token #${currentRes.rows[0].token_number}. Please complete or skip token #${currentRes.rows[0].token_number} first.`);
          err.statusCode = 400;
          throw err;
        }

        // 2. Find next waiting token
        const nextRes = await client.query(
          `SELECT qt.*, 
                  a.id as appointment_id, p.user_id as patient_user_id,
                  pu.first_name || ' ' || pu.last_name as patient_name,
                  doc.room_number
           FROM queue_tokens qt
           JOIN appointments a ON qt.appointment_id = a.id
           JOIN patients p ON a.patient_id = p.id
           JOIN users pu ON p.user_id = pu.id
           JOIN doctors doc ON qt.doctor_id = doc.id
           WHERE qt.doctor_id = $1 AND qt.queue_date = $2 AND qt.status = 'waiting'
           ORDER BY qt.token_number ASC
           LIMIT 1
           FOR UPDATE`,
          [doctorId, queueDate]
        );

        if (nextRes.rows.length === 0) {
          const err = new Error('No patients waiting in queue today.');
          err.statusCode = 404;
          throw err;
        }

        const tokenToCall = nextRes.rows[0];

        // 3. Update status to in_consultation
        const updateRes = await client.query(
          `UPDATE queue_tokens
           SET status = 'in_consultation',
               called_at = NOW(),
               started_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [tokenToCall.id]
        );

        // 4. Find patient 2 tokens behind to notify them
        const twoBehindRes = await client.query(
          `SELECT qt.token_number, p.user_id as patient_user_id
           FROM queue_tokens qt
           JOIN appointments a ON qt.appointment_id = a.id
           JOIN patients p ON a.patient_id = p.id
           WHERE qt.doctor_id = $1 AND qt.queue_date = $2 
             AND qt.status = 'waiting' 
             AND qt.token_number > $3
           ORDER BY qt.token_number ASC
           OFFSET 1 LIMIT 1`,
          [doctorId, queueDate, tokenToCall.token_number]
        );

        return {
          calledToken: updateRes.rows[0],
          patientUserId: tokenToCall.patient_user_id,
          roomNumber: tokenToCall.room_number,
          twoBehindPatientUserId: twoBehindRes.rows[0]?.patient_user_id || null,
          twoBehindTokenNumber: twoBehindRes.rows[0]?.token_number || null
        };
      });
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async updateTokenStatus(tokenId, doctorId, newStatus, action = null) {
    try {
      return await transaction(async (client) => {
        // Lock token row
        const tokenRes = await client.query(
          `SELECT * FROM queue_tokens WHERE id = $1 AND doctor_id = $2 FOR UPDATE`,
          [tokenId, doctorId]
        );
        const tokenRow = tokenRes.rows[0];
        if (!tokenRow) {
          const err = new Error('Queue token not found or forbidden');
          err.statusCode = 404;
          throw err;
        }

        if (newStatus === 'skipped' && action === 'back_of_line') {
          // Move to back of line: assign next token number for today, set status = 'waiting'
          const maxRes = await client.query(
            `SELECT COALESCE(MAX(token_number), 0) + 1 as next_token
             FROM queue_tokens
             WHERE doctor_id = $1 AND queue_date = $2
             FOR UPDATE`,
            [doctorId, tokenRow.queue_date]
          );

          const nextTokenNumber = parseInt(maxRes.rows[0].next_token, 10);

          const updateRes = await client.query(
            `UPDATE queue_tokens
             SET token_number = $1,
                 status = 'waiting',
                 called_at = NULL,
                 started_at = NULL
             WHERE id = $2
             RETURNING *`,
            [nextTokenNumber, tokenId]
          );
          return updateRes.rows[0];
        }

        // Standard status update (completed, skipped, no_show)
        let setFields = 'status = $1';
        if (newStatus === 'completed') setFields += ', completed_at = NOW()';

        const updateRes = await client.query(
          `UPDATE queue_tokens SET ${setFields} WHERE id = $2 RETURNING *`,
          [newStatus, tokenId]
        );
        return updateRes.rows[0];
      });
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async getMyTokenDetails(appointmentId, patientId) {
    try {
      const tokenRes = await query(
        `SELECT qt.*,
                a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
                doc.room_number, doc.specialization,
                du.first_name || ' ' || du.last_name as doctor_name
         FROM queue_tokens qt
         JOIN appointments a ON qt.appointment_id = a.id
         JOIN doctors doc ON qt.doctor_id = doc.id
         JOIN users du ON doc.user_id = du.id
         WHERE qt.appointment_id = $1`,
        [appointmentId]
      );

      const token = tokenRes.rows[0];
      if (!token) return null;

      // Ownership check
      if (patientId && token.patient_id !== patientId) {
        const err = new Error('Access forbidden: You can only view your own queue tokens.');
        err.statusCode = 403;
        throw err;
      }

      // Count people ahead
      const aheadRes = await query(
        `SELECT COUNT(*) as count
         FROM queue_tokens
         WHERE doctor_id = $1 AND queue_date = $2 AND status = 'waiting' AND token_number < $3`,
        [token.doctor_id, token.queue_date, token.token_number]
      );
      const peopleAhead = parseInt(aheadRes.rows[0].count, 10);

      // Estimate average consultation time (bounded between 5 and 60 minutes)
      const avgRes = await query(
        `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - COALESCE(started_at, called_at))) / 60) as avg_mins
         FROM queue_tokens
         WHERE doctor_id = $1 AND queue_date = $2 AND status = 'completed' AND completed_at IS NOT NULL`,
        [token.doctor_id, token.queue_date]
      );

      let avgMins = parseFloat(avgRes.rows[0]?.avg_mins);
      if (!avgMins || isNaN(avgMins) || avgMins < 5 || avgMins > 60) {
        avgMins = 15; // default estimate 15 mins
      } else {
        avgMins = Math.round(avgMins);
      }

      const estimatedWaitMinutes = peopleAhead * avgMins;

      return {
        id: token.id,
        appointmentId: token.appointment_id,
        doctorId: token.doctor_id,
        doctorName: token.doctor_name,
        specialization: token.specialization,
        roomNumber: token.room_number || 'Room 101',
        queueDate: token.queue_date,
        tokenNumber: token.token_number,
        status: token.status,
        checkedInAt: token.checked_in_at,
        calledAt: token.called_at,
        startedAt: token.started_at,
        completedAt: token.completed_at,
        peopleAhead,
        avgConsultationMinutes: avgMins,
        estimatedWaitMinutes,
        isEstimate: true
      };
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async getAdminBoard(queueDate) {
    try {
      const result = await query(
        `SELECT doc.id as doctor_id, doc.room_number, doc.specialization,
                du.first_name || ' ' || du.last_name as doctor_name,
                (
                  SELECT qt.token_number 
                  FROM queue_tokens qt 
                  WHERE qt.doctor_id = doc.id AND qt.queue_date = $1 AND qt.status = 'in_consultation'
                  LIMIT 1
                ) as current_token,
                ARRAY(
                  SELECT qt.token_number 
                  FROM queue_tokens qt 
                  WHERE qt.doctor_id = doc.id AND qt.queue_date = $1 AND qt.status = 'waiting'
                  ORDER BY qt.token_number ASC 
                  LIMIT 5
                ) as next_tokens,
                (
                  SELECT COUNT(*) 
                  FROM queue_tokens qt 
                  WHERE qt.doctor_id = doc.id AND qt.queue_date = $1 AND qt.status = 'waiting'
                ) as waiting_count
         FROM doctors doc
         JOIN users du ON doc.user_id = du.id
         WHERE doc.is_available = true
         ORDER BY du.first_name ASC`,
        [queueDate]
      );
      return result.rows.map(r => ({
        doctorId: r.doctor_id,
        doctorName: `Dr. ${r.doctor_name}`,
        specialization: r.specialization,
        roomNumber: r.room_number || 'Room 101',
        currentToken: r.current_token ? parseInt(r.current_token, 10) : null,
        nextTokens: (r.next_tokens || []).map(t => parseInt(t, 10)),
        waitingCount: parseInt(r.waiting_count || 0, 10)
      }));
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Queue token feature unavailable: Table queue_tokens missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }
}

module.exports = QueueToken;
