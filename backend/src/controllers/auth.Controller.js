import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

const generateTokens = (user) => {
  const payload = {
    userId: user.user_id,
    id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
    companyCode: user.company_code || 'CO-0001',
    company_code: user.company_code || 'CO-0001',
    allowedCompanies: [user.company_code || 'CO-0001'],
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });

  return { accessToken, refreshToken, token: accessToken };
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both email and password are required for login.',
        },
      });
    }

    const userRes = await pool.query(
      'SELECT user_id, username, email, password_hash, role, company_code, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account is deactivated. Please contact your organization administrator.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const tokens = generateTokens(user);

    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          company_code: user.company_code || 'CO-0001',
          companyCode: user.company_code || 'CO-0001',
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during authentication.',
      },
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required.',
        },
      });
    }

    const decoded = jwt.verify(rawToken, config.jwt.refreshSecret);

    const userRes = await pool.query(
      'SELECT user_id, username, email, role, company_code, is_active FROM users WHERE user_id = $1',
      [decoded.userId || decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User session is no longer active.',
        },
      });
    }

    const user = userRes.rows[0];
    const tokens = generateTokens(user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          company_code: user.company_code || 'CO-0001',
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired. Please re-authenticate.',
      },
    });
  }
};

export const verifyToken = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: { user: req.user },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Token verification failed.' },
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT user_id, username, email, role, company_code, is_active, created_at FROM users WHERE user_id = $1',
      [req.user.userId || req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: userRes.rows[0] },
    });
  } catch (error) {
    logger.error({ err: error }, 'getCurrentUser error');
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve profile.' },
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password, role = 'user', company_code } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username, email, and password are required.',
        },
      });
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [
      email.trim(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'A user with this email address already exists.',
        },
      });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    const companyCode = company_code || req.companyCode || 'CO-0001';

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role, company_code, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING user_id, username, email, role, company_code, is_active, created_at
    `,
      [username.trim(), email.trim().toLowerCase(), password_hash, role, companyCode]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error({ err: error }, 'createUser error');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user.' },
    });
  }
};

export const listUsers = async (req, res) => {
  try {
    const companyCode = req.query.company_code || req.companyCode || 'CO-0001';
    const result = await pool.query(
      `
      SELECT user_id, username, email, role, company_code, is_active, created_at, updated_at
      FROM users
      WHERE company_code = $1
      ORDER BY created_at DESC
    `,
      [companyCode]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      meta: { count: result.rows.length },
    });
  } catch (error) {
    logger.error({ err: error }, 'listUsers error');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list users.' },
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Role is required.' },
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, username, email, role, company_code, is_active, updated_at
    `,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error({ err: error }, 'updateUserRole error');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update user role.' },
    });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE users
      SET is_active = false, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, username, email, role, company_code, is_active, updated_at
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error({ err: error }, 'deactivateUser error');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to deactivate user.' },
    });
  }
};

export default {
  login,
  refreshToken,
  verifyToken,
  getCurrentUser,
  logout,
  createUser,
  listUsers,
  updateUserRole,
  deactivateUser,
};
