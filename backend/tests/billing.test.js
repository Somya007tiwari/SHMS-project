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

describe('Billing API (Invoices, Totals, Payments & Lock)', () => {
  const timestamp = Date.now();
  let adminUser, patientUser, adminToken;

  beforeAll(async () => {
    adminUser = await createTestUser({ email: `admin_bill_${timestamp}@example.com`, role: 'admin' });
    patientUser = await createTestUser({ email: `patient_bill_${timestamp}@example.com`, role: 'patient' });
    adminToken = generateTestToken(adminUser);
  });

  test('POST /api/v1/invoices - Server computes total amount from items', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientUser.patient_id,
        items: [
          { description: 'Consultation', unitPrice: 500, quantity: 1 },
          { description: 'Blood Test', unitPrice: 300, quantity: 2 }
        ],
        discountAmount: 100,
        taxAmount: 50
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    // Subtotal: 500 + 600 = 1100. Total: 1100 - 100 + 50 = 1050
    expect(Number(res.body.data.total_amount)).toBe(1050);
  });

  test('POST /api/v1/invoices/:id/payments - Prevents payment exceeding balance', async () => {
    // Create an invoice first
    const createRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientUser.patient_id,
        items: [{ description: 'Test Service', unitPrice: 200, quantity: 1 }]
      });

    const invoiceId = createRes.body.data.id;

    // Attempt payment exceeding total amount
    const payRes = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        method: 'cash'
      });

    expect(payRes.statusCode).toBe(400);
    expect(payRes.body.message).toMatch(/exceed|balance|total/i);
  });
});
