import pool from '../config/database.js';
import bcrypt from 'bcrypt';

export const createBranch = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            company_id,
            branch_name,
            branch_code,
            address,
            phone_number,
            email_id,
            password
        } = req.body;

        // Validate required fields
        if (!company_id || !branch_name || !branch_code || !phone_number || !email_id || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: company_id, branch_name, branch_code, phone_number, email_id, password'
            });
        }

        // Start transaction
        await client.query('BEGIN');

        // 1. Insert branch
        const branchQuery = `
            INSERT INTO branches (
                company_id,
                branch_name,
                branch_code,
                address,
                phone_number,
                email_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const branchValues = [company_id, branch_name, branch_code, address, phone_number, email_id];
        const branchResult = await client.query(branchQuery, branchValues);
        const newBranch = branchResult.rows[0];

        // 2. Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Create employee (branch admin)
        const employeeQuery = `
            INSERT INTO employees (
                company_id,
                branch_id,
                first_name,
                last_name,
                employee_code,
                email,
                phone_number,
                department,
                role,
                date_of_joining,
                address,
                password,
                is_company_admin,
                is_baranch_admin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const employeeCode = `EMP-${newBranch.branch_code}-001`;
        
        const employeeValues = [
            company_id,
            newBranch.branch_id,
            branch_name, // first_name = branch_name
            'Admin', // last_name = 'Admin'
            employeeCode,
            email_id, // email = branch email
            phone_number, // phone = branch phone
            'Administration',
            'Branch Admin',
            new Date(),
            address,
            hashedPassword,
            false,
            true // is_baranch_admin = true
        ];

        const employeeResult = await client.query(employeeQuery, employeeValues);

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Branch and Branch Admin created successfully',
            data: {
                branch: newBranch,
                employee: employeeResult.rows[0]
            }
        });

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Branch or employee with this unique field already exists',
                error: error.detail
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating branch and employee',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// Get all branches (company_id is optional here for general listing)
export const getBranches = async (req, res) => {
    try {
        const { company_id } = req.query;

        let query = `
            SELECT 
                b.*,
                c.company_name
            FROM branches b
            LEFT JOIN companies c ON b.company_id = c.company_id
        `;
        
        const values = [];
        
        // Optional filter by company_id
        if (company_id) {
            query += ` WHERE b.company_id = $1`;
            values.push(company_id);
        }
        
        query += ` ORDER BY b.created_at DESC`;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching branches',
            error: error.message
        });
    }
};

// Get single branch by ID
export const getBranchById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                b.*,
                c.company_name
            FROM branches b
            LEFT JOIN companies c ON b.company_id = c.company_id
            WHERE b.branch_id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching branch',
            error: error.message
        });
    }
};

// Update branch by ID
export const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            company_id,
            branch_name,
            branch_code,
            address,
            phone_number,
            email_id
        } = req.body;

        // Check if branch exists
        const checkQuery = 'SELECT * FROM branches WHERE branch_id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCounter = 1;

        if (company_id !== undefined) {
            updates.push(`company_id = $${paramCounter}`);
            values.push(company_id);
            paramCounter++;
        }
        if (branch_name !== undefined) {
            updates.push(`branch_name = $${paramCounter}`);
            values.push(branch_name);
            paramCounter++;
        }
        if (branch_code !== undefined) {
            updates.push(`branch_code = $${paramCounter}`);
            values.push(branch_code);
            paramCounter++;
        }
        if (address !== undefined) {
            updates.push(`address = $${paramCounter}`);
            values.push(address);
            paramCounter++;
        }
        if (phone_number !== undefined) {
            updates.push(`phone_number = $${paramCounter}`);
            values.push(phone_number);
            paramCounter++;
        }
        if (email_id !== undefined) {
            updates.push(`email_id = $${paramCounter}`);
            values.push(email_id);
            paramCounter++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields provided for update'
            });
        }

        values.push(id);
        const query = `
            UPDATE branches 
            SET ${updates.join(', ')} 
            WHERE branch_id = $${paramCounter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            message: 'Branch updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Branch with this branch_code, phone_number, or email_id already exists',
                error: error.detail
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating branch',
            error: error.message
        });
    }
};

// Delete branch by ID
export const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if branch exists
        const checkQuery = 'SELECT * FROM branches WHERE branch_id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        const query = 'DELETE FROM branches WHERE branch_id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        res.status(200).json({
            success: true,
            message: 'Branch deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting branch',
            error: error.message
        });
    }
};

// DISPLAY FUNCTION: Get branches by company ID - company_id is REQUIRED
export const getBranchesByCompany = async (req, res) => {
    try {
        const { company_id } = req.query;

        // COMPANY_ID IS REQUIRED - Validation
        if (!company_id) {
            return res.status(400).json({
                success: false,
                message: 'company_id is required as a query parameter'
            });
        }

        // Validate company_id is a number
        if (isNaN(company_id)) {
            return res.status(400).json({
                success: false,
                message: 'company_id must be a valid number'
            });
        }

        const query = `
            SELECT 
                branch_id,
                branch_name,
                branch_code,
                address,
                phone_number,
                email_id,
                created_at
            FROM branches
            WHERE company_id = $1
            ORDER BY branch_name ASC
        `;

        const result = await pool.query(query, [company_id]);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            company_id: parseInt(company_id),
            data: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching branches by company',
            error: error.message
        });
    }
};