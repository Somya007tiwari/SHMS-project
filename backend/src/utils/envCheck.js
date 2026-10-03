/**
 * Environment variables validation utility.
 * Validates required environment variables and checks secret strength.
 */
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const requiredVars = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'FRONTEND_URL',
  ];

  // 1. Check missing required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      if (isProduction) {
        errors.push(`Missing required environment variable: ${varName}`);
      } else {
        warnings.push(`Missing environment variable ${varName} (using default/fallback)`);
      }
    }
  }

  // 2. Validate secrets strength
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  const isExampleAccess = accessSecret.includes('change_in_production') || accessSecret.includes('your_super_secret');
  const isExampleRefresh = refreshSecret.includes('change_in_production') || refreshSecret.includes('your_super_secret');

  if (accessSecret && isExampleAccess) {
    const msg = 'JWT_ACCESS_SECRET is using a default example value';
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (refreshSecret && isExampleRefresh) {
    const msg = 'JWT_REFRESH_SECRET is using a default example value';
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (accessSecret && accessSecret.length < 32) {
    const msg = 'JWT_ACCESS_SECRET is shorter than 32 characters';
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (refreshSecret && refreshSecret.length < 32) {
    const msg = 'JWT_REFRESH_SECRET is shorter than 32 characters';
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    const msg = 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be identical';
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  // Log warnings in development
  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  // Refuse to start in production if there are errors
  if (isProduction && errors.length > 0) {
    console.error('❌ FATAL: Environment validation failed for production:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }
}

module.exports = { validateEnv };
