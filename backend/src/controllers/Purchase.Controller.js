import pool from '../config/database.js';

// Helper: Document Number Generation
const generateDocNumber = async (client, companyId, prefix) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(
        `SELECT COUNT(*)::INT AS cnt FROM purchase_invoices WHERE company_id = $1`,
        [companyId]
    );
    const seq = (countRes.rows[0].cnt + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
};

// Helper: Tax Ledger Resolver
const getTaxLedger = async (client, companyId, code, name, taxType = 'NONE') => {
    let resL = await client.query(`SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`, [companyId, code]);
    if (resL.rows.length === 0) {
        const grp = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-TAXES' OR group_code = 'DUTIES_AND_TAXES') LIMIT 1`, [companyId]);
        const gid = grp.rows[0]?.group_id;
        resL = await client.query(`
            INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type, tax_type)
            VALUES ($1, $2, $3, $4, 'DR', 'DR', $5) RETURNING ledger_id
        `, [companyId, gid, name, code, taxType]);
    }
    return resL.rows[0].ledger_id;
};

// 1. CREATE PURCHASE INVOICE (Raw Material / Vendor Commercial & Accounting Integration)
export const createPurchaseInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            vendor_id, // vendor_profiles.vendor_profile_id or vendors.vendor_id
            supplier_invoice_number,
            supplier_invoice_date = new Date().toISOString().split('T')[0],
            due_date,
            place_of_supply_state_code,
            items = [],
            freight_charges = 0,
            other_charges = 0,
            purchase_order_id = null
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!companyId || !vendor_id || !supplier_invoice_number || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID, Vendor, Supplier Invoice Number, and at least one item are required.'
            });
        }

        // 1. Fetch Vendor & Accounting Ledger
        let vendorRes = await client.query(`
            SELECT vp.*, l.ledger_id, l.ledger_name 
            FROM vendor_profiles vp
            JOIN ledgers l ON vp.ledger_id = l.ledger_id
            WHERE (vp.vendor_profile_id = $1 OR vp.existing_vendor_id = $1) AND vp.company_id = $2
        `, [vendor_id, companyId]);

        let vendorProfile = vendorRes.rows[0];
        if (!vendorProfile) {
            // Check direct vendor table
            const directV = await client.query(`SELECT * FROM vendors WHERE vendor_id = $1`, [vendor_id]);
            if (directV.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Vendor not found.' });
            }
            const v = directV.rows[0];
            // Ensure ledger under Sundry Creditors
            const credGrp = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND group_code = 'GRP-CREDITORS' LIMIT 1`, [companyId]);
            const gid = credGrp.rows[0]?.group_id;
            let led = await client.query(`SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`, [companyId, v.vendor_code]);
            let ledId;
            if (led.rows.length === 0) {
                const newL = await client.query(`
                    INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type, maintain_bill_by_bill)
                    VALUES ($1, $2, $3, $4, 'CR', 'CR', TRUE) RETURNING ledger_id
                `, [companyId, gid, v.vendor_name, v.vendor_code]);
                ledId = newL.rows[0].ledger_id;
            } else {
                ledId = led.rows[0].ledger_id;
            }
            const newVp = await client.query(`
                INSERT INTO vendor_profiles (company_id, ledger_id, existing_vendor_id, vendor_code, vendor_trade_name, vendor_legal_name, gstin, pan, address_line1, city, state_code, postal_code)
                VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11) RETURNING *
            `, [companyId, ledId, v.vendor_id, v.vendor_code, v.vendor_name, v.gstin, v.pan, v.address || 'Address', v.city || 'City', v.state || '27', v.pincode || '400001']);
            vendorProfile = newVp.rows[0];
            vendorProfile.ledger_id = ledId;
        }

        // 2. Fetch Company GST State
        const compRes = await client.query(`SELECT gst_no FROM companies WHERE company_id = $1`, [companyId]);
        const compGst = compRes.rows[0]?.gst_no || '';
        const companyStateCode = compGst.substring(0, 2) || '27';
        const vendorStateCode = (vendorProfile.state_code || vendorProfile.gstin?.substring(0, 2) || '27').toString().substring(0, 2);
        const isIntraState = companyStateCode === vendorStateCode;

        // 3. Find or Create Default Purchase Ledger (Direct Expense)
        let purchLedRes = await client.query(`SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = 'LED-PURCH-GEN'`, [companyId]);
        let purchaseLedgerId;
        if (purchLedRes.rows.length === 0) {
            const grp = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND group_code = 'GRP-PURCHASE' LIMIT 1`, [companyId]);
            const gid = grp.rows[0]?.group_id;
            const newL = await client.query(`
                INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type)
                VALUES ($1, $2, 'General Purchase Account', 'LED-PURCH-GEN', 'DR', 'DR') RETURNING ledger_id
            `, [companyId, gid]);
            purchaseLedgerId = newL.rows[0].ledger_id;
        } else {
            purchaseLedgerId = purchLedRes.rows[0].ledger_id;
        }

        // 4. Calculate Items & Taxes
        let totalTaxable = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const calculatedItems = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const qty = parseFloat(it.quantity || it.billed_quantity) || 1;
            const rate = parseFloat(it.unit_rate || it.cost_price || it.price) || 0;
            const taxable = +(qty * rate).toFixed(2);
            const taxRate = parseFloat(it.tax_rate || it.gst_rate) || (isIntraState ? 18 : 18);

            let cgst = 0, sgst = 0, igst = 0;
            if (isIntraState) {
                cgst = +((taxable * (taxRate / 2)) / 100).toFixed(2);
                sgst = +((taxable * (taxRate / 2)) / 100).toFixed(2);
            } else {
                igst = +((taxable * taxRate) / 100).toFixed(2);
            }

            const lineTotal = +(taxable + cgst + sgst + igst).toFixed(2);

            totalTaxable += taxable;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;

            calculatedItems.push({
                ...it,
                line_number: i + 1,
                billed_quantity: qty,
                unit_rate: rate,
                taxable_amount: taxable,
                tax_rate: taxRate,
                cgst_amount: cgst,
                sgst_amount: sgst,
                igst_amount: igst,
                total_amount: lineTotal
            });
        }

        totalTaxable = +totalTaxable.toFixed(2);
        totalCgst = +totalCgst.toFixed(2);
        totalSgst = +totalSgst.toFixed(2);
        totalIgst = +totalIgst.toFixed(2);

        const subTotal = totalTaxable + totalCgst + totalSgst + totalIgst + parseFloat(other_charges || 0);
        const roundedTotal = Math.round(subTotal);
        const roundOff = +(roundedTotal - subTotal).toFixed(2);

        // Internal Entry Number
        const internalEntryNo = await generateDocNumber(client, companyId, 'PINV');
        const calculatedDueDate = due_date || supplier_invoice_date;

        // 5. Insert Purchase Invoice Header
        const invRes = await client.query(`
            INSERT INTO purchase_invoices (
                company_id, branch_id, vendor_id, purchase_ledger_id, purchase_order_id,
                internal_entry_number, supplier_invoice_number, supplier_invoice_date,
                posting_date, due_date, place_of_supply_state_code, is_reverse_charge,
                total_taxable_amount, total_cgst_amount, total_sgst_amount, total_igst_amount,
                other_charges, round_off_amount, net_total_amount, paid_amount,
                outstanding_amount, payment_status, status, created_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8,
                CURRENT_DATE, $9, $10, FALSE,
                $11, $12, $13, $14,
                $15, $16, $17, 0.00,
                $17, 'UNPAID', 'POSTED', $18
            ) RETURNING *
        `, [
            companyId, branchId, vendorProfile.vendor_profile_id, purchaseLedgerId, purchase_order_id,
            internalEntryNo, supplier_invoice_number.trim(), supplier_invoice_date,
            calculatedDueDate, vendorStateCode,
            totalTaxable, totalCgst, totalSgst, totalIgst,
            parseFloat(other_charges || 0), roundOff, roundedTotal, createdBy
        ]);
        const invoice = invRes.rows[0];

        // 6. Insert Purchase Invoice Items & Update Raw Material Stock
        for (const item of calculatedItems) {
            await client.query(`
                INSERT INTO purchase_invoice_items (
                    purchase_invoice_id, line_number, grn_id, raw_material_id, product_id,
                    hsn_sac_code, billed_quantity, unit_of_measure, unit_rate,
                    taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                invoice.purchase_invoice_id, item.line_number, item.grn_id || null,
                item.raw_material_id || null, item.product_id || null,
                item.hsn_code || item.hsn_sac_code || '8471',
                item.billed_quantity, item.unit_of_measure || item.unit || 'PCS', item.unit_rate,
                item.taxable_amount, item.tax_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount
            ]);

            // If raw material supplied and not from a GRN, update Raw Material Inventory
            if (item.raw_material_id && !item.grn_id) {
                const batchNo = item.batch_number || `BATCH-${supplier_invoice_number.trim()}`;
                await client.query(`
                    INSERT INTO raw_material_inventory (
                        company_id, branch_id, material_id, raw_material_id, batch_number,
                        received_quantity, available_quantity, reserved_quantity,
                        unit_cost, status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $3, $4, $5, $5, 0, $6, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [companyId, branchId, item.raw_material_id, batchNo, item.billed_quantity, item.unit_rate]);

                // Movement log
                await client.query(`
                    INSERT INTO raw_material_stock_movements (
                        company_id, branch_id, material_id, movement_type, item_type,
                        quantity, unit_cost, total_cost, reference_no, batch_no, notes
                    ) VALUES ($1, $2, $3, 'Purchase Inward', 'Raw Material', $4, $5, $6, $7, $8, $9)
                `, [
                    companyId, branchId, item.raw_material_id, item.billed_quantity,
                    item.unit_rate, item.taxable_amount, supplier_invoice_number, batchNo,
                    `Inward from Vendor Bill ${supplier_invoice_number}`
                ]);
            }
        }

        // 7. Post Double-Entry Accounting Voucher (VCH-PURCHASE)
        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-PURCHASE', 'PURCHASE') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `PUR-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, reference_date, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, 'PURCHASE_INVOICE', $9,
                TRUE, $10, $10, CURRENT_TIMESTAMP
            ) RETURNING voucher_id, voucher_number
        `, [
            companyId, branchId, voucherTypeId, vNum, supplier_invoice_date,
            `Purchase from ${vendorProfile.vendor_trade_name} (Inv: ${supplier_invoice_number})`,
            supplier_invoice_number, supplier_invoice_date, invoice.purchase_invoice_id, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        let lineNo = 1;

        // Line 1: CREDIT Vendor Ledger (Sundry Creditor)
        const vendVl = await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, $2, $3, 0.00, $4, $5) RETURNING line_id
        `, [voucher.voucher_id, lineNo++, vendorProfile.ledger_id, roundedTotal, `Bill: ${supplier_invoice_number}`]);

        // Bill Allocation: NEW_REF for Vendor
        await client.query(`
            INSERT INTO bill_allocations (
                voucher_line_id, ledger_id, reference_type, bill_reference_no,
                amount, dr_cr, due_date
            ) VALUES ($1, $2, 'NEW_REF', $3, $4, 'CR', $5)
        `, [vendVl.rows[0].line_id, vendorProfile.ledger_id, supplier_invoice_number, roundedTotal, calculatedDueDate]);

        // Increment Vendor Current Balance (Credit increases liability)
        await client.query(`
            UPDATE ledgers SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE ledger_id = $2
        `, [roundedTotal, vendorProfile.ledger_id]);

        // Line 2: DEBIT Purchase Ledger
        await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, $2, $3, $4, 0.00, 'Purchase Cost')
        `, [voucher.voucher_id, lineNo++, purchaseLedgerId, totalTaxable]);

        await client.query(`
            UPDATE ledgers SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE ledger_id = $2
        `, [totalTaxable, purchaseLedgerId]);

        // Line 3: DEBIT CGST Input
        if (totalCgst > 0) {
            const cgstLedId = await getTaxLedger(client, companyId, 'LED-TAX-IN-CGST', 'Input CGST', 'CGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, 0.00, 'CGST Input Tax Credit')
            `, [voucher.voucher_id, lineNo++, cgstLedId, totalCgst]);
            await client.query(`UPDATE ledgers SET current_balance = current_balance + $1 WHERE ledger_id = $2`, [totalCgst, cgstLedId]);
        }

        // Line 4: DEBIT SGST Input
        if (totalSgst > 0) {
            const sgstLedId = await getTaxLedger(client, companyId, 'LED-TAX-IN-SGST', 'Input SGST', 'SGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, 0.00, 'SGST Input Tax Credit')
            `, [voucher.voucher_id, lineNo++, sgstLedId, totalSgst]);
            await client.query(`UPDATE ledgers SET current_balance = current_balance + $1 WHERE ledger_id = $2`, [totalSgst, sgstLedId]);
        }

        // Line 5: DEBIT IGST Input
        if (totalIgst > 0) {
            const igstLedId = await getTaxLedger(client, companyId, 'LED-TAX-IN-IGST', 'Input IGST', 'IGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, 0.00, 'IGST Input Tax Credit')
            `, [voucher.voucher_id, lineNo++, igstLedId, totalIgst]);
            await client.query(`UPDATE ledgers SET current_balance = current_balance + $1 WHERE ledger_id = $2`, [totalIgst, igstLedId]);
        }

        // Line 6: Round Off
        if (roundOff !== 0) {
            const roLedId = await getTaxLedger(client, companyId, 'LED-ROUND-OFF', 'Round Off Account', 'NONE');
            const roDr = roundOff > 0 ? roundOff : 0;
            const roCr = roundOff < 0 ? Math.abs(roundOff) : 0;
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, 'Round Off Adjustment')
            `, [voucher.voucher_id, lineNo++, roLedId, roDr, roCr]);
        }

        // Update purchase invoice with voucher reference
        await client.query(`
            UPDATE purchase_invoices SET accounting_voucher_id = $1 WHERE purchase_invoice_id = $2
        `, [voucher.voucher_id, invoice.purchase_invoice_id]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Purchase Invoice recorded & posted into Double-Entry Accounting Ledger successfully',
            data: {
                ...invoice,
                accounting_voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number,
                items: calculatedItems
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createPurchaseInvoice:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    } finally {
        client.release();
    }
};

// 2. GET PURCHASE INVOICES
export const getPurchaseInvoices = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const vendorId = req.query.vendor_id;
        const paymentStatus = req.query.payment_status;
        const search = req.query.search;

        let query = `
            SELECT 
                pi.*,
                vp.vendor_trade_name,
                vp.vendor_code,
                vp.gstin AS vendor_gstin,
                v.voucher_number
            FROM purchase_invoices pi
            JOIN vendor_profiles vp ON pi.vendor_id = vp.vendor_profile_id
            LEFT JOIN vouchers v ON pi.accounting_voucher_id = v.voucher_id
            WHERE pi.company_id = $1
        `;
        const params = [companyId];

        if (vendorId) {
            params.push(vendorId);
            query += ` AND pi.vendor_id = $${params.length}`;
        }
        if (paymentStatus) {
            params.push(paymentStatus.toUpperCase());
            query += ` AND pi.payment_status = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (pi.supplier_invoice_number ILIKE $${params.length} OR vp.vendor_trade_name ILIKE $${params.length})`;
        }

        query += ` ORDER BY pi.supplier_invoice_date DESC, pi.purchase_invoice_id DESC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getPurchaseInvoices:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. GET SINGLE PURCHASE INVOICE BY ID
