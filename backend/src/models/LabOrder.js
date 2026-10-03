const { pool } = require('../config/database');

const LabOrder = {
  /**
   * Safely generate a unique order number like LAB-2026-104928
   */
  async generateOrderNumber() {
    const year = new Date().getFullYear();
    for (let attempts = 0; attempts < 10; attempts++) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      const orderNum = `LAB-${year}-${rand}`;
      const check = await pool.query(`SELECT 1 FROM lab_orders WHERE order_number = $1`, [orderNum]);
      if (check.rows.length === 0) {
        return orderNum;
      }
    }
    return `LAB-${year}-${Date.now().toString().slice(-6)}`;
  },

  /**
   * Create lab orders in a single DB transaction (Doctor order)
   */
  async createDoctorOrders({ patientId, doctorId, appointmentId, testIds, notes }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const createdOrders = [];
      for (const testId of testIds) {
        const orderNum = await this.generateOrderNumber();
        const res = await client.query(
          `INSERT INTO lab_orders (
            order_number, patient_id, ordered_by_doctor_id, appointment_id, test_id,
            status, notes
          ) VALUES ($1, $2, $3, $4, $5, 'requested', $6)
          RETURNING *`,
          [orderNum, patientId, doctorId || null, appointmentId || null, testId, notes || null]
        );
        createdOrders.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return createdOrders;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Create lab orders in a single DB transaction (Patient self-booking)
   */
  async createPatientBooking({ patientId, testIds, scheduledDate, scheduledTime, notes }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const createdOrders = [];
      for (const testId of testIds) {
        const orderNum = await this.generateOrderNumber();
        const res = await client.query(
          `INSERT INTO lab_orders (
            order_number, patient_id, test_id, status, scheduled_date, scheduled_time, notes
          ) VALUES ($1, $2, $3, 'scheduled', $4, $5, $6)
          RETURNING *`,
          [orderNum, patientId, testId, scheduledDate, scheduledTime, notes || null]
        );
        createdOrders.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return createdOrders;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Find lab order by ID with details (patient, doctor, test, user, files)
   */
  async findById(id) {
    const res = await pool.query(
      `SELECT lo.*, 
              lt.name AS test_name, lt.code AS test_code, lt.category AS test_category,
              lt.price AS test_price, lt.sample_type, lt.preparation_instructions,
              lt.turnaround_hours, lt.unit, lt.normal_min, lt.normal_max, lt.normal_text,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              pu.email AS patient_email, p.phone AS patient_phone, p.gender,
              p.user_id AS patient_user_id,
              CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
              d.specialization AS doctor_specialization,
              d.qualification AS doctor_qualification,
              d.room_number AS doctor_room_number,
              CONCAT(u.first_name, ' ', u.last_name) AS resulted_by_name
       FROM lab_orders lo
       JOIN lab_tests lt ON lo.test_id = lt.id
       JOIN patients p ON lo.patient_id = p.id
       LEFT JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors d ON lo.ordered_by_doctor_id = d.id
       LEFT JOIN users u ON lo.resulted_by = u.id
       WHERE lo.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Get orders for a patient
   */
  async getByPatientId(patientId, { page = 1, limit = 10, status = '', category = '' }) {
    const offset = (page - 1) * limit;
    const conditions = ['lo.patient_id = $1'];
    const values = [patientId];

    if (status) {
      values.push(status);
      conditions.push(`lo.status = $${values.length}`);
    }

    if (category) {
      values.push(category);
      conditions.push(`lt.category = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*) 
       FROM lab_orders lo 
       JOIN lab_tests lt ON lo.test_id = lt.id 
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT lo.*, 
              lt.name AS test_name, lt.category AS test_category, lt.price AS test_price,
              lt.unit, lt.normal_min, lt.normal_max, lt.normal_text,
              CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
       FROM lab_orders lo
       JOIN lab_tests lt ON lo.test_id = lt.id
       LEFT JOIN doctors d ON lo.ordered_by_doctor_id = d.id
       ${whereClause}
       ORDER BY lo.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { orders: dataRes.rows, total };
  },

  /**
   * Get orders for a doctor
   */
  async getByDoctorId(doctorId, { page = 1, limit = 10, status = '', search = '' }) {
    const offset = (page - 1) * limit;
    const conditions = ['lo.ordered_by_doctor_id = $1'];
    const values = [doctorId];

    if (status) {
      values.push(status);
      conditions.push(`lo.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(lo.order_number ILIKE $${values.length} OR CONCAT(p.first_name, ' ', p.last_name) ILIKE $${values.length} OR lt.name ILIKE $${values.length})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*) 
       FROM lab_orders lo 
       JOIN lab_tests lt ON lo.test_id = lt.id 
       JOIN patients p ON lo.patient_id = p.id 
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT lo.*, 
              lt.name AS test_name, lt.category AS test_category, lt.unit, lt.normal_min, lt.normal_max, lt.normal_text,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name, p.phone AS patient_phone
       FROM lab_orders lo
       JOIN lab_tests lt ON lo.test_id = lt.id
       JOIN patients p ON lo.patient_id = p.id
       ${whereClause}
       ORDER BY lo.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { orders: dataRes.rows, total };
  },

  /**
   * Get all orders for Admin
   */
  async getAll({ page = 1, limit = 10, status = '', search = '', fromDate = '', toDate = '' }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`lo.status = $${values.length}`);
    }

    if (fromDate) {
      values.push(fromDate);
      conditions.push(`lo.created_at >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      conditions.push(`lo.created_at <= ($${values.length}::date + INTERVAL '1 day')`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(lo.order_number ILIKE $${values.length} OR CONCAT(p.first_name, ' ', p.last_name) ILIKE $${values.length} OR lt.name ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) 
       FROM lab_orders lo 
       JOIN lab_tests lt ON lo.test_id = lt.id 
       JOIN patients p ON lo.patient_id = p.id 
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT lo.*, 
              lt.name AS test_name, lt.category AS test_category, lt.price AS test_price, lt.unit,
              CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
              CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
       FROM lab_orders lo
       JOIN lab_tests lt ON lo.test_id = lt.id
       JOIN patients p ON lo.patient_id = p.id
       LEFT JOIN doctors d ON lo.ordered_by_doctor_id = d.id
       ${whereClause}
       ORDER BY lo.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { orders: dataRes.rows, total };
  },

  /**
   * Update lab order status
   */
  async updateStatus(id, newStatus) {
    const res = await pool.query(
      `UPDATE lab_orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [newStatus, id]
    );
    return res.rows[0] || null;
  },

  /**
   * Submit or edit result for a lab order
   */
  async updateResult(id, { resultValue, resultNumeric, resultFlag, resultNotes, resultedBy }) {
    const res = await pool.query(
      `UPDATE lab_orders SET
        result_value = $1,
        result_numeric = $2,
        result_flag = $3,
        result_notes = $4,
        resulted_at = NOW(),
        resulted_by = COALESCE($5, resulted_by),
        status = 'completed',
        updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [resultValue, resultNumeric, resultFlag, resultNotes || null, resultedBy || null, id]
    );
    return res.rows[0] || null;
  },

  /**
   * Link invoice item ID to lab order
   */
  async linkInvoiceItem(orderId, invoiceItemId) {
    const res = await pool.query(
      `UPDATE lab_orders SET invoice_item_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [invoiceItemId, orderId]
    );
    return res.rows[0] || null;
  },

  /**
   * Report Files Methods
   */
  async addFile({ orderId, originalName, storedName, mimeType, sizeBytes, uploadedBy }) {
    const res = await pool.query(
      `INSERT INTO lab_report_files (order_id, original_name, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, originalName, storedName, mimeType, sizeBytes, uploadedBy || null]
    );
    return res.rows[0];
  },

  async getFilesByOrderId(orderId) {
    const res = await pool.query(
      `SELECT f.*, CONCAT(u.first_name, ' ', u.last_name) AS uploader_name
       FROM lab_report_files f
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.order_id = $1
       ORDER BY f.created_at ASC`,
      [orderId]
    );
    return res.rows;
  },

  async getFileById(fileId) {
    const res = await pool.query(`SELECT * FROM lab_report_files WHERE id = $1`, [fileId]);
    return res.rows[0] || null;
  },

  async deleteFile(fileId) {
    const res = await pool.query(`DELETE FROM lab_report_files WHERE id = $1 RETURNING *`, [fileId]);
    return res.rows[0] || null;
  }
};

module.exports = LabOrder;
