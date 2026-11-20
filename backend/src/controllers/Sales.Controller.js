import pool from '../config/database.js';
import { applyLedgerBalance } from '../services/AccountingPosting.js';
import { resolveTaxRates } from '../services/TaxMaster.js';
import { recalculateLedgerBalance } from './Accounting.Controller.js';

// Helper: Sanitize foreign keys / BigInt IDs (convert empty string, 'null', etc. to null)
const sanitizeId = (id) => {
    if (id === undefined || id === null) return null;
    const str = String(id).trim();
    if (str === '' || str === 'null' || str === 'undefined') return null;
    return str;
};

// Helper: Ensure employee ID exists to avoid foreign key violations with stale tokens or super admins
const getValidEmployeeId = async (client, employeeId) => {
    const cleanId = sanitizeId(employeeId);
    if (!cleanId) return null;
    const res = await client.query('SELECT employee_id FROM employees WHERE employee_id = $1 LIMIT 1', [cleanId]);
    return res.rows.length > 0 ? res.rows[0].employee_id : null;
};

// Helper: Generate sequential invoice / quotation / order numbers
const generateDocNumber = async (client, companyId, prefix) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(
        `SELECT COUNT(*)::INT AS cnt FROM sales_invoices WHERE company_id = $1 AND invoice_number LIKE $2`,
        [companyId, `${prefix}-${year}-%`]
    );
    const seq = (countRes.rows[0].cnt + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
};

