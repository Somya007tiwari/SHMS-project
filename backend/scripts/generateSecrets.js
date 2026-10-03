const crypto = require('crypto');

/**
 * Generate cryptographically strong random 64-byte hex strings
 * for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.
 * Prints values to stdout for manual copy-paste into .env.
 * Does NOT modify .env file.
 */
function generateSecrets() {
  const accessSecret = crypto.randomBytes(64).toString('hex');
  const refreshSecret = crypto.randomBytes(64).toString('hex');

  console.log('\n🔑 Generated Secure JWT Secrets:\n');
  console.log(`JWT_ACCESS_SECRET=${accessSecret}`);
  console.log(`JWT_REFRESH_SECRET=${refreshSecret}\n`);
  console.log('Copy and paste the above lines into your backend/.env file.\n');
}

generateSecrets();
