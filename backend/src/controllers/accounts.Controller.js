import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getLedgerGroups = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT g.*, p.group_name as parent_group_name,
                   (SELECT COUNT(*) FROM ledgers l WHERE l.group_id = g.group_id) as total_ledgers
            FROM ledger_groups g
            LEFT JOIN ledger_groups p ON g.parent_group_id = p.group_id
            WHERE g.company_code = $1
            ORDER BY g.group_type, g.sequence, g.group_name ASC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getLedgerGroups error');
        res.status(500).json({ success: false, message: 'Failed to fetch ledger groups' });
    }
};

export const getLedgers = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { group, search } = req.query;

        let query = `
            SELECT l.*, g.group_name, g.group_type, g.nature as group_nature
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            WHERE l.company_code = $1 AND l.is_active = true
        `;
        const params = [companyCode];
        let idx = 2;

        if (group) {
            query += ` AND (g.group_name ILIKE $${idx} OR g.group_type ILIKE $${idx})`;
            params.push(`%${group}%`);
            idx++;
        }

        if (search) {
            query += ` AND (l.ledger_name ILIKE $${idx} OR l.gstin_uin ILIKE $${idx} OR l.pan_it_no ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY g.group_type, l.ledger_name ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getLedgers error');
        res.status(500).json({ success: false, message: 'Failed to fetch ledgers' });
    }
};

export const createLedger = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            ledger_name, group_id, opening_balance = 0, dr_cr = 'Dr',
            mailing_name, address, country = 'India', state_name = 'Maharashtra',
            gst_state_code = '27', pan_it_no, gstin_uin, gst_registration_type = 'Regular',
            bank_account_no, ifsc_code, bank_name, branch_name,
            credit_period_days = 30, credit_limit = 0
        } = req.body;

        if (!ledger_name || !group_id) {
            return res.status(400).json({ success: false, message: 'Ledger name and group are required' });
        }

        const result = await pool.query(`
            INSERT INTO ledgers (
                company_code, ledger_name, group_id, opening_balance, dr_cr, current_balance,
                mailing_name, address, country, state_name, gst_state_code, pan_it_no,
                gstin_uin, gst_registration_type, bank_account_no, ifsc_code, bank_name,
                branch_name, credit_period_days, credit_limit
            ) VALUES ($1, $2, $3, $4, $5, $4, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            companyCode, ledger_name, group_id, opening_balance, dr_cr,
            mailing_name || ledger_name, address, country, state_name, gst_state_code,
            pan_it_no, gstin_uin, gst_registration_type, bank_account_no, ifsc_code,
            bank_name, branch_name, credit_period_days, credit_limit
        ]);

        res.status(201).json({ success: true, message: 'Ledger created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createLedger error');
        res.status(500).json({ success: false, message: 'Failed to create ledger', error: error.message });
    }
};

