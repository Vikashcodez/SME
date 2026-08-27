import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getCustomers = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { search } = req.query;

        let query = `SELECT * FROM customers WHERE company_code = $1 AND is_active = true`;
        const params = [companyCode];

        if (search) {
            query += ` AND (customer_name ILIKE $2 OR customer_code ILIKE $2 OR gstin ILIKE $2 OR contact_person ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY customer_name ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getCustomers error');
        res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }
};

export const createCustomer = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            customer_code, customer_name, contact_person, email, phone, mobile,
            gstin, pan, currency = 'INR', billing_address, billing_city = '',
            billing_state = '', billing_state_code = '', billing_pincode,
            shipping_address, shipping_city, shipping_state, shipping_state_code,
            shipping_pincode, credit_limit = 500000, credit_days = 30, payment_terms = '30 Days Net'
        } = req.body;

        if (!customer_name) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }

        await client.query('BEGIN');

        
        let cCode = customer_code;
        if (!cCode) {
            const countRes = await client.query(`SELECT COUNT(*) FROM customers WHERE company_code = $1`, [companyCode]);
            cCode = `CUST-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        
        const grpRes = await client.query(`SELECT group_id FROM ledger_groups WHERE group_name = 'Sundry Debtors' LIMIT 1`);
        const debtorGroupId = grpRes.rows[0]?.group_id;

        let ledgerId = null;
        if (debtorGroupId) {
            const lRes = await client.query(`
                INSERT INTO ledgers (
                    company_code, ledger_name, group_id, mailing_name, address,
                    state_name, gst_state_code, pan_it_no, gstin_uin, credit_period_days, credit_limit
                ) VALUES ($1, $2, $3, $2, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (company_code, ledger_name) DO UPDATE SET gstin_uin = EXCLUDED.gstin_uin
                RETURNING ledger_id
            `, [
                companyCode, customer_name, debtorGroupId, billing_address,
                billing_state, billing_state_code, pan, gstin, credit_days, credit_limit
            ]);
            ledgerId = lRes.rows[0]?.ledger_id;
        }

        const result = await client.query(`
            INSERT INTO customers (
                company_code, customer_code, customer_name, contact_person, email, phone, mobile,
                gstin, pan, currency, billing_address, billing_city, billing_state, billing_state_code,
                billing_pincode, shipping_address, shipping_city, shipping_state, shipping_state_code,
                shipping_pincode, credit_limit, credit_days, payment_terms, ledger_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *
        `, [
            companyCode, cCode, customer_name, contact_person, email, phone, mobile,
            gstin, pan, currency, billing_address, billing_city, billing_state, billing_state_code,
            billing_pincode, shipping_address || billing_address, shipping_city || billing_city,
            shipping_state || billing_state, shipping_state_code || billing_state_code,
            shipping_pincode || billing_pincode, credit_limit, credit_days, payment_terms, ledgerId
        ]);

        await client.query('COMMIT');

        res.status(201).json({ success: true, message: 'Customer created successfully', data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createCustomer error');
        res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
    } finally {
        client.release();
    }
};

export const getSalesOrders = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, search } = req.query;

        let query = `
            SELECT so.*, c.customer_name, c.gstin, c.phone, c.billing_city,
                   (SELECT COUNT(*) FROM sales_order_items soi WHERE soi.order_id = so.order_id) as item_count
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            WHERE so.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND so.status = $${idx}`;
            params.push(status);
            idx++;
        }

        if (search) {
            query += ` AND (so.order_number ILIKE $${idx} OR c.customer_name ILIKE $${idx} OR so.customer_po_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY so.order_date DESC, so.order_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getSalesOrders error');
        res.status(500).json({ success: false, message: 'Failed to fetch sales orders' });
    }
};

export const getSalesOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const soRes = await pool.query(`
            SELECT so.*, c.customer_name, c.gstin, c.pan, c.email, c.phone, c.billing_address, c.billing_city, c.billing_state
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            WHERE so.order_id = $1
        `, [id]);

        if (soRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales order not found' });
        }

        const itemsRes = await pool.query(`
            SELECT soi.*, p.product_code, p.current_stock
            FROM sales_order_items soi
            LEFT JOIN products p ON soi.product_id = p.product_id
            WHERE soi.order_id = $1
            ORDER BY soi.item_id ASC
        `, [id]);

        res.status(200).json({
            success: true,
            data: {
                ...soRes.rows[0],
                items: itemsRes.rows
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getSalesOrderById error');
        res.status(500).json({ success: false, message: 'Failed to fetch sales order details' });
    }
};

export const createSalesOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            order_number, order_date = new Date(), delivery_date, customer_id,
            quotation_id, customer_po_number, customer_po_date, payment_terms = '30 Days Net',
            place_of_supply = '', remarks, status = 'Confirmed',
            items = []
        } = req.body;

        if (!customer_id || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Customer and line items are required' });
        }

        await client.query('BEGIN');

        
        let totalTaxable = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const isInterState = Boolean(place_of_supply && !place_of_supply.startsWith('27'));

        items.forEach(it => {
            const qty = parseFloat(it.quantity) || 0;
            const price = parseFloat(it.unit_price) || 0;
            const disc = parseFloat(it.discount_amount) || 0;
            const taxable = (qty * price) - disc;
            const gstRate = parseFloat(it.gst_rate) || 18.00;

            let cgst = 0, sgst = 0, igst = 0;
            if (isInterState) {
                igst = taxable * (gstRate / 100);
            } else {
                cgst = taxable * (gstRate / 200);
                sgst = taxable * (gstRate / 200);
            }

            const itemTotal = taxable + cgst + sgst + igst;

            it.taxable_amount = taxable;
            it.cgst_amount = cgst;
            it.sgst_amount = sgst;
            it.igst_amount = igst;
            it.total_amount = itemTotal;

            totalTaxable += taxable;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;
            grandTotal += itemTotal;
        });

        
        let oNum = order_number;
        if (!oNum) {
            const seqRes = await client.query(`SELECT nextval('seq_sales_orders_co0001') AS next_val`);
            const nextCount = parseInt(seqRes.rows[0].next_val, 10);
            oNum = `SO-${new Date().getFullYear()}-${String(nextCount).padStart(4, '0')}`;
        }

        const soRes = await client.query(`
            INSERT INTO sales_orders (
                company_code, order_number, order_date, delivery_date, customer_id,
                quotation_id, customer_po_number, customer_po_date, payment_terms,
                place_of_supply, total_taxable, total_cgst, total_sgst, total_igst,
                grand_total, status, remarks, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `, [
            companyCode, oNum, order_date, delivery_date, customer_id,
            quotation_id || null, customer_po_number, customer_po_date || null, payment_terms,
            place_of_supply, totalTaxable, totalCgst, totalSgst, totalIgst,
            grandTotal, status, remarks, req.user?.username || 'Admin'
        ]);

        const order = soRes.rows[0];

        
        for (const it of items) {
            await client.query(`
                INSERT INTO sales_order_items (
                    order_id, product_id, item_name, hsn_code, quantity, uom,
                    unit_price, discount_amount, taxable_amount, gst_rate,
                    cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [
                order.order_id, it.product_id || null, it.item_name, it.hsn_code || '8483',
                it.quantity, it.uom || 'PCS', it.unit_price, it.discount_amount || 0,
                it.taxable_amount, it.gst_rate || 18, it.cgst_amount, it.sgst_amount,
                it.igst_amount, it.total_amount
            ]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Sales Order ${oNum} created successfully`,
            data: { ...order, items }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createSalesOrder error');
        res.status(500).json({ success: false, message: 'Failed to create sales order', error: error.message });
    } finally {
        client.release();
    }
};

export const getSalesInvoices = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, search } = req.query;

        let query = `
            SELECT si.*, c.customer_name, c.gstin, c.billing_city, so.order_number
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.customer_id
            LEFT JOIN sales_orders so ON si.order_id = so.order_id
            WHERE si.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND si.status = $${idx}`;
            params.push(status);
            idx++;
        }

        if (search) {
            query += ` AND (si.invoice_number ILIKE $${idx} OR c.customer_name ILIKE $${idx} OR so.order_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY si.invoice_date DESC, si.invoice_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getSalesInvoices error');
        res.status(500).json({ success: false, message: 'Failed to fetch sales invoices' });
    }
};

export const convertOrderToInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        const { orderId } = req.body;
        const companyCode = req.companyId || 'CO-0001';

        await client.query('BEGIN');

        const soRes = await client.query(`SELECT * FROM sales_orders WHERE order_id = $1`, [orderId]);
        if (soRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Sales order not found' });
        }

        const so = soRes.rows[0];

        
        if (['Invoiced', 'Delivered', 'Cancelled'].includes(so.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Order ${so.order_number} is already ${so.status}` });
        }

        const itemsRes = await client.query(`SELECT * FROM sales_order_items WHERE order_id = $1`, [orderId]);

        
        const seqRes = await client.query(`SELECT nextval('seq_sales_invoices_co0001') AS next_val`);
        const nextInvCount = parseInt(seqRes.rows[0].next_val, 10);
        const nextInvNum = `SINV-${new Date().getFullYear()}-${String(nextInvCount).padStart(4, '0')}`;

        const invRes = await client.query(`
            INSERT INTO sales_invoices (
                company_code, invoice_number, invoice_date, due_date, customer_id,
                order_id, payment_terms, place_of_supply, total_taxable, total_cgst,
                total_sgst, total_igst, grand_total, paid_amount, balance_amount, status, created_by
            ) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $11, 'Issued', $12)
            RETURNING *
        `, [
            companyCode, nextInvNum, so.customer_id, so.order_id,
            so.payment_terms, so.place_of_supply, so.total_taxable,
            so.total_cgst, so.total_sgst, so.total_igst, so.grand_total,
            req.user?.username || 'Admin'
        ]);

        const invoice = invRes.rows[0];

        
        for (const it of itemsRes.rows) {
            await client.query(`
                INSERT INTO sales_invoice_items (
                    invoice_id, product_id, item_name, hsn_code, quantity, uom,
                    unit_price, discount_amount, taxable_amount, gst_rate,
                    cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [
                invoice.invoice_id, it.product_id, it.item_name, it.hsn_code,
                it.quantity, it.uom, it.unit_price, it.discount_amount,
                it.taxable_amount, it.gst_rate, it.cgst_amount, it.sgst_amount,
                it.igst_amount, it.total_amount
            ]);
        }

        
        await client.query(`UPDATE sales_orders SET status = 'Invoiced', updated_at = NOW() WHERE order_id = $1`, [orderId]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Sales Order ${so.order_number} successfully converted to Invoice ${nextInvNum}`,
            data: invoice
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'convertOrderToInvoice error');
        res.status(500).json({ success: false, message: 'Conversion failed', error: error.message });
    } finally {
        client.release();
    }
};
