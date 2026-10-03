require('dotenv').config();
const { query, pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const newPassword = process.argv[2];

  if (!newPassword) {
    console.error('Usage: node scripts/resetAdminPassword.js <new_password>');
    process.exit(1);
  }

  const email = 'admin@shms.com';

  try {
    // Check if admin user exists
    const existingRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingRes.rows.length === 0) {
      console.error(`❌ Admin user (${email}) not found.`);
      process.exit(1);
    }

    // Generate password hash using 12 salt rounds (same as User model and Auth controller)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password hash for admin user only
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE email = $2 AND role = \'admin\'',
      [passwordHash, email]
    );

    console.log(`✅ Password reset successfully for admin user (${email}).`);
  } catch (error) {
    console.error('❌ Failed to reset admin password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
