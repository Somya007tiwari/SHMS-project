require('dotenv').config();
require('express-async-errors');

const { validateEnv } = require('./src/utils/envCheck');
validateEnv();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const path = require('path');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Disable X-Powered-By Header ───────────────────────────────────────────
app.disable('x-powered-by');

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ─── General Middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1', routes);
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
