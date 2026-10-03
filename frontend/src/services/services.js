import api from './api';

export const appointmentService = {
  create: (data) => api.post('/appointments', data),
  getMyAppointments: (params) => api.get('/appointments/my', { params }),
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  getAvailableSlots: (doctorId, date) => api.get('/appointments/slots', { params: { doctorId, date } }),
  approve: (id) => api.patch(`/appointments/${id}/approve`),
  reject: (id, data) => api.patch(`/appointments/${id}/reject`, data),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
  complete: (id, data) => api.patch(`/appointments/${id}/complete`, data),
  reschedule: (id, data) => api.put(`/appointments/${id}/reschedule`, data),
};

export const doctorService = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  getMyProfile: () => api.get('/doctors/me/profile'),
  getDashboard: () => api.get('/doctors/me/dashboard'),
  getMyPatients: (params) => api.get('/doctors/me/patients', { params }),
  getSchedule: (id) => api.get(`/doctors/${id}/schedule`),
  updateSchedule: (data) => api.put('/doctors/me/schedule', data),
  createLeave: (data) => api.post('/doctors/me/leaves', data),
  getMyLeaves: () => api.get('/doctors/me/leaves'),
  deleteLeave: (id) => api.delete(`/doctors/me/leaves/${id}`),
  getLeaves: (doctorId) => api.get(`/doctors/${doctorId}/leaves`),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  create: (data) => api.post('/doctors', data),
};

export const patientService = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  getMyProfile: () => api.get('/patients/me/profile'),
  updateMyProfile: (data) => api.put('/patients/me/profile', data),
  getDashboard: () => api.get('/patients/me/dashboard'),
  getMedicalHistory: (id) => api.get(`/patients/${id ? id + '/' : 'me/'}history`),
};

export const prescriptionService = {
  create: (data) => api.post('/prescriptions', data),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
  getMyPrescriptions: (params) => api.get('/prescriptions/my', { params }),
  getDoctorPrescriptions: (params) => api.get('/prescriptions/doctor', { params }),
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  getMedicineSuggestions: (q) => api.get('/prescriptions/medicine-suggestions', { params: { q } }),
  downloadPDF: (id) => api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' }),
};

export const billingService = {
  create: (data) => api.post('/billing', data),
  getAll: (params) => api.get('/billing', { params }),
  getMyBills: (params) => api.get('/billing/my', { params }),
  getById: (id) => api.get(`/billing/${id}`),
  addPayment: (id, data) => api.post(`/billing/${id}/payment`, data),
  downloadPDF: (id) => api.get(`/billing/${id}/download`, { responseType: 'blob' }),
  getRevenueStats: () => api.get('/billing/revenue-stats'),
};

export const reportService = {
  upload: (data) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyReports: (params) => api.get('/reports/my', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
};

export const healthProfileService = {
  getMine: () => api.get('/patients/me/health-profile'),
  updateMine: (data) => api.put('/patients/me/health-profile', data),
  getByPatient: (patientId) => api.get(`/patients/${patientId}/health-profile`),
};

export const medicalRecordService = {
  getMyRecords: (params) => api.get('/medical-records/my', { params }),
  getByPatient: (patientId, params) => api.get(`/medical-records/patient/${patientId}`, { params }),
  getAll: (params) => api.get('/medical-records/all', { params }),
  getById: (id) => api.get(`/medical-records/${id}`),
  create: (data) => api.post('/medical-records', data),
  update: (id, data) => api.put(`/medical-records/${id}`, data),
  delete: (id) => api.delete(`/medical-records/${id}`),
  uploadFiles: (id, formData) => api.post(`/medical-records/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadFile: (fileId) => api.get(`/medical-records/files/${fileId}/download`, { responseType: 'blob' }),
  deleteFile: (fileId) => api.delete(`/medical-records/files/${fileId}`),
};

export const notificationService = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAsUnread: (id) => api.put(`/notifications/${id}/unread`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getLoginHistory: (params) => api.get('/admin/login-history', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  deactivateUser: (id) => api.patch(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.patch(`/admin/users/${id}/activate`),
  unlockUser: (id) => api.patch(`/admin/users/${id}/unlock`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const reviewService = {
  create: (doctorId, data) => api.post(`/doctors/${doctorId}/reviews`, data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  getByDoctor: (doctorId, params) => api.get(`/doctors/${doctorId}/reviews`, { params }),
  getSummary: (doctorId) => api.get(`/doctors/${doctorId}/rating-summary`),
};

export const aiService = {
  getWelcome: () => api.get('/ai/welcome'),
  chat: (message, history) => api.post('/ai/chat', { message, conversationHistory: history }),
};

export const invoiceService = {
  create: (data) => api.post('/invoices', data),
  getMyInvoices: (params) => api.get('/invoices/my', { params }),
  getDoctorInvoices: (params) => api.get('/invoices/doctor', { params }),
  getStats: () => api.get('/invoices/stats'),
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  addPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  cancel: (id) => api.put(`/invoices/${id}/cancel`),
  downloadPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  exportCSV: (params) => api.get('/invoices/export.csv', { params, responseType: 'blob' }),
};

export const analyticsService = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getAppointmentsTrend: (params) => api.get('/analytics/appointments-trend', { params }),
  getRevenueTrend: (params) => api.get('/analytics/revenue-trend', { params }),
  getPatientGrowth: (params) => api.get('/analytics/patient-growth', { params }),
  getDepartmentsAnalytics: (params) => api.get('/analytics/departments', { params }),
  getDoctorsAnalytics: (params) => api.get('/analytics/doctors', { params }),
  exportCSV: (params) => api.get('/analytics/export.csv', { params, responseType: 'blob' }),
};

export const labService = {
  getTests: (params) => api.get('/lab/tests', { params }),
  getTestById: (id) => api.get(`/lab/tests/${id}`),
  createTest: (data) => api.post('/lab/tests', data),
  updateTest: (id, data) => api.put(`/lab/tests/${id}`, data),
  toggleTestStatus: (id) => api.patch(`/lab/tests/${id}/status`),
  createDoctorOrders: (data) => api.post('/lab/orders', data),
  bookPatientOrders: (data) => api.post('/lab/orders/book', data),
  cancelOrder: (id) => api.post(`/lab/orders/${id}/cancel`),
  getMyOrders: (params) => api.get('/lab/orders/my', { params }),
  getDoctorOrders: (params) => api.get('/lab/orders/doctor', { params }),
  getAllOrders: (params) => api.get('/lab/orders', { params }),
  getOrderById: (id) => api.get(`/lab/orders/${id}`),
  updateOrderStatus: (id, status) => api.patch(`/lab/orders/${id}/status`, { status }),
  submitResult: (id, data) => api.put(`/lab/orders/${id}/result`, data),
  uploadFiles: (id, formData) => api.post(`/lab/orders/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadFile: (fileId) => api.get(`/lab/files/${fileId}/download`, { responseType: 'blob' }),
  deleteFile: (fileId) => api.delete(`/lab/files/${fileId}`),
  addToInvoice: (id) => api.post(`/lab/orders/${id}/add-to-invoice`),
};

export const assistantService = {
  analyze: (data) => api.post('/assistant/analyze', data),
};
