require('dotenv').config();
const { query, pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: node scripts/createAdmin.js <password>');
    process.exit(1);
  }

  const email = 'admin@shms.com';

  try {
    // Check if admin user already exists
    const existingRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingRes.rows.length > 0) {
      console.log(`User with email ${email} already exists.`);
      process.exit(0);
    }

    // Generate password hash using 12 salt rounds (same as User model and Auth controller)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert admin user
    await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_email_verified)
       VALUES ($1, $2, 'admin', 'Admin', 'User', '1234567890', true, true)`,
      [email, passwordHash]
    );

    console.log(`✅ Admin user (${email}) created successfully.`);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
