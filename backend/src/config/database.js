const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shms_db',
  user: process.env.DB_USER || 'shms_user',
  password: process.env.DB_PASSWORD || 'shms_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Database connection established');
  }
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

/**
 * Execute a query with automatic connection management
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  } catch (error) {
    console.error('Query Error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
};

/**
 * Get a client for transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  client.query = async (...args) => {
    try {
      return await originalQuery(...args);
    } catch (error) {
      throw error;
    }
  };

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

/**
 * Execute queries within a transaction
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, transaction };
