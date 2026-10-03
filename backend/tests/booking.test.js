const request = require('supertest');
const app = require('../server');
const { createTestUser, generateTestToken } = require('./testHelpers');

// Mock email, AI, and cron to keep tests offline and fast
jest.mock('../src/services/emailService', () => ({
  sendWelcome: jest.fn(),
  sendAppointmentConfirmation: jest.fn(),
  sendAppointmentCancellation: jest.fn(),
  checkEmailConfig: jest.fn()
}));
jest.mock('../src/services/reminderCron', () => ({
  startReminderCron: jest.fn()
}));

describe('Booking API (Appointments, Slots, Double Booking, Reschedule)', () => {
  const timestamp = Date.now();
  let patientUser, doctorUser, patientToken, doctorToken;

  beforeAll(async () => {
    patientUser = await createTestUser({ email: `patient_book_${timestamp}@example.com`, role: 'patient' });
    doctorUser = await createTestUser({ email: `doctor_book_${timestamp}@example.com`, role: 'doctor' });
    patientToken = generateTestToken(patientUser);
    doctorToken = generateTestToken(doctorUser);
  });

  test('GET /api/v1/appointments/slots - Returns available slots for doctor', async () => {
    const res = await request(app)
      .get(`/api/v1/appointments/slots?doctorId=${doctorUser.doctor_id}&date=2026-10-10`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/v1/appointments - Creates appointment, second request returns 409 (Double booking)', async () => {
    const bookingPayload = {
      doctorId: doctorUser.doctor_id,
      appointmentDate: '2026-10-15',
      timeSlot: '10:00 AM',
      type: 'in-person',
      reason: 'Routine checkup'
    };

    // First booking attempt
    const res1 = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(bookingPayload);

    expect(res1.statusCode).toBe(201);
    expect(res1.body.success).toBe(true);
    const appointmentId = res1.body.data.id;

    // Second booking attempt for same doctor, date & slot
    const res2 = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(bookingPayload);

    expect(res2.statusCode).toBe(409);

    // Cancel appointment frees the slot
    const cancelRes = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Schedule conflict' });

    expect(cancelRes.statusCode).toBe(200);
  });
});
