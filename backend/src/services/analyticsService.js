const { query } = require('../config/database');

function parseDateRange(queryFrom, queryTo) {
  const now = new Date();
  let toDate = queryTo ? new Date(queryTo) : new Date();
  let fromDate = queryFrom ? new Date(queryFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(fromDate.getTime())) fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(toDate.getTime())) toDate = new Date();

  toDate.setHours(23, 59, 59, 999);
  fromDate.setHours(0, 0, 0, 0);

  if (fromDate > toDate) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  const fiveYearsMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > fiveYearsMs) {
    fromDate = new Date(toDate.getTime() - fiveYearsMs);
  }

  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];

  const diffMs = toDate.getTime() - fromDate.getTime();
  const prevFromDate = new Date(fromDate.getTime() - diffMs);
  const prevFromStr = prevFromDate.toISOString().split('T')[0];

  return { fromDate, toDate, fromStr, toStr, prevFromStr };
}

function calculatePercentChange(current, previous) {
  const curr = parseFloat(current) || 0;
  const prev = parseFloat(previous) || 0;
  if (prev === 0) {
    return curr > 0 ? 100.0 : 0.0;
  }
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function generateDateBuckets(fromDate, toDate, groupBy = 'day') {
  const buckets = [];
  const curr = new Date(fromDate);
  curr.setHours(0, 0, 0, 0);
  const end = new Date(toDate);

  while (curr <= end) {
    let label = '';
    if (groupBy === 'month') {
      label = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
      buckets.push(label);
      curr.setMonth(curr.getMonth() + 1);
    } else if (groupBy === 'week') {
      label = `${curr.getFullYear()}-W${String(Math.ceil(curr.getDate() / 7)).padStart(2, '0')} (${curr.toISOString().split('T')[0]})`;
      buckets.push(label);
      curr.setDate(curr.getDate() + 7);
    } else {
      label = curr.toISOString().split('T')[0];
      buckets.push(label);
      curr.setDate(curr.getDate() + 1);
    }
  }

  return Array.from(new Set(buckets));
}

const analyticsService = {
  parseDateRange,
  calculatePercentChange,

  async getOverview({ from, to }) {
    const { fromStr, toStr, prevFromStr } = parseDateRange(from, to);

    const [patientRes, doctorRes, activeDocRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM patients`),
      query(`SELECT COUNT(*) FROM doctors`),
      query(`SELECT COUNT(*) FROM doctors WHERE is_available = true`)
    ]);

    const totalPatients = parseInt(patientRes.rows[0]?.count || 0, 10);
    const totalDoctors = parseInt(doctorRes.rows[0]?.count || 0, 10);
    const activeDoctors = parseInt(activeDocRes.rows[0]?.count || 0, 10);

    const currApptRes = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM appointments
      WHERE appointment_date >= $1 AND appointment_date <= $2
    `, [fromStr, toStr]);

    const prevApptRes = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM appointments
      WHERE appointment_date >= $1 AND appointment_date < $2
    `, [prevFromStr, fromStr]);

    const currAppts = currApptRes.rows[0] || {};
    const prevAppts = prevApptRes.rows[0] || {};

    const totalAppts = parseInt(currAppts.total || 0, 10);
    const completedAppts = parseInt(currAppts.completed || 0, 10);
    const cancelledAppts = parseInt(currAppts.cancelled || 0, 10);
    const rejectedAppts = parseInt(currAppts.rejected || 0, 10);
    const pendingAppts = parseInt(currAppts.pending || 0, 10);

    const prevTotalAppts = parseInt(prevAppts.total || 0, 10);

    const cancellationRate = totalAppts > 0 ? Math.round((cancelledAppts / totalAppts) * 1000) / 10 : 0;
    const prevCancellationRate = prevTotalAppts > 0 ? Math.round((parseInt(prevAppts.cancelled || 0, 10) / prevTotalAppts) * 1000) / 10 : 0;

    let currentRevenue = 0;
    let previousRevenue = 0;
    let pendingInvoiceAmount = 0;

    try {
      const currRevRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE (created_at >= $1 OR payment_date >= $1) AND (created_at <= $2 OR payment_date <= $2)
      `, [fromStr, `${toStr} 23:59:59`]);
      const prevRevRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE (created_at >= $1 OR payment_date >= $1) AND (created_at < $2 OR payment_date < $2)
      `, [prevFromStr, fromStr]);
      currentRevenue = parseFloat(currRevRes.rows[0]?.total || 0);
      previousRevenue = parseFloat(prevRevRes.rows[0]?.total || 0);
    } catch {
      currentRevenue = 0;
      previousRevenue = 0;
    }

    try {
      const pendingInvRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'pending'`);
      pendingInvoiceAmount = parseFloat(pendingInvRes.rows[0]?.total || 0);
    } catch {
      try {
        const fallbackRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE status = 'pending'`);
        pendingInvoiceAmount = parseFloat(fallbackRes.rows[0]?.total || 0);
      } catch {
        pendingInvoiceAmount = 0;
      }
    }

    const newPatientsRes = await query(`SELECT COUNT(*) FROM patients WHERE created_at >= $1 AND created_at <= $2`, [fromStr, `${toStr} 23:59:59`]);
    const prevNewPatientsRes = await query(`SELECT COUNT(*) FROM patients WHERE created_at >= $1 AND created_at < $2`, [prevFromStr, fromStr]);

    const newPatients = parseInt(newPatientsRes.rows[0]?.count || 0, 10);
    const prevNewPatients = parseInt(prevNewPatientsRes.rows[0]?.count || 0, 10);

    return {
      dateRange: { from: fromStr, to: toStr },
      metrics: {
        totalPatients: { current: totalPatients, previous: totalPatients, percentChange: 0 },
        totalDoctors: { current: totalDoctors, active: activeDoctors },
        appointments: { current: totalAppts, previous: prevTotalAppts, percentChange: calculatePercentChange(totalAppts, prevTotalAppts) },
        completed: { current: completedAppts },
        cancelled: { current: cancelledAppts },
        rejected: { current: rejectedAppts },
        pending: { current: pendingAppts },
        cancellationRate: { current: cancellationRate, previous: prevCancellationRate, percentChange: calculatePercentChange(cancellationRate, prevCancellationRate) },
        revenue: { current: currentRevenue, previous: previousRevenue, percentChange: calculatePercentChange(currentRevenue, previousRevenue) },
        pendingInvoiceAmount: { current: pendingInvoiceAmount },
        newPatients: { current: newPatients, previous: prevNewPatients, percentChange: calculatePercentChange(newPatients, prevNewPatients) }
      }
    };
  },

  async getAppointmentsTrend({ from, to, groupBy = 'day' }) {
    const { fromDate, toDate, fromStr, toStr } = parseDateRange(from, to);

    let dateFormat = 'YYYY-MM-DD';
    let truncUnit = 'day';
    if (groupBy === 'month') {
      dateFormat = 'YYYY-MM';
      truncUnit = 'month';
    } else if (groupBy === 'week') {
      dateFormat = 'IYYY-IW';
      truncUnit = 'week';
    }

    const res = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('${truncUnit}', appointment_date), '${dateFormat}') as period,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM appointments
      WHERE appointment_date >= $1 AND appointment_date <= $2
      GROUP BY DATE_TRUNC('${truncUnit}', appointment_date)
      ORDER BY DATE_TRUNC('${truncUnit}', appointment_date) ASC
    `, [fromStr, toStr]);

    const dataMap = new Map();
    res.rows.forEach(r => dataMap.set(r.period, {
      period: r.period,
      total: parseInt(r.total || 0, 10),
      completed: parseInt(r.completed || 0, 10),
      cancelled: parseInt(r.cancelled || 0, 10),
      pending: parseInt(r.pending || 0, 10),
      rejected: parseInt(r.rejected || 0, 10)
    }));

    const expectedBuckets = generateDateBuckets(fromDate, toDate, groupBy);
    return expectedBuckets.map(bucketKey => {
      if (dataMap.has(bucketKey)) return dataMap.get(bucketKey);
      for (const [k, v] of dataMap.entries()) {
        if (bucketKey.includes(k) || k.includes(bucketKey)) return { ...v, period: bucketKey };
      }
      return { period: bucketKey, total: 0, completed: 0, cancelled: 0, pending: 0, rejected: 0 };
    });
  },

  async getRevenueTrend({ from, to, groupBy = 'day' }) {
    const { fromDate, toDate, fromStr, toStr } = parseDateRange(from, to);

    let dateFormat = 'YYYY-MM-DD';
    let truncUnit = 'day';
    if (groupBy === 'month') {
      dateFormat = 'YYYY-MM';
      truncUnit = 'month';
    } else if (groupBy === 'week') {
      dateFormat = 'IYYY-IW';
      truncUnit = 'week';
    }

    let rows = [];
    try {
      const res = await query(`
        SELECT
          TO_CHAR(DATE_TRUNC('${truncUnit}', COALESCE(created_at, payment_date)), '${dateFormat}') as period,
          SUM(amount) as revenue,
          COUNT(*) as payment_count
        FROM payments
        WHERE (created_at >= $1 OR payment_date >= $1) AND (created_at <= $2 OR payment_date <= $2)
        GROUP BY DATE_TRUNC('${truncUnit}', COALESCE(created_at, payment_date))
        ORDER BY DATE_TRUNC('${truncUnit}', COALESCE(created_at, payment_date)) ASC
      `, [fromStr, `${toStr} 23:59:59`]);
      rows = res.rows;
    } catch {
      rows = [];
    }

    const dataMap = new Map();
    rows.forEach(r => dataMap.set(r.period, {
      period: r.period,
      revenue: parseFloat(r.revenue || 0),
      payment_count: parseInt(r.payment_count || 0, 10)
    }));

    const expectedBuckets = generateDateBuckets(fromDate, toDate, groupBy);
    return expectedBuckets.map(bucketKey => {
      if (dataMap.has(bucketKey)) return dataMap.get(bucketKey);
      for (const [k, v] of dataMap.entries()) {
        if (bucketKey.includes(k) || k.includes(bucketKey)) return { ...v, period: bucketKey };
      }
      return { period: bucketKey, revenue: 0, payment_count: 0 };
    });
  },

  async getPatientGrowth({ from, to, groupBy = 'day' }) {
    const { fromDate, toDate, fromStr, toStr } = parseDateRange(from, to);

    let dateFormat = 'YYYY-MM-DD';
    let truncUnit = 'day';
    if (groupBy === 'month') {
      dateFormat = 'YYYY-MM';
      truncUnit = 'month';
    } else if (groupBy === 'week') {
      dateFormat = 'IYYY-IW';
      truncUnit = 'week';
    }

    const initialRes = await query(`SELECT COUNT(*) FROM patients WHERE created_at < $1`, [fromStr]);
    let cumulative = parseInt(initialRes.rows[0]?.count || 0, 10);

    const res = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('${truncUnit}', created_at), '${dateFormat}') as period,
        COUNT(*) as new_patients
      FROM patients
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('${truncUnit}', created_at)
      ORDER BY DATE_TRUNC('${truncUnit}', created_at) ASC
    `, [fromStr, `${toStr} 23:59:59`]);

    const dataMap = new Map();
    res.rows.forEach(r => dataMap.set(r.period, parseInt(r.new_patients || 0, 10)));

    const expectedBuckets = generateDateBuckets(fromDate, toDate, groupBy);
    return expectedBuckets.map(bucketKey => {
      let count = dataMap.get(bucketKey) || 0;
      if (!count) {
        for (const [k, v] of dataMap.entries()) {
          if (bucketKey.includes(k) || k.includes(bucketKey)) {
            count = v;
            break;
          }
        }
      }
      cumulative += count;
      return {
        period: bucketKey,
        new_patients: count,
        cumulative_patients: cumulative
      };
    });
  },

  async getDepartmentsAnalytics({ from, to }) {
    const { fromStr, toStr } = parseDateRange(from, to);

    try {
      const res = await query(`
        SELECT
          d.id as department_id,
          d.name as department_name,
          COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_count,
          COALESCE(SUM(p.amount), 0) as revenue
        FROM departments d
        LEFT JOIN doctors doc ON d.id = doc.department_id
        LEFT JOIN appointments a ON doc.id = a.doctor_id AND a.appointment_date >= $1 AND a.appointment_date <= $2
        LEFT JOIN invoices i ON a.id = i.appointment_id
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE d.is_active = true
        GROUP BY d.id, d.name
        ORDER BY appointment_count DESC, revenue DESC
        LIMIT 10
      `, [fromStr, toStr]);

      return res.rows.map(r => ({
        department_id: r.department_id,
        department_name: r.department_name,
        appointment_count: parseInt(r.appointment_count || 0, 10),
        completed_count: parseInt(r.completed_count || 0, 10),
        revenue: parseFloat(r.revenue || 0)
      }));
    } catch {
      // Fallback query without invoices / payments join if invoices table is missing
      const fallbackRes = await query(`
        SELECT
          d.id as department_id,
          d.name as department_name,
          COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_count,
          0 as revenue
        FROM departments d
        LEFT JOIN doctors doc ON d.id = doc.department_id
        LEFT JOIN appointments a ON doc.id = a.doctor_id AND a.appointment_date >= $1 AND a.appointment_date <= $2
        WHERE d.is_active = true
        GROUP BY d.id, d.name
        ORDER BY appointment_count DESC
        LIMIT 10
      `, [fromStr, toStr]);

      return fallbackRes.rows.map(r => ({
        department_id: r.department_id,
        department_name: r.department_name,
        appointment_count: parseInt(r.appointment_count || 0, 10),
        completed_count: parseInt(r.completed_count || 0, 10),
        revenue: 0
      }));
    }
  },

  async getDoctorsAnalytics({ from, to, sort = 'appointments', order = 'desc', limit = 10 }) {
    const { fromStr, toStr } = parseDateRange(from, to);

    const validSorts = {
      appointments: 'appointment_count',
      completed: 'completed_count',
      revenue: 'revenue',
      rating: 'average_rating'
    };

    const sortColumn = validSorts[sort] || 'appointment_count';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    try {
      const res = await query(`
        SELECT
          doc.id as doctor_id,
          u.first_name || ' ' || u.last_name as doctor_name,
          doc.specialization,
          d.name as department_name,
          COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_count,
          COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END) as cancelled_count,
          COALESCE(SUM(p.amount), 0) as revenue,
          doc.rating as average_rating,
          doc.total_reviews as review_count
        FROM doctors doc
        JOIN users u ON doc.user_id = u.id
        LEFT JOIN departments d ON doc.department_id = d.id
        LEFT JOIN appointments a ON doc.id = a.doctor_id AND a.appointment_date >= $1 AND a.appointment_date <= $2
        LEFT JOIN invoices i ON a.id = i.appointment_id
        LEFT JOIN payments p ON i.id = p.invoice_id
        GROUP BY doc.id, u.first_name, u.last_name, doc.specialization, d.name, doc.rating, doc.total_reviews
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ${limitNum}
      `, [fromStr, toStr]);

      return res.rows.map(r => {
        const apptCount = parseInt(r.appointment_count || 0, 10);
        const cancCount = parseInt(r.cancelled_count || 0, 10);
        const cancellationRate = apptCount > 0 ? Math.round((cancCount / apptCount) * 1000) / 10 : 0;

        return {
          doctor_id: r.doctor_id,
          doctor_name: r.doctor_name,
          specialization: r.specialization || 'General',
          department_name: r.department_name || 'General',
          appointment_count: apptCount,
          completed_count: parseInt(r.completed_count || 0, 10),
          cancellation_rate: cancellationRate,
          revenue: parseFloat(r.revenue || 0),
          average_rating: r.average_rating !== null ? parseFloat(r.average_rating) : null,
          review_count: parseInt(r.review_count || 0, 10)
        };
      });
    } catch {
      // Fallback query without invoices / payments join
      const fallbackRes = await query(`
        SELECT
          doc.id as doctor_id,
          u.first_name || ' ' || u.last_name as doctor_name,
          doc.specialization,
          d.name as department_name,
          COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_count,
          COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END) as cancelled_count,
          0 as revenue,
          doc.rating as average_rating,
          doc.total_reviews as review_count
        FROM doctors doc
        JOIN users u ON doc.user_id = u.id
        LEFT JOIN departments d ON doc.department_id = d.id
        LEFT JOIN appointments a ON doc.id = a.doctor_id AND a.appointment_date >= $1 AND a.appointment_date <= $2
        GROUP BY doc.id, u.first_name, u.last_name, doc.specialization, d.name, doc.rating, doc.total_reviews
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ${limitNum}
      `, [fromStr, toStr]);

      return fallbackRes.rows.map(r => {
        const apptCount = parseInt(r.appointment_count || 0, 10);
        const cancCount = parseInt(r.cancelled_count || 0, 10);
        const cancellationRate = apptCount > 0 ? Math.round((cancCount / apptCount) * 1000) / 10 : 0;

        return {
          doctor_id: r.doctor_id,
          doctor_name: r.doctor_name,
          specialization: r.specialization || 'General',
          department_name: r.department_name || 'General',
          appointment_count: apptCount,
          completed_count: parseInt(r.completed_count || 0, 10),
          cancellation_rate: cancellationRate,
          revenue: 0,
          average_rating: r.average_rating !== null ? parseFloat(r.average_rating) : null,
          review_count: parseInt(r.review_count || 0, 10)
        };
      });
    }
  }
};

module.exports = analyticsService;
