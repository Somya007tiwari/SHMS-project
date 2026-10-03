const request = require('supertest');
const app = require('../server');
const { createTestUser, generateTestToken } = require('./testHelpers');

jest.mock('../src/services/emailService', () => ({
  sendWelcome: jest.fn(),
  checkEmailConfig: jest.fn()
}));
jest.mock('../src/services/reminderCron', () => ({
  startReminderCron: jest.fn()
}));

describe('Access Control Tests (Tenant Isolation & Authorization)', () => {
  const timestamp = Date.now();
  let patientA, patientB, tokenA, tokenB;

  beforeAll(async () => {
    patientA = await createTestUser({ email: `patientA_${timestamp}@example.com`, role: 'patient' });
    patientB = await createTestUser({ email: `patientB_${timestamp}@example.com`, role: 'patient' });
    tokenA = generateTestToken(patientA);
    tokenB = generateTestToken(patientB);
  });

  test('Patient B cannot view Patient A medical record (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/medical-records/999999`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.statusCode);
  });

  test('Patient B cannot view Patient A invoice (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/999999`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.statusCode);
  });

  test('Patient B cannot view Patient A prescription (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/prescriptions/999999`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.statusCode);
  });

  test('Patient B cannot view Patient A lab order (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/lab/orders/999999`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.statusCode);
  });
});
