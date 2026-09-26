const { query } = require('../config/database');
const { generateBillNumber } = require('../utils/helpers');

class Bill {
  static async create(data) {
    const billNumber = generateBillNumber();
    const taxAmount = ((data.consultationCharge + data.labCharges + data.medicationCharges + data.otherCharges - data.discount) * data.taxPercentage) / 100;
    const totalAmount = data.consultationCharge + data.labCharges + data.medicationCharges + data.otherCharges - data.discount + taxAmount;

    const result = await query(
      `INSERT INTO bills (patient_id, appointment_id, bill_number, consultation_charge, lab_charges, 
        medication_charges, other_charges, discount, tax_percentage, tax_amount, total_amount, 
        due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        data.patientId, data.appointmentId, billNumber,
        data.consultationCharge || 0, data.labCharges || 0,
        data.medicationCharges || 0, data.otherCharges || 0,
        data.discount || 0, data.taxPercentage || 18, taxAmount,
        totalAmount, data.dueDate, data.notes, data.createdBy
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const bill = await query(
      `SELECT b.*, 
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.email as patient_email, pu.phone as patient_phone,
        a.appointment_date, a.appointment_time,
        du.first_name || ' ' || du.last_name as doctor_name,
        doc.specialization
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       LEFT JOIN appointments a ON b.appointment_id = a.id
       LEFT JOIN doctors doc ON a.doctor_id = doc.id
       LEFT JOIN users du ON doc.user_id = du.id
       WHERE b.id = $1`,
      [id]
    );

    if (!bill.rows[0]) return null;

    const payments = await query(
      'SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    return { ...bill.rows[0], payments: payments.rows };
  }

  static async getByPatient(patientId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await query('SELECT COUNT(*) FROM bills WHERE patient_id = $1', [patientId]);

    const result = await query(
      `SELECT b.*, 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE bill_id = b.id) as paid_amount
       FROM bills b
       WHERE b.patient_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );

    return { bills: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async addPayment(data) {
    const result = await query(
      `INSERT INTO payments (bill_id, patient_id, amount, payment_method, transaction_id, notes, processed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.billId, data.patientId, data.amount, data.paymentMethod,
       data.transactionId, data.notes, data.processedBy]
    );

    // Update bill status
    const totalPaid = await query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE bill_id = $1',
      [data.billId]
    );

    const bill = await query('SELECT total_amount FROM bills WHERE id = $1', [data.billId]);
    const totalAmount = parseFloat(bill.rows[0]?.total_amount || 0);
    const paidAmount = parseFloat(totalPaid.rows[0].total);

    let newStatus = 'pending';
    if (paidAmount >= totalAmount) newStatus = 'paid';
    else if (paidAmount > 0) newStatus = 'partially_paid';

    await query('UPDATE bills SET status = $1 WHERE id = $2', [newStatus, data.billId]);

    return result.rows[0];
  }

  static async getAll({ page = 1, limit = 10, status, patientId }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) { whereClause += ` AND b.status = $${paramCount++}`; params.push(status); }
    if (patientId) { whereClause += ` AND b.patient_id = $${paramCount++}`; params.push(patientId); }

    const offset = (page - 1) * limit;
    const countResult = await query(`SELECT COUNT(*) FROM bills b ${whereClause}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT b.*, pu.first_name || ' ' || pu.last_name as patient_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE bill_id = b.id) as paid_amount
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { bills: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getRevenueStats() {
    const result = await query(`
      SELECT
        DATE_TRUNC('month', b.created_at) as month,
        SUM(p.amount) as revenue,
        COUNT(DISTINCT b.id) as invoice_count
      FROM bills b
      JOIN payments p ON b.id = p.bill_id
      WHERE b.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', b.created_at)
      ORDER BY month ASC
    `);
    return result.rows;
  }
}

module.exports = Bill;
