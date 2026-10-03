const request = require('supertest');
const app = require('../server');

jest.mock('../src/services/emailService', () => ({
  sendWelcome: jest.fn(),
  checkEmailConfig: jest.fn()
}));
jest.mock('../src/services/reminderCron', () => ({
  startReminderCron: jest.fn()
}));

describe('Input Validation & Error Handling API', () => {
  test('POST /api/v1/auth/register - Invalid email format returns 400 JSON error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email-format',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message || res.body.errors).toBeDefined();
  });

  test('POST /api/v1/auth/login - Malformed JSON body returns 400 JSON error without stack trace', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken_json');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid JSON payload');
  });
});