export const getPurchaseInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invRes = await pool.query(`
            SELECT 
                pi.*,
                vp.vendor_trade_name,
                vp.vendor_legal_name,
                vp.vendor_code,
                vp.gstin AS vendor_gstin,
                vp.address_line1,
                vp.city,
                vp.state_code,
                vp.postal_code,
                v.voucher_number
            FROM purchase_invoices pi
            JOIN vendor_profiles vp ON pi.vendor_id = vp.vendor_profile_id
            LEFT JOIN vouchers v ON pi.accounting_voucher_id = v.voucher_id
            WHERE pi.purchase_invoice_id = $1
        `, [id]);

        if (invRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
        }

        const itemsRes = await pool.query(`
            SELECT 
                pii.*,
                rm.material_name,
                rm.material_code,
                p.product_name,
                COALESCE(p.product_code, p.code) AS product_code
            FROM purchase_invoice_items pii
            LEFT JOIN raw_materials rm ON pii.raw_material_id = rm.material_id
            LEFT JOIN products p ON pii.product_id = p.product_id
            WHERE pii.purchase_invoice_id = $1
            ORDER BY pii.line_number ASC
        `, [id]);

        return res.json({
            success: true,
            data: {
                ...invRes.rows[0],
                items: itemsRes.rows
            }
        });
    } catch (error) {
        console.error('Error in getPurchaseInvoiceById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. RECORD VENDOR PAYMENT (Payment Voucher & Bill Settlement)
export const recordVendorPayment = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            vendor_id,
            amount,
            payment_date = new Date().toISOString().split('T')[0],
            payment_mode = 'BANK', // BANK or CASH
            instrument_type = 'NEFT', // NEFT, RTGS, IMPS, CHEQUE, UPI, CASH
            instrument_reference_number,
            invoices_to_settle = [], // [{ purchase_invoice_id, amount }]
            narration
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        const paymentAmount = parseFloat(amount);
        if (!companyId || !vendor_id || !paymentAmount || paymentAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID, Vendor ID, and a valid Payment Amount are required.'
            });
        }

        // Fetch vendor & ledger
        const vendRes = await client.query(`
            SELECT vp.*, l.ledger_id 
            FROM vendor_profiles vp 
            JOIN ledgers l ON vp.ledger_id = l.ledger_id 
            WHERE (vp.vendor_profile_id = $1 OR vp.existing_vendor_id = $1) AND vp.company_id = $2
        `, [vendor_id, companyId]);

        if (vendRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
        }
        const vendor = vendRes.rows[0];
        const vendorLedgerId = vendor.ledger_id;

        // Fetch Payment Mode Ledger (Cash or Bank)
        let payLedRes = await client.query(
            `SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`,
            [companyId, payment_mode === 'CASH' ? 'LED-CASH-MAIN' : 'LED-BANK-MAIN']
        );
        let paymentLedgerId;
        if (payLedRes.rows.length === 0) {
            const fallbackRes = await client.query(`
                SELECT l.ledger_id FROM ledgers l
                JOIN account_groups ag ON l.group_id = ag.group_id
                WHERE l.company_id = $1 AND ag.group_code IN ('GRP-BANK', 'GRP-CASH', 'BANK_ACCOUNTS', 'CASH_IN_HAND')
                LIMIT 1
            `, [companyId]);
            paymentLedgerId = fallbackRes.rows[0]?.ledger_id;
        } else {
            paymentLedgerId = payLedRes.rows[0].ledger_id;
        }

        // Post Double-Entry Payment Voucher (VCH-PAYMENT)
        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-PAYMENT', 'PAYMENT') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `PAY-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, reference_date, source_module,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $5, 'PAYMENT',
                TRUE, $8, $8, CURRENT_TIMESTAMP
            ) RETURNING voucher_id, voucher_number
        `, [
            companyId, branchId, voucherTypeId, vNum, payment_date,
            narration || `Payment of ₹${paymentAmount.toFixed(2)} to ${vendor.vendor_trade_name}`,
            instrument_reference_number || vNum, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        // Line 1: DEBIT Vendor Ledger (Reduces liability)
        const vendVl = await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 1, $2, $3, 0.00, $4) RETURNING line_id
        `, [voucher.voucher_id, vendorLedgerId, paymentAmount, `Payment to ${vendor.vendor_trade_name}`]);

        await client.query(`
            UPDATE ledgers SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP
            WHERE ledger_id = $2
        `, [paymentAmount, vendorLedgerId]);

        // Line 2: CREDIT Cash / Bank Ledger
        await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 2, $2, 0.00, $3, $4)
        `, [voucher.voucher_id, paymentLedgerId, paymentAmount, `Paid via ${payment_mode} ref: ${instrument_reference_number || vNum}`]);

        await client.query(`
            UPDATE ledgers SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP
            WHERE ledger_id = $2
        `, [paymentAmount, paymentLedgerId]);

        // Bill Allocations: Settle Invoices (FIFO or Explicit)
        let remainingToAllocate = paymentAmount;
        let billsToProcess = [];

        if (invoices_to_settle && invoices_to_settle.length > 0) {
            billsToProcess = invoices_to_settle;
        } else {
            // Auto FIFO: fetch unpaid/partially paid invoices for this vendor
            const unpaidRes = await client.query(`
                SELECT purchase_invoice_id, supplier_invoice_number, outstanding_amount, due_date
                FROM purchase_invoices
                WHERE vendor_id = $1 AND outstanding_amount > 0 AND status = 'POSTED'
                ORDER BY supplier_invoice_date ASC, purchase_invoice_id ASC
            `, [vendor.vendor_profile_id]);
            billsToProcess = unpaidRes.rows.map(b => ({
                purchase_invoice_id: b.purchase_invoice_id,
                supplier_invoice_number: b.supplier_invoice_number,
                amount: Math.min(parseFloat(b.outstanding_amount), remainingToAllocate),
                due_date: b.due_date
            }));
        }

        let allocatedTotal = 0;
        for (const bill of billsToProcess) {
            if (remainingToAllocate <= 0) break;
            const allocAmt = Math.min(parseFloat(bill.amount), remainingToAllocate);
            if (allocAmt <= 0) continue;

            const invRow = await client.query(
                `SELECT outstanding_amount, paid_amount, supplier_invoice_number, due_date FROM purchase_invoices WHERE purchase_invoice_id = $1`,
                [bill.purchase_invoice_id]
            );
            if (invRow.rows.length === 0) continue;

            const inv = invRow.rows[0];
            const newPaid = +(parseFloat(inv.paid_amount) + allocAmt).toFixed(2);
            const newOutstanding = Math.max(0, +(parseFloat(inv.outstanding_amount) - allocAmt).toFixed(2));
            const newStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

            await client.query(`
                UPDATE purchase_invoices 
                SET paid_amount = $1, outstanding_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
                WHERE purchase_invoice_id = $4
            `, [newPaid, newOutstanding, newStatus, bill.purchase_invoice_id]);

            // Bill Allocation AGST_REF
            await client.query(`
                INSERT INTO bill_allocations (
                    voucher_line_id, ledger_id, reference_type, bill_reference_no,
                    amount, dr_cr, due_date
                ) VALUES ($1, $2, 'AGST_REF', $3, $4, 'DR', $5)
            `, [vendVl.rows[0].line_id, vendorLedgerId, inv.supplier_invoice_number, allocAmt, inv.due_date]);

            remainingToAllocate -= allocAmt;
            allocatedTotal += allocAmt;
        }

        const unallocatedAmount = Math.max(0, +(paymentAmount - allocatedTotal).toFixed(2));

        // Insert Settlement Voucher
        await client.query(`
            INSERT INTO settlement_vouchers (
                company_id, branch_id, settlement_type, voucher_number, settlement_date,
                party_ledger_id, payment_mode_ledger_id, amount, unallocated_amount,
                payment_instrument_type, instrument_reference_number, accounting_voucher_id,
                status, created_by
            ) VALUES (
                $1, $2, 'PAYMENT', $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11, 'POSTED', $12
            )
        `, [
            companyId, branchId, vNum, payment_date,
            vendorLedgerId, paymentLedgerId, paymentAmount, unallocatedAmount,
            instrument_type, instrument_reference_number, voucher.voucher_id, createdBy
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Vendor Payment recorded and allocated against purchase bills successfully',
            data: {
                voucher_number: voucher.voucher_number,
                payment_amount: paymentAmount,
                allocated_amount: allocatedTotal,
                unallocated_amount: unallocatedAmount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in recordVendorPayment:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 5. GET VENDOR BILL-WISE OUTSTANDING
export const getVendorBillOutstanding = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const companyId = req.query.company_id || req.user?.company_id;

        const result = await pool.query(`
            SELECT 
                pi.purchase_invoice_id,
                pi.supplier_invoice_number,
                pi.supplier_invoice_date,
                pi.due_date,
                pi.net_total_amount,
                pi.paid_amount,
                pi.outstanding_amount,
                pi.payment_status,
                (CURRENT_DATE - pi.due_date) AS overdue_days
            FROM purchase_invoices pi
            JOIN vendor_profiles vp ON pi.vendor_id = vp.vendor_profile_id
            WHERE (vp.vendor_profile_id = $1 OR vp.existing_vendor_id = $1)
              AND pi.company_id = $2
              AND pi.outstanding_amount > 0
            ORDER BY pi.due_date ASC
        `, [vendor_id, companyId]);

        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getVendorBillOutstanding:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
