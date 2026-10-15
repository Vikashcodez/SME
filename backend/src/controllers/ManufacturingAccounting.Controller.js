import pool from '../config/database.js';

// Helper: Find or create standard ledger
const ensureLedger = async (client, companyId, code, name, groupCode, drCr = 'DR') => {
    let res = await client.query(`SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`, [companyId, code]);
    if (res.rows.length === 0) {
        const grp = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = $2 OR group_name ILIKE $3) LIMIT 1`, [companyId, groupCode, `%${groupCode}%`]);
        const gid = grp.rows[0]?.group_id;
        const newL = await client.query(`
            INSERT INTO ledgers (company_id, group_id, ledger_name, ledger_code, opening_balance_type, current_balance_type)
            VALUES ($1, $2, $3, $4, $5, $5) RETURNING ledger_id
        `, [companyId, gid, name, code, drCr]);
        return newL.rows[0].ledger_id;
    }
    return res.rows[0].ledger_id;
};

// 1. RECORD STOCK JOURNAL / MANUFACTURING VOUCHER (Tally Manufacturing Journal)
export const recordStockJournal = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            voucher_date = new Date().toISOString().split('T')[0],
            production_order_id,
            production_batch_id,
            source_items = [], // Raw materials consumed: [{ raw_material_id, quantity, unit_cost }]
            destination_items = [], // Finished goods produced: [{ product_id, quantity, unit_cost }]
            additional_costs = 0, // Labor / Machining / Overhead added
            narration
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!companyId || (source_items.length === 0 && destination_items.length === 0)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID and items are required.' });
        }

        // Calculate Consumption & Production totals
        let totalConsumptionCost = 0;
        for (const it of source_items) {
            const qty = parseFloat(it.quantity) || 1;
            const cost = parseFloat(it.unit_cost) || 0;
            totalConsumptionCost += (qty * cost);
        }
        totalConsumptionCost = +totalConsumptionCost.toFixed(2);

        let totalProducedCost = 0;
        for (const it of destination_items) {
            const qty = parseFloat(it.quantity) || 1;
            const cost = parseFloat(it.unit_cost) || 0;
            totalProducedCost += (qty * cost);
        }
        totalProducedCost = +totalProducedCost.toFixed(2);

        const netVoucherAmount = Math.max(totalConsumptionCost, totalProducedCost);

        // Fetch or create essential ledgers
        const rawStockLedgerId = await ensureLedger(client, companyId, 'LED-STOCK-RAW', 'Raw Material Stock', 'GRP-STOCK', 'DR');
        const fgStockLedgerId = await ensureLedger(client, companyId, 'LED-STOCK-FG', 'Finished Goods Stock', 'GRP-STOCK', 'DR');
        const mfgConsumptionLedgerId = await ensureLedger(client, companyId, 'LED-MFG-CONSUMPTION', 'Manufacturing Consumption Account', 'GRP-DIR-EXP', 'DR');
        const mfgWipLedgerId = await ensureLedger(client, companyId, 'LED-MFG-WIP', 'Work In Progress (WIP) Stock', 'GRP-STOCK', 'DR');

        // Post Double-Entry Journal Voucher (VCH-JOURNAL with Base Category JOURNAL)
        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-JOURNAL', 'JOURNAL') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `STK-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, reference_date, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $5, 'INVENTORY_CLEARING', $8,
                TRUE, $9, $9, CURRENT_TIMESTAMP
            ) RETURNING voucher_id, voucher_number
        `, [
            companyId, branchId, voucherTypeId, vNum, voucher_date,
            narration || `Stock Journal: Consumed ₹${totalConsumptionCost.toFixed(2)}, Produced ₹${totalProducedCost.toFixed(2)}`,
            vNum, production_order_id || null, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        let lineNo = 1;

        // Entry A: Consumption
        if (totalConsumptionCost > 0) {
            // Debit: Manufacturing Consumption
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, $4, 0.00, 'Raw Material Consumption')
            `, [voucher.voucher_id, lineNo++, mfgConsumptionLedgerId, totalConsumptionCost]);

            // Credit: Raw Material Stock
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, 0.00, $4, 'Raw Material Inventory Issued')
            `, [voucher.voucher_id, lineNo++, rawStockLedgerId, totalConsumptionCost]);
        }

        // Entry B: Finished Goods Output
        if (totalProducedCost > 0) {
            // Debit: Finished Goods Stock
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, $4, 0.00, 'Finished Goods Produced Inward')
            `, [voucher.voucher_id, lineNo++, fgStockLedgerId, totalProducedCost]);

            // Credit: Work in Progress / Manufacturing Clearing
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, 0.00, $4, 'Manufacturing Completion Clearing')
            `, [voucher.voucher_id, lineNo++, mfgWipLedgerId, totalProducedCost]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Manufacturing Stock Journal voucher recorded successfully',
            data: {
                voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number,
                total_consumption: totalConsumptionCost,
                total_produced: totalProducedCost
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in recordStockJournal:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 2. RECORD SCRAP & REJECTION ACCOUNTING (Abnormal Loss / Scrap Journal)
export const recordScrapAccounting = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            voucher_date = new Date().toISOString().split('T')[0],
            quality_check_id,
            production_batch_id,
            rejected_quantity,
            unit_cost,
            scrap_reason = 'Rejected during Quality Check',
            is_scrap_saleable = false
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        const qty = parseFloat(rejected_quantity) || 0;
        const costPerUnit = parseFloat(unit_cost) || 0;
        const totalScrapCost = +(qty * costPerUnit).toFixed(2);

        if (!companyId || totalScrapCost <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Valid company ID, rejected quantity and unit cost are required.' });
        }

        // Ledgers:
        // DEBIT: Production Rejection & Scrap Loss (Indirect Expense)
        // CREDIT: Work in Progress Stock (Asset)
        const scrapLossLedgerId = await ensureLedger(client, companyId, 'LED-LOSS-SCRAP', 'Production Rejection & Scrap Loss', 'GRP-INDIR-EXP', 'DR');
        const mfgWipLedgerId = await ensureLedger(client, companyId, 'LED-MFG-WIP', 'Work In Progress (WIP) Stock', 'GRP-STOCK', 'DR');

        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-JOURNAL', 'JOURNAL') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `SCRAP-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, reference_date, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $5, 'INVENTORY_CLEARING', $8,
                TRUE, $9, $9, CURRENT_TIMESTAMP
            ) RETURNING voucher_id, voucher_number
        `, [
            companyId, branchId, voucherTypeId, vNum, voucher_date,
            `Abnormal Loss: Rejection of ${qty} units (${scrap_reason})`,
            vNum, quality_check_id || null, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        // Line 1: DEBIT Scrap Loss
        await client.query(`
            INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
            VALUES ($1, 1, $2, $3, 0.00, $4)
        `, [voucher.voucher_id, scrapLossLedgerId, totalScrapCost, `Scrap Loss (${qty} units)`]);

        await client.query(`UPDATE ledgers SET current_balance = current_balance + $1 WHERE ledger_id = $2`, [totalScrapCost, scrapLossLedgerId]);

        // Line 2: CREDIT WIP Clearing
        await client.query(`
            INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
            VALUES ($1, 2, $2, 0.00, $3, 'WIP Written Off for Rejected Units')
        `, [voucher.voucher_id, mfgWipLedgerId, totalScrapCost]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Production Rejection & Scrap Loss voucher posted successfully',
            data: {
                voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number,
                rejected_quantity: qty,
                total_scrap_cost: totalScrapCost
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in recordScrapAccounting:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 3. RECORD REWORK COST ACCOUNTING (Direct / Rectification Expense)
export const recordReworkAccounting = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            voucher_date = new Date().toISOString().split('T')[0],
            production_rework_id,
            rework_quantity,
            additional_material_cost = 0,
            additional_labor_cost = 0,
            other_cost = 0,
            rework_reason = 'Defect rectification'
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        const matCost = parseFloat(additional_material_cost) || 0;
        const laborCost = parseFloat(additional_labor_cost) || 0;
        const othCost = parseFloat(other_cost) || 0;
        const totalReworkCost = +(matCost + laborCost + othCost).toFixed(2);

        if (!companyId || totalReworkCost <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Valid company ID and rework costs (> 0) are required.' });
        }

        // Ledgers:
        // DEBIT: Rework & Rectification Cost (Direct Expense)
        // CREDIT: Raw Material Stock (for additional materials) & Cash/Bank/Overhead clearing (for labor/other)
        const reworkLedgerId = await ensureLedger(client, companyId, 'LED-EXP-REWORK', 'Rework & Rectification Cost', 'GRP-DIR-EXP', 'DR');
        const rawStockLedgerId = await ensureLedger(client, companyId, 'LED-STOCK-RAW', 'Raw Material Stock', 'GRP-STOCK', 'DR');
        const cashLedgerId = await ensureLedger(client, companyId, 'LED-CASH-MAIN', 'Cash Account', 'GRP-CASH', 'DR');

        const vtRes = await client.query(`SELECT voucher_type_id FROM voucher_types WHERE voucher_type_code IN ('VCH-JOURNAL', 'JOURNAL') LIMIT 1`);
        const voucherTypeId = vtRes.rows[0]?.voucher_type_id;

        const countV = await client.query(`SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1`, [companyId]);
        const vNum = `RWK-${new Date().getFullYear()}-${(countV.rows[0].cnt + 1).toString().padStart(4, '0')}`;

        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, reference_date, source_module, source_document_id,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $5, 'INVENTORY_CLEARING', $8,
                TRUE, $9, $9, CURRENT_TIMESTAMP
            ) RETURNING voucher_id, voucher_number
        `, [
            companyId, branchId, voucherTypeId, vNum, voucher_date,
            `Rework Cost: ₹${totalReworkCost.toFixed(2)} (${rework_reason})`,
            vNum, production_rework_id || null, createdBy
        ]);
        const voucher = voucherRes.rows[0];

        let lineNo = 1;

        // Line 1: DEBIT Rework Expense
        await client.query(`
            INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
            VALUES ($1, $2, $3, $4, 0.00, 'Rework Cost Incurred')
        `, [voucher.voucher_id, lineNo++, reworkLedgerId, totalReworkCost]);

        await client.query(`UPDATE ledgers SET current_balance = current_balance + $1 WHERE ledger_id = $2`, [totalReworkCost, reworkLedgerId]);

        // Line 2: CREDIT Raw Material Stock (if material used)
        if (matCost > 0) {
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, 0.00, $4, 'Additional Raw Materials for Rework')
            `, [voucher.voucher_id, lineNo++, rawStockLedgerId, matCost]);
            await client.query(`UPDATE ledgers SET current_balance = current_balance - $1 WHERE ledger_id = $2`, [matCost, rawStockLedgerId]);
        }

        // Line 3: CREDIT Cash / Labor Clearing
        const laborOthCost = +(laborCost + othCost).toFixed(2);
        if (laborOthCost > 0) {
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, 0.00, $4, 'Labor & Overhead Spent on Rework')
            `, [voucher.voucher_id, lineNo++, cashLedgerId, laborOthCost]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Production Rework Cost voucher posted successfully',
            data: {
                voucher_id: voucher.voucher_id,
                voucher_number: voucher.voucher_number,
                total_rework_cost: totalReworkCost
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in recordReworkAccounting:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 4. GET MANUFACTURING JOURNAL VOUCHERS
export const getManufacturingVouchers = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const fromDate = req.query.from_date;
        const toDate = req.query.to_date;

        let query = `
            SELECT 
                v.*,
                vt.voucher_type_name,
                vt.voucher_type_code,
                COALESCE(SUM(vl.debit_amount), 0)::NUMERIC(16,2) as total_amount
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            JOIN voucher_lines vl ON v.voucher_id = vl.voucher_id
            WHERE v.company_id = $1 
              AND (v.voucher_number LIKE 'STK-%' OR v.voucher_number LIKE 'SCRAP-%' OR v.voucher_number LIKE 'RWK-%')
        `;
        const params = [companyId];

        if (fromDate) {
            params.push(fromDate);
            query += ` AND v.voucher_date >= $${params.length}`;
        }
        if (toDate) {
            params.push(toDate);
            query += ` AND v.voucher_date <= $${params.length}`;
        }

        query += ` GROUP BY v.voucher_id, vt.voucher_type_name, vt.voucher_type_code ORDER BY v.voucher_date DESC, v.voucher_id DESC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getManufacturingVouchers:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. GET MANUFACTURING COST & EFFICIENCY SUMMARY REPORT
export const getManufacturingCostSummary = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const fromDate = req.query.from_date || `${new Date().getFullYear()}-04-01`;
        const toDate = req.query.to_date || new Date().toISOString().split('T')[0];

        // 1. Total Raw Materials Consumed in Production
        const consRes = await pool.query(`
            SELECT 
                COALESCE(SUM(pmc.consumed_quantity), 0)::NUMERIC(14,2) AS total_consumed_qty,
                COALESCE(SUM(pmc.total_cost), 0)::NUMERIC(16,2) AS total_consumed_cost
            FROM production_material_consumptions pmc
            JOIN production_orders po ON pmc.production_order_id = po.id
            WHERE po.company_id = $1 AND po.created_at >= $2 AND po.created_at <= ($3::DATE + 1)
        `, [companyId, fromDate, toDate]);

        // 2. Total Finished Goods Produced
        const fgRes = await pool.query(`
            SELECT 
                COALESCE(SUM(produced_quantity), 0)::NUMERIC(14,2) AS total_produced_qty
            FROM production_batches
            WHERE company_id = $1 AND production_date >= $2 AND production_date <= $3
        `, [companyId, fromDate, toDate]);

        // 3. Total QC Passed, Rejected, and Rework Quantities
        const qcRes = await pool.query(`
            SELECT 
                COALESCE(SUM(inspected_quantity), 0)::NUMERIC(14,2) AS total_inspected_qty,
                COALESCE(SUM(passed_quantity), 0)::NUMERIC(14,2) AS total_passed_qty,
                COALESCE(SUM(rework_quantity), 0)::NUMERIC(14,2) AS total_rework_qty,
                COALESCE(SUM(rejected_quantity), 0)::NUMERIC(14,2) AS total_rejected_qty
            FROM quality_checks
            WHERE company_id = $1 AND checked_at >= $2 AND checked_at <= ($3::DATE + 1)
        `, [companyId, fromDate, toDate]);

        // 4. Total Rework Costs
        const rwkRes = await pool.query(`
            SELECT 
                COALESCE(SUM(total_rework_cost), 0)::NUMERIC(16,2) AS total_rework_cost,
                COALESCE(SUM(additional_material_cost), 0)::NUMERIC(16,2) AS total_rew_mat_cost,
                COALESCE(SUM(additional_labor_cost), 0)::NUMERIC(16,2) AS total_rew_labor_cost
            FROM production_rework
            WHERE company_id = $1 AND created_at >= $2 AND created_at <= ($3::DATE + 1)
        `, [companyId, fromDate, toDate]);

        const inspQty = parseFloat(qcRes.rows[0]?.total_inspected_qty || 0);
        const passQty = parseFloat(qcRes.rows[0]?.total_passed_qty || 0);
        const rejQty = parseFloat(qcRes.rows[0]?.total_rejected_qty || 0);
        const rewQty = parseFloat(qcRes.rows[0]?.total_rework_qty || 0);
        const qcYield = inspQty > 0 ? +((passQty / inspQty) * 100).toFixed(2) : 100;

        return res.json({
            success: true,
            data: {
                from_date: fromDate,
                to_date: toDate,
                raw_material_consumption: {
                    total_quantity: consRes.rows[0]?.total_consumed_qty || '0.00',
                    total_cost: consRes.rows[0]?.total_consumed_cost || '0.00'
                },
                finished_goods_production: {
                    total_quantity: fgRes.rows[0]?.total_produced_qty || '0.00'
                },
                quality_and_rejection: {
                    inspected_quantity: inspQty.toFixed(2),
                    passed_quantity: passQty.toFixed(2),
                    rework_quantity: rewQty.toFixed(2),
                    rejected_quantity: rejQty.toFixed(2),
                    yield_percentage: qcYield
                },
                rework_expenses: {
                    total_cost: rwkRes.rows[0]?.total_rework_cost || '0.00',
                    additional_material_cost: rwkRes.rows[0]?.total_rew_mat_cost || '0.00',
                    additional_labor_cost: rwkRes.rows[0]?.total_rew_labor_cost || '0.00'
                }
            }
        });
    } catch (error) {
        console.error('Error in getManufacturingCostSummary:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
