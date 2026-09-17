import pool from '../config/database.js'; 
import bcrypt from 'bcrypt'; 

// Default password for new employees
const DEFAULT_PASSWORD = 'welcome';

// Create a new employee (password set to default "welcome")
export const createEmployee = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            first_name,
            last_name,
            employee_code,
            email,
            phone_number,
            dob,
            gender,
            department,
            role,
            date_of_joining,
            address
        } = req.body;

        // Validate required fields
        if (!company_id || !branch_id || !first_name || !employee_code || !email || !phone_number) {
            return res.status(400).json({
                success: false,
                message: 'company_id, branch_id, first_name, employee_code, email, and phone_number are required fields'
            });
        }

        // Check for duplicate employee_code, email, or phone_number
        const duplicateCheck = await pool.query(
            `SELECT employee_id, employee_code, email, phone_number 
             FROM employees 
             WHERE employee_code = $1 OR email = $2 OR phone_number = $3`,
            [employee_code, email, phone_number]
        );

        if (duplicateCheck.rows.length > 0) {
            const duplicate = duplicateCheck.rows[0];
            let field = '';
            if (duplicate.employee_code === employee_code) field = 'employee_code';
            else if (duplicate.email === email) field = 'email';
            else if (duplicate.phone_number === phone_number) field = 'phone_number';

            return res.status(409).json({
                success: false,
                message: `Employee with this ${field} already exists`
            });
        }

        // Hash the default password
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        const query = `
            INSERT INTO employees (
                company_id, branch_id, first_name, last_name, employee_code,
                email, phone_number, dob, gender, department, role,
                date_of_joining, address, password
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING employee_id, company_id, branch_id, first_name, last_name,
                      employee_code, email, phone_number, dob, gender, department,
                      role, date_of_joining, address, created_at
        `;

        const values = [
            company_id,
            branch_id,
            first_name,
            last_name || null,
            employee_code,
            email,
            phone_number,
            dob || null,
            gender || null,
            department || null,
            role || null,
            date_of_joining || null,
            address || null,
            hashedPassword
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Employee created successfully with default password "welcome"',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Edit/Update an employee
export const updateEmployee = async (req, res) => {
    try {
        const { employee_id } = req.params;
        const {
            company_id,
            branch_id,
            first_name,
            last_name,
            employee_code,
            email,
            phone_number,
            dob,
            gender,
            department,
            role,
            date_of_joining,
            address,
            password
        } = req.body;

        // Check if employee exists
        const checkQuery = `SELECT * FROM employees WHERE employee_id = $1`;
        const checkResult = await pool.query(checkQuery, [employee_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check for duplicate employee_code, email, or phone_number (excluding current employee)
        if (employee_code || email || phone_number) {
            const duplicateCheck = await pool.query(
                `SELECT employee_id, employee_code, email, phone_number 
                 FROM employees 
                 WHERE employee_id != $1 
                 AND (employee_code = $2 OR email = $3 OR phone_number = $4)`,
                [employee_id, employee_code || null, email || null, phone_number || null]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Employee with this employee_code, email, or phone_number already exists'
                });
            }
        }

        // Build dynamic update query
        let updateFields = [];
        let values = [];
        let paramCounter = 1;

        if (company_id !== undefined) {
            updateFields.push(`company_id = $${paramCounter}`);
            values.push(company_id);
            paramCounter++;
        }
        if (branch_id !== undefined) {
            updateFields.push(`branch_id = $${paramCounter}`);
            values.push(branch_id);
            paramCounter++;
        }
        if (first_name !== undefined) {
            updateFields.push(`first_name = $${paramCounter}`);
            values.push(first_name);
            paramCounter++;
        }
        if (last_name !== undefined) {
            updateFields.push(`last_name = $${paramCounter}`);
            values.push(last_name);
            paramCounter++;
        }
        if (employee_code !== undefined) {
            updateFields.push(`employee_code = $${paramCounter}`);
            values.push(employee_code);
            paramCounter++;
        }
        if (email !== undefined) {
            updateFields.push(`email = $${paramCounter}`);
            values.push(email);
            paramCounter++;
        }
        if (phone_number !== undefined) {
            updateFields.push(`phone_number = $${paramCounter}`);
            values.push(phone_number);
            paramCounter++;
        }
        if (dob !== undefined) {
            updateFields.push(`dob = $${paramCounter}`);
            values.push(dob);
            paramCounter++;
        }
        if (gender !== undefined) {
            updateFields.push(`gender = $${paramCounter}`);
            values.push(gender);
            paramCounter++;
        }
        if (department !== undefined) {
            updateFields.push(`department = $${paramCounter}`);
            values.push(department);
            paramCounter++;
        }
        if (role !== undefined) {
            updateFields.push(`role = $${paramCounter}`);
            values.push(role);
            paramCounter++;
        }
        if (date_of_joining !== undefined) {
            updateFields.push(`date_of_joining = $${paramCounter}`);
            values.push(date_of_joining);
            paramCounter++;
        }
        if (address !== undefined) {
            updateFields.push(`address = $${paramCounter}`);
            values.push(address);
            paramCounter++;
        }
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push(`password = $${paramCounter}`);
            values.push(hashedPassword);
            paramCounter++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(employee_id);
        const query = `
            UPDATE employees 
            SET ${updateFields.join(', ')}
            WHERE employee_id = $${paramCounter}
            RETURNING employee_id, company_id, branch_id, first_name, last_name,
                      employee_code, email, phone_number, dob, gender, department,
                      role, date_of_joining, address, created_at
        `;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Display employees by company_id OR branch_id (via query params)
export const getEmployees = async (req, res) => {
    try {
        const { company_id, branch_id, department, role, gender, search } = req.query;

        // Require at least one of company_id or branch_id
        if (!company_id && !branch_id) {
            return res.status(400).json({
                success: false,
                message: 'Either company_id or branch_id is required as a query parameter'
            });
        }

        // Build query with filters
        let query = `
            SELECT 
                e.employee_id,
                e.company_id,
                e.branch_id,
                e.first_name,
                e.last_name,
                e.employee_code,
                e.email,
                e.phone_number,
                e.dob,
                e.gender,
                e.department,
                e.role,
                e.date_of_joining,
                e.address,
                e.created_at,
                c.company_name,
                b.branch_name
            FROM employees e
            LEFT JOIN companies c ON e.company_id = c.company_id
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            WHERE 1=1
        `;

        let values = [];
        let paramCounter = 1;

        // Filter by company_id (query param)
        if (company_id) {
            query += ` AND e.company_id = $${paramCounter}`;
            values.push(company_id);
            paramCounter++;
        }

        // Filter by branch_id (query param)
        if (branch_id) {
            query += ` AND e.branch_id = $${paramCounter}`;
            values.push(branch_id);
            paramCounter++;
        }

        // Optional additional filters
        if (department) {
            query += ` AND e.department = $${paramCounter}`;
            values.push(department);
            paramCounter++;
        }

        if (role) {
            query += ` AND e.role = $${paramCounter}`;
            values.push(role);
            paramCounter++;
        }

        if (gender) {
            query += ` AND e.gender = $${paramCounter}`;
            values.push(gender);
            paramCounter++;
        }

        // Search by name, email, employee_code, or phone
        if (search) {
            query += ` AND (
                e.first_name ILIKE $${paramCounter} OR
                e.last_name ILIKE $${paramCounter} OR
                e.email ILIKE $${paramCounter} OR
                e.employee_code ILIKE $${paramCounter} OR
                e.phone_number ILIKE $${paramCounter}
            )`;
            values.push(`%${search}%`);
            paramCounter++;
        }

        query += ` ORDER BY e.created_at DESC`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No employees found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully',
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get a single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { employee_id } = req.params;

        const query = `
            SELECT 
                e.employee_id,
                e.company_id,
                e.branch_id,
                e.first_name,
                e.last_name,
                e.employee_code,
                e.email,
                e.phone_number,
                e.dob,
                e.gender,
                e.department,
                e.role,
                e.date_of_joining,
                e.address,
                e.created_at,
                c.company_name,
                b.branch_name
            FROM employees e
            LEFT JOIN companies c ON e.company_id = c.company_id
            LEFT JOIN branches b ON e.branch_id = b.branch_id
            WHERE e.employee_id = $1
        `;

        const result = await pool.query(query, [employee_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete an employee (hard delete)
export const deleteEmployee = async (req, res) => {
    try {
        const { employee_id } = req.params;

        // Check if employee exists
        const checkQuery = `SELECT * FROM employees WHERE employee_id = $1`;
        const checkResult = await pool.query(checkQuery, [employee_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Hard delete
        const query = `DELETE FROM employees WHERE employee_id = $1 RETURNING *`;
        const result = await pool.query(query, [employee_id]);

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Reset employee password to default "welcome"
export const resetEmployeePassword = async (req, res) => {
    try {
        const { employee_id } = req.params;

        const checkQuery = `SELECT * FROM employees WHERE employee_id = $1`;
        const checkResult = await pool.query(checkQuery, [employee_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        const query = `
            UPDATE employees 
            SET password = $1
            WHERE employee_id = $2
            RETURNING employee_id, first_name, last_name, email
        `;

        const result = await pool.query(query, [hashedPassword, employee_id]);

        res.status(200).json({
            success: true,
            message: `Password reset to default "${DEFAULT_PASSWORD}" successfully`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error resetting employee password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Change employee password
export const changeEmployeePassword = async (req, res) => {
    try {
        const { employee_id } = req.params;
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'old_password and new_password are required'
            });
        }

        const checkQuery = `SELECT * FROM employees WHERE employee_id = $1`;
        const checkResult = await pool.query(checkQuery, [employee_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const employee = checkResult.rows[0];

        // Verify old password
        const isMatch = await bcrypt.compare(old_password, employee.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Old password is incorrect'
            });
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        await pool.query(
            `UPDATE employees SET password = $1 WHERE employee_id = $2`,
            [hashedPassword, employee_id]
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing employee password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};