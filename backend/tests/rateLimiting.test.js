const request = require('supertest');
const app = require('../server');

jest.mock('../src/services/emailService', () => ({
  sendWelcome: jest.fn(),
  checkEmailConfig: jest.fn()
}));
jest.mock('../src/services/reminderCron', () => ({
  startReminderCron: jest.fn()
}));

describe('Rate Limiting Middleware', () => {
  test('Repeated login attempts trigger 429 Too Many Requests JSON response', async () => {
    let triggered429 = false;

    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rate_test@example.com', password: 'wrongpassword' });

      if (res.statusCode === 429) {
        triggered429 = true;
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Too many login attempts');
        break;
      }
    }

    expect(triggered429).toBe(true);
  });
});
