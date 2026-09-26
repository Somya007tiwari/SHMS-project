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
};

export const doctorService = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  getMyProfile: () => api.get('/doctors/me/profile'),
  getDashboard: () => api.get('/doctors/me/dashboard'),
  getMyPatients: (params) => api.get('/doctors/me/patients', { params }),
  getSchedule: (id) => api.get(`/doctors/${id}/schedule`),
  updateSchedule: (data) => api.put('/doctors/me/schedule', data),
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
  getMyPrescriptions: (params) => api.get('/prescriptions/my', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  downloadPDF: (id) => api.get(`/prescriptions/${id}/download`, { responseType: 'blob' }),
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

export const notificationService = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  deactivateUser: (id) => api.patch(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.patch(`/admin/users/${id}/activate`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const aiService = {
  getWelcome: () => api.get('/ai/welcome'),
  chat: (message, history) => api.post('/ai/chat', { message, conversationHistory: history }),
};
