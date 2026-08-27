import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is missing or malformed. Please log in.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || decodedHeader.header.alg === 'none') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Unsupported or insecure token algorithm.',
        },
      });
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    req.user = {
      userId: decoded.userId || decoded.id,
      username: decoded.username || decoded.name || 'User',
      email: decoded.email,
      role: decoded.role || 'user',
      companyCode: decoded.companyCode || decoded.company_code || 'CO-0001',
      allowedCompanies: decoded.allowedCompanies || [decoded.companyCode || 'CO-0001'],
      permissions: decoded.permissions || {},
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Your access token has expired. Please refresh your session.',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid access token provided.',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'Authentication failed.',
      },
    });
  }
};

export const isSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'super_admin' || req.user.role === 'Super Admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied: Super Admin privileges required.',
    },
  });
};

export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Action requires one of the following roles: ${roles.join(', ')}`,
      },
    });
  };
};

export default { authenticate, isSuperAdmin, requireRole };
