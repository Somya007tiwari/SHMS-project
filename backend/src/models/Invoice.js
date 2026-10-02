const { query, transaction } = require('../config/database');

class Invoice {
  static generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `INV-${year}-${random}`;
  }

  static async isTableMissingError(error) {
    if (error && (error.code === '42P01' || error.message?.includes('relation "invoices" does not exist'))) {
      return true;
    }
    return false;
  }

  static async create({
    patientId,
    doctorId = null,
    appointmentId = null,
    prescriptionId = null,
    items = [],
    discountAmount = 0,
    taxAmount = 0,
    notes = null,
    dueDate = null,
    createdBy = null
  }) {
    return await transaction(async (client) => {
      // 1. Calculate items subtotal and validate money math on server
      let subtotal = 0;
      const processedItems = items.map((item, index) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const price = parseFloat(item.unitPrice || item.unit_price) || 0;
        if (qty <= 0) throw new Error('Item quantity must be greater than 0');
        if (price < 0) throw new Error('Item unit price cannot be negative');

        const amount = Math.round(qty * price * 100) / 100;
        subtotal += amount;

        return {
          itemType: item.itemType || item.item_type || 'other',
          description: item.description || 'Medical Service',
          quantity: qty,
          unitPrice: price,
          amount,
          sortOrder: item.sortOrder || index
        };
      });

      subtotal = Math.round(subtotal * 100) / 100;

      const discount = Math.max(0, parseFloat(discountAmount) || 0);
      if (discount > subtotal) {
        throw new Error('Discount amount cannot be greater than subtotal');
      }

      const tax = Math.max(0, parseFloat(taxAmount) || 0);
      const totalAmount = Math.round((subtotal - discount + tax) * 100) / 100;
      if (totalAmount < 0) {
        throw new Error('Total invoice amount cannot be negative');
      }

      const invoiceNumber = this.generateInvoiceNumber();

      // 2. Insert Invoice
      const invoiceRes = await client.query(
        `INSERT INTO invoices (
          invoice_number, patient_id, doctor_id, appointment_id, prescription_id,
          subtotal, discount_amount, tax_amount, total_amount, status,
          notes, due_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12)
        RETURNING *`,
        [
          invoiceNumber, patientId, doctorId, appointmentId, prescriptionId,
          subtotal, discount, tax, totalAmount, notes, dueDate, createdBy
        ]
      );

      const invoice = invoiceRes.rows[0];

      // 3. Insert Invoice Items
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, item_type, description, quantity, unit_price, amount, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoice.id, item.itemType, item.description,
            item.quantity, item.unitPrice, item.amount, item.sortOrder
          ]
        );
      }

      return invoice;
    });
  }

  static async findById(id) {
    const res = await query(
      `SELECT i.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.email as patient_email, pu.phone as patient_phone,
        du.first_name || ' ' || du.last_name as doctor_name,
        doc.specialization as doctor_specialization,
        a.appointment_date, a.appointment_time
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors doc ON i.doctor_id = doc.id
       LEFT JOIN users du ON doc.user_id = du.id
       LEFT JOIN appointments a ON i.appointment_id = a.id
       WHERE i.id = $1`,
      [id]
    );

    if (!res.rows[0]) return null;

    const invoice = res.rows[0];

    const itemsRes = await query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [id]
    );

    const paymentsRes = await query(
      `SELECT p.*, u.first_name || ' ' || u.last_name as recorded_by_name
       FROM payments p
       LEFT JOIN users u ON p.recorded_by = u.id
       WHERE p.invoice_id = $1
       ORDER BY p.paid_at DESC, p.created_at DESC`,
      [id]
    );

    const successfulPaymentsSum = paymentsRes.rows
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const totalAmount = parseFloat(invoice.total_amount || 0);
    const paidAmount = Math.round(successfulPaymentsSum * 100) / 100;
    const balance = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);

    return {
      ...invoice,
      items: itemsRes.rows,
      payments: paymentsRes.rows,
      paid_amount: paidAmount,
      balance
    };
  }

  static async findByPatient(patientId, { page = 1, limit = 10, status } = {}) {
    let where = 'WHERE i.patient_id = $1';
    const params = [patientId];
    let paramCount = 2;

    if (status) {
      where += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    const countRes = await query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const res = await query(
      `SELECT i.*,
        du.first_name || ' ' || du.last_name as doctor_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id AND status = 'success') as paid_amount
       FROM invoices i
       LEFT JOIN doctors doc ON i.doctor_id = doc.id
       LEFT JOIN users du ON doc.user_id = du.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    return { invoices: res.rows, total };
  }

  static async findByDoctor(doctorId, { page = 1, limit = 10, status } = {}) {
    let where = 'WHERE i.doctor_id = $1';
    const params = [doctorId];
    let paramCount = 2;

    if (status) {
      where += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    const countRes = await query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const res = await query(
      `SELECT i.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id AND status = 'success') as paid_amount
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    return { invoices: res.rows, total };
  }

  static async getAll({ page = 1, limit = 10, status, search, from, to } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      where += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    if (from) {
      where += ` AND i.created_at >= $${paramCount++}`;
      params.push(from);
    }

    if (to) {
      where += ` AND i.created_at <= $${paramCount++}`;
      params.push(to);
    }

    if (search) {
      where += ` AND (i.invoice_number ILIKE $${paramCount} OR pu.first_name ILIKE $${paramCount} OR pu.last_name ILIKE $${paramCount} OR du.first_name ILIKE $${paramCount} OR du.last_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors doc ON i.doctor_id = doc.id
       LEFT JOIN users du ON doc.user_id = du.id
       ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const res = await query(
      `SELECT i.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        du.first_name || ' ' || du.last_name as doctor_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id AND status = 'success') as paid_amount
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors doc ON i.doctor_id = doc.id
       LEFT JOIN users du ON doc.user_id = du.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    return { invoices: res.rows, total };
  }

  static async getStats() {
    const statsRes = await query(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN total_amount ELSE 0 END), 0) as failed_amount,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as cancelled_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
      FROM invoices
    `);

    const monthlyRes = await query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_collected
      FROM invoices
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    return {
      summary: statsRes.rows[0],
      monthly: monthlyRes.rows
    };
  }

  static async update({ id, items, discountAmount = 0, taxAmount = 0, notes, dueDate }) {
    return await transaction(async (client) => {
      const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [id]);
      const current = invRes.rows[0];
      if (!current) throw new Error('Invoice not found');
      if (current.status !== 'pending') {
        throw new Error('Only pending invoices can be updated');
      }

      let subtotal = 0;
      const processedItems = items.map((item, index) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const price = parseFloat(item.unitPrice || item.unit_price) || 0;
        if (qty <= 0) throw new Error('Item quantity must be greater than 0');
        if (price < 0) throw new Error('Item unit price cannot be negative');

        const amount = Math.round(qty * price * 100) / 100;
        subtotal += amount;

        return {
          itemType: item.itemType || item.item_type || 'other',
          description: item.description || 'Medical Service',
          quantity: qty,
          unitPrice: price,
          amount,
          sortOrder: item.sortOrder || index
        };
      });

      subtotal = Math.round(subtotal * 100) / 100;

      const discount = Math.max(0, parseFloat(discountAmount) || 0);
      if (discount > subtotal) {
        throw new Error('Discount amount cannot be greater than subtotal');
      }

      const tax = Math.max(0, parseFloat(taxAmount) || 0);
      const totalAmount = Math.round((subtotal - discount + tax) * 100) / 100;

      // Delete existing items
      await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);

      // Insert new items
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, item_type, description, quantity, unit_price, amount, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, item.itemType, item.description, item.quantity, item.unitPrice, item.amount, item.sortOrder]
        );
      }

      // Update invoice
      const updatedRes = await client.query(
        `UPDATE invoices
         SET subtotal = $1, discount_amount = $2, tax_amount = $3, total_amount = $4,
             notes = $5, due_date = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [subtotal, discount, tax, totalAmount, notes, dueDate, id]
      );

      return updatedRes.rows[0];
    });
  }

  static async addPayment({ invoiceId, amount, method, status = 'success', transactionRef, recordedBy }) {
    return await transaction(async (client) => {
      const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [invoiceId]);
      const invoice = invRes.rows[0];
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'cancelled') {
        throw new Error('Cancelled invoices cannot receive payments');
      }

      // Calculate existing successful payments sum
      const paySumRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as paid_sum FROM payments WHERE invoice_id = $1 AND status = 'success'`,
        [invoiceId]
      );
      const currentPaid = parseFloat(paySumRes.rows[0].paid_sum || 0);
      const totalAmount = parseFloat(invoice.total_amount || 0);
      const remainingBalance = Math.round((totalAmount - currentPaid) * 100) / 100;

      if (status === 'failed') {
        // Record failed payment attempt
        const failedPayRes = await client.query(
          `INSERT INTO payments (invoice_id, amount, method, status, transaction_ref, recorded_by, paid_at)
           VALUES ($1, $2, $3, 'failed', $4, $5, NOW()) RETURNING *`,
          [invoiceId, Math.max(0, parseFloat(amount) || 0), method, transactionRef, recordedBy]
        );

        // Set status to failed if no payments completed yet
        if (currentPaid === 0) {
          await client.query(`UPDATE invoices SET status = 'failed', updated_at = NOW() WHERE id = $1`, [invoiceId]);
        }
        return failedPayRes.rows[0];
      }

      // Success payment path
      const pAmount = parseFloat(amount);
      if (isNaN(pAmount) || pAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      if (pAmount > remainingBalance + 0.01) {
        throw new Error(`Payment amount exceeds remaining balance of ${remainingBalance.toFixed(2)}`);
      }

      const payRes = await client.query(
        `INSERT INTO payments (invoice_id, amount, method, status, transaction_ref, recorded_by, paid_at)
         VALUES ($1, $2, $3, 'success', $4, $5, NOW()) RETURNING *`,
        [invoiceId, pAmount, method, transactionRef, recordedBy]
      );

      const newPaidTotal = Math.round((currentPaid + pAmount) * 100) / 100;
      if (newPaidTotal >= totalAmount - 0.01) {
        await client.query(`UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = $1`, [invoiceId]);
      }

      return payRes.rows[0];
    });
  }

  static async cancel(id) {
    return await transaction(async (client) => {
      const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [id]);
      const invoice = invRes.rows[0];
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'paid') {
        throw new Error('Paid invoices cannot be cancelled');
      }

      const paySumRes = await client.query(
        `SELECT COUNT(*) FROM payments WHERE invoice_id = $1 AND status = 'success'`,
        [id]
      );
      if (parseInt(paySumRes.rows[0].count, 10) > 0) {
        throw new Error('Invoices with successful payments cannot be cancelled');
      }

      const res = await client.query(
        `UPDATE invoices SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      return res.rows[0];
    });
  }
}

module.exports = Invoice;