// =========================================================================
// 1. SALES INVOICE (Tax Invoice + Double-Entry Accounting Voucher + GST)
// =========================================================================
export const createSalesInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            customer_id: requestCustomerId,
            invoice_date = new Date().toISOString().split('T')[0],
            due_date,
            items: requestItems = [], // [{ product_id, quantity, unit_rate, discount_percentage }]
            freight_charges = 0,
            other_charges = 0,
            sales_order_id = null,
            quotation_id = null,
            quotation_edit_mode = false,
            terms_and_conditions,
            invoice_type = 'TAX_INVOICE'
        } = req.body;

        const companyId = sanitizeId(req.body.company_id || req.user?.company_id);
        const branchId = sanitizeId(req.body.branch_id || req.user?.branch_id);
        const createdBy = await getValidEmployeeId(client, req.user?.employee_id);
        let customer_id = sanitizeId(requestCustomerId);
        const cleanSalesOrderId = sanitizeId(sales_order_id);
        const cleanQuotationId = sanitizeId(quotation_id);
        let items = requestItems;
        let quotation = null;

        if (cleanQuotationId) {
            const quotationRes = await client.query(`
                SELECT * FROM quotations
                WHERE quotation_id = $1 AND company_id = $2
                FOR UPDATE
            `, [cleanQuotationId, companyId]);
            if (quotationRes.rows.length === 0) {
                throw new Error('Quotation not found.');
            }
            quotation = quotationRes.rows[0];
            if (quotation.status !== 'DRAFT') {
                throw new Error(`Quotation cannot be invoiced from status ${quotation.status}.`);
            }

            const existingInvoice = await client.query(
                `SELECT sales_invoice_id FROM sales_invoices WHERE quotation_id = $1 LIMIT 1`,
                [cleanQuotationId]
            );
            if (existingInvoice.rows.length > 0) {
                throw new Error('This quotation is already converted to a sales invoice.');
            }

            customer_id = quotation.customer_id;
            if (!quotation_edit_mode) {
                const quotationItems = await client.query(
                    `SELECT product_id, quantity, quoted_rate AS unit_rate, discount_percentage, tax_rate,
                            taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
                     FROM quotation_items WHERE quotation_id = $1 ORDER BY line_number`,
                    [quotation_id]
                );
                items = quotationItems.rows;
            }
        }

        if (!companyId || !customer_id || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID, Customer, and at least one item are required.'
            });
        }

        // Fetch Customer Profile + Ledger
        const custRes = await client.query(`
            SELECT cp.*, l.ledger_id, l.ledger_name
            FROM customer_profiles cp
            JOIN ledgers l ON cp.ledger_id = l.ledger_id
            WHERE cp.customer_id = $1
        `, [customer_id]);

        if (custRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        const customer = custRes.rows[0];

        // Fetch Company / Supplier State Code (derived from first 2 digits of Company GSTIN)
        let companyStateCode = '27'; // Default Maharashtra if not specified
        const compRes = await client.query(`SELECT gst_no FROM companies WHERE company_id = $1`, [companyId]);
        if (compRes.rows.length > 0 && compRes.rows[0].gst_no && compRes.rows[0].gst_no.length >= 2) {
            companyStateCode = compRes.rows[0].gst_no.substring(0, 2);
        }
        const customerStateCode = customer.billing_state_code || '27';
        const isIntraState = companyStateCode === customerStateCode;

        // Calculate line items with GST
        let totalTaxable = 0;
        let totalDiscount = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        const calculatedItems = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isService = item.item_type === 'SERVICE' || Boolean(item.service_id) || (!item.product_id && item.service_id);

            let itemName = '';
            let itemCode = '';
            let hsnSacCode = '';
            let defaultRate = 0;
            let defaultGst = 18;
            let defaultUom = isService ? 'HRS' : 'PCS';
            let productId = null;
            let serviceId = null;

            if (isService) {
                const sId = item.service_id || item.product_id; // In case passed in item_id
                const sRes = await client.query(`SELECT * FROM services WHERE service_id = $1`, [sId]);
                if (sRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: `Service ID ${sId} not found` });
                }
                const service = sRes.rows[0];
                serviceId = service.service_id;
                itemName = service.service_name;
                itemCode = service.service_code;
                hsnSacCode = service.sac_code || service.hsn_code || '9983';
                defaultRate = parseFloat(service.service_charge) || parseFloat(service.selling_price) || 0;
                defaultGst = parseFloat(service.gst_rate ?? 18);
                defaultUom = service.unit_of_measure || 'HRS';
            } else {
                const pRes = await client.query(`SELECT * FROM products WHERE product_id = $1`, [item.product_id]);
                if (pRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: `Product ID ${item.product_id} not found` });
                }
                const product = pRes.rows[0];
                productId = product.product_id;
                itemName = product.product_name;
                itemCode = product.product_code || product.code;
                hsnSacCode = product.hsn_code || '9988';
                defaultRate = parseFloat(product.selling_price) || parseFloat(product.price) || 0;
                defaultGst = parseFloat(product.gst_rate ?? 18);
                defaultUom = product.unit_of_measure || 'PCS';
            }

            const qty = parseFloat(item.quantity) || 1;
            const rate = item.unit_rate !== undefined && item.unit_rate !== '' ? parseFloat(item.unit_rate) : defaultRate;
            const discPct = parseFloat(item.discount_percentage) || 0;

            const gross = qty * rate;
            const discAmt = +(gross * (discPct / 100)).toFixed(2);
            const taxable = quotation && !quotation_edit_mode
                ? parseFloat(item.taxable_amount || 0)
                : +(gross - discAmt).toFixed(2);

            // Default GST tax rate
            const gstRate = parseFloat(item.tax_rate !== undefined ? item.tax_rate : defaultGst);
            const masterRates = await resolveTaxRates(client, companyId, gstRate);
            let cgstRate = 0, sgstRate = 0, igstRate = 0;
            let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

            if (quotation && !quotation_edit_mode) {
                cgstRate = taxable ? +((parseFloat(item.cgst_amount || 0) / taxable) * 100).toFixed(2) : 0;
                sgstRate = taxable ? +((parseFloat(item.sgst_amount || 0) / taxable) * 100).toFixed(2) : 0;
                igstRate = taxable ? +((parseFloat(item.igst_amount || 0) / taxable) * 100).toFixed(2) : 0;
                cgstAmt = parseFloat(item.cgst_amount || 0);
                sgstAmt = parseFloat(item.sgst_amount || 0);
                igstAmt = parseFloat(item.igst_amount || 0);
            } else if (isIntraState) {
                cgstRate = masterRates.cgst;
                sgstRate = masterRates.sgst;
                cgstAmt = +(taxable * (cgstRate / 100)).toFixed(2);
                sgstAmt = +(taxable * (sgstRate / 100)).toFixed(2);
            } else {
                igstRate = masterRates.igst || masterRates.total;
                igstAmt = +(taxable * (igstRate / 100)).toFixed(2);
            }

            const itemTotal = quotation && !quotation_edit_mode && item.total_amount !== undefined
                ? parseFloat(item.total_amount)
                : +(taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2);

            totalTaxable += taxable;
            totalDiscount += discAmt;
            totalCgst += cgstAmt;
            totalSgst += sgstAmt;
            totalIgst += igstAmt;

            calculatedItems.push({
                item_type: isService ? 'SERVICE' : 'PRODUCT',
                product_id: productId,
                service_id: serviceId,
                item_name: itemName,
                item_code: itemCode,
                hsn_sac_code: item.hsn_sac_code || hsnSacCode,
                quantity: qty,
                unit_of_measure: item.unit_of_measure || defaultUom,
                unit_rate: rate,
                discount_percentage: discPct,
                discount_amount: discAmt,
                taxable_amount: taxable,
                tax_rate: gstRate,
                cgst_rate: cgstRate,
                cgst_amount: cgstAmt,
                sgst_rate: sgstRate,
                sgst_amount: sgstAmt,
                igst_rate: igstRate,
                igst_amount: igstAmt,
                total_amount: itemTotal
            });
        }

        const freight = parseFloat(freight_charges) || 0;
        const other = parseFloat(other_charges) || 0;
        const subtotal = totalTaxable + totalCgst + totalSgst + totalIgst + freight + other;
        const roundedTotal = quotation && !quotation_edit_mode
            ? parseFloat(quotation.net_amount)
            : Math.round(subtotal);
        const roundOff = quotation && !quotation_edit_mode
            ? +(roundedTotal - subtotal).toFixed(2)
            : +(roundedTotal - subtotal).toFixed(2);

        // Fetch / Ensure General Sales Ledger
        const salesLedRes = await client.query(
            `SELECT ledger_id FROM ledgers WHERE company_id = $1 AND (ledger_code = 'LED-SALES-GEN' OR ledger_code = 'SALES_GEN') ORDER BY (ledger_code = 'LED-SALES-GEN') DESC LIMIT 1`,
            [companyId]
        );
        let salesLedgerId;
        if (salesLedRes.rows.length === 0) {
            // Find Sales Accounts group
            const grpRes = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-SALES' OR group_code = 'SALES_ACCOUNTS') LIMIT 1`, [companyId]);
            const gid = grpRes.rows[0]?.group_id;
            const newLed = await client.query(`
                INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type)
                VALUES ($1, $2, 'General Sales Account', 'LED-SALES-GEN', 'CR', 'CR') RETURNING ledger_id
            `, [companyId, gid]);
            salesLedgerId = newLed.rows[0].ledger_id;
        } else {
            salesLedgerId = salesLedRes.rows[0].ledger_id;
        }

        // Generate Invoice Number
        const invoiceNumber = await generateDocNumber(client, companyId, 'INV');
        const calculatedDueDate = due_date || invoice_date;

        // 1. Insert Sales Invoice Header (Default: UNPAID with full amount in outstanding customer due)
        const isPaidImmediately = Boolean(req.body.is_paid || req.body.payment_received);
        const initialPaid = isPaidImmediately ? roundedTotal : 0.00;
        const initialOutstanding = isPaidImmediately ? 0.00 : roundedTotal;
        const initialPaymentStatus = isPaidImmediately ? 'PAID' : 'UNPAID';

        const invRes = await client.query(`
            INSERT INTO sales_invoices (
                company_id, branch_id, customer_id, sales_ledger_id,
                invoice_number, invoice_date, due_date, sales_order_id, quotation_id,
                invoice_type, place_of_supply_state_code, currency_code,
                total_taxable_amount, total_discount_amount,
                total_cgst_amount, total_sgst_amount, total_igst_amount,
                freight_charges, other_charges, round_off_amount, net_total_amount,
                paid_amount, outstanding_amount, payment_status, status, created_by
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9,
                $10, $11, 'INR',
                $12, $13,
                $14, $15, $16,
                $17, $18, $19, $20,
                $21, $22, $23, 'POSTED', $24
            ) RETURNING *
        `, [
            companyId, branchId, customer_id, salesLedgerId,
            invoiceNumber, invoice_date, calculatedDueDate, cleanSalesOrderId, cleanQuotationId,
            invoice_type, customerStateCode,
            totalTaxable, totalDiscount,
            totalCgst, totalSgst, totalIgst,
            freight, other, roundOff, roundedTotal,
            initialPaid, initialOutstanding, initialPaymentStatus,
            createdBy
        ]);
        const invoice = invRes.rows[0];

        // 2. Insert Sales Invoice Items
        for (let i = 0; i < calculatedItems.length; i++) {
            const it = calculatedItems[i];
            await client.query(`
                INSERT INTO sales_invoice_items (
                    sales_invoice_id, line_number, item_type, product_id, service_id,
                    item_name, item_code, hsn_sac_code,
                    quantity, unit_of_measure, unit_rate, discount_percentage, discount_amount,
                    taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
                    igst_rate, igst_amount, total_amount
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8,
                    $9, $10, $11, $12, $13,
                    $14, $15, $16, $17, $18, $19,
                    $20, $21, $22
                )
            `, [
                invoice.sales_invoice_id, i + 1, it.item_type || 'PRODUCT', sanitizeId(it.product_id), sanitizeId(it.service_id),
                it.item_name, it.item_code, it.hsn_sac_code,
                it.quantity, it.unit_of_measure, it.unit_rate, it.discount_percentage, it.discount_amount,
                it.taxable_amount, it.tax_rate, it.cgst_rate, it.cgst_amount, it.sgst_rate, it.sgst_amount,
                it.igst_rate, it.igst_amount, it.total_amount
            ]);
        }

        // =====================================================================
        // 3. POST BALANCED DOUBLE-ENTRY ACCOUNTING VOUCHER (SALES)
        // DEBIT: Customer Ledger (Total Amount)
        // CREDIT: General Sales Ledger (Taxable Amount)
        // CREDIT: CGST Output (if any)
        // CREDIT: SGST Output (if any)
        // CREDIT: IGST Output (if any)
        // CREDIT/DEBIT: Round Off (if any)
        // =====================================================================
        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-SALES', 'SALES') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `V-SAL-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                reference_number, reference_date, narration, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $5, $7, 'SALES_INVOICE', $8,
                $9, $10, $10, CURRENT_TIMESTAMP
            ) RETURNING *
        `, [
            companyId, branchId, voucherTypeId, vNum, invoice_date,
            invoiceNumber, `Sales Invoice ${invoiceNumber} issued to ${customer.trade_name}`,
            invoice.sales_invoice_id, isPaidImmediately, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        // Voucher Lines
        let lineNo = 1;

        // Line 1: Customer Bill Reference
        const custVl = await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, $2, $3, $4, 0.00, $5) RETURNING line_id
        `, [voucher.voucher_id, lineNo++, customer.ledger_id, roundedTotal, `Bill: ${invoiceNumber}`]);

        // Bill Allocation: NEW_REF for Customer Outstanding Due
        await client.query(`
            INSERT INTO bill_allocations (
                voucher_line_id, ledger_id, reference_type, bill_reference_no,
                amount, dr_cr, due_date
            ) VALUES ($1, $2, 'NEW_REF', $3, $4, 'DR', $5)
        `, [custVl.rows[0].line_id, customer.ledger_id, invoiceNumber, roundedTotal, calculatedDueDate]);

        // Line 2: Sales Revenue Ledger
        await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, $2, $3, 0.00, $4, 'Sales Revenue')
        `, [voucher.voucher_id, lineNo++, salesLedgerId, totalTaxable]);

        // If paid immediately at sale time, update ledger balances; otherwise do not add to accounts until customer pays
        if (isPaidImmediately) {
            await applyLedgerBalance(client, companyId, salesLedgerId, 0, totalTaxable);
        }

        // Helper: Find or create tax ledgers
        const getTaxLedger = async (code, name, taxType = 'NONE') => {
            let resL = await client.query(`SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`, [companyId, code]);
            if (resL.rows.length === 0) {
                const grp = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-TAXES' OR group_code = 'DUTIES_AND_TAXES') LIMIT 1`, [companyId]);
                const gid = grp.rows[0]?.group_id;
                resL = await client.query(`
                    INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type, tax_type)
                    VALUES ($1, $2, $3, $4, 'CR', 'CR', $5) RETURNING ledger_id
                `, [companyId, gid, name, code, taxType]);
            }
            return resL.rows[0].ledger_id;
        };

        // Line 3: CGST Output (if intra-state)
        if (totalCgst > 0) {
            const cgstLedgerId = await getTaxLedger('CGST_OUT', 'CGST Output Account', 'CGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, 0.00, $4, 'CGST Output')
            `, [voucher.voucher_id, lineNo++, cgstLedgerId, totalCgst]);
            await applyLedgerBalance(client, companyId, cgstLedgerId, 0, totalCgst);
        }

        // Line 4: SGST Output (if intra-state)
        if (totalSgst > 0) {
            const sgstLedgerId = await getTaxLedger('SGST_OUT', 'SGST Output Account', 'SGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, 0.00, $4, 'SGST Output')
            `, [voucher.voucher_id, lineNo++, sgstLedgerId, totalSgst]);
            await applyLedgerBalance(client, companyId, sgstLedgerId, 0, totalSgst);
        }

        // Line 5: IGST Output (if inter-state)
        if (totalIgst > 0) {
            const igstLedgerId = await getTaxLedger('IGST_OUT', 'IGST Output Account', 'IGST');
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, 0.00, $4, 'IGST Output')
            `, [voucher.voucher_id, lineNo++, igstLedgerId, totalIgst]);
            await applyLedgerBalance(client, companyId, igstLedgerId, 0, totalIgst);
        }

        // Line 6: Round Off (if any)
        if (roundOff !== 0) {
            const roLedgerId = await getTaxLedger('ROUND_OFF', 'Round Off Account', 'NONE');
            const roDebit = roundOff < 0 ? Math.abs(roundOff) : 0;
            const roCredit = roundOff > 0 ? roundOff : 0;
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, 'Round Off')
            `, [voucher.voucher_id, lineNo++, roLedgerId, roDebit, roCredit]);
            await applyLedgerBalance(client, companyId, roLedgerId, roDebit, roCredit);
        }

        // Update Invoice with Accounting Voucher Reference
        await client.query(`
            UPDATE sales_invoices 
            SET accounting_voucher_id = $1 
            WHERE sales_invoice_id = $2
        `, [voucher.voucher_id, invoice.sales_invoice_id]);

        await recalculateLedgerBalance(client, salesLedgerId, companyId);

        if (cleanQuotationId) {
            await client.query(
                `UPDATE quotations SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP WHERE quotation_id = $1`,
                [cleanQuotationId]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Sales Invoice created & posted into Double-Entry Ledger successfully',
            data: {
                ...invoice,
                accounting_voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number,
                items: calculatedItems
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createSalesInvoice:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    } finally {
        client.release();
    }
};

// 2. Get All Sales Invoices
export const getSalesInvoices = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const customerId = req.query.customer_id;
        const paymentStatus = req.query.payment_status;
        const search = req.query.search;

        let query = `
            SELECT 
                si.*,
                cp.trade_name AS customer_name,
                cp.customer_code,
                cp.phone AS customer_phone,
                v.voucher_number
            FROM sales_invoices si
            JOIN customer_profiles cp ON si.customer_id = cp.customer_id
            LEFT JOIN vouchers v ON si.accounting_voucher_id = v.voucher_id
            WHERE si.company_id = $1
        `;
        const params = [companyId];

        if (customerId) {
            params.push(customerId);
            query += ` AND si.customer_id = $${params.length}`;
        }
        if (paymentStatus) {
            params.push(paymentStatus.toUpperCase());
            query += ` AND si.payment_status = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (si.invoice_number ILIKE $${params.length} OR cp.trade_name ILIKE $${params.length})`;
        }

        query += ` ORDER BY si.invoice_date DESC, si.sales_invoice_id DESC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getSalesInvoices:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Single Sales Invoice with Items
export const getSalesInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invRes = await pool.query(`
            SELECT 
                si.*,
                cp.trade_name AS customer_name,
                cp.legal_name AS customer_legal_name,
                cp.customer_code,
                cp.gstin AS customer_gstin,
                cp.billing_address_line1,
                cp.billing_city,
                cp.billing_state_code,
                cp.billing_postal_code,
                cp.phone,
                cp.email,
                v.voucher_number
            FROM sales_invoices si
            JOIN customer_profiles cp ON si.customer_id = cp.customer_id
            LEFT JOIN vouchers v ON si.accounting_voucher_id = v.voucher_id
            WHERE si.sales_invoice_id = $1
        `, [id]);

        if (invRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sales invoice not found' });
        }

        const itemsRes = await pool.query(`
            SELECT 
                sii.*,
                COALESCE(sii.item_type, CASE WHEN sii.service_id IS NOT NULL THEN 'SERVICE' ELSE 'PRODUCT' END) AS item_type,
                COALESCE(s.service_name, p.product_name, sii.item_name, 'Item') AS product_name,
                COALESCE(s.service_name, p.product_name, sii.item_name, 'Item') AS item_name,
                COALESCE(s.service_code, p.product_code, p.code, sii.item_code) AS sku,
                COALESCE(s.service_code, p.product_code, p.code, sii.item_code) AS product_code,
                COALESCE(s.category, p.category) AS category
            FROM sales_invoice_items sii
            LEFT JOIN products p ON sii.product_id = p.product_id
            LEFT JOIN services s ON sii.service_id = s.service_id
            WHERE sii.sales_invoice_id = $1
            ORDER BY sii.line_number ASC
        `, [id]);

        return res.json({
            success: true,
            data: {
                ...invRes.rows[0],
                items: itemsRes.rows
            }
        });
    } catch (error) {
        console.error('Error in getSalesInvoiceById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// =========================================================================
// 4. BILL-WISE RECEIPT SETTLEMENT (Customer Payment & Invoice Matching)
// =========================================================================
export const recordReceiptSettlement = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            customer_id,
            payment_mode = 'BANK', // 'BANK' or 'CASH'
            bank_account_id = null,
            payment_ledger_id = null,
            payment_instrument_type = 'NEFT', // CASH, CHEQUE, NEFT, RTGS, IMPS, UPI, CARD
            settlement_date = new Date().toISOString().split('T')[0],
            amount,
            instrument_reference_number,
            narration,
            allocations = [], // [{ invoice_id, allocated_amount }]
            invoices_to_settle = []
        } = req.body;

        const companyId = sanitizeId(req.body.company_id || req.user?.company_id);
        const branchId = sanitizeId(req.body.branch_id || req.user?.branch_id);
        const createdBy = await getValidEmployeeId(client, req.user?.employee_id);
        const cleanCustomerId = sanitizeId(customer_id);

        const receiptAmount = parseFloat(amount);
        if (!companyId || !cleanCustomerId || !receiptAmount || receiptAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID, Customer ID, and a valid Receipt Amount are required.'
            });
        }

        // Fetch customer ledger & profile
        const custRes = await client.query(`
            SELECT cp.*, l.ledger_id, l.ledger_name
            FROM customer_profiles cp 
            JOIN ledgers l ON cp.ledger_id = l.ledger_id 
            WHERE cp.customer_id = $1
        `, [cleanCustomerId]);
        if (custRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        const customer = custRes.rows[0];
        const customerLedgerId = customer.ledger_id;

        const rawAllocs = (allocations && allocations.length > 0)
            ? allocations
            : (invoices_to_settle && invoices_to_settle.length > 0)
            ? invoices_to_settle
            : (req.body.invoice_id ? [{ invoice_id: req.body.invoice_id, allocated_amount: receiptAmount }] : []);

        const normalizedAllocations = rawAllocs
            .map((allocation) => ({
                invoice_id: Number(allocation.invoice_id || allocation.sales_invoice_id),
                allocated_amount: Number(allocation.allocated_amount || allocation.amount)
            }))
            .filter((allocation) => Number.isInteger(allocation.invoice_id) && allocation.allocated_amount > 0);

        let settledInvoice = null;
        if (normalizedAllocations.length === 1) {
            const allocation = normalizedAllocations[0];
            const invoiceRes = await client.query(`
                SELECT sales_invoice_id, invoice_number, outstanding_amount, paid_amount, net_total_amount, payment_status, sales_ledger_id
                FROM sales_invoices
                WHERE sales_invoice_id = $1
                  AND customer_id = $2
                  AND company_id = $3
                FOR UPDATE
            `, [allocation.invoice_id, cleanCustomerId, companyId]);

            if (invoiceRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'The selected invoice does not belong to this customer.'
                });
            }

            settledInvoice = invoiceRes.rows[0];
            const outstandingAmount = Number(settledInvoice.outstanding_amount) || 0;
            if (settledInvoice.payment_status === 'PAID' || outstandingAmount <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'The selected invoice is already fully settled.'
                });
            }

            if (allocation.allocated_amount > outstandingAmount + 0.01) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Payment exceeds the selected invoice outstanding amount of ₹${outstandingAmount.toFixed(2)}.`
                });
            }

            if (Math.abs(allocation.allocated_amount - receiptAmount) > 0.01) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'The invoice allocation must equal the receipt amount.'
                });
            }
        }

        // Resolve Bank or Cash Payment Ledger
        let targetPaymentLedgerId = null;
        let selectedBankDetails = null;

        if (payment_mode === 'BANK') {
            if (bank_account_id) {
                const baRes = await client.query(`
                    SELECT ba.bank_account_id, ba.ledger_id, ba.bank_name, ba.account_number
                    FROM bank_accounts ba
                    WHERE (ba.bank_account_id::TEXT = $1 OR ba.ledger_id::TEXT = $1)
                      AND ba.company_id = $2 AND ba.is_active = TRUE
                `, [String(bank_account_id), companyId]);
                if (baRes.rows.length > 0) {
                    targetPaymentLedgerId = baRes.rows[0].ledger_id;
                    selectedBankDetails = baRes.rows[0];
                } else {
                    const ledCheck = await client.query(`
                        SELECT l.ledger_id, l.ledger_name, l.ledger_code
                        FROM ledgers l
                        JOIN account_groups ag ON ag.group_id = l.group_id
                        WHERE l.ledger_id::TEXT = $1 AND l.company_id = $2 AND ag.group_code IN ('GRP-BANK', 'BANK_ACCOUNTS') AND l.is_active = TRUE
                    `, [String(bank_account_id), companyId]);
                    if (ledCheck.rows.length > 0) {
                        targetPaymentLedgerId = ledCheck.rows[0].ledger_id;
                        selectedBankDetails = {
                            bank_account_id: ledCheck.rows[0].ledger_id,
                            bank_name: ledCheck.rows[0].ledger_name,
                            account_number: ledCheck.rows[0].ledger_code,
                            ledger_id: ledCheck.rows[0].ledger_id
                        };
                    }
                }
            }

            if (!targetPaymentLedgerId) {
                const defaultBankRes = await client.query(`
                    SELECT ba.bank_account_id, ba.ledger_id, ba.bank_name, ba.account_number
                    FROM bank_accounts ba
                    WHERE ba.company_id = $1 AND ba.is_active = TRUE
                    ORDER BY ba.bank_account_id ASC LIMIT 1
                `, [companyId]);
                if (defaultBankRes.rows.length > 0) {
                    targetPaymentLedgerId = defaultBankRes.rows[0].ledger_id;
                    selectedBankDetails = defaultBankRes.rows[0];
                } else {
                    const fallbackRes = await client.query(`
                        SELECT l.ledger_id, l.ledger_name, l.ledger_code
                        FROM ledgers l
                        JOIN account_groups ag ON l.group_id = ag.group_id
                        WHERE l.company_id = $1 AND ag.group_code IN ('GRP-BANK', 'BANK_ACCOUNTS') AND l.is_active = TRUE
                        ORDER BY (l.ledger_code = 'LED-BANK-MAIN') DESC, l.ledger_id ASC
                        LIMIT 1
                    `, [companyId]);
                    if (fallbackRes.rows.length > 0) {
                        targetPaymentLedgerId = fallbackRes.rows[0].ledger_id;
                        selectedBankDetails = {
                            bank_account_id: fallbackRes.rows[0].ledger_id,
                            bank_name: fallbackRes.rows[0].ledger_name,
                            account_number: fallbackRes.rows[0].ledger_code,
                            ledger_id: fallbackRes.rows[0].ledger_id
                        };
                    }
                }
            }

            if (!targetPaymentLedgerId) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'No registered bank accounts found. Please add a bank account in Ledger & Banking.'
                });
            }
        } else {
            // CASH mode
            if (payment_ledger_id) {
                const ledCheck = await client.query(`
                    SELECT l.ledger_id, l.ledger_name, l.current_balance, l.current_balance_type
                    FROM ledgers l
                    JOIN account_groups ag ON ag.group_id = l.group_id
                    WHERE l.ledger_id::TEXT = $1 AND l.company_id = $2 AND ag.group_code IN ('GRP-CASH', 'CASH_IN_HAND') AND l.is_active = TRUE
                `, [String(payment_ledger_id), companyId]);
                if (ledCheck.rows.length > 0) {
                    targetPaymentLedgerId = ledCheck.rows[0].ledger_id;
                }
            }

            if (!targetPaymentLedgerId) {
                const fundedCashRes = await client.query(`
                    SELECT l.ledger_id FROM ledgers l
                    JOIN account_groups ag ON ag.group_id = l.group_id
                    WHERE l.company_id = $1 AND ag.group_code IN ('GRP-CASH', 'CASH_IN_HAND') AND l.current_balance > 0 AND l.is_active = TRUE
                    ORDER BY l.current_balance DESC
                    LIMIT 1
                `, [companyId]);
                if (fundedCashRes.rows.length > 0) {
                    targetPaymentLedgerId = fundedCashRes.rows[0].ledger_id;
                } else {
                    let payLedRes = await client.query(
                        `SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = 'LED-CASH-MAIN' AND is_active = TRUE`,
                        [companyId]
                    );
                    if (payLedRes.rows.length > 0) {
                        targetPaymentLedgerId = payLedRes.rows[0].ledger_id;
                    } else {
                        const fallbackRes = await client.query(`
                            SELECT l.ledger_id FROM ledgers l
                            JOIN account_groups ag ON l.group_id = ag.group_id
                            WHERE l.company_id = $1 AND ag.group_code IN ('GRP-CASH', 'CASH_IN_HAND') AND l.is_active = TRUE
                            LIMIT 1
                        `, [companyId]);
                        targetPaymentLedgerId = fallbackRes.rows[0]?.ledger_id;
                    }
                }
            }

            if (!targetPaymentLedgerId) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'No cash in hand ledger found. Please check Chart of Accounts.'
                });
            }
        }

        // Resolve General Sales Ledger for Income Recognition
        let targetSalesLedgerId = settledInvoice?.sales_ledger_id;
        if (!targetSalesLedgerId) {
            const salesLedRes = await client.query(
                `SELECT ledger_id FROM ledgers WHERE company_id = $1 AND (ledger_code = 'LED-SALES-GEN' OR ledger_code = 'SALES_GEN')`,
                [companyId]
            );
            if (salesLedRes.rows.length > 0) {
                targetSalesLedgerId = salesLedRes.rows[0].ledger_id;
            } else {
                const grpRes = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-SALES' OR group_code = 'SALES_ACCOUNTS') LIMIT 1`, [companyId]);
                const gid = grpRes.rows[0]?.group_id;
                const newLed = await client.query(`
                    INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type)
                    VALUES ($1, $2, 'General Sales Account', 'LED-SALES-GEN', 'CR', 'CR') RETURNING ledger_id
                `, [companyId, gid]);
                targetSalesLedgerId = newLed.rows[0].ledger_id;
            }
        }

        // Post Double-Entry Receipt Voucher (VCH-RECEIPT)
        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-RECEIPT', 'RECEIPT') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `RCT-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const receiptNarration = narration || (
            payment_mode === 'BANK' && selectedBankDetails
                ? `Receipt of ₹${receiptAmount.toFixed(2)} from ${customer.trade_name} to ${selectedBankDetails.bank_name} (${selectedBankDetails.account_number})`
                : `Receipt of ₹${receiptAmount.toFixed(2)} from ${customer.trade_name} via ${payment_mode === 'CASH' ? 'Cash in Hand' : 'Bank'}`
        );

        // 1. Voucher Header (is_posted = TRUE, source_module = 'RECEIPT')
        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                reference_number, reference_date, narration, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $5, $7, 'RECEIPT', $8,
                TRUE, $9, $9, CURRENT_TIMESTAMP
            ) RETURNING *
        `, [
            companyId, branchId, voucherTypeId, vNum, settlement_date,
            instrument_reference_number || vNum,
            receiptNarration,
            settledInvoice ? settledInvoice.sales_invoice_id : null,
            createdBy
        ]);
        const voucher = voucherRes.rows[0];

        // 2. Line 1: DEBIT Bank / Cash Ledger (Adds money to Bank or Cash in Hand)
        const line1Narration = payment_mode === 'BANK' && selectedBankDetails
            ? `Deposited to ${selectedBankDetails.bank_name} (${selectedBankDetails.account_number}) ref: ${instrument_reference_number || vNum}`
            : `Received via ${payment_mode} ref: ${instrument_reference_number || vNum}`;

        await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 1, $2, $3, 0.00, $4)
        `, [voucher.voucher_id, targetPaymentLedgerId, receiptAmount, line1Narration]);

        await applyLedgerBalance(client, companyId, targetPaymentLedgerId, receiptAmount, 0);

        // 3. Line 2: CREDIT General Sales / Income Ledger (Recognizes revenue into accounts)
        const line2Narration = settledInvoice
            ? `Sales income from ${customer.trade_name} (Inv: ${settledInvoice.invoice_number})`
            : `Sales income from ${customer.trade_name}`;

        const creditLineRes = await client.query(`
            INSERT INTO voucher_lines (
                voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 2, $2, 0.00, $3, $4) RETURNING line_id
        `, [voucher.voucher_id, targetSalesLedgerId, receiptAmount, line2Narration]);
        const creditVoucherLineId = creditLineRes.rows[0].line_id;

        await applyLedgerBalance(client, companyId, targetSalesLedgerId, 0, receiptAmount);

        // 4. Update Invoices & Bill Allocations
        let allocatedTotal = 0;
        for (const alloc of normalizedAllocations) {
            const allocAmt = parseFloat(alloc.allocated_amount);
            if (alloc.invoice_id && allocAmt > 0) {
                const invCheck = await client.query(
                    `SELECT * FROM sales_invoices WHERE sales_invoice_id = $1 FOR UPDATE`,
                    [alloc.invoice_id]
                );
                if (invCheck.rows.length > 0) {
                    const inv = invCheck.rows[0];
                    const newPaid = +(parseFloat(inv.paid_amount || 0) + allocAmt).toFixed(2);
                    const newOutstanding = Math.max(0, +(parseFloat(inv.net_total_amount) - newPaid).toFixed(2));
                    const newStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

                    await client.query(`
                        UPDATE sales_invoices 
                        SET paid_amount = $1, outstanding_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
                        WHERE sales_invoice_id = $4
                    `, [newPaid, newOutstanding, newStatus, alloc.invoice_id]);

                    // Add Bill Allocation record
                    await client.query(`
                        INSERT INTO bill_allocations (
                            voucher_line_id, ledger_id, reference_type, bill_reference_no,
                            amount, dr_cr
                        ) VALUES ($1, $2, 'AGST_REF', $3, $4, 'CR')
                    `, [creditVoucherLineId, customerLedgerId, inv.invoice_number, allocAmt]);

                    allocatedTotal += allocAmt;
                }
            }
        }

        const unallocatedAmount = Math.max(0, +(receiptAmount - allocatedTotal).toFixed(2));

        // 5. Insert Settlement Voucher Record
        const settlementRes = await client.query(`
            INSERT INTO settlement_vouchers (
                company_id, branch_id, settlement_type, voucher_number, settlement_date,
                party_ledger_id, payment_mode_ledger_id, amount, unallocated_amount,
                payment_instrument_type, instrument_reference_number,
                accounting_voucher_id, status, created_by
            ) VALUES (
                $1, $2, 'RECEIPT', $3, $4,
                $5, $6, $7, $8,
                $9, $10,
                $11, 'POSTED', $12
            ) RETURNING *
        `, [
            companyId, branchId, vNum, settlement_date,
            customerLedgerId, targetPaymentLedgerId, receiptAmount, unallocatedAmount,
            payment_instrument_type, instrument_reference_number || null,
            voucher.voucher_id, createdBy
        ]);

        // Recalculate balances from audit lines to guarantee consistency
        await recalculateLedgerBalance(client, targetPaymentLedgerId, companyId);
        await recalculateLedgerBalance(client, targetSalesLedgerId, companyId);
        if (customerLedgerId) {
            await recalculateLedgerBalance(client, customerLedgerId, companyId);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Receipt recorded, deposited into account, and posted to accounts successfully',
            data: {
                settlement: settlementRes.rows[0],
                voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in recordReceiptSettlement:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    } finally {
        client.release();
    }
};
// =========================================================================
// 5. SALES QUOTATIONS
// =========================================================================
export const getQuotations = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const result = await pool.query(`
            SELECT q.*, cp.trade_name AS customer_name, cp.phone,
                   COALESCE(
                       json_agg(qi ORDER BY qi.line_number) FILTER (WHERE qi.quotation_item_id IS NOT NULL),
                       '[]'::json
                   ) AS items
            FROM quotations q
            JOIN customer_profiles cp ON q.customer_id = cp.customer_id
            LEFT JOIN quotation_items qi ON qi.quotation_id = q.quotation_id
            WHERE q.company_id = $1
            GROUP BY q.quotation_id, cp.trade_name, cp.phone
            ORDER BY q.quotation_date DESC, q.quotation_id DESC
        `, [companyId]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createQuotation = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { customer_id, quotation_date = new Date().toISOString().split('T')[0], valid_until, items = [], terms_and_conditions } = req.body;
        const companyId = sanitizeId(req.body.company_id || req.user?.company_id);
        const branchId = sanitizeId(req.body.branch_id || req.user?.branch_id);
        const createdBy = await getValidEmployeeId(client, req.user?.employee_id);
        const cleanCustomerId = sanitizeId(customer_id);

        if (!companyId || !cleanCustomerId || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID, Customer, and Items are required' });
        }

        const validDate = valid_until || quotation_date;
        const countQ = await client.query(`SELECT COUNT(*)::INT AS cnt FROM quotations WHERE company_id = $1`, [companyId]);
        const qNum = `QTN-${new Date().getFullYear()}-${(countQ.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        let totalTaxable = 0, totalTax = 0;
        const parsedItems = items.map((it, idx) => {
            const qty = parseFloat(it.quantity) || 1;
            const rate = parseFloat(it.quoted_rate) || 0;
            const taxable = +(qty * rate).toFixed(2);
            const taxRate = parseFloat(it.tax_rate) || 18;
            const taxAmt = +(taxable * (taxRate / 100)).toFixed(2);
            totalTaxable += taxable;
            totalTax += taxAmt;
            return {
                ...it,
                line_number: idx + 1,
                quantity: qty,
                quoted_rate: rate,
                taxable_amount: taxable,
                tax_rate: taxRate,
                tax_amount: taxAmt,
                total_amount: +(taxable + taxAmt).toFixed(2)
            };
        });

        const net = +(totalTaxable + totalTax).toFixed(2);

        const qRes = await client.query(`
            INSERT INTO quotations (
                company_id, branch_id, customer_id, quotation_number, quotation_date,
                valid_until, total_taxable_amount, total_tax_amount, net_amount,
                status, terms_and_conditions, created_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                'DRAFT', $10, $11
            ) RETURNING *
        `, [companyId, branchId, cleanCustomerId, qNum, quotation_date, validDate, totalTaxable, totalTax, net, terms_and_conditions, createdBy]);
        const quote = qRes.rows[0];

        for (const item of parsedItems) {
            const isService = item.item_type === 'SERVICE' || Boolean(item.service_id);
            await client.query(`
                INSERT INTO quotation_items (
                    quotation_id, line_number, item_type, product_id, service_id, hsn_sac_code,
                    quantity, unit_of_measure, quoted_rate, taxable_amount, tax_rate,
                    cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                quote.quotation_id, item.line_number, isService ? 'SERVICE' : 'PRODUCT',
                isService ? null : sanitizeId(item.product_id), isService ? sanitizeId(item.service_id || item.product_id) : null,
                item.hsn_sac_code || (isService ? '9983' : '9988'),
                item.quantity, item.unit_of_measure || (isService ? 'HRS' : 'PCS'), item.quoted_rate, item.taxable_amount, item.tax_rate,
                +(item.tax_amount / 2).toFixed(2), +(item.tax_amount / 2).toFixed(2), 0, item.total_amount
            ]);
        }

        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: { ...quote, items: parsedItems } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createQuotation:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// =========================================================================
