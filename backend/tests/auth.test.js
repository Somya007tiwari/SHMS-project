const request = require('supertest');
const app = require('../server');
const { query } = require('../src/config/database');
const { createTestUser, generateTestToken } = require('./testHelpers');

// Mock email, AI, and cron to keep tests offline and fast
jest.mock('../src/services/emailService', () => ({
  sendWelcome: jest.fn(),
  checkEmailConfig: jest.fn()
}));
jest.mock('../src/services/reminderCron', () => ({
  startReminderCron: jest.fn()
}));

describe('Auth & Role Protection API', () => {
  const timestamp = Date.now();
  const testEmail = `testauth_${timestamp}@example.com`;
  const password = 'Password123';

  test('POST /api/v1/auth/register - Successfully registers new patient', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password,
        firstName: 'Test',
        lastName: 'Patient'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/v1/auth/login - Returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toContain('Invalid email or password');
  });

  test('POST /api/v1/auth/login - Successfully logs in with correct password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('Role Protection - Patient cannot access admin dashboard (403)', async () => {
    const patientUser = await createTestUser({ email: `patient_role_${timestamp}@example.com`, role: 'patient' });
    const token = generateTestToken(patientUser);

    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });
});
