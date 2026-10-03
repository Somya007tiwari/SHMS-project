const { pool } = require('../config/database');

async function updateEnum() {
  try {
    await pool.query("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'needs_reschedule'");
    console.log("✅ appointment_status enum updated with 'needs_reschedule'!");
  } catch (err) {
    console.log("Enum update note:", err.message);
  } finally {
    process.exit(0);
  }
}

updateEnum();