// 6. SALES ORDERS
// =========================================================================
export const getSalesOrders = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const result = await pool.query(`
            SELECT so.*, cp.trade_name AS customer_name, cp.phone
            FROM sales_orders so
            JOIN customer_profiles cp ON so.customer_id = cp.customer_id
            WHERE so.company_id = $1
            ORDER BY so.order_date DESC, so.sales_order_id DESC
        `, [companyId]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createSalesOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { customer_id, quotation_id = null, order_date = new Date().toISOString().split('T')[0], delivery_due_date, customer_po_reference, items = [], terms_and_conditions } = req.body;
        const companyId = sanitizeId(req.body.company_id || req.user?.company_id);
        const branchId = sanitizeId(req.body.branch_id || req.user?.branch_id);
        const createdBy = await getValidEmployeeId(client, req.user?.employee_id);
        const cleanCustomerId = sanitizeId(customer_id);
        const cleanQuotationId = sanitizeId(quotation_id);

        if (!companyId || !cleanCustomerId || items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID, Customer, and Items are required' });
        }

        const countSO = await client.query(`SELECT COUNT(*)::INT AS cnt FROM sales_orders WHERE company_id = $1`, [companyId]);
        const soNum = `SO-${new Date().getFullYear()}-${(countSO.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        let totalTaxable = 0, totalTax = 0;
        const parsedItems = items.map((it, idx) => {
            const qty = parseFloat(it.ordered_quantity || it.quantity) || 1;
            const rate = parseFloat(it.unit_rate) || 0;
            const taxable = +(qty * rate).toFixed(2);
            const taxRate = parseFloat(it.tax_rate) || 18;
            const taxAmt = +(taxable * (taxRate / 100)).toFixed(2);
            totalTaxable += taxable;
            totalTax += taxAmt;
            return {
                ...it,
                line_number: idx + 1,
                ordered_quantity: qty,
                unit_rate: rate,
                taxable_amount: taxable,
                tax_rate: taxRate,
                tax_amount: taxAmt,
                total_amount: +(taxable + taxAmt).toFixed(2)
            };
        });

        const net = +(totalTaxable + totalTax).toFixed(2);

        const soRes = await client.query(`
            INSERT INTO sales_orders (
                company_id, branch_id, customer_id, quotation_id, order_number, order_date,
                delivery_due_date, customer_po_reference, total_taxable_amount, total_tax_amount,
                net_amount, status, billing_status, terms_and_conditions, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, 'PENDING', 'UNBILLED', $12, $13
            ) RETURNING *
        `, [companyId, branchId, cleanCustomerId, cleanQuotationId, soNum, order_date, delivery_due_date || order_date, customer_po_reference, totalTaxable, totalTax, net, terms_and_conditions, createdBy]);
        const so = soRes.rows[0];

        for (const item of parsedItems) {
            await client.query(`
                INSERT INTO sales_order_items (
                    sales_order_id, line_number, product_id, hsn_sac_code,
                    ordered_quantity, unit_of_measure, unit_rate, taxable_amount, tax_rate,
                    cgst_amount, sgst_amount, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                so.sales_order_id, item.line_number, sanitizeId(item.product_id), item.hsn_sac_code || '9988',
                item.ordered_quantity, item.unit_of_measure || 'PCS', item.unit_rate, item.taxable_amount, item.tax_rate,
                +(item.tax_amount / 2).toFixed(2), +(item.tax_amount / 2).toFixed(2), 0, item.total_amount
            ]);
        }

        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: { ...so, items: parsedItems } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createSalesOrder:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