export const createVoucher = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            voucher_type, voucher_number, voucher_date = new Date(),
            reference_no, reference_date, party_ledger_id, narration,
            items = [], bill_allocations = []
        } = req.body;

        if (!voucher_type || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Voucher type and accounting entries are required' });
        }

        
        let totalDr = 0;
        let totalCr = 0;
        for (const it of items) {
            const amt = parseFloat(it.amount) || 0;
            if (it.entry_type === 'Dr' || it.entry_type === 'By') totalDr += amt;
            else if (it.entry_type === 'Cr' || it.entry_type === 'To') totalCr += amt;
        }

        const diff = Math.abs(totalDr - totalCr);
        if (diff > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Double entry mismatch! Total Debit (₹${totalDr.toFixed(2)}) must equal Total Credit (₹${totalCr.toFixed(2)}). Difference: ₹${diff.toFixed(2)}`
            });
        }

        await client.query('BEGIN');

        
        let vNumber = voucher_number;
        if (!vNumber) {
            const prefixMap = {
                'Payment': 'PAY-', 'Receipt': 'RCT-', 'Contra': 'CTR-',
                'Journal': 'JRN-', 'Sales': 'SL-', 'Purchase': 'PUR-',
                'Debit Note': 'DN-', 'Credit Note': 'CN-'
            };
            const pfx = prefixMap[voucher_type] || 'VCH-';
            const year = new Date().getFullYear();
            const seqRes = await client.query(`SELECT nextval('seq_vouchers_co0001') AS next_val`);
            const nextCount = parseInt(seqRes.rows[0].next_val, 10);
            vNumber = `${pfx}${year}-${String(nextCount).padStart(4, '0')}`;
        }

        
        const vRes = await client.query(`
            INSERT INTO vouchers (
                company_code, voucher_type, voucher_number, voucher_date,
                reference_no, reference_date, party_ledger_id, total_amount,
                narration, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            companyCode, voucher_type, vNumber, voucher_date,
            reference_no, reference_date, party_ledger_id || null,
            totalDr, narration, req.user?.username || 'Admin'
        ]);

        const voucher = vRes.rows[0];

        
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const itemType = (it.entry_type === 'Dr' || it.entry_type === 'By') ? 'Dr' : 'Cr';
            const amount = parseFloat(it.amount);

            await client.query(`
                INSERT INTO voucher_items (voucher_id, ledger_id, entry_type, amount, item_narration, sequence)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [voucher.voucher_id, it.ledger_id, itemType, amount, it.item_narration || null, i + 1]);

            
            const ledgerRes = await client.query(`
                SELECT l.ledger_id, g.group_type, g.nature 
                FROM ledgers l 
                JOIN ledger_groups g ON l.group_id = g.group_id 
                WHERE l.ledger_id = $1
            `, [it.ledger_id]);

            const groupType = ledgerRes.rows[0]?.group_type || 'Assets';
            const isDebitNormal = groupType === 'Assets' || groupType === 'Expenses';

            
            
            const balanceDelta = isDebitNormal
                ? (itemType === 'Dr' ? amount : -amount)
                : (itemType === 'Cr' ? amount : -amount);

            await client.query(`
                UPDATE ledgers 
                SET current_balance = current_balance + $1, updated_at = NOW() 
                WHERE ledger_id = $2
            `, [balanceDelta, it.ledger_id]);
        }

        
        for (const b of bill_allocations) {
            await client.query(`
                INSERT INTO bill_allocations (
                    ledger_id, ref_type, bill_reference_no, credit_days, due_date, amount, dr_cr
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [b.ledger_id, b.ref_type || 'New Ref', b.bill_reference_no || vNumber, b.credit_days || 0, b.due_date || null, b.amount, b.dr_cr || 'Dr']);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `${voucher_type} Voucher ${vNumber} posted successfully`,
            data: voucher
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createVoucher error');
        res.status(500).json({ success: false, message: 'Failed to create voucher', error: error.message });
    } finally {
        client.release();
    }
};

