const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  console.log('Running Phase 7 (Lab Tests & Reports) migration...');
  const sqlPath = path.join(__dirname, '../../../database/migration_phase7_lab_tests_and_reports.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Phase 7 migration executed successfully!');
  } catch (err) {
    console.error('❌ Phase 7 migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
