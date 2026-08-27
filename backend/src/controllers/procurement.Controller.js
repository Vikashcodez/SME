import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getVendors = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { search } = req.query;

        let query = `SELECT * FROM vendors WHERE company_code = $1 AND is_active = true`;
        const params = [companyCode];

        if (search) {
            query += ` AND (vendor_name ILIKE $2 OR vendor_code ILIKE $2 OR gstin ILIKE $2 OR contact_person ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY vendor_name ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getVendors error');
        res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
    }
};

export const createVendor = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            vendor_code, vendor_name, contact_person, email, phone, mobile,
            gstin, pan, currency = 'INR', address, city = '',
            state_name = '', state_code = '', pincode,
            payment_terms = '30 Days Net', bank_account_no, ifsc_code, bank_name
        } = req.body;

        if (!vendor_name) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }

        await client.query('BEGIN');

        let vCode = vendor_code;
        if (!vCode) {
            const countRes = await client.query(`SELECT COUNT(*) FROM vendors WHERE company_code = $1`, [companyCode]);
            vCode = `VEND-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        
        const grpRes = await client.query(`SELECT group_id FROM ledger_groups WHERE group_name = 'Sundry Creditors' LIMIT 1`);
        const creditorGroupId = grpRes.rows[0]?.group_id;

        let ledgerId = null;
        if (creditorGroupId) {
            const lRes = await client.query(`
                INSERT INTO ledgers (
                    company_code, ledger_name, group_id, mailing_name, address,
                    state_name, gst_state_code, pan_it_no, gstin_uin, bank_account_no, ifsc_code, bank_name
                ) VALUES ($1, $2, $3, $2, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (company_code, ledger_name) DO UPDATE SET gstin_uin = EXCLUDED.gstin_uin
                RETURNING ledger_id
            `, [companyCode, vendor_name, creditorGroupId, address, state_name, state_code, pan, gstin, bank_account_no, ifsc_code, bank_name]);
            ledgerId = lRes.rows[0]?.ledger_id;
        }

        const result = await client.query(`
            INSERT INTO vendors (
                company_code, vendor_code, vendor_name, contact_person, email, phone, mobile,
                gstin, pan, currency, address, city, state_name, state_code, pincode,
                payment_terms, bank_account_no, ifsc_code, bank_name, ledger_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `, [
            companyCode, vCode, vendor_name, contact_person, email, phone, mobile,
            gstin, pan, currency, address, city, state_name, state_code, pincode,
            payment_terms, bank_account_no, ifsc_code, bank_name, ledgerId
        ]);

        await client.query('COMMIT');

        res.status(201).json({ success: true, message: 'Vendor created successfully', data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createVendor error');
        res.status(500).json({ success: false, message: 'Failed to create vendor', error: error.message });
    } finally {
        client.release();
    }
};

export const getPurchaseOrders = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, search } = req.query;

        let query = `
            SELECT po.*, v.vendor_name, v.gstin, v.phone, v.city,
                   (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.po_id) as item_count
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.vendor_id
            WHERE po.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND po.status = $${idx}`;
            params.push(status);
            idx++;
        }

        if (search) {
            query += ` AND (po.po_number ILIKE $${idx} OR v.vendor_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY po.po_date DESC, po.po_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getPurchaseOrders error');
        res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
    }
};

export const createPurchaseOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            po_number, po_date = new Date(), delivery_date, vendor_id,
            pr_id, payment_terms = '30 Days Net', remarks, status = 'Approved',
            items = []
        } = req.body;

        if (!vendor_id || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Vendor and line items are required' });
        }

        await client.query('BEGIN');

        
        const vendorRes = await client.query('SELECT state_code FROM vendors WHERE vendor_id = $1', [vendor_id]);
        const vendorStateCode = vendorRes.rows[0]?.state_code || '27';
        const companyStateCode = '27'; 
        const isInterState = vendorStateCode !== companyStateCode;

        let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, grandTotal = 0;

        items.forEach(it => {
            const qty = parseFloat(it.quantity) || 0;
            const price = parseFloat(it.unit_price) || 0;
            const taxable = qty * price;
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

        
        let pNum = po_number;
        if (!pNum) {
            const seqRes = await client.query(`SELECT nextval('seq_purchase_orders_co0001') AS next_val`);
            const nextCount = parseInt(seqRes.rows[0].next_val, 10);
            pNum = `PO-${new Date().getFullYear()}-${String(nextCount).padStart(4, '0')}`;
        }

        const poRes = await client.query(`
            INSERT INTO purchase_orders (
                company_code, po_number, po_date, delivery_date, vendor_id,
                pr_id, payment_terms, total_taxable, total_cgst, total_sgst,
                total_igst, grand_total, status, remarks, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            companyCode, pNum, po_date, delivery_date, vendor_id,
            pr_id || null, payment_terms, totalTaxable, totalCgst, totalSgst,
            totalIgst, grandTotal, status, remarks, req.user?.username || 'Admin'
        ]);

        const po = poRes.rows[0];

        for (const it of items) {
            await client.query(`
                INSERT INTO purchase_order_items (
                    po_id, product_id, item_name, hsn_code, quantity, uom,
                    unit_price, taxable_amount, gst_rate, cgst_amount,
                    sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                po.po_id, it.product_id || null, it.item_name, it.hsn_code || '8483',
                it.quantity, it.uom || 'PCS', it.unit_price, it.taxable_amount,
                it.gst_rate || 18, it.cgst_amount, it.sgst_amount, it.igst_amount || 0,
                it.total_amount
            ]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Purchase Order ${pNum} created successfully`,
            data: { ...po, items }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createPurchaseOrder error');
        res.status(500).json({ success: false, message: 'Failed to create purchase order', error: error.message });
    } finally {
        client.release();
    }
};

export const getGoodsReceipts = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT grn.*, v.vendor_name, po.po_number
            FROM goods_receipts grn
            JOIN vendors v ON grn.vendor_id = v.vendor_id
            LEFT JOIN purchase_orders po ON grn.po_id = po.po_id
            WHERE grn.company_code = $1
            ORDER BY grn.grn_date DESC, grn.grn_id DESC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getGoodsReceipts error');
        res.status(500).json({ success: false, message: 'Failed to fetch goods receipts' });
    }
};