export const getDayBook = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { fromDate, toDate, voucherType } = req.query;

        let query = `
            SELECT v.*, pl.ledger_name as party_name,
                   json_agg(json_build_object(
                       'item_id', vi.item_id,
                       'ledger_id', vi.ledger_id,
                       'ledger_name', l.ledger_name,
                       'entry_type', vi.entry_type,
                       'amount', vi.amount,
                       'narration', vi.item_narration
                   ) ORDER BY vi.sequence) as entries
            FROM vouchers v
            LEFT JOIN ledgers pl ON v.party_ledger_id = pl.ledger_id
            JOIN voucher_items vi ON v.voucher_id = vi.voucher_id
            JOIN ledgers l ON vi.ledger_id = l.ledger_id
            WHERE v.company_code = $1 AND v.is_cancelled = false
        `;
        const params = [companyCode];
        let idx = 2;

        if (fromDate) {
            query += ` AND v.voucher_date >= $${idx}`;
            params.push(fromDate);
            idx++;
        }
        if (toDate) {
            query += ` AND v.voucher_date <= $${idx}`;
            params.push(toDate);
            idx++;
        }
        if (voucherType) {
            query += ` AND v.voucher_type = $${idx}`;
            params.push(voucherType);
            idx++;
        }

        query += ` GROUP BY v.voucher_id, pl.ledger_name ORDER BY v.voucher_date DESC, v.voucher_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDayBook error');
        res.status(500).json({ success: false, message: 'Failed to fetch Day Book' });
    }
};

export const getTrialBalance = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';

        const result = await pool.query(`
            SELECT 
                g.group_id,
                g.group_name,
                g.group_type,
                g.parent_group_id,
                l.ledger_id,
                l.ledger_name,
                l.opening_balance,
                l.dr_cr as opening_dr_cr,
                COALESCE(SUM(CASE WHEN vi.entry_type = 'Dr' THEN vi.amount ELSE 0 END), 0) as total_debit,
                COALESCE(SUM(CASE WHEN vi.entry_type = 'Cr' THEN vi.amount ELSE 0 END), 0) as total_credit,
                l.current_balance as closing_balance
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            LEFT JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND l.is_active = true
            GROUP BY g.group_id, g.group_name, g.group_type, g.parent_group_id, l.ledger_id, l.ledger_name, l.opening_balance, l.dr_cr, l.current_balance
            ORDER BY g.group_type, g.sequence, l.ledger_name ASC
        `, [companyCode]);

        let grandDebit = 0;
        let grandCredit = 0;
        result.rows.forEach(r => {
            const dr = parseFloat(r.total_debit) || 0;
            const cr = parseFloat(r.total_credit) || 0;
            grandDebit += dr;
            grandCredit += cr;
        });

        res.status(200).json({
            success: true,
            grandTotalDebit: grandDebit,
            grandTotalCredit: grandCredit,
            isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
            data: result.rows
        });
    } catch (error) {
        logger.error({ err: error }, 'getTrialBalance error');
        res.status(500).json({ success: false, message: 'Failed to generate Trial Balance' });
    }
};

export const getProfitAndLoss = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';

        
        const salesRes = await pool.query(`
            SELECT l.ledger_name, COALESCE(SUM(vi.amount), 0) as amount
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND g.group_type = 'Income' AND g.affects_gross_profit = true AND vi.entry_type = 'Cr'
            GROUP BY l.ledger_name
        `, [companyCode]);

        
        const purchaseRes = await pool.query(`
            SELECT l.ledger_name, COALESCE(SUM(vi.amount), 0) as amount
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND g.group_type = 'Expenses' AND g.affects_gross_profit = true AND vi.entry_type = 'Dr'
            GROUP BY l.ledger_name
        `, [companyCode]);

        
        const indirectExpRes = await pool.query(`
            SELECT l.ledger_name, g.group_name, COALESCE(SUM(vi.amount), 0) as amount
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND g.group_type = 'Expenses' AND g.affects_gross_profit = false AND vi.entry_type = 'Dr'
            GROUP BY l.ledger_name, g.group_name
        `, [companyCode]);

        const totalSales = salesRes.rows.reduce((s, r) => s + parseFloat(r.amount), 0) || 0;
        const totalPurchases = purchaseRes.rows.reduce((s, r) => s + parseFloat(r.amount), 0) || 0;
        const grossProfit = totalSales - totalPurchases;
        const totalIndirectExp = indirectExpRes.rows.reduce((s, r) => s + parseFloat(r.amount), 0) || 0;
        const netProfit = grossProfit - totalIndirectExp;

        res.status(200).json({
            success: true,
            data: {
                tradingAccount: {
                    sales: salesRes.rows,
                    totalSales,
                    purchases: purchaseRes.rows,
                    totalPurchases,
                    grossProfit
                },
                profitAndLossAccount: {
                    grossProfit,
                    indirectExpenses: indirectExpRes.rows,
                    totalIndirectExpenses: totalIndirectExp,
                    netProfit,
                    netProfitPercentage: totalSales > 0 ? (netProfit / totalSales) * 100 : 0
                }
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getProfitAndLoss error');
        res.status(500).json({ success: false, message: 'Failed to generate P&L statement' });
    }
};

const escapeXml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

export const getBalanceSheet = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';

        
        const liabRes = await pool.query(`
            SELECT g.group_name, l.ledger_name, l.current_balance, l.dr_cr
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            WHERE l.company_code = $1 AND g.group_type = 'Liabilities'
            ORDER BY g.sequence, l.ledger_name
        `, [companyCode]);

        
        const assetRes = await pool.query(`
            SELECT g.group_name, l.ledger_name, l.current_balance, l.dr_cr
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            WHERE l.company_code = $1 AND g.group_type = 'Assets'
            ORDER BY g.sequence, l.ledger_name
        `, [companyCode]);

        
        const salesRes = await pool.query(`
            SELECT COALESCE(SUM(vi.amount), 0) as total
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND g.group_type = 'Income' AND vi.entry_type = 'Cr'
        `, [companyCode]);

        const expRes = await pool.query(`
            SELECT COALESCE(SUM(vi.amount), 0) as total
            FROM ledgers l
            JOIN ledger_groups g ON l.group_id = g.group_id
            JOIN voucher_items vi ON l.ledger_id = vi.ledger_id
            WHERE l.company_code = $1 AND g.group_type = 'Expenses' AND vi.entry_type = 'Dr'
        `, [companyCode]);

        const totalIncome = parseFloat(salesRes.rows[0]?.total || 0);
        const totalExpense = parseFloat(expRes.rows[0]?.total || 0);
        const netProfit = totalIncome - totalExpense;

        let liabilitiesList = [...liabRes.rows];
        if (Math.abs(netProfit) > 0.001) {
            liabilitiesList.push({
                group_name: 'Reserves & Surplus / Retained Earnings',
                ledger_name: 'Profit & Loss A/c (Current Period Surplus)',
                current_balance: netProfit,
                dr_cr: netProfit >= 0 ? 'Cr' : 'Dr'
            });
        }

        let totalLiabilities = liabRes.rows.reduce((s, r) => s + Math.abs(parseFloat(r.current_balance) || 0), 0) + netProfit;
        let totalAssets = assetRes.rows.reduce((s, r) => s + Math.abs(parseFloat(r.current_balance) || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                liabilities: liabilitiesList,
                totalLiabilities,
                assets: assetRes.rows,
                totalAssets,
                netProfitForPeriod: netProfit,
                isBalanced: Math.abs(totalLiabilities - totalAssets) < 0.01
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getBalanceSheet error');
        res.status(500).json({ success: false, message: 'Failed to generate Balance Sheet' });
    }
};

export const exportTallyXml = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const ledgersRes = await pool.query(`
            SELECT l.*, g.group_name FROM ledgers l JOIN ledger_groups g ON l.group_id = g.group_id WHERE l.company_code = $1
        `, [companyCode]);
        const vouchersRes = await pool.query(`
            SELECT v.*, pl.ledger_name as party_name,
                   json_agg(json_build_object(
                       'ledger_name', l.ledger_name,
                       'entry_type', vi.entry_type,
                       'amount', vi.amount
                   )) as entries
            FROM vouchers v
            LEFT JOIN ledgers pl ON v.party_ledger_id = pl.ledger_id
            JOIN voucher_items vi ON v.voucher_id = vi.voucher_id
            JOIN ledgers l ON vi.ledger_id = l.ledger_id
            WHERE v.company_code = $1
            GROUP BY v.voucher_id, pl.ledger_name
        `, [companyCode]);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters &amp; Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

        
        for (const l of ledgersRes.rows) {
            xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <LEDGER NAME="${escapeXml(l.ledger_name)}" ACTION="Create">\n            <NAME.LIST><NAME>${escapeXml(l.ledger_name)}</NAME></NAME.LIST>\n            <PARENT>${escapeXml(l.group_name)}</PARENT>\n            <OPENINGBALANCE>${l.dr_cr === 'Cr' ? '-' : ''}${l.opening_balance}</OPENINGBALANCE>\n            <MAILINGNAME>${escapeXml(l.mailing_name || l.ledger_name)}</MAILINGNAME>\n            <COUNTRYNAME>${escapeXml(l.country)}</COUNTRYNAME>\n            <LEDSTATENAME>${escapeXml(l.state_name)}</LEDSTATENAME>\n            <PARTYGSTIN>${escapeXml(l.gstin_uin || '')}</PARTYGSTIN>\n            <PANNUMBER>${escapeXml(l.pan_it_no || '')}</PANNUMBER>\n          </LEDGER>\n        </TALLYMESSAGE>\n`;
        }

        
        for (const v of vouchersRes.rows) {
            const dateStr = new Date(v.voucher_date).toISOString().slice(0, 10).replace(/-/g, '');
            xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="${escapeXml(v.voucher_type)}" ACTION="Create">\n            <DATE>${dateStr}</DATE>\n            <VOUCHERTYPENAME>${escapeXml(v.voucher_type)}</VOUCHERTYPENAME>\n            <VOUCHERNUMBER>${escapeXml(v.voucher_number)}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${escapeXml(v.party_name || '')}</PARTYLEDGERNAME>\n            <NARRATION>${escapeXml(v.narration || '')}</NARRATION>\n`;
            for (const e of v.entries || []) {
                xml += `            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>${escapeXml(e.ledger_name)}</LEDGERNAME>\n              <ISDEEMEDPOSITIVE>${e.entry_type === 'Dr' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n              <AMOUNT>${e.entry_type === 'Dr' ? '-' : ''}${e.amount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n`;
            }
            xml += `          </VOUCHER>\n        </TALLYMESSAGE>\n`;
        }

        xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;

        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="tally_prime_export_${Date.now()}.xml"`);
        res.send(xml);

    } catch (error) {
        logger.error({ err: error }, 'exportTallyXml error');
        res.status(500).json({ success: false, message: 'Failed to export Tally XML' });
    }
};
