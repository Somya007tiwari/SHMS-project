const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

class User {
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query(
      `SELECT u.*, 
        CASE WHEN u.role = 'patient' THEN p.id ELSE NULL END as patient_id,
        CASE WHEN u.role = 'doctor' THEN d.id ELSE NULL END as doctor_id
       FROM users u
       LEFT JOIN patients p ON u.id = p.user_id AND u.role = 'patient'
       LEFT JOIN doctors d ON u.id = d.user_id AND u.role = 'doctor'
       WHERE u.id = $1 AND u.is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create({ email, password, role, firstName, lastName, phone }) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, first_name, last_name, phone, created_at`,
      [email.toLowerCase(), passwordHash, role, firstName, lastName, phone]
    );
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = {
      first_name: updates.firstName,
      last_name: updates.lastName,
      phone: updates.phone,
      profile_image_url: updates.profileImageUrl,
      profile_image_public_id: updates.profileImagePublicId
    };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, role, first_name, last_name, phone, profile_image_url, updated_at`,
      values
    );
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, id]
    );
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patient_id || null,
        doctorId: user.doctor_id || null
      },
      jwtConfig.access.secret,
      { expiresIn: jwtConfig.access.expiresIn }
    );
  }

  static generateRefreshToken(userId) {
    return jwt.sign({ userId }, jwtConfig.refresh.secret, {
      expiresIn: jwtConfig.refresh.expiresIn
    });
  }

  static async saveRefreshToken(userId, token) {
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [token, userId]);
  }

  static async clearRefreshToken(userId) {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
  }

  static async updateLastLogin(userId) {
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
  }

  static async setPasswordResetToken(email, token, expiresAt) {
    const result = await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
       WHERE email = $3 AND is_active = true RETURNING id`,
      [token, expiresAt, email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  static async findByResetToken(token) {
    const result = await query(
      `SELECT * FROM users WHERE password_reset_token = $1 
       AND password_reset_expires > NOW() AND is_active = true`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async getAll({ page = 1, limit = 10, role, search }) {
    let whereClause = 'WHERE u.is_active = true';
    const params = [];
    let paramCount = 1;

    if (role) {
      whereClause += ` AND u.role = $${paramCount++}`;
      params.push(role);
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, 
              u.is_active, u.last_login, u.created_at
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { users: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async recordLoginAttempt(userId, email, ip, userAgent, success, reason = null) {
    try {
      await query(
        `INSERT INTO login_history (user_id, email, ip_address, user_agent, success, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, email, ip, userAgent, success, reason]
      );
    } catch (err) {
      // Graceful degradation if migration table does not exist yet
    }
  }

  static async handleFailedLogin(user, email, ip, userAgent) {
    try {
      const maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5;
      const lockMinutes = parseInt(process.env.LOGIN_LOCK_MINUTES) || 15;
      const newAttempts = (user.failed_login_attempts || 0) + 1;

      if (newAttempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        await query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, lockUntil, user.id]
        );
      } else {
        await query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [newAttempts, user.id]
        );
      }
    } catch (err) {
      // Graceful degradation
    }
    await this.recordLoginAttempt(user ? user.id : null, email, ip, userAgent, false, 'Invalid credentials');
  }

  static async handleSuccessfulLogin(userId, email, ip, userAgent) {
    try {
      await query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
        [userId]
      );
    } catch (err) {
      // Graceful degradation
    }
    await this.recordLoginAttempt(userId, email, ip, userAgent, true, null);
  }

  static async unlockUser(userId) {
    try {
      await query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [userId]
      );
      return true;
    } catch (err) {
      return false;
    }
  }
}

module.exports = User;
