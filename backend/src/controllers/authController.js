const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { sendSuccess, sendError, sendCreated } = require('../utils/responseHandler');
const { generateToken } = require('../utils/helpers');
const jwtConfig = require('../config/jwt');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');

const authController = {
  async register(req, res) {
    const { email, password, firstName, lastName, phone, role = 'patient' } = req.body;

    // Only admin can create doctor accounts via this route
    if (role === 'doctor' && (!req.user || req.user.role !== 'admin')) {
      return sendError(res, 'Doctor accounts must be created by an administrator', 403);
    }
    if (role === 'admin') {
      return sendError(res, 'Admin accounts cannot be registered via this route', 403);
    }

    const existing = await User.findByEmail(email);
    if (existing) return sendError(res, 'Email address already registered', 409);

    const user = await User.create({ email, password, role, firstName, lastName, phone });

    // Create profile record
    if (role === 'patient') {
      await Patient.create(user.id);
    }

    // Generate tokens
    const fullUser = await User.findById(user.id);
    const accessToken = User.generateAccessToken(fullUser);
    const refreshToken = User.generateRefreshToken(user.id);
    await User.saveRefreshToken(user.id, refreshToken);

    // Send welcome email (non-blocking)
    emailService.sendWelcome({ email, name: `${firstName} ${lastName}`, role });

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, jwtConfig.cookieOptions);

    await auditService.log(req, 'register', 'user', user.id, `New ${role} registered: ${email}`);

    return sendCreated(res, {
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.first_name, lastName: user.last_name
      },
      accessToken
    }, 'Registration successful');
  },

  async login(req, res) {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const user = await User.findByEmail(email);
    if (!user) {
      await User.recordLoginAttempt(null, email, ip, userAgent, false, 'Invalid credentials');
      return sendError(res, 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      await User.recordLoginAttempt(user.id, email, ip, userAgent, false, 'Account deactivated');
      return sendError(res, 'Account has been deactivated. Please contact support.', 401);
    }

    // Account Lockout check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockMinutes = process.env.LOGIN_LOCK_MINUTES || 15;
      await User.recordLoginAttempt(user.id, email, ip, userAgent, false, 'Account locked');
      return sendError(
        res,
        `Account is temporarily locked due to consecutive failed login attempts. Please try again after ${lockMinutes} minutes.`,
        401
      );
    }

    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await User.handleFailedLogin(user, email, ip, userAgent);
      return sendError(res, 'Invalid email or password', 401);
    }

    // Success login
    await User.handleSuccessfulLogin(user.id, email, ip, userAgent);

    const accessToken = User.generateAccessToken(user);
    const refreshToken = User.generateRefreshToken(user.id);
    await User.saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, jwtConfig.cookieOptions);

    await auditService.log(req, 'login', 'user', user.id, `User logged in: ${email}`);

    return sendSuccess(res, {
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.first_name, lastName: user.last_name,
        profileImage: user.profile_image_url,
        patientId: user.patient_id,
        doctorId: user.doctor_id
      },
      accessToken
    }, 'Login successful');
  },

  async refreshToken(req, res) {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return sendError(res, 'Refresh token required', 401);

    try {
      const decoded = jwt.verify(token, jwtConfig.refresh.secret);
      const user = await User.findById(decoded.userId);

      if (!user || user.refresh_token !== token) {
        return sendError(res, 'Invalid refresh token', 401);
      }

      const accessToken = User.generateAccessToken(user);
      const newRefreshToken = User.generateRefreshToken(user.id);
      await User.saveRefreshToken(user.id, newRefreshToken);

      res.cookie('refreshToken', newRefreshToken, jwtConfig.cookieOptions);
      return sendSuccess(res, { accessToken }, 'Token refreshed');
    } catch {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }
  },

  async logout(req, res) {
    await User.clearRefreshToken(req.user.userId);
    res.clearCookie('refreshToken');
    await auditService.log(req, 'logout', 'user', req.user.userId, 'User logged out');
    return sendSuccess(res, null, 'Logged out successfully');
  },

  async forgotPassword(req, res) {
    const { email } = req.body;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const user = await User.setPasswordResetToken(email, token, expiresAt);

    // Always return success to prevent email enumeration
    if (user) {
      const fullUser = await User.findById(user.id);
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await emailService.sendPasswordReset({
        email,
        name: `${fullUser.first_name} ${fullUser.last_name}`,
        resetUrl
      });
    }

    return sendSuccess(res, null, 'If the email exists, a password reset link has been sent');
  },

  async resetPassword(req, res) {
    const { token, password } = req.body;

    const user = await User.findByResetToken(token);
    if (!user) return sendError(res, 'Invalid or expired reset token', 400);

    await User.updatePassword(user.id, password);
    await auditService.log(req, 'update', 'user', user.id, 'Password reset successfully');

    return sendSuccess(res, null, 'Password reset successfully. Please login with your new password.');
  },

  async getProfile(req, res) {
    const user = await User.findById(req.user.userId);
    if (!user) return sendError(res, 'User not found', 404);

    const profile = {
      id: user.id, email: user.email, role: user.role,
      firstName: user.first_name, lastName: user.last_name,
      phone: user.phone, profileImage: user.profile_image_url,
      isEmailVerified: user.is_email_verified,
      lastLogin: user.last_login, createdAt: user.created_at,
      patientId: user.patient_id, doctorId: user.doctor_id
    };

    return sendSuccess(res, profile);
  },

  async updateProfile(req, res) {
    const { firstName, lastName, phone } = req.body;
    const updates = { firstName, lastName, phone };

    if (req.uploadedFile) {
      updates.profileImageUrl = req.uploadedFile.url;
      updates.profileImagePublicId = req.uploadedFile.publicId;
    }

    const updated = await User.update(req.user.userId, updates);
    await auditService.log(req, 'update', 'user', req.user.userId, 'Profile updated');

    return sendSuccess(res, updated, 'Profile updated successfully');
  },

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByEmail(req.user.email);
    const isValid = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) return sendError(res, 'Current password is incorrect', 400);

    await User.updatePassword(req.user.userId, newPassword);
    await auditService.log(req, 'update', 'user', req.user.userId, 'Password changed');

    return sendSuccess(res, null, 'Password changed successfully');
  }
};

module.exports = authController;
