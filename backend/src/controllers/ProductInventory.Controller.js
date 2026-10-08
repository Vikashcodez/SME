import pool from '../config/database.js';

// 1. Get Live Finished Goods Inventory (Batches & Flat List)
export const getAllProductInventory = async (req, res) => {
    try {
        const { company_id, branch_id, product_id, status, search, view, group_by } = req.query;

        // If client requests grouped view via query param, delegate to getGroupedProductInventory
        if (view === 'grouped' || group_by === 'product') {
            return getGroupedProductInventory(req, res);
        }

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

        if (product_id && product_id !== 'all') {
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

// 2. Get Live Finished Goods Grouped by Product (Aggregates + Batches Breakdown)
export const getGroupedProductInventory = async (req, res) => {
    try {
        const { company_id, branch_id, product_id, status, search } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                p.product_id,
                p.product_code,
                p.product_name,
                p.category as product_category,
                p.unit_of_measure as product_unit,
                p.selling_price,
                p.cost_price,
                COUNT(pi.id) as batches_count,
                COALESCE(SUM(pi.quantity), 0) as total_quantity,
                COALESCE(SUM(pi.available_quantity), 0) as total_available_quantity,
                COALESCE(SUM(pi.reserved_quantity), 0) as total_reserved_quantity,
                COALESCE(SUM(pi.available_quantity * pi.unit_cost), 0) as total_inventory_cost_value,
                COALESCE(SUM(pi.available_quantity * p.selling_price), 0) as total_sales_value,
                CASE 
                    WHEN COALESCE(SUM(pi.available_quantity), 0) > 0 
                    THEN SUM(pi.available_quantity * pi.unit_cost) / SUM(pi.available_quantity)
                    ELSE COALESCE(AVG(pi.unit_cost), p.cost_price, 0)
                END as average_unit_cost,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', pi.id,
                        'batch_number', pi.batch_number,
                        'quantity', pi.quantity,
                        'available_quantity', pi.available_quantity,
                        'reserved_quantity', pi.reserved_quantity,
                        'unit_cost', pi.unit_cost,
                        'manufacturing_date', pi.manufacturing_date,
                        'expiry_date', pi.expiry_date,
                        'warehouse_location', pi.warehouse_location,
                        'status', pi.status,
                        'production_batch_id', pi.production_batch_id,
                        'total_batch_cost_value', (pi.available_quantity * pi.unit_cost),
                        'total_batch_sales_value', (pi.available_quantity * p.selling_price),
                        'created_at', pi.created_at
                    ) ORDER BY pi.manufacturing_date DESC NULLS LAST, pi.id DESC
                ) as batches
            FROM products p
            JOIN product_inventory pi ON p.product_id = pi.product_id
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

        if (product_id && product_id !== 'all') {
            query += ` AND p.product_id = $${counter}`;
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
                p.product_name ILIKE $${counter} OR
                p.product_code ILIKE $${counter} OR
                p.category ILIKE $${counter} OR
                pi.batch_number ILIKE $${counter}
            )`;
            values.push(`%${search}%`);
            counter++;
        }

        query += ` GROUP BY p.product_id, p.product_code, p.product_name, p.category, p.unit_of_measure, p.selling_price, p.cost_price
                   ORDER BY p.product_name ASC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching grouped product inventory:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch grouped product inventory',
            error: error.message
        });
    }
};

// 3. Get Product Inventory Summary & Dashboard Stats
export const getProductInventorySummary = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                COUNT(DISTINCT pi.product_id) as total_products_count,
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

// 4. Update Inventory batch (e.g. reserve stock, change location)
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
