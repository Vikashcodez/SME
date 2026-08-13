import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Super admin credentials from .env
const SUPER_ADMIN = {
    email: config.superAdmin.email,
    password: config.superAdmin.password,
    role: config.superAdmin.role
};

// Login controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if it's super admin
        if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
            // Generate JWT token with role
            const token = jwt.sign(
                { 
                    email: SUPER_ADMIN.email,
                    role: SUPER_ADMIN.role  // role is super_admin
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expire }
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        email: SUPER_ADMIN.email,
                        role: SUPER_ADMIN.role
                    }
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Verify token
export const verifyToken = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: { user: req.user }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: { user: req.user }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};