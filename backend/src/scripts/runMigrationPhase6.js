const { pool } = require('../config/database');

async function runMigration() {
  console.log('Running Phase 6 migration...');
  
  try {
    await pool.query("CREATE SEQUENCE IF NOT EXISTS prescription_seq START WITH 100001;");
    console.log('Sequence prescription_seq checked/created.');
  } catch (e) { console.warn('Seq warning:', e.message); }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
          medicine_name VARCHAR(200) NOT NULL,
          dosage VARCHAR(100) NOT NULL,
          frequency VARCHAR(100) NOT NULL,
          duration_days INTEGER NOT NULL CHECK (duration_days > 0),
          timing VARCHAR(100) DEFAULT 'After food',
          instructions TEXT,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table prescription_items checked/created.');
  } catch (e) { console.warn('Table warning:', e.message); }

  try {
    await pool.query("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(50);");
    await pool.query("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;");
    await pool.query("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS advice TEXT;");
    await pool.query("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_date DATE;");
    console.log('Columns added to prescriptions table.');
  } catch (e) {
    console.warn('ALTER TABLE warning (run as superuser if needed):', e.message);
  }

  console.log('✅ Phase 6 migration script finished!');
  process.exit(0);
}

runMigration();
