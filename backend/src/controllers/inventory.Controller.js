import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getProducts = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { category, itemType, search, lowStock } = req.query;

        let query = `
            SELECT p.*, c.category_name
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.company_code = $1 AND p.is_active = true
        `;
        const params = [companyCode];
        let idx = 2;

        if (category) {
            query += ` AND c.category_name ILIKE $${idx}`;
            params.push(`%${category}%`);
            idx++;
        }
        if (itemType) {
            query += ` AND p.item_type = $${idx}`;
            params.push(itemType);
            idx++;
        }
        if (lowStock === 'true') {
            query += ` AND p.current_stock <= p.reorder_level`;
        }
        if (search) {
            query += ` AND (p.product_name ILIKE $${idx} OR p.product_code ILIKE $${idx} OR p.hsn_code ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY p.product_name ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getProducts error');
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, c.category_name
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.product_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'getProductById error');
        res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
};

export const createProduct = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            product_code, product_name, item_type = 'Finished Goods', category_id,
            uom_code = 'PCS', hsn_code = '8483', gst_rate = 18.00,
            cost_price = 0, selling_price = 0, reorder_level = 50,
            reorder_quantity = 100, current_stock = 0
        } = req.body;

        if (!product_name) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        let pCode = product_code;
        if (!pCode) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM products WHERE company_code = $1`, [companyCode]);
            pCode = `PRD-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO products (
                company_code, product_code, product_name, item_type, category_id,
                uom_code, hsn_code, gst_rate, cost_price, selling_price,
                reorder_level, reorder_quantity, current_stock
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            companyCode, pCode, product_name, item_type, category_id || null,
            uom_code, hsn_code, gst_rate, cost_price, selling_price,
            reorder_level, reorder_quantity, current_stock
        ]);

        res.status(201).json({ success: true, message: 'Product created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createProduct error');
        res.status(500).json({ success: false, message: 'Failed to create product', error: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            product_name, item_type, category_id, uom_code, hsn_code,
            gst_rate, cost_price, selling_price, reorder_level,
            reorder_quantity, current_stock, is_active
        } = req.body;

        const result = await pool.query(`
            UPDATE products
            SET product_name = COALESCE($1, product_name),
                item_type = COALESCE($2, item_type),
                category_id = COALESCE($3, category_id),
                uom_code = COALESCE($4, uom_code),
                hsn_code = COALESCE($5, hsn_code),
                gst_rate = COALESCE($6, gst_rate),
                cost_price = COALESCE($7, cost_price),
                selling_price = COALESCE($8, selling_price),
                reorder_level = COALESCE($9, reorder_level),
                reorder_quantity = COALESCE($10, reorder_quantity),
                current_stock = COALESCE($11, current_stock),
                is_active = COALESCE($12, is_active),
                updated_at = NOW()
            WHERE product_id = $13
            RETURNING *
        `, [
            product_name, item_type, category_id, uom_code, hsn_code,
            gst_rate, cost_price, selling_price, reorder_level,
            reorder_quantity, current_stock, is_active, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, message: 'Product updated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateProduct error');
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            UPDATE products SET is_active = false, updated_at = NOW() WHERE product_id = $1 RETURNING product_id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, message: 'Product deactivated successfully' });
    } catch (error) {
        logger.error({ err: error }, 'deleteProduct error');
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

export const getWarehouses = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT * FROM warehouses WHERE company_code = $1 AND is_active = true ORDER BY is_primary DESC, warehouse_name ASC
        `, [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getWarehouses error');
        res.status(500).json({ success: false, message: 'Failed to fetch warehouses' });
    }
};

export const createWarehouse = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { warehouse_code, warehouse_name, location, is_primary = false } = req.body;

        if (!warehouse_name) {
            return res.status(400).json({ success: false, message: 'Warehouse name is required' });
        }

        let wCode = warehouse_code;
        if (!wCode) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM warehouses WHERE company_code = $1`, [companyCode]);
            wCode = `WH-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(2, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO warehouses (company_code, warehouse_code, warehouse_name, location, is_primary, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [companyCode, wCode, warehouse_name, location, is_primary]);

        res.status(201).json({ success: true, message: 'Warehouse created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createWarehouse error');
        res.status(500).json({ success: false, message: 'Failed to create warehouse', error: error.message });
    }
};

export const getStockLedger = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { productId, warehouseId } = req.query;

        let query = `
            SELECT sl.*, p.product_name, p.product_code, p.uom_code, w.warehouse_name
            FROM stock_ledger sl
            JOIN products p ON sl.product_id = p.product_id
            JOIN warehouses w ON sl.warehouse_id = w.warehouse_id
            WHERE sl.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (productId) {
            query += ` AND sl.product_id = $${idx}`;
            params.push(productId);
            idx++;
        }
        if (warehouseId) {
            query += ` AND sl.warehouse_id = $${idx}`;
            params.push(warehouseId);
            idx++;
        }

        query += ` ORDER BY sl.transaction_date DESC, sl.entry_id DESC LIMIT 100`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getStockLedger error');
        res.status(500).json({ success: false, message: 'Failed to fetch stock ledger' });
    }
};

export const createStockTransfer = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { from_warehouse_id, to_warehouse_id, product_id, quantity, transfer_date, notes } = req.body;

        if (!from_warehouse_id || !to_warehouse_id || !product_id || !quantity) {
            return res.status(400).json({ success: false, message: 'Source warehouse, target warehouse, product and quantity are required' });
        }

        await client.query('BEGIN');

        const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

        const tRes = await client.query(`
            INSERT INTO stock_transfers (company_code, transfer_number, from_warehouse_id, to_warehouse_id, transfer_date, status, remarks)
            VALUES ($1, $2, $3, $4, $5, 'Completed', $6)
            RETURNING *
        `, [companyCode, transferNumber, from_warehouse_id, to_warehouse_id, transfer_date || new Date().toISOString().slice(0, 10), notes || 'Inter-warehouse stock movement']);

        const transfer = tRes.rows[0];

        await client.query(`
            INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
            VALUES ($1, $2, $3)
        `, [transfer.transfer_id, product_id, quantity]);

        
        await client.query(`
            INSERT INTO stock_ledger (company_code, product_id, warehouse_id, transaction_type, reference_no, quantity_in, quantity_out, balance_qty)
            VALUES ($1, $2, $3, 'Transfer Out', $4, 0, $5, 0)
        `, [companyCode, product_id, from_warehouse_id, transferNumber, quantity]);

        
        await client.query(`
            INSERT INTO stock_ledger (company_code, product_id, warehouse_id, transaction_type, reference_no, quantity_in, quantity_out, balance_qty)
            VALUES ($1, $2, $3, 'Transfer In', $4, $5, 0, 0)
        `, [companyCode, product_id, to_warehouse_id, transferNumber, quantity]);

        await client.query('COMMIT');

        res.status(201).json({ success: true, message: 'Stock transfer completed successfully', data: transfer });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createStockTransfer error');
        res.status(500).json({ success: false, message: 'Failed to execute stock transfer', error: error.message });
    } finally {
        client.release();
    }
};

export const getStockTransfers = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT st.*, fw.warehouse_name as from_warehouse_name, tw.warehouse_name as to_warehouse_name
            FROM stock_transfers st
            JOIN warehouses fw ON st.from_warehouse_id = fw.warehouse_id
            JOIN warehouses tw ON st.to_warehouse_id = tw.warehouse_id
            WHERE st.company_code = $1
            ORDER BY st.transfer_date DESC, st.transfer_id DESC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getStockTransfers error');
        res.status(500).json({ success: false, message: 'Failed to fetch stock transfers' });
    }
};
