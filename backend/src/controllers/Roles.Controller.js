import pool from '../config/database.js'; 

// Create a new role
export const createRole = async (req, res) => {
    try {
        const { company_id, branch_id, role_name, role_description, is_active } = req.body;

        // Validate required fields
        if (!company_id || !branch_id || !role_name) {
            return res.status(400).json({
                success: false,
                message: 'company_id, branch_id, and role_name are required fields'
            });
        }

        const query = `
            INSERT INTO roles (company_id, branch_id, role_name, role_description, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            company_id,
            branch_id,
            role_name,
            role_description || null,
            is_active !== undefined ? is_active : true
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Edit/Update a role
export const updateRole = async (req, res) => {
    try {
        const { role_id } = req.params;
        const { company_id, branch_id, role_name, role_description, is_active } = req.body;

        // Check if role exists and is not soft deleted
        const checkQuery = `
            SELECT * FROM roles 
            WHERE role_id = $1 AND is_active = true
        `;
        const checkResult = await pool.query(checkQuery, [role_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found or has been deleted'
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
        if (role_name !== undefined) {
            updateFields.push(`role_name = $${paramCounter}`);
            values.push(role_name);
            paramCounter++;
        }
        if (role_description !== undefined) {
            updateFields.push(`role_description = $${paramCounter}`);
            values.push(role_description);
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

        values.push(role_id);
        const query = `
            UPDATE roles 
            SET ${updateFields.join(', ')}
            WHERE role_id = $${paramCounter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Display roles by branch_id (with optional filters)
export const getRolesByBranch = async (req, res) => {
    try {
        const { branch_id } = req.params;
        const { is_active, company_id, role_name } = req.query;

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
                r.role_id,
                r.company_id,
                r.branch_id,
                r.role_name,
                r.role_description,
                r.is_active,
                r.created_at,
                c.company_name,
                b.branch_name
            FROM roles r
            LEFT JOIN companies c ON r.company_id = c.company_id
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            WHERE r.branch_id = $1
        `;

        let values = [branch_id];
        let paramCounter = 2;

        // Apply filters
        if (is_active !== undefined) {
            query += ` AND r.is_active = $${paramCounter}`;
            values.push(is_active === 'true' || is_active === true);
            paramCounter++;
        }

        if (company_id) {
            query += ` AND r.company_id = $${paramCounter}`;
            values.push(company_id);
            paramCounter++;
        }

        if (role_name) {
            query += ` AND r.role_name ILIKE $${paramCounter}`;
            values.push(`%${role_name}%`);
            paramCounter++;
        }

        // Order by created_at descending
        query += ` ORDER BY r.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: result.rows.length === 0 ? 'No roles found for this branch' : 'Roles retrieved successfully',
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get a single role by ID
export const getRoleById = async (req, res) => {
    try {
        const { role_id } = req.params;

        const query = `
            SELECT 
                r.role_id,
                r.company_id,
                r.branch_id,
                r.role_name,
                r.role_description,
                r.is_active,
                r.created_at,
                c.company_name,
                b.branch_name
            FROM roles r
            LEFT JOIN companies c ON r.company_id = c.company_id
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            WHERE r.role_id = $1 AND r.is_active = true
        `;

        const result = await pool.query(query, [role_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found or has been deleted'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Soft delete a role (set is_active to false)
export const softDeleteRole = async (req, res) => {
    try {
        const { role_id } = req.params;

        // Check if role exists and is currently active
        const checkQuery = `
            SELECT * FROM roles 
            WHERE role_id = $1 AND is_active = true
        `;
        const checkResult = await pool.query(checkQuery, [role_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found or already deleted'
            });
        }

        // Soft delete - set is_active to false
        const query = `
            UPDATE roles 
            SET is_active = false
            WHERE role_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [role_id]);

        res.status(200).json({
            success: true,
            message: 'Role soft deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error soft deleting role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Restore a soft deleted role
export const restoreRole = async (req, res) => {
    try {
        const { role_id } = req.params;

        // Check if role exists and is inactive
        const checkQuery = `
            SELECT * FROM roles 
            WHERE role_id = $1 AND is_active = false
        `;
        const checkResult = await pool.query(checkQuery, [role_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found or already active'
            });
        }

        // Restore role - set is_active to true
        const query = `
            UPDATE roles 
            SET is_active = true
            WHERE role_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [role_id]);

        res.status(200).json({
            success: true,
            message: 'Role restored successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restoring role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};