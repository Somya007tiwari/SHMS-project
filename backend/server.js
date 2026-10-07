const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

require('express-async-errors');

const { validateEnv } = require('./src/utils/envCheck');
validateEnv();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Disable X-Powered-By Header ───────────────────────────────────────────
app.disable('x-powered-by');

// ─── Trust Proxy Configuration ─────────────────────────────────────────────
let trustProxySetting;
if (process.env.TRUST_PROXY !== undefined && process.env.TRUST_PROXY !== '') {
  if (process.env.TRUST_PROXY === 'true') {
    trustProxySetting = true;
  } else if (process.env.TRUST_PROXY === 'false') {
    trustProxySetting = false;
  } else if (!isNaN(Number(process.env.TRUST_PROXY))) {
    trustProxySetting = Number(process.env.TRUST_PROXY);
  } else {
    trustProxySetting = process.env.TRUST_PROXY;
  }
} else {
  trustProxySetting = process.env.NODE_ENV === 'production' ? 1 : false;
}

if (trustProxySetting !== false) {
  app.set('trust proxy', trustProxySetting);
}

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, '') : url);
const frontendUrlNormalized = normalizeUrl(process.env.FRONTEND_URL);

// Allow Vercel deployments (including custom domains) + local dev
const isVercelOrigin = (origin) => {
  if (!origin) return false;
  const normalized = normalizeUrl(origin);
  return (
    /\.vercel\.app$/.test(normalized) ||           // *.vercel.app
    /^https:\/\/.*\.vercel\.app$/.test(normalized) || // preview deployments
    normalized === frontendUrlNormalized ||        // exact FRONTEND_URL match
    (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized))
  );
};

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [frontendUrlNormalized].filter(Boolean)
  : [frontendUrlNormalized, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeUrl(origin);
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin) || isVercelOrigin(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', normalizedOrigin);
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Acting-Patient-Id']
}));

// ─── General Middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
// Serve ONLY public profile photos statically; private medical records, lab reports, and signatures return 404
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads/profiles')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/uploads', (req, res) => {
  res.status(404).json({ success: false, message: 'File not found or access forbidden' });
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const { query } = require('./src/config/database');

// ─── Health Check (Excluded from Rate Limiting) ─────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'down';
  try {
    await query('SELECT 1');
    dbStatus = 'up';
  } catch (e) {
    dbStatus = 'down';
  }
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    db: dbStatus
  });
});

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1', routes);
app.use('/api', routes);
// ─── Root Route ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Hospital Management System API Running',
    version: '1.0.0'
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

const { startReminderCron } = require('./src/services/reminderCron');
const emailService = require('./src/services/emailService');

// ─── Start Server ───────────────────────────────────────────────────────────
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║   Smart Hospital Management System API    ║
    ║   Server running on port ${PORT}             ║
    ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(12)}          ║
    ╚═══════════════════════════════════════════╝
    `);
    emailService.checkEmailConfig();
    startReminderCron();
  });
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
