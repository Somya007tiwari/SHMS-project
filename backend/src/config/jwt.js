module.exports = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'shms_access_secret_dev',
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'shms_refresh_secret_dev',
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  },
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};
