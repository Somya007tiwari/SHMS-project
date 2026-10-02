const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  console.log('Running Phase 8 (Invoices & Payments) migration...');
  const sqlPath = path.join(__dirname, '../../../database/migration_phase8_invoices_and_payments.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Phase 8 migration executed successfully!');
  } catch (err) {
    console.error('❌ Phase 8 migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
