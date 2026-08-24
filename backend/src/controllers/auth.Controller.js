import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { config } from '../config/env.js';

// Super admin credentials from .env
const SUPER_ADMIN = {
    email: config.superAdmin.email,
    password: config.superAdmin.password,
    role: config.superAdmin.role
};

// Login function - Handles both Super Admin and Company Admin
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if it's super admin first
        if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
            const token = jwt.sign(
                { 
                    email: SUPER_ADMIN.email,
                    role: SUPER_ADMIN.role,
                    is_super_admin: true
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
                        role: SUPER_ADMIN.role,
                        is_super_admin: true
                    }
                }
            });
        }

        // Check if it's a company admin (employee)
        const employeeResult = await pool.query(
            `SELECT 
                e.employee_id,
                e.company_id,
                e.first_name,
                e.last_name,
                e.email,
                e.phone_number,
                e.password,
                e.is_company_admin,
                e.role,
                e.department,
                e.dob,
                e.gender,
                e.date_of_joining,
                e.address,
                c.company_name,
                c.company_code,
                c.logo_url
             FROM employees e
             LEFT JOIN companies c ON e.company_id = c.company_id
             WHERE e.email = $1`,
            [email]
        );

        const employee = employeeResult.rows[0];

        if (employee) {
            // Check if employee is active
            // if (employee.is_active === false) {
            //     return res.status(401).json({
            //         success: false,
            //         message: 'Your account is deactivated. Please contact admin.'
            //     });
            // }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, employee.password);
            
            if (isPasswordValid) {
                // Generate token with all employee data
                const token = jwt.sign(
                    {
                        employee_id: employee.employee_id,
                        company_id: employee.company_id,
                        email: employee.email,
                        first_name: employee.first_name,
                        last_name: employee.last_name,
                        role: employee.role || 'employee',
                        is_company_admin: employee.is_company_admin,
                        company_name: employee.company_name,
                        company_code: employee.company_code,
                        phone_number: employee.phone_number,
                        department: employee.department
                    },
                    config.jwt.secret,
                    { expiresIn: config.jwt.expire }
                );

                // Remove password from response
                delete employee.password;

                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        token,
                        user: {
                            employee_id: employee.employee_id,
                            company_id: employee.company_id,
                            email: employee.email,
                            first_name: employee.first_name,
                            last_name: employee.last_name,
                            role: employee.role || 'employee',
                            is_company_admin: employee.is_company_admin,
                            company_name: employee.company_name,
                            company_code: employee.company_code,
                            logo_url: employee.logo_url,
                            phone_number: employee.phone_number,
                            department: employee.department,
                            dob: employee.dob,
                            gender: employee.gender,
                            date_of_joining: employee.date_of_joining,
                            address: employee.address
                        }
                    }
                });
            }
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