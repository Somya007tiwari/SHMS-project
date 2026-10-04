const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from backend/.env if present
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

async function runMigration() {
  const args = process.argv.slice(2);
  const hasYes = args.includes('--yes');

  if (!hasYes) {
    console.error('❌ MIGRATION REFUSED: Explicit --yes flag is required to run database migrations.');
    console.error('Usage: node backend/scripts/migrate.js --yes (or npm run migrate -- --yes)');
    process.exit(1);
  }

  // Parse connection settings safely without exposing credentials
  let host = process.env.DB_HOST || 'localhost';
  let dbName = process.env.DB_NAME || 'shms_db';

  let poolConfig;
  if (process.env.DATABASE_URL) {
    try {
      const parsedUrl = new URL(process.env.DATABASE_URL);
      host = parsedUrl.hostname || host;
      dbName = parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : dbName;
    } catch {
      // URL parsing fallback
    }
    const sslOption = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: sslOption,
    };
  } else {
    const isSsl = process.env.DB_SSL === 'true';
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'shms_db',
      user: process.env.DB_USER || 'shms_user',
      password: process.env.DB_PASSWORD || 'shms_password',
      ssl: isSsl ? { rejectUnauthorized: false } : false,
    };
  }

  console.log(`=======================================================`);
  console.log(`🚀 SHMS Database Migration Runner`);
  console.log(`🎯 Target Host: "${host}"`);
  console.log(`🛢️ Target Database: "${dbName}"`);
  console.log(`=======================================================`);

  const pool = new Pool(poolConfig);

  try {
    const migrationOrderPath = path.resolve(__dirname, '../../database/migration-order.json');
    if (!fs.existsSync(migrationOrderPath)) {
      throw new Error(`Migration order file not found at: ${migrationOrderPath}`);
    }

    const migrationOrder = JSON.parse(fs.readFileSync(migrationOrderPath, 'utf8'));

    // Security Guard: Refuse if seed.sql appears in the migration order
    if (migrationOrder.includes('seed.sql')) {
      throw new Error('FATAL SECURITY ERROR: seed.sql is listed in migration-order.json! seed.sql creates a demo admin and must never be run in migrations.');
    }

    // 1. Ensure schema_migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const appliedRes = await pool.query('SELECT filename FROM schema_migrations');
    const appliedFiles = new Set(appliedRes.rows.map((r) => r.filename));

    // 3. Detect if database was built by hand previously (users table exists, but schema_migrations empty)
    const usersExistRes = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);
    const usersExist = usersExistRes.rows[0].exists;
    const isHandBuilt = usersExist && appliedFiles.size === 0;

    if (isHandBuilt) {
      console.log('ℹ️ Detected pre-existing database schema (users table present). Marking schema.sql as recorded without re-executing it.');
    }

    const dbDir = path.resolve(__dirname, '../../database');

    for (const filename of migrationOrder) {
      if (filename === 'seed.sql') {
        throw new Error('FATAL SECURITY ERROR: Attempted to run seed.sql. Migration aborted.');
      }

      if (appliedFiles.has(filename)) {
        console.log(`  [SKIP] Already applied: ${filename}`);
        continue;
      }

      if (filename === 'schema.sql' && isHandBuilt) {
        await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [filename]);
        appliedFiles.add(filename);
        console.log(`  [RECORDED] ${filename} marked as applied for hand-built database.`);
        continue;
      }

      const filePath = path.join(dbDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file missing on disk: ${filename} (at ${filePath})`);
      }

      console.log(`  [APPLYING] ${filename}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      try {
        await pool.query(sqlContent);
        await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        appliedFiles.add(filename);
        console.log(`  [SUCCESS] ${filename} applied successfully.`);
      } catch (err) {
        console.error(`❌ MIGRATION FAILED on file: "${filename}"`);
        console.error(`Error details: ${err.message}`);
        throw new Error(`Migration stopped due to error in ${filename}: ${err.message}`);
      }
    }

    console.log(`\n=======================================================`);
    console.log(`🔍 Running Post-Migration Verification Checklist...`);
    console.log(`=======================================================`);

    // Verify tables list
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log(`📋 Total Public Tables Found (${tables.length}): ${tables.join(', ')}`);

    // Verify doctors.room_number column
    const roomColRes = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'room_number'
      );
    `);
    const hasRoomNumber = roomColRes.rows[0].exists;

    // Verify appointment_status enum value 'needs_reschedule'
    const enumValRes = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'appointment_status' AND e.enumlabel = 'needs_reschedule'
      );
    `);
    const hasNeedsReschedule = enumValRes.rows[0].exists;

    console.log(`- doctors.room_number column: ${hasRoomNumber ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`- appointment_status 'needs_reschedule' value: ${hasNeedsReschedule ? '✅ EXISTS' : '❌ MISSING'}`);

    const missingItems = [];
    if (!hasRoomNumber) missingItems.push('doctors.room_number');
    if (!hasNeedsReschedule) missingItems.push("appointment_status enum 'needs_reschedule'");

    if (missingItems.length === 0) {
      console.log(`\n=======================================================`);
      console.log(`✅ OK - All migrations applied and schema verified successfully!`);
      console.log(`=======================================================`);
    } else {
      console.error(`\n❌ SCHEMA INCOMPLETE - Missing elements: ${missingItems.join(', ')}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Migration Runner Terminated with Error:`, err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
