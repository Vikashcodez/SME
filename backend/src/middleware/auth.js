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