import pool from '../config/database.js';

// ==========================================
// RAW MATERIAL CATEGORIES
// ==========================================

export const getRawMaterialCategories = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT rmc.*, 
                   COUNT(rm.material_id) as material_count
            FROM raw_material_categories rmc
            LEFT JOIN raw_materials rm ON rmc.id = rm.category_id
            WHERE 1=1
        `;
        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND (rmc.company_id = $${counter} OR rmc.company_id IS NULL)`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (rmc.branch_id = $${counter} OR rmc.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        query += ` GROUP BY rmc.id ORDER BY rmc.name ASC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching raw material categories:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch raw material categories', error: error.message });
    }
};

export const createRawMaterialCategory = async (req, res) => {
    try {
        const { company_id, branch_id, name, description, status = true } = req.body;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const query = `
            INSERT INTO raw_material_categories (company_id, branch_id, name, description, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [
            effectiveCompanyId,
            effectiveBranchId,
            name.trim(),
            description || null,
            status
        ]);

        return res.status(201).json({ success: true, message: 'Raw material category created', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating raw material category:', error);
        return res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
    }
};

export const updateRawMaterialCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        const result = await pool.query(`
            UPDATE raw_material_categories SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [name, description, status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category updated', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating raw material category:', error);
        return res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
    }
};

export const deleteRawMaterialCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`UPDATE raw_materials SET category_id = NULL WHERE category_id = $1`, [id]);
        const result = await pool.query(`DELETE FROM raw_material_categories WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        return res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
    }
};

// ==========================================
// PRODUCT CATEGORIES
// ==========================================

export const getProductCategories = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT pc.*, 
                   COUNT(p.product_id) as product_count
            FROM product_categories pc
            LEFT JOIN products p ON pc.id = p.category_id
            WHERE 1=1
        `;
        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND (pc.company_id = $${counter} OR pc.company_id IS NULL)`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pc.branch_id = $${counter} OR pc.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        query += ` GROUP BY pc.id ORDER BY pc.name ASC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching product categories:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch product categories', error: error.message });
    }
};

export const createProductCategory = async (req, res) => {
    try {
        const { company_id, branch_id, name, description, status = true } = req.body;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const query = `
            INSERT INTO product_categories (company_id, branch_id, name, description, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [
            effectiveCompanyId,
            effectiveBranchId,
            name.trim(),
            description || null,
            status
        ]);

        return res.status(201).json({ success: true, message: 'Product category created', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating product category:', error);
        return res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
    }
};

export const updateProductCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        const result = await pool.query(`
            UPDATE product_categories SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [name, description, status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category updated', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating product category:', error);
        return res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
    }
};

export const deleteProductCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`UPDATE products SET category_id = NULL WHERE category_id = $1`, [id]);
        const result = await pool.query(`DELETE FROM product_categories WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        return res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting product category:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
    }
};
