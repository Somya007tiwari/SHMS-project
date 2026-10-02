const analyticsService = require('../services/analyticsService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const escapeCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  // Formula injection protection: escape =, +, -, @
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str}"`;
};

const analyticsController = {
  async getOverview(req, res) {
    try {
      const data = await analyticsService.getOverview(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch analytics overview', 500);
    }
  },

  async getAppointmentsTrend(req, res) {
    try {
      const data = await analyticsService.getAppointmentsTrend(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch appointments trend', 500);
    }
  },

  async getRevenueTrend(req, res) {
    try {
      const data = await analyticsService.getRevenueTrend(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch revenue trend', 500);
    }
  },

  async getPatientGrowth(req, res) {
    try {
      const data = await analyticsService.getPatientGrowth(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch patient growth analytics', 500);
    }
  },

  async getDepartmentsAnalytics(req, res) {
    try {
      const data = await analyticsService.getDepartmentsAnalytics(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch department analytics', 500);
    }
  },

  async getDoctorsAnalytics(req, res) {
    try {
      const data = await analyticsService.getDoctorsAnalytics(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      return sendError(res, err.message || 'Failed to fetch doctor analytics', 500);
    }
  },

  async exportCSV(req, res) {
    try {
      const { report = 'overview', from, to, groupBy = 'day' } = req.query;
      const { fromStr, toStr } = analyticsService.parseDateRange(from, to);

      let csvContent = '';
      const filename = `analytics-${report}-${fromStr}-to-${toStr}.csv`;

      if (report === 'appointments') {
        const data = await analyticsService.getAppointmentsTrend({ from, to, groupBy });
        const headers = ['Period', 'Total Appointments', 'Completed', 'Cancelled', 'Pending', 'Rejected'];
        const rows = data.map(r => [
          escapeCell(r.period), escapeCell(r.total), escapeCell(r.completed),
          escapeCell(r.cancelled), escapeCell(r.pending), escapeCell(r.rejected)
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      } else if (report === 'revenue') {
        const data = await analyticsService.getRevenueTrend({ from, to, groupBy });
        const headers = ['Period', 'Revenue (INR)', 'Payment Count'];
        const rows = data.map(r => [
          escapeCell(r.period), escapeCell(r.revenue.toFixed(2)), escapeCell(r.payment_count)
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      } else if (report === 'departments') {
        const data = await analyticsService.getDepartmentsAnalytics({ from, to });
        const headers = ['Department Name', 'Appointment Count', 'Completed Count', 'Revenue (INR)'];
        const rows = data.map(r => [
          escapeCell(r.department_name), escapeCell(r.appointment_count),
          escapeCell(r.completed_count), escapeCell(r.revenue.toFixed(2))
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      } else if (report === 'doctors') {
        const data = await analyticsService.getDoctorsAnalytics({ from, to, limit: 100 });
        const headers = ['Doctor Name', 'Specialization', 'Department', 'Appointments', 'Completed', 'Cancellation Rate (%)', 'Revenue (INR)', 'Rating', 'Review Count'];
        const rows = data.map(r => [
          escapeCell(r.doctor_name), escapeCell(r.specialization), escapeCell(r.department_name),
          escapeCell(r.appointment_count), escapeCell(r.completed_count),
          escapeCell(`${r.cancellation_rate}%`), escapeCell(r.revenue.toFixed(2)),
          escapeCell(r.average_rating !== null ? r.average_rating.toFixed(1) : 'N/A'),
          escapeCell(r.review_count)
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      } else {
        // Default: overview report
        const overview = await analyticsService.getOverview({ from, to });
        const m = overview.metrics;
        const headers = ['Metric', 'Current Period', 'Previous Period', 'Percent Change (%)'];
        const rows = [
          [escapeCell('Total Patients'), escapeCell(m.totalPatients.current), escapeCell(m.totalPatients.previous), escapeCell('0%')],
          [escapeCell('Total Doctors'), escapeCell(m.totalDoctors.current), escapeCell(m.totalDoctors.active), escapeCell('N/A')],
          [escapeCell('Appointments'), escapeCell(m.appointments.current), escapeCell(m.appointments.previous), escapeCell(`${m.appointments.percentChange}%`)],
          [escapeCell('Cancellation Rate'), escapeCell(`${m.cancellationRate.current}%`), escapeCell(`${m.cancellationRate.previous}%`), escapeCell(`${m.cancellationRate.percentChange}%`)],
          [escapeCell('Revenue (INR)'), escapeCell(m.revenue.current.toFixed(2)), escapeCell(m.revenue.previous.toFixed(2)), escapeCell(`${m.revenue.percentChange}%`)],
          [escapeCell('New Patients'), escapeCell(m.newPatients.current), escapeCell(m.newPatients.previous), escapeCell(`${m.newPatients.percentChange}%`)],
          [escapeCell('Pending Invoices (INR)'), escapeCell(m.pendingInvoiceAmount.current.toFixed(2)), escapeCell('N/A'), escapeCell('N/A')]
        ];
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } catch (err) {
      return sendError(res, err.message || 'Failed to export analytics CSV', 500);
    }
  }
};

module.exports = analyticsController;
