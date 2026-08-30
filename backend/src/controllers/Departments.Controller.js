import pool from '../config/database.js';

// Create a new department
export const createDepartment = async (req, res) => {
    try {
        const { company_id, branch_id, department_name, department_description, is_active } = req.body;

        // Validate required fields
        if (!company_id || !branch_id || !department_name) {
            return res.status(400).json({
                success: false,
                message: 'company_id, branch_id, and department_name are required fields'
            });
        }

        const query = `
            INSERT INTO departments (company_id, branch_id, department_name, department_description, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            company_id,
            branch_id,
            department_name,
            department_description || null,
            is_active !== undefined ? is_active : true
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Edit/Update a department
export const updateDepartment = async (req, res) => {
    try {
        const { department_id } = req.params;
        const { company_id, branch_id, department_name, department_description, is_active } = req.body;

        // Check if department exists and is not soft deleted
        const checkQuery = `
            SELECT * FROM departments 
            WHERE department_id = $1 AND is_active = true
        `;
        const checkResult = await pool.query(checkQuery, [department_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Department not found or has been deleted'
            });
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
        if (department_name !== undefined) {
            updateFields.push(`department_name = $${paramCounter}`);
            values.push(department_name);
            paramCounter++;
        }
        if (department_description !== undefined) {
            updateFields.push(`department_description = $${paramCounter}`);
            values.push(department_description);
            paramCounter++;
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramCounter}`);
            values.push(is_active);
            paramCounter++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(department_id);
        const query = `
            UPDATE departments 
            SET ${updateFields.join(', ')}
            WHERE department_id = $${paramCounter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            message: 'Department updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Display departments by branch_id (with optional filters)
export const getDepartmentsByBranch = async (req, res) => {
    try {
        const { branch_id } = req.params;
        const { is_active, company_id, department_name } = req.query;

        // Validate branch_id
        if (!branch_id) {
            return res.status(400).json({
                success: false,
                message: 'branch_id is required'
            });
        }

        // Build query with filters
        let query = `
            SELECT 
                d.department_id,
                d.company_id,
                d.branch_id,
                d.department_name,
                d.department_description,
                d.is_active,
                d.created_at,
                c.company_name,
                b.branch_name
            FROM departments d
            LEFT JOIN companies c ON d.company_id = c.company_id
            LEFT JOIN branches b ON d.branch_id = b.branch_id
            WHERE d.branch_id = $1
        `;

        let values = [branch_id];
        let paramCounter = 2;

        // Apply filters
        if (is_active !== undefined) {
            query += ` AND d.is_active = $${paramCounter}`;
            values.push(is_active === 'true' || is_active === true);
            paramCounter++;
        }

        if (company_id) {
            query += ` AND d.company_id = $${paramCounter}`;
            values.push(company_id);
            paramCounter++;
        }

        if (department_name) {
            query += ` AND d.department_name ILIKE $${paramCounter}`;
            values.push(`%${department_name}%`);
            paramCounter++;
        }

        // Order by created_at descending
        query += ` ORDER BY d.created_at DESC`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No departments found for this branch'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Departments retrieved successfully',
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get a single department by ID
export const getDepartmentById = async (req, res) => {
    try {
        const { department_id } = req.params;

        const query = `
            SELECT 
                d.department_id,
                d.company_id,
                d.branch_id,
                d.department_name,
                d.department_description,
                d.is_active,
                d.created_at,
                c.company_name,
                b.branch_name
            FROM departments d
            LEFT JOIN companies c ON d.company_id = c.company_id
            LEFT JOIN branches b ON d.branch_id = b.branch_id
            WHERE d.department_id = $1 AND d.is_active = true
        `;

        const result = await pool.query(query, [department_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Department not found or has been deleted'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Soft delete a department (set is_active to false)
export const softDeleteDepartment = async (req, res) => {
    try {
        const { department_id } = req.params;

        // Check if department exists and is currently active
        const checkQuery = `
            SELECT * FROM departments 
            WHERE department_id = $1 AND is_active = true
        `;
        const checkResult = await pool.query(checkQuery, [department_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Department not found or already deleted'
            });
        }

        // Soft delete - set is_active to false
        const query = `
            UPDATE departments 
            SET is_active = false
            WHERE department_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [department_id]);

        res.status(200).json({
            success: true,
            message: 'Department soft deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error soft deleting department:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Restore a soft deleted department
export const restoreDepartment = async (req, res) => {
    try {
        const { department_id } = req.params;

        // Check if department exists and is inactive
        const checkQuery = `
            SELECT * FROM departments 
            WHERE department_id = $1 AND is_active = false
        `;
        const checkResult = await pool.query(checkQuery, [department_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Department not found or already active'
            });
        }

        // Restore department - set is_active to true
        const query = `
            UPDATE departments 
            SET is_active = true
            WHERE department_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [department_id]);

        res.status(200).json({
            success: true,
            message: 'Department restored successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restoring department:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get departments with employee count (additional useful function)
export const getDepartmentsWithEmployeeCount = async (req, res) => {
    try {
        const { branch_id } = req.params;
        const { is_active } = req.query;

        if (!branch_id) {
            return res.status(400).json({
                success: false,
                message: 'branch_id is required'
            });
        }

        let query = `
            SELECT 
                d.department_id,
                d.department_name,
                d.department_description,
                d.is_active,
                d.created_at,
                COUNT(e.employee_id) as employee_count
            FROM departments d
            LEFT JOIN employees e ON d.department_id = e.department_id AND e.is_active = true
            WHERE d.branch_id = $1
        `;

        let values = [branch_id];
        let paramCounter = 2;

        if (is_active !== undefined) {
            query += ` AND d.is_active = $${paramCounter}`;
            values.push(is_active === 'true' || is_active === true);
            paramCounter++;
        }

        query += ` GROUP BY d.department_id, d.department_name, d.department_description, d.is_active, d.created_at
                   ORDER BY d.created_at DESC`;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching departments with employee count:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Bulk soft delete departments
export const bulkSoftDeleteDepartments = async (req, res) => {
    try {
        const { department_ids } = req.body;

        if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'department_ids array is required'
            });
        }

        const query = `
            UPDATE departments 
            SET is_active = false
            WHERE department_id = ANY($1::bigint[]) 
            AND is_active = true
            RETURNING *
        `;

        const result = await pool.query(query, [department_ids]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active departments found to delete'
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.rows.length} department(s) soft deleted successfully`,
            data: result.rows
        });
    } catch (error) {
        console.error('Error bulk soft deleting departments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};