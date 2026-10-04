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

  const clientConfig = process.env.TEST_DATABASE_URL
    ? {
        connectionString: process.env.TEST_DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: dbName,
        user: process.env.DB_USER || 'shms_user',
        password: process.env.DB_PASSWORD || 'shms_password',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();

    const dbDir = path.join(__dirname, '../../database');
    const migrationOrderPath = path.join(dbDir, 'migration-order.json');
    if (!fs.existsSync(migrationOrderPath)) {
      throw new Error(`migration-order.json not found at ${migrationOrderPath}`);
    }

    const sqlFiles = JSON.parse(fs.readFileSync(migrationOrderPath, 'utf8'));

    for (const file of sqlFiles) {
      if (file === 'seed.sql') continue; // Extra safety: skip seed.sql
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
