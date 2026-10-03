const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load test environment
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

const dbName = process.env.DB_NAME || 'shms_test';

// Safety enforcement check: Refuse execution if DB name does not contain "test"
if (!dbName.toLowerCase().includes('test')) {
  throw new Error(`CRITICAL TEST SAFETY FAILURE: Database name "${dbName}" is not a test database! Tests must be run on a dedicated test database (e.g., shms_test).`);
}

const { query } = require('../src/config/database');
const jwtConfig = require('../src/config/jwt');

/**
 * Helper to generate a test JWT access token for a given user object.
 */
function generateTestToken(user) {
  const secret = jwtConfig.access?.secret || process.env.JWT_ACCESS_SECRET || 'test_access_secret';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      patientId: user.patient_id || null,
      doctorId: user.doctor_id || null
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Helper to create a test user record directly in the test database.
 */
async function createTestUser({ email, password = 'Password123', role = 'patient', firstName = 'Test', lastName = 'User' }) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const res = await query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, true, true)
     RETURNING id, email, role, first_name, last_name`,
    [email.toLowerCase(), passwordHash, role, firstName, lastName]
  );
  const user = res.rows[0];

  if (role === 'patient') {
    const pRes = await query('INSERT INTO patients (user_id) VALUES ($1) RETURNING id', [user.id]);
    user.patient_id = pRes.rows[0].id;
  } else if (role === 'doctor') {
    const dRes = await query(
      `INSERT INTO doctors (user_id, specialization, consultation_fee, is_available)
       VALUES ($1, 'General Medicine', 500.00, true) RETURNING id`,
      [user.id]
    );
    user.doctor_id = dRes.rows[0].id;
  }

  return user;
}

module.exports = {
  dbName,
  generateTestToken,
  createTestUser
};
