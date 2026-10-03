require('dotenv').config();
const { query, pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function createOrResetAdmin() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];

  // If only 1 argument provided, default email to admin@shms.com and use arg as password
  let email = emailArg;
  let password = passwordArg;
  if (emailArg && !passwordArg) {
    email = 'admin@shms.com';
    password = emailArg;
  }

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js [email] <password>');
    process.exit(1);
  }

  // Enforce password policy
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('❌ Password policy error: Password must be at least 8 characters long and contain at least one uppercase letter and one number.');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const existingRes = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingRes.rows.length > 0) {
      await query(
        `UPDATE users SET password_hash = $1, is_active = true, is_email_verified = true, updated_at = NOW() WHERE email = $2`,
        [passwordHash, email.toLowerCase()]
      );
      console.log(`✅ Admin password reset successfully for email: ${email}`);
    } else {
      await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_email_verified)
         VALUES ($1, $2, 'admin', 'System', 'Admin', true, true)`,
        [email.toLowerCase(), passwordHash]
      );
      console.log(`✅ Admin user created successfully for email: ${email}`);
    }
  } catch (error) {
    console.error('❌ Failed to create/reset admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createOrResetAdmin();
