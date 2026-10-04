import pool from '../config/database.js';

// 1. Get Live Finished Goods Inventory (Batches & Aggregates)
export const getAllProductInventory = async (req, res) => {
    try {
        const { company_id, branch_id, product_id, status, search } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                pi.*,
                p.product_code,
                p.product_name,
                p.category as product_category,
                p.unit_of_measure as product_unit,
                p.selling_price,
                (pi.available_quantity * pi.unit_cost) as total_batch_cost_value,
                (pi.available_quantity * p.selling_price) as total_batch_sales_value,
                pb.production_date,
                po.production_number,
                c.company_name,
                b.branch_name
            FROM product_inventory pi
            JOIN products p ON pi.product_id = p.product_id
            LEFT JOIN production_batches pb ON pi.production_batch_id = pb.id
            LEFT JOIN production_orders po ON pb.production_order_id = po.id
            LEFT JOIN companies c ON pi.company_id = c.company_id
            LEFT JOIN branches b ON pi.branch_id = b.branch_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND pi.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pi.branch_id = $${counter} OR pi.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (product_id) {
            query += ` AND pi.product_id = $${counter}`;
            values.push(product_id);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND pi.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (search) {
            query += ` AND (
                pi.batch_number ILIKE $${counter} OR
                p.product_name ILIKE $${counter} OR
                p.product_code ILIKE $${counter}
            )`;
            values.push(`%${search}%`);
            counter++;
        }

        query += ` ORDER BY pi.id DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching product inventory:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch product inventory',
            error: error.message
        });
    }
};

// 2. Get Product Inventory Summary & Dashboard Stats
export const getProductInventorySummary = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                COUNT(pi.id) as total_batches_count,
                COALESCE(SUM(pi.quantity), 0) as total_produced_units,
                COALESCE(SUM(pi.available_quantity), 0) as total_available_units,
                COALESCE(SUM(pi.reserved_quantity), 0) as total_reserved_units,
                COALESCE(SUM(pi.available_quantity * pi.unit_cost), 0) as total_inventory_valuation,
                COALESCE(SUM(pi.available_quantity * p.selling_price), 0) as total_market_value
            FROM product_inventory pi
            JOIN products p ON pi.product_id = p.product_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND pi.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pi.branch_id = $${counter} OR pi.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        const result = await pool.query(query, values);
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching inventory summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory summary',
            error: error.message
        });
    }
};

// 3. Update Inventory batch (e.g. reserve stock, change location)
export const updateProductInventoryBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { warehouse_location, reserved_quantity, status } = req.body;

        const updateRes = await pool.query(`
            UPDATE product_inventory SET
                warehouse_location = COALESCE($1, warehouse_location),
                reserved_quantity = COALESCE($2, reserved_quantity),
                status = COALESCE($3, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [warehouse_location, reserved_quantity, status, id]);

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Batch not found in product inventory' });
        }

        return res.status(200).json({
            success: true,
            message: 'Product inventory batch updated successfully',
            data: updateRes.rows[0]
        });

    } catch (error) {
        console.error('Error updating product inventory batch:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update product inventory batch',
            error: error.message
        });
    }
};
