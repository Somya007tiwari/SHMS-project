const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Ensure test environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

async function setupTestDb() {
  const dbName = process.env.DB_NAME || 'shms_test';
  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shms_test';

  // Mandatory Safety Check: Database name MUST contain "test"
  if (!dbName.toLowerCase().includes('test') && !testDbUrl.toLowerCase().includes('test')) {
    console.error('❌ FATAL SAFETY ERROR: Target database name does not contain "test". Refusing to run setupTestDb on non-test database!');
    console.error(`Attempted DB Name: "${dbName}"`);
    process.exit(1);
  }

  console.log(`🚀 Starting Test Database setup for target: "${dbName}"...`);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: dbName,
    user: process.env.DB_USER || 'shms_user',
    password: process.env.DB_PASSWORD || 'shms_password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    const dbDir = path.join(__dirname, '../../database');
    const sqlFiles = [
      'schema.sql',
      'migration_phase2_schedules_and_unique_indexes.sql',
      'migration_phase3_doctor_reviews.sql',
      'migration_phase3_5_doctor_leaves_reschedule.sql',
      'migration_phase3_6_notifications_and_reminders.sql',
      'migration_phase5_medical_records.sql',
      'migration_phase6_prescriptions.sql',
      'migration_phase7_lab_tests_and_reports.sql',
      'migration_phase8_invoices_and_payments.sql',
      'optional_indexes_phase9_analytics.sql',
      'migration_phase11_security_and_audit.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(dbDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`  Applying: ${file}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
      } else {
        console.warn(`  Warning: File ${file} not found, skipping.`);
      }
    }

    console.log('✅ Test Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Test Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestDb();
