import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getWorkCenters = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query('SELECT * FROM work_centers WHERE company_code = $1 ORDER BY center_name ASC', [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getWorkCenters error');
        res.status(500).json({ success: false, message: 'Failed to fetch work centers' });
    }
};

export const getBoms = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT b.*, p.product_name, p.product_code, p.uom_code,
                   (SELECT COUNT(*) FROM bom_items bi WHERE bi.bom_id = b.bom_id) as raw_item_count
            FROM boms b
            JOIN products p ON b.product_id = p.product_id
            WHERE b.company_code = $1
            ORDER BY b.bom_code ASC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getBoms error');
        res.status(500).json({ success: false, message: 'Failed to fetch BOMs' });
    }
};

export const getBomById = async (req, res) => {
    try {
        const { id } = req.params;
        const bomRes = await pool.query(`
            SELECT b.*, p.product_name, p.product_code, p.uom_code
            FROM boms b
            JOIN products p ON b.product_id = p.product_id
            WHERE b.bom_id = $1
        `, [id]);

        if (bomRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        const itemsRes = await pool.query(`
            SELECT bi.*, p.product_name, p.product_code, p.uom_code, p.cost_price
            FROM bom_items bi
            JOIN products p ON bi.product_id = p.product_id
            WHERE bi.bom_id = $1
            ORDER BY bi.item_id ASC
        `, [id]);

        res.status(200).json({
            success: true,
            data: {
                ...bomRes.rows[0],
                items: itemsRes.rows
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getBomById error');
        res.status(500).json({ success: false, message: 'Failed to fetch BOM details' });
    }
};

export const createBom = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { bom_code, product_id, bom_name, output_qty = 1.00, uom_code = 'PCS', items = [] } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Finished product ID is required' });
        }

        await client.query('BEGIN');

        let bCode = bom_code;
        if (!bCode) {
            const countRes = await client.query(`SELECT COUNT(*) FROM boms WHERE company_code = $1`, [companyCode]);
            bCode = `BOM-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const bomRes = await client.query(`
            INSERT INTO boms (company_code, bom_code, product_id, bom_name, output_qty, uom_code, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING *
        `, [companyCode, bCode, product_id, bom_name || `BOM for Product ${product_id}`, output_qty, uom_code]);

        const bom = bomRes.rows[0];

        if (Array.isArray(items) && items.length > 0) {
            for (const it of items) {
                await client.query(`
                    INSERT INTO bom_items (bom_id, product_id, quantity, scrap_percentage, unit_cost)
                    VALUES ($1, $2, $3, $4, $5)
                `, [bom.bom_id, it.product_id, it.quantity, it.scrap_percentage || 0, it.unit_cost || 0]);
            }
        }

        await client.query('COMMIT');

        res.status(201).json({ success: true, message: 'BOM created successfully', data: bom });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createBom error');
        res.status(500).json({ success: false, message: 'Failed to create BOM', error: error.message });
    } finally {
        client.release();
    }
};

export const getWorkOrders = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, search } = req.query;

        let query = `
            SELECT wo.*, p.product_name, p.product_code, p.uom_code, so.order_number
            FROM work_orders wo
            JOIN products p ON wo.product_id = p.product_id
            LEFT JOIN sales_orders so ON wo.sales_order_id = so.order_id
            WHERE wo.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND wo.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (search) {
            query += ` AND (wo.work_order_number ILIKE $${idx} OR p.product_name ILIKE $${idx} OR p.product_code ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY wo.order_date DESC, wo.work_order_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getWorkOrders error');
        res.status(500).json({ success: false, message: 'Failed to fetch work orders' });
    }
};

export const createWorkOrder = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { work_order_number, product_id, product_name, planned_qty, quantity, status, order_date, target_date, due_date, bom_id, sales_order_id } = req.body;

        
        let resolvedProductId = product_id ? parseInt(product_id, 10) : null;
        if (!resolvedProductId && product_name) {
            const pRes = await pool.query(
                'SELECT product_id FROM products WHERE company_code = $1 AND product_name ILIKE $2 LIMIT 1',
                [companyCode, `%${product_name}%`]
            );
            if (pRes.rows.length > 0) resolvedProductId = pRes.rows[0].product_id;
        }

        if (!resolvedProductId) {
            const fallbackProd = await pool.query('SELECT product_id FROM products WHERE company_code = $1 ORDER BY product_id ASC LIMIT 1', [companyCode]);
            if (fallbackProd.rows.length > 0) {
                resolvedProductId = fallbackProd.rows[0].product_id;
            } else {
                return res.status(400).json({ success: false, message: 'No valid product found to create work order' });
            }
        }

        
        let resolvedBomId = bom_id ? parseInt(bom_id, 10) : null;
        if (!resolvedBomId) {
            const bomRes = await pool.query('SELECT bom_id FROM boms WHERE product_id = $1 LIMIT 1', [resolvedProductId]);
            if (bomRes.rows.length > 0) resolvedBomId = bomRes.rows[0].bom_id;
        }

        const qty = parseFloat(planned_qty || quantity || 100);
        const orderDate = order_date || new Date().toISOString().slice(0, 10);
        const targetDate = target_date || due_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

        const result = await pool.query(`
            INSERT INTO work_orders (
                company_code, work_order_number, product_id, bom_id, sales_order_id,
                planned_qty, completed_qty, rejected_qty, status, order_date, target_date
            ) VALUES ($1, $2, $3, $4, $5, $6, 0.00, 0.00, $7, $8, $9)
            RETURNING *
        `, [
            companyCode,
            work_order_number || `WO-2026-${Date.now().toString().slice(-4)}`,
            resolvedProductId,
            resolvedBomId,
            sales_order_id || null,
            qty,
            status || 'Planned',
            orderDate,
            targetDate
        ]);

        res.status(201).json({ success: true, message: 'Work order created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createWorkOrder error');
        res.status(500).json({ success: false, message: 'Failed to create work order', error: error.message });
    }
};

export const updateWorkOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, completed_qty, rejected_qty } = req.body;

        const result = await pool.query(`
            UPDATE work_orders
            SET status = COALESCE($1, status),
                completed_qty = COALESCE($2, completed_qty),
                rejected_qty = COALESCE($3, rejected_qty),
                updated_at = NOW()
            WHERE work_order_id = $4
            RETURNING *
        `, [status, completed_qty, rejected_qty, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        res.status(200).json({ success: true, message: 'Work order status updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateWorkOrderStatus error');
        res.status(500).json({ success: false, message: 'Failed to update work order status' });
    }
};

export const logProduction = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { quantity_produced, quantity_rejected, operator_name, remarks } = req.body;

        await client.query('BEGIN');

        const woRes = await client.query(`SELECT * FROM work_orders WHERE work_order_id = $1`, [id]);
        if (woRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }
        const wo = woRes.rows[0];

        const newCompleted = parseFloat(wo.completed_qty) + parseFloat(quantity_produced || 0);
        const newRejected = parseFloat(wo.rejected_qty) + parseFloat(quantity_rejected || 0);
        const newStatus = newCompleted >= parseFloat(wo.planned_qty) ? 'Completed' : 'In Progress';

        const updatedWo = await client.query(`
            UPDATE work_orders
            SET completed_qty = $1, rejected_qty = $2, status = $3, updated_at = NOW()
            WHERE work_order_id = $4
            RETURNING *
        `, [newCompleted, newRejected, newStatus, id]);

        
        if (parseFloat(quantity_produced) > 0) {
            await client.query(`
                UPDATE products SET current_stock = current_stock + $1 WHERE product_id = $2
            `, [parseFloat(quantity_produced), wo.product_id]);
        }

        await client.query('COMMIT');

        res.status(200).json({ success: true, message: 'Production output logged successfully', data: updatedWo.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'logProduction error');
        res.status(500).json({ success: false, message: 'Failed to log production', error: error.message });
    } finally {
        client.release();
    }
};