export const convertQuotationToSalesOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyId = req.scopeCompanyId || req.user?.company_id;
        const quotationId = req.params.id;
        await client.query('BEGIN');

        const quotationRes = await client.query(`
            SELECT * FROM quotations
            WHERE quotation_id = $1 AND company_id = $2
            FOR UPDATE
        `, [quotationId, companyId]);
        if (quotationRes.rows.length === 0) throw new Error('Quotation not found.');
        const quotation = quotationRes.rows[0];
        if (['CONVERTED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(quotation.status)) {
            throw new Error(`Quotation cannot be converted from status ${quotation.status}.`);
        }

        const existingOrder = await client.query(
            `SELECT sales_order_id FROM sales_orders WHERE quotation_id = $1 LIMIT 1`,
            [quotationId]
        );
        if (existingOrder.rows.length > 0) throw new Error('This quotation is already converted to a sales order.');

        const itemsRes = await client.query(
            `SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY line_number`,
            [quotationId]
        );
        if (itemsRes.rows.length === 0) throw new Error('Quotation has no items.');

        const countRes = await client.query(`SELECT COUNT(*)::INT AS cnt FROM sales_orders WHERE company_id = $1`, [companyId]);
        const orderNumber = `SO-${new Date().getFullYear()}-${String(countRes.rows[0].cnt + 1).padStart(4, '0')}`;
        const orderRes = await client.query(`
            INSERT INTO sales_orders (
                company_id, branch_id, customer_id, quotation_id, order_number, order_date,
                delivery_due_date, total_taxable_amount, total_tax_amount, net_amount,
                status, billing_status, terms_and_conditions, created_by
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE, $6, $7, $8, 'PENDING', 'UNBILLED', $9, $10)
            RETURNING *
        `, [companyId, quotation.branch_id, quotation.customer_id, quotationId, orderNumber,
            quotation.total_taxable_amount, quotation.total_tax_amount, quotation.net_amount,
            quotation.terms_and_conditions, sanitizeId(req.user?.employee_id)]);

        for (const item of itemsRes.rows) {
            await client.query(`
                INSERT INTO sales_order_items (
                    sales_order_id, line_number, product_id, hsn_sac_code,
                    ordered_quantity, unit_of_measure, unit_rate, discount_percentage,
                    discount_amount, taxable_amount, tax_rate, cgst_rate, cgst_amount,
                    sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8, $9, 0, $10, 0, $11, 0, $12, $13)
            `, [orderRes.rows[0].sales_order_id, item.line_number, sanitizeId(item.product_id), item.hsn_sac_code,
                item.quantity, item.unit_of_measure, item.quoted_rate, item.taxable_amount, item.tax_rate,
                item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount]);
        }

        await client.query(`UPDATE quotations SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP WHERE quotation_id = $1`, [quotationId]);
        await client.query('COMMIT');
        return res.status(201).json({ success: true, message: 'Quotation converted to sales order.', data: { ...orderRes.rows[0], items: itemsRes.rows } });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};
