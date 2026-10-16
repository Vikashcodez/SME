import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please login first.'
            });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

export const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super admin only.'
        });
    }
};

export const enforceTenantScope = (req, res, next) => {
    const user = req.user;

    if (user?.is_super_admin) {
        return next();
    }

    const requestedCompanyId = req.body?.company_id || req.query?.company_id;
    const requestedBranchId = req.body?.branch_id || req.query?.branch_id;

    if (requestedCompanyId && String(requestedCompanyId) !== String(user?.company_id)) {
        return res.status(403).json({
            success: false,
            message: 'You cannot access another company.'
        });
    }

    if (requestedBranchId && user?.branch_id && String(requestedBranchId) !== String(user.branch_id)) {
        return res.status(403).json({
            success: false,
            message: 'You cannot access another branch.'
        });
    }

    req.scopeCompanyId = user?.company_id || null;
    req.scopeBranchId = user?.branch_id || null;

    // Branch users are never allowed to omit or override their branch scope.
    if (user?.branch_id) {
        req.query.company_id = user.company_id;
        req.query.branch_id = user.branch_id;
        if (req.body && typeof req.body === 'object') {
            req.body.company_id = user.company_id;
            req.body.branch_id = user.branch_id;
        }
    }
    next();
};