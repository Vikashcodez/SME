import pool from '../config/database.js';

// Helper: Generate voucher number
const generateVoucherNumber = async (client, companyId, branchId, voucherCode) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(
        `SELECT COUNT(*)::INT AS cnt FROM vouchers WHERE company_id = $1 AND voucher_number LIKE $2`,
        [companyId, `${voucherCode}-${year}-%`]
    );
    const seq = (countRes.rows[0].cnt + 1).toString().padStart(4, '0');
    return `${voucherCode}-${year}-${seq}`;
};

// 1. Get Chart of Accounts (Hierarchical Tree or Flat)
export const getChartOfAccounts = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        // Fetch all groups
        const groupsRes = await pool.query(`
            SELECT * FROM account_groups 
            WHERE company_id = $1 OR company_id IS NULL
            ORDER BY nature, group_name ASC
        `, [companyId]);

        // Fetch all ledgers
        const ledgersRes = await pool.query(`
            SELECT l.*, ag.group_name, ag.nature, ag.group_code
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.company_id = $1
            ORDER BY l.ledger_name ASC
        `, [companyId]);

        return res.json({
            success: true,
            data: {
                groups: groupsRes.rows,
                ledgers: ledgersRes.rows
            }
        });
    } catch (error) {
        console.error('Error in getChartOfAccounts:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};

// 2. Get All Account Groups
export const getAccountGroups = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const result = await pool.query(`
            SELECT ag.*, pag.group_name AS parent_group_name,
                (SELECT COUNT(*)::INT FROM ledgers l WHERE l.group_id = ag.group_id) AS total_ledgers
            FROM account_groups ag
            LEFT JOIN account_groups pag ON ag.parent_group_id = pag.group_id
            WHERE ag.company_id = $1 OR ag.company_id IS NULL
            ORDER BY ag.nature, ag.group_name ASC
        `, [companyId]);

        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getAccountGroups:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Create Custom Account Group
export const createAccountGroup = async (req, res) => {
    try {
        const { group_name, group_code, parent_group_id, affects_gross_profit = false } = req.body;
        const companyId = req.body.company_id || req.user?.company_id;

        if (!group_name || !parent_group_id || !companyId) {
            return res.status(400).json({ success: false, message: 'Group Name, Parent Group, and Company ID are required' });
        }

        // Get nature from parent group
        const parent = await pool.query(`SELECT nature FROM account_groups WHERE group_id = $1`, [parent_group_id]);
        if (parent.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Parent group not found' });
        }
        const nature = parent.rows[0].nature;

        const effectiveCode = group_code ? group_code.trim().toUpperCase() : `GRP_${Date.now()}`;

        const result = await pool.query(`
            INSERT INTO account_groups (
                company_id, parent_group_id, group_name, group_code, nature, affects_gross_profit, is_system_group
            ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
            RETURNING *
        `, [companyId, parent_group_id, group_name.trim(), effectiveCode, nature, Boolean(affects_gross_profit)]);

        return res.status(201).json({ success: true, message: 'Account group created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error in createAccountGroup:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get Ledgers List with filters
export const getLedgers = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const groupCode = req.query.group_code;
        const nature = req.query.nature;
        const search = req.query.search;
        const isActive = req.query.is_active;

        let query = `
            SELECT l.*, ag.group_name, ag.group_code, ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.company_id = $1
        `;
        const params = [companyId];

        if (groupCode) {
            params.push(groupCode);
            query += ` AND ag.group_code = $${params.length}`;
        }
        if (nature) {
            params.push(nature);
            query += ` AND ag.nature = $${params.length}`;
        }
        if (isActive !== undefined && isActive !== '') {
            params.push(isActive === 'true' || isActive === true);
            query += ` AND l.is_active = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (l.ledger_name ILIKE $${params.length} OR l.ledger_code ILIKE $${params.length})`;
        }

        query += ` ORDER BY l.ledger_name ASC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getLedgers:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Create Standard / Custom Ledger
export const createLedger = async (req, res) => {
    try {
        const {
            group_id,
            ledger_name,
            ledger_code,
            opening_balance = 0,
            opening_balance_type = 'DR',
            maintain_bill_by_bill = false,
            default_credit_period_days = 0,
            credit_limit = 0,
            tax_type = 'NONE',
            is_cost_centres_applicable = false
        } = req.body;
        const companyId = req.body.company_id || req.user?.company_id;

        if (!companyId || !group_id || !ledger_name) {
            return res.status(400).json({ success: false, message: 'Company ID, Group ID, and Ledger Name are required' });
        }

        const effectiveCode = ledger_code ? ledger_code.trim().toUpperCase() : `LED-${Date.now().toString().slice(-6)}`;
        const parsedBal = parseFloat(opening_balance) || 0;

        const result = await pool.query(`
            INSERT INTO ledgers (
                company_id, group_id, ledger_name, ledger_code, currency_code,
                opening_balance, opening_balance_type,
                current_balance, current_balance_type,
                maintain_bill_by_bill, default_credit_period_days, credit_limit,
                tax_type, is_cost_centres_applicable, is_active
            ) VALUES (
                $1, $2, $3, $4, 'INR',
                $5, $6,
                $5, $6,
                $7, $8, $9,
                $10, $11, TRUE
            ) RETURNING *
        `, [
            companyId,
            group_id,
            ledger_name.trim(),
            effectiveCode,
            parsedBal,
            opening_balance_type === 'CR' ? 'CR' : 'DR',
            Boolean(maintain_bill_by_bill),
            parseInt(default_credit_period_days) || 0,
            parseFloat(credit_limit) || 0,
            tax_type,
            Boolean(is_cost_centres_applicable)
        ]);

        return res.status(201).json({ success: true, message: 'Ledger created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error in createLedger:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Get Ledger Statement (Running Debit/Credit Ledger Book)
export const getLedgerStatement = async (req, res) => {
    try {
        const { ledger_id } = req.params;
        const { from_date, to_date } = req.query;

        // Fetch ledger basic info
        const ledgerRes = await pool.query(`
            SELECT l.*, ag.group_name, ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.ledger_id = $1
        `, [ledger_id]);

        if (ledgerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ledger not found' });
        }
        const ledger = ledgerRes.rows[0];

        // Fetch all voucher lines for this ledger
        let query = `
            SELECT 
                vl.line_id,
                vl.voucher_id,
                v.voucher_number,
                v.voucher_date,
                v.reference_number,
                vt.voucher_type_name,
                vt.voucher_type_code,
                vl.debit_amount,
                vl.credit_amount,
                vl.narration AS line_narration,
                v.narration AS voucher_narration
            FROM voucher_lines vl
            JOIN vouchers v ON vl.voucher_id = v.voucher_id
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            WHERE vl.ledger_id = $1 AND v.is_posted = TRUE
        `;
        const params = [ledger_id];

        if (from_date) {
            params.push(from_date);
            query += ` AND v.voucher_date >= $${params.length}`;
        }
        if (to_date) {
            params.push(to_date);
            query += ` AND v.voucher_date <= $${params.length}`;
        }

        query += ` ORDER BY v.voucher_date ASC, v.voucher_id ASC`;

        const linesRes = await pool.query(query, params);

        // Compute running balance
        let runningBalance = parseFloat(ledger.opening_balance) || 0;
        let isDebitNature = ['ASSET', 'EXPENSE'].includes(ledger.nature);
        if (ledger.opening_balance_type === 'CR' && isDebitNature) {
            runningBalance = -runningBalance;
        } else if (ledger.opening_balance_type === 'DR' && !isDebitNature) {
            runningBalance = -runningBalance;
        }

        const transactions = linesRes.rows.map(line => {
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;

            if (isDebitNature) {
                runningBalance += (dr - cr);
            } else {
                runningBalance += (cr - dr);
            }

            return {
                ...line,
                running_balance: Math.abs(runningBalance).toFixed(2),
                running_balance_type: runningBalance >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR')
            };
        });

        return res.json({
            success: true,
            data: {
                ledger,
                opening_balance: ledger.opening_balance,
                opening_balance_type: ledger.opening_balance_type,
                transactions
            }
        });

    } catch (error) {
        console.error('Error in getLedgerStatement:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Create Double-Entry Voucher (Manual Journal, Payment, Receipt, Contra)
export const createVoucher = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            voucher_type_code, // JOURNAL, PAYMENT, RECEIPT, CONTRA
            voucher_date = new Date().toISOString().split('T')[0],
            reference_number,
            reference_date,
            narration,
            lines = [], // [{ ledger_id, debit_amount, credit_amount, narration }]
            bill_allocations = []
        } = req.body;

        const companyId = req.body.company_id || req.user?.company_id;
        const branchId = req.body.branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!companyId || !voucher_type_code || lines.length < 2) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID, Voucher Type, and at least 2 voucher lines are required.'
            });
        }

        // Validate Total Debit == Total Credit
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;
            if (dr > 0 && cr > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'A single voucher line cannot have both Debit and Credit amounts.'
                });
            }
            if (dr === 0 && cr === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Each voucher line must have a non-zero Debit or Credit amount.'
                });
            }
            totalDebit += dr;
            totalCredit += cr;
        }

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Double entry mismatch! Total Debit (₹${totalDebit.toFixed(2)}) must equal Total Credit (₹${totalCredit.toFixed(2)}).`
            });
        }

        // Fetch voucher type
        const vtRes = await client.query(
            `SELECT voucher_type_id FROM voucher_types WHERE (company_id = $1 OR company_id IS NULL) AND voucher_type_code = $2`,
            [companyId, voucher_type_code.toUpperCase()]
        );
        if (vtRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Invalid voucher type: ${voucher_type_code}` });
        }
        const voucherTypeId = vtRes.rows[0].voucher_type_id;

        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(client, companyId, branchId, voucher_type_code.toUpperCase());

        // Insert Voucher Header
        const voucherRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
                reference_number, reference_date, narration,
                is_posted, created_by, posted_by, posted_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8,
                TRUE, $9, $9, CURRENT_TIMESTAMP
            ) RETURNING *
        `, [
            companyId, branchId, voucherTypeId, voucherNumber, voucher_date,
            reference_number || null, reference_date || null, narration || null,
            createdBy
        ]);
        const voucher = voucherRes.rows[0];

        // Insert Voucher Lines and Update Ledger Balances
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;

            const vlRes = await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING line_id
            `, [
                voucher.voucher_id,
                i + 1,
                line.ledger_id,
                dr,
                cr,
                line.narration || narration || null
            ]);
            const lineId = vlRes.rows[0].line_id;

            // Update Ledger Current Balance
            const ledgerRes = await client.query(
                `SELECT l.*, ag.nature FROM ledgers l JOIN account_groups ag ON l.group_id = ag.group_id WHERE l.ledger_id = $1`,
                [line.ledger_id]
            );
            if (ledgerRes.rows.length > 0) {
                const led = ledgerRes.rows[0];
                let currentBal = parseFloat(led.current_balance) || 0;
                let isDr = led.current_balance_type === 'DR';

                // Net signed change from ledger perspective
                // Asset / Expense: Debit increases balance, Credit decreases
                // Liability / Equity / Income: Credit increases balance, Debit decreases
                const isDebitNature = ['ASSET', 'EXPENSE'].includes(led.nature);
                let signedBal = isDebitNature ? (isDr ? currentBal : -currentBal) : (isDr ? -currentBal : currentBal);

                if (isDebitNature) {
                    signedBal += (dr - cr);
                } else {
                    signedBal += (cr - dr);
                }

                const newBal = Math.abs(signedBal);
                const newBalType = signedBal >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

                await client.query(`
                    UPDATE ledgers 
                    SET current_balance = $1, current_balance_type = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE ledger_id = $3
                `, [newBal, newBalType, line.ledger_id]);
            }
        }

        // Bill Allocations if any
        if (Array.isArray(bill_allocations) && bill_allocations.length > 0) {
            for (const ba of bill_allocations) {
                const billRef = ba.bill_reference_no || ba.bill_reference_number;
                const allocAmt = parseFloat(ba.amount || ba.allocated_amount);
                if (billRef && allocAmt > 0) {
                    await client.query(`
                        INSERT INTO bill_allocations (
                            voucher_line_id, ledger_id, reference_type, bill_reference_no,
                            amount, dr_cr
                        ) VALUES (
                            (SELECT line_id FROM voucher_lines WHERE voucher_id = $1 AND ledger_id = $2 LIMIT 1),
                            $2, $3, $4, $5, $6
                        )
                    `, [
                        voucher.voucher_id,
                        ba.ledger_id,
                        ba.reference_type || 'AGST_REF',
                        billRef,
                        allocAmt,
                        ba.dr_cr || ba.allocation_type || 'DR'
                    ]);
                }
            }
        }

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'Voucher posted successfully with double-entry validation',
            data: voucher
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createVoucher:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    } finally {
        client.release();
    }
};

// 8. Get Vouchers List
export const getVouchers = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const voucherType = req.query.voucher_type;
        const fromDate = req.query.from_date;
        const toDate = req.query.to_date;
        const search = req.query.search;

        let query = `
            SELECT 
                v.*,
                vt.voucher_type_name,
                vt.voucher_type_code,
                e.first_name || ' ' || COALESCE(e.last_name, '') AS created_by_name
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            LEFT JOIN employees e ON v.created_by = e.employee_id
            WHERE v.company_id = $1
        `;
        const params = [companyId];

        if (voucherType) {
            params.push(voucherType.toUpperCase());
            query += ` AND vt.voucher_type_code = $${params.length}`;
        }
        if (fromDate) {
            params.push(fromDate);
            query += ` AND v.voucher_date >= $${params.length}`;
        }
        if (toDate) {
            params.push(toDate);
            query += ` AND v.voucher_date <= $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (v.voucher_number ILIKE $${params.length} OR v.reference_number ILIKE $${params.length} OR v.narration ILIKE $${params.length})`;
        }

        query += ` ORDER BY v.voucher_date DESC, v.voucher_id DESC LIMIT 100`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Error in getVouchers:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Get Single Voucher with Lines
export const getVoucherById = async (req, res) => {
    try {
        const { id } = req.params;
        const vRes = await pool.query(`
            SELECT 
                v.*,
                vt.voucher_type_name,
                vt.voucher_type_code,
                e.first_name || ' ' || COALESCE(e.last_name, '') AS created_by_name
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            LEFT JOIN employees e ON v.created_by = e.employee_id
            WHERE v.voucher_id = $1
        `, [id]);

        if (vRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }

        const linesRes = await pool.query(`
            SELECT 
                vl.*,
                l.ledger_name,
                l.ledger_code,
                ag.group_name
            FROM voucher_lines vl
            JOIN ledgers l ON vl.ledger_id = l.ledger_id
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE vl.voucher_id = $1
            ORDER BY vl.line_number ASC
        `, [id]);

        return res.json({
            success: true,
            data: {
                ...vRes.rows[0],
                lines: linesRes.rows
            }
        });
    } catch (error) {
        console.error('Error in getVoucherById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Trial Balance Report
export const getTrialBalance = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const asOnDate = req.query.as_on_date || new Date().toISOString().split('T')[0];

        // Aggregate all posted voucher lines up to asOnDate
        const result = await pool.query(`
            SELECT 
                l.ledger_id,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                ag.nature,
                l.opening_balance,
                l.opening_balance_type,
                COALESCE(SUM(vl.debit_amount), 0)::NUMERIC(16,2) AS period_debit,
                COALESCE(SUM(vl.credit_amount), 0)::NUMERIC(16,2) AS period_credit,
                l.current_balance,
                l.current_balance_type
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            LEFT JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            LEFT JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE AND v.voucher_date <= $2
            WHERE l.company_id = $1
            GROUP BY l.ledger_id, l.ledger_name, l.ledger_code, ag.group_name, ag.nature, l.opening_balance, l.opening_balance_type, l.current_balance, l.current_balance_type
            ORDER BY ag.nature, l.ledger_name ASC
        `, [companyId, asOnDate]);

        let totalDebits = 0;
        let totalCredits = 0;

        const rows = result.rows.map(r => {
            const curBal = parseFloat(r.current_balance) || 0;
            const isDr = r.current_balance_type === 'DR';
            const closingDebit = isDr ? curBal : 0;
            const closingCredit = !isDr ? curBal : 0;
            totalDebits += closingDebit;
            totalCredits += closingCredit;

            return {
                ...r,
                closing_debit: closingDebit.toFixed(2),
                closing_credit: closingCredit.toFixed(2)
            };
        });

        return res.json({
            success: true,
            data: {
                as_on_date: asOnDate,
                rows,
                totals: {
                    total_debit: totalDebits.toFixed(2),
                    total_credit: totalCredits.toFixed(2),
                    difference: Math.abs(totalDebits - totalCredits).toFixed(2),
                    is_balanced: Math.abs(totalDebits - totalCredits) < 0.05
                }
            }
        });

    } catch (error) {
        console.error('Error in getTrialBalance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
