import pool from '../config/database.js';

// Helper: Recalculate and persist a ledger's current_balance and current_balance_type
export const recalculateLedgerBalance = async (client, ledgerId, companyId) => {
    const ledRes = await client.query(`
        SELECT l.ledger_id, l.opening_balance, l.opening_balance_type, ag.nature
        FROM ledgers l
        JOIN account_groups ag ON l.group_id = ag.group_id
        WHERE l.ledger_id = $1 AND (l.company_id = $2 OR $2 IS NULL)
        FOR UPDATE
    `, [ledgerId, companyId]);

    if (ledRes.rows.length === 0) return null;
    const led = ledRes.rows[0];

    const transRes = await client.query(`
        SELECT 
            COALESCE(SUM(vl.debit_amount), 0)::NUMERIC(16,4) AS total_dr,
            COALESCE(SUM(vl.credit_amount), 0)::NUMERIC(16,4) AS total_cr
        FROM voucher_lines vl
        JOIN vouchers v ON vl.voucher_id = v.voucher_id
        WHERE vl.ledger_id = $1 AND v.is_posted = TRUE
    `, [ledgerId]);

    const opBal = parseFloat(led.opening_balance) || 0;
    const isOpDr = (led.opening_balance_type || 'DR') === 'DR';
    const totalDr = parseFloat(transRes.rows[0].total_dr) || 0;
    const totalCr = parseFloat(transRes.rows[0].total_cr) || 0;

    const isDebitNature = ['ASSET', 'EXPENSE'].includes(led.nature);
    let signedBal = 0;

    if (isDebitNature) {
        // Asset / Expense: Normal balance is Debit
        const opSigned = isOpDr ? opBal : -opBal;
        signedBal = opSigned + (totalDr - totalCr);
    } else {
        // Liability / Equity / Income: Normal balance is Credit
        const opSigned = isOpDr ? -opBal : opBal;
        signedBal = opSigned + (totalCr - totalDr);
    }

    const newBal = Math.abs(signedBal);
    const newBalType = signedBal >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

    await client.query(`
        UPDATE ledgers
        SET current_balance = $1, current_balance_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE ledger_id = $3
    `, [newBal, newBalType, ledgerId]);

    return { current_balance: newBal, current_balance_type: newBalType };
};

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
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
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
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
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
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;

        if (!group_name || !parent_group_id || !companyId) {
            return res.status(400).json({ success: false, message: 'Group Name, Parent Group, and Company ID are required' });
        }

        // Get nature from parent group
        const parent = await pool.query(
            `SELECT nature FROM account_groups WHERE group_id = $1 AND (company_id = $2 OR company_id IS NULL)`,
            [parent_group_id, companyId]
        );
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

// 4. Get Ledgers List with filters & accurate balances
export const getLedgers = async (req, res) => {
    try {
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
        const groupCode = req.query.group_code;
        const nature = req.query.nature;
        const search = req.query.search;
        const isActive = req.query.is_active;

        let query = `
            SELECT 
                l.*,
                ag.group_name,
                ag.group_code,
                ag.nature,
                COALESCE((
                    SELECT COUNT(*)::INT 
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_transactions,
                COALESCE((
                    SELECT SUM(vl.debit_amount)::NUMERIC(16,2)
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_debit,
                COALESCE((
                    SELECT SUM(vl.credit_amount)::NUMERIC(16,2)
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_credit
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

        const rows = result.rows.map(l => {
            const opBal = parseFloat(l.opening_balance) || 0;
            const isOpDr = (l.opening_balance_type || 'DR') === 'DR';
            const totDr = parseFloat(l.total_debit) || 0;
            const totCr = parseFloat(l.total_credit) || 0;
            const isDebitNature = ['ASSET', 'EXPENSE'].includes(l.nature);

            let signedBal = 0;
            if (isDebitNature) {
                const opSigned = isOpDr ? opBal : -opBal;
                signedBal = opSigned + (totDr - totCr);
            } else {
                const opSigned = isOpDr ? -opBal : opBal;
                signedBal = opSigned + (totCr - totDr);
            }

            const curBal = Math.abs(signedBal);
            const curType = signedBal >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

            return {
                ...l,
                current_balance: curBal.toFixed(2),
                current_balance_type: curType
            };
        });

        return res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Error in getLedgers:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4a. Get Single Ledger Details
export const getLedgerById = async (req, res) => {
    try {
        const { ledger_id } = req.params;
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;

        const result = await pool.query(`
            SELECT l.*, ag.group_name, ag.group_code, ag.nature,
                COALESCE((
                    SELECT COUNT(*)::INT 
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_transactions,
                COALESCE((
                    SELECT SUM(vl.debit_amount)::NUMERIC(16,2)
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_debit,
                COALESCE((
                    SELECT SUM(vl.credit_amount)::NUMERIC(16,2)
                    FROM voucher_lines vl 
                    JOIN vouchers v ON vl.voucher_id = v.voucher_id 
                    WHERE vl.ledger_id = l.ledger_id AND v.is_posted = TRUE
                ), 0) AS total_credit
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.ledger_id = $1 AND l.company_id = $2
        `, [ledger_id, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ledger not found.' });
        }

        const l = result.rows[0];
        const opBal = parseFloat(l.opening_balance) || 0;
        const isOpDr = (l.opening_balance_type || 'DR') === 'DR';
        const totDr = parseFloat(l.total_debit) || 0;
        const totCr = parseFloat(l.total_credit) || 0;
        const isDebitNature = ['ASSET', 'EXPENSE'].includes(l.nature);

        let signedBal = isDebitNature ? ((isOpDr ? opBal : -opBal) + totDr - totCr) : ((isOpDr ? -opBal : opBal) + totCr - totDr);
        const curBal = Math.abs(signedBal);
        const curType = signedBal >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

        return res.json({
            success: true,
            data: {
                ...l,
                current_balance: curBal.toFixed(2),
                current_balance_type: curType
            }
        });
    } catch (error) {
        console.error('Error in getLedgerById:', error);
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
            opening_balance_date,
            notes,
            maintain_bill_by_bill = false,
            default_credit_period_days = 0,
            credit_limit = 0,
            tax_type = 'NONE',
            is_cost_centres_applicable = false
        } = req.body;
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;

        if (!companyId || !group_id || !ledger_name) {
            return res.status(400).json({ success: false, message: 'Company ID, Group ID, and Ledger Name are required' });
        }

        const groupRes = await pool.query(
            `SELECT group_id, nature FROM account_groups WHERE group_id = $1 AND (company_id = $2 OR company_id IS NULL)`,
            [group_id, companyId]
        );
        if (groupRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Account group does not belong to this company.' });
        }

        const effectiveCode = ledger_code ? ledger_code.trim().toUpperCase() : `LED-${Date.now().toString().slice(-6)}`;
        const parsedBal = parseFloat(opening_balance) || 0;
        const opType = opening_balance_type === 'CR' ? 'CR' : 'DR';
        const opDate = opening_balance_date || new Date().toISOString().split('T')[0];

        const result = await pool.query(`
            INSERT INTO ledgers (
                company_id, group_id, ledger_name, ledger_code, currency_code,
                opening_balance, opening_balance_type, opening_balance_date, notes,
                current_balance, current_balance_type,
                maintain_bill_by_bill, default_credit_period_days, credit_limit,
                tax_type, is_cost_centres_applicable, is_active, is_system_defined
            ) VALUES (
                $1, $2, $3, $4, 'INR',
                $5, $6, $7, $8,
                $5, $6,
                $9, $10, $11,
                $12, $13, TRUE, FALSE
            ) RETURNING *
        `, [
            companyId,
            group_id,
            ledger_name.trim(),
            effectiveCode,
            parsedBal,
            opType,
            opDate,
            notes || null,
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

// 5b. Update Ledger
export const updateLedger = async (req, res) => {
    const client = await pool.connect();
    try {
        const { ledger_id } = req.params;
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;
        const {
            group_id,
            ledger_name,
            ledger_code,
            opening_balance,
            opening_balance_type,
            opening_balance_date,
            maintain_bill_by_bill,
            default_credit_period_days,
            credit_limit,
            tax_type,
            is_cost_centres_applicable,
            is_active,
            notes
        } = req.body;

        if (!companyId || !ledger_id) {
            return res.status(400).json({ success: false, message: 'Company ID and Ledger ID are required.' });
        }

        await client.query('BEGIN');

        const existingRes = await client.query(
            `SELECT l.*, ag.nature FROM ledgers l JOIN account_groups ag ON l.group_id = ag.group_id WHERE l.ledger_id = $1 AND l.company_id = $2 FOR UPDATE`,
            [ledger_id, companyId]
        );
        if (existingRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Ledger not found.' });
        }
        const existing = existingRes.rows[0];

        const targetGroupId = group_id || existing.group_id;
        if (group_id && group_id !== existing.group_id) {
            const groupCheck = await client.query(
                `SELECT group_id FROM account_groups WHERE group_id = $1 AND (company_id = $2 OR company_id IS NULL)`,
                [group_id, companyId]
            );
            if (groupCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Specified account group does not exist.' });
            }
        }

        const newName = ledger_name ? ledger_name.trim() : existing.ledger_name;
        const newCode = ledger_code ? ledger_code.trim().toUpperCase() : existing.ledger_code;
        const newOpBal = opening_balance !== undefined ? parseFloat(opening_balance) || 0 : parseFloat(existing.opening_balance) || 0;
        const newOpType = opening_balance_type ? (opening_balance_type === 'CR' ? 'CR' : 'DR') : existing.opening_balance_type;
        const newOpDate = opening_balance_date || existing.opening_balance_date || new Date().toISOString().split('T')[0];
        const newNotes = notes !== undefined ? notes : existing.notes;
        const newIsActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;

        await client.query(`
            UPDATE ledgers SET
                group_id = $1,
                ledger_name = $2,
                ledger_code = $3,
                opening_balance = $4,
                opening_balance_type = $5,
                opening_balance_date = $6,
                notes = $7,
                maintain_bill_by_bill = $8,
                default_credit_period_days = $9,
                credit_limit = $10,
                tax_type = $11,
                is_cost_centres_applicable = $12,
                is_active = $13,
                updated_at = CURRENT_TIMESTAMP
            WHERE ledger_id = $14 AND company_id = $15
        `, [
            targetGroupId,
            newName,
            newCode,
            newOpBal,
            newOpType,
            newOpDate,
            newNotes,
            maintain_bill_by_bill !== undefined ? Boolean(maintain_bill_by_bill) : existing.maintain_bill_by_bill,
            default_credit_period_days !== undefined ? parseInt(default_credit_period_days) || 0 : existing.default_credit_period_days,
            credit_limit !== undefined ? parseFloat(credit_limit) || 0 : existing.credit_limit,
            tax_type !== undefined ? tax_type : existing.tax_type,
            is_cost_centres_applicable !== undefined ? Boolean(is_cost_centres_applicable) : existing.is_cost_centres_applicable,
            newIsActive,
            ledger_id,
            companyId
        ]);

        await recalculateLedgerBalance(client, ledger_id, companyId);

        const updatedRes = await client.query(`
            SELECT l.*, ag.group_name, ag.group_code, ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.ledger_id = $1
        `, [ledger_id]);

        await client.query('COMMIT');
        return res.json({ success: true, message: 'Ledger updated successfully', data: updatedRes.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateLedger:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 5c. Delete Ledger with Accounting Rule Validations
export const deleteLedger = async (req, res) => {
    try {
        const { ledger_id } = req.params;
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;

        if (!companyId || !ledger_id) {
            return res.status(400).json({ success: false, message: 'Company ID and Ledger ID are required.' });
        }

        const ledRes = await pool.query(
            `SELECT * FROM ledgers WHERE ledger_id = $1 AND company_id = $2`,
            [ledger_id, companyId]
        );
        if (ledRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ledger not found.' });
        }
        const ledger = ledRes.rows[0];

        const systemLedgerCodes = [
            'LED-CASH-MAIN', 'LED-BANK-MAIN', 'LED-SALES-GEN', 'LED-PURCH-GEN',
            'LED-TAX-OUT-CGST', 'LED-TAX-OUT-SGST', 'LED-TAX-OUT-IGST',
            'LED-TAX-IN-CGST', 'LED-TAX-IN-SGST', 'LED-TAX-IN-IGST',
            'LED-ROUND-OFF', 'LED-EXP-GEN'
        ];
        if (ledger.is_system_defined || systemLedgerCodes.includes(ledger.ledger_code)) {
            return res.status(400).json({
                success: false,
                message: 'System-defined default accounts cannot be deleted. You can rename or deactivate them.'
            });
        }

        const transCount = await pool.query(
            `SELECT COUNT(*)::INT AS cnt FROM voucher_lines WHERE ledger_id = $1`,
            [ledger_id]
        );
        if (transCount.rows[0].cnt > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete ledger "${ledger.ledger_name}" because it has ${transCount.rows[0].cnt} recorded accounting transaction(s). You can deactivate it instead.`
            });
        }

        const bankCheck = await pool.query(`SELECT bank_account_id FROM bank_accounts WHERE ledger_id = $1`, [ledger_id]);
        if (bankCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete ledger because it is linked to a Bank Account.' });
        }
        const custCheck = await pool.query(`SELECT customer_id FROM customer_profiles WHERE ledger_id = $1`, [ledger_id]);
        if (custCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete ledger because it is linked to a Customer Profile.' });
        }
        const vendCheck = await pool.query(`SELECT vendor_profile_id FROM vendor_profiles WHERE ledger_id = $1`, [ledger_id]);
        if (vendCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete ledger because it is linked to a Vendor Profile.' });
        }

        await pool.query(`DELETE FROM ledgers WHERE ledger_id = $1 AND company_id = $2`, [ledger_id, companyId]);

        return res.json({ success: true, message: `Ledger "${ledger.ledger_name}" deleted successfully.` });
    } catch (error) {
        console.error('Error in deleteLedger:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5a. Get bank accounts with their linked ledger balances
export const getBankAccounts = async (req, res) => {
    try {
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        const result = await pool.query(`
            SELECT ba.*, l.ledger_name, l.ledger_code, l.current_balance,
                   l.current_balance_type, l.opening_balance, l.opening_balance_type
            FROM bank_accounts ba
            JOIN ledgers l ON l.ledger_id = ba.ledger_id
            WHERE ba.company_id = $1 AND ba.is_active = TRUE
            ORDER BY ba.bank_name ASC, ba.account_number ASC
        `, [companyId]);

        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getBankAccounts:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5b. Create a bank account and its corresponding Bank Accounts ledger
export const createBankAccount = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            account_type = 'CURRENT',
            account_holder_name,
            opening_balance = 0,
            opening_balance_type = 'DR'
        } = req.body;
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;
        const balance = Number(opening_balance);

        if (!companyId || !bank_name?.trim() || !account_number?.trim() || !ifsc_code?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Company ID, bank name, account number, and IFSC code are required'
            });
        }
        if (!['CURRENT', 'SAVINGS', 'OVERDRAFT', 'CASH_CREDIT'].includes(account_type)) {
            return res.status(400).json({ success: false, message: 'Invalid bank account type' });
        }
        if (!Number.isFinite(balance) || balance < 0) {
            return res.status(400).json({ success: false, message: 'Opening balance must be a non-negative number' });
        }
        if (!['DR', 'CR'].includes(opening_balance_type)) {
            return res.status(400).json({ success: false, message: 'Opening balance type must be DR or CR' });
        }

        await client.query('BEGIN');
        const groupResult = await client.query(
            `SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-BANK'`,
            [companyId]
        );
        if (groupResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Bank Accounts group is not configured for this company' });
        }

        const ledgerName = `${bank_name.trim()} - ${account_number.trim().slice(-4)}`;
        const ledgerCode = `LED-BANK-${Date.now().toString().slice(-8)}`;
        const ledgerResult = await client.query(`
            INSERT INTO ledgers (
                company_id, group_id, ledger_name, ledger_code, opening_balance,
                opening_balance_type, current_balance, current_balance_type, tax_type, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $5, $6, 'NONE', TRUE)
            RETURNING *
        `, [companyId, groupResult.rows[0].group_id, ledgerName, ledgerCode, balance, opening_balance_type]);

        const bankResult = await client.query(`
            INSERT INTO bank_accounts (
                company_id, ledger_id, bank_name, account_number, ifsc_code,
                branch_name, account_type, account_holder_name, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
            RETURNING *
        `, [
            companyId,
            ledgerResult.rows[0].ledger_id,
            bank_name.trim(),
            account_number.trim(),
            ifsc_code.trim().toUpperCase(),
            branch_name?.trim() || null,
            account_type,
            account_holder_name?.trim() || null
        ]);

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'Bank account and ledger created successfully',
            data: { ...bankResult.rows[0], ledger: ledgerResult.rows[0] }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createBankAccount:', error);
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'A bank account with this account number already exists' });
        }
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 6. Get Ledger Statement (Running Debit/Credit Ledger Book)
export const getLedgerStatement = async (req, res) => {
    try {
        const { ledger_id } = req.params;
        const { from_date, to_date, voucher_type, financial_year_id } = req.query;
        const companyId = req.scopeCompanyId || req.user?.company_id;

        // Fetch ledger basic info
        const ledgerRes = await pool.query(`
            SELECT l.*, ag.group_name, ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.ledger_id = $1 AND l.company_id = $2
        `, [ledger_id, companyId]);

        if (ledgerRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ledger not found' });
        }
        const ledger = ledgerRes.rows[0];
        const isDebitNature = ['ASSET', 'EXPENSE'].includes(ledger.nature);

        // Date range determination
        let effectiveFromDate = from_date;
        let effectiveToDate = to_date;

        if (financial_year_id) {
            const fyRes = await pool.query(
                `SELECT start_date, end_date FROM financial_years WHERE financial_year_id = $1 AND company_id = $2`,
                [financial_year_id, companyId]
            );
            if (fyRes.rows.length > 0) {
                if (!effectiveFromDate) effectiveFromDate = fyRes.rows[0].start_date;
                if (!effectiveToDate) effectiveToDate = fyRes.rows[0].end_date;
            }
        }

        // 1. Calculate Period Opening Balance (Base opening balance + all transactions before effectiveFromDate)
        const baseOpBal = parseFloat(ledger.opening_balance) || 0;
        const isBaseOpDr = (ledger.opening_balance_type || 'DR') === 'DR';
        let periodOpeningSigned = 0;

        if (isDebitNature) {
            periodOpeningSigned = isBaseOpDr ? baseOpBal : -baseOpBal;
        } else {
            periodOpeningSigned = isBaseOpDr ? -baseOpBal : baseOpBal;
        }

        if (effectiveFromDate) {
            const priorRes = await pool.query(`
                SELECT 
                    COALESCE(SUM(vl.debit_amount), 0)::NUMERIC(16,2) AS prior_dr,
                    COALESCE(SUM(vl.credit_amount), 0)::NUMERIC(16,2) AS prior_cr
                FROM voucher_lines vl
                JOIN vouchers v ON vl.voucher_id = v.voucher_id
                WHERE vl.ledger_id = $1 AND v.company_id = $2 AND v.is_posted = TRUE
                  AND v.voucher_date < $3
            `, [ledger_id, companyId, effectiveFromDate]);

            const priorDr = parseFloat(priorRes.rows[0].prior_dr) || 0;
            const priorCr = parseFloat(priorRes.rows[0].prior_cr) || 0;

            if (isDebitNature) {
                periodOpeningSigned += (priorDr - priorCr);
            } else {
                periodOpeningSigned += (priorCr - priorDr);
            }
        }

        const periodOpeningBalance = Math.abs(periodOpeningSigned);
        const periodOpeningBalanceType = periodOpeningSigned >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

        // 2. Fetch voucher lines for this ledger within the range
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
                v.narration AS voucher_narration,
                (
                    SELECT STRING_AGG(DISTINCT l2.ledger_name, ', ')
                    FROM voucher_lines vl2
                    JOIN ledgers l2 ON vl2.ledger_id = l2.ledger_id
                    WHERE vl2.voucher_id = v.voucher_id AND vl2.ledger_id != $1
                ) AS contra_ledgers
            FROM voucher_lines vl
            JOIN vouchers v ON vl.voucher_id = v.voucher_id
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            WHERE vl.ledger_id = $1 AND v.company_id = $2 AND v.is_posted = TRUE
        `;
        const params = [ledger_id, companyId];

        if (effectiveFromDate) {
            params.push(effectiveFromDate);
            query += ` AND v.voucher_date >= $${params.length}`;
        }
        if (effectiveToDate) {
            params.push(effectiveToDate);
            query += ` AND v.voucher_date <= $${params.length}`;
        }
        if (voucher_type) {
            const cleanVT = voucher_type.trim().toUpperCase();
            const vtNoPrefix = cleanVT.replace(/^VCH-/, '');
            const vtWithPrefix = `VCH-${vtNoPrefix}`;
            params.push(cleanVT, vtWithPrefix, vtNoPrefix);
            query += ` AND (
                UPPER(vt.voucher_type_code) = $${params.length - 2}
                OR UPPER(vt.voucher_type_code) = $${params.length - 1}
                OR UPPER(vt.base_category) = $${params.length}
            )`;
        }

        query += ` ORDER BY v.voucher_date ASC, v.voucher_id ASC, vl.line_number ASC`;

        const linesRes = await pool.query(query, params);

        let runningSigned = periodOpeningSigned;
        let totalDebit = 0;
        let totalCredit = 0;

        const transactions = linesRes.rows.map(line => {
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;
            totalDebit += dr;
            totalCredit += cr;

            if (isDebitNature) {
                runningSigned += (dr - cr);
            } else {
                runningSigned += (cr - dr);
            }

            const particulars = line.contra_ledgers || line.line_narration || line.voucher_narration || line.voucher_type_name;

            return {
                ...line,
                particulars,
                running_balance: Math.abs(runningSigned).toFixed(2),
                running_balance_type: runningSigned >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR')
            };
        });

        const closingBalance = Math.abs(runningSigned);
        const closingBalanceType = runningSigned >= 0 ? (isDebitNature ? 'DR' : 'CR') : (isDebitNature ? 'CR' : 'DR');

        return res.json({
            success: true,
            data: {
                ledger,
                base_opening_balance: ledger.opening_balance,
                base_opening_balance_type: ledger.opening_balance_type,
                period_opening_balance: periodOpeningBalance.toFixed(2),
                period_opening_balance_type: periodOpeningBalanceType,
                from_date: effectiveFromDate || null,
                to_date: effectiveToDate || null,
                transactions,
                totals: {
                    total_debit: totalDebit.toFixed(2),
                    total_credit: totalCredit.toFixed(2),
                    closing_balance: closingBalance.toFixed(2),
                    closing_balance_type: closingBalanceType
                }
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
            if (!Number.isFinite(dr) || !Number.isFinite(cr) || dr < 0 || cr < 0 || (dr > 0 && cr > 0)) {
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

        // Fetch voucher type (support codes like 'CONTRA', 'VCH-CONTRA', or base category)
        const cleanCode = voucher_type_code.trim().toUpperCase();
        const codeWithoutPrefix = cleanCode.replace(/^VCH-/, '');
        const codeWithPrefix = `VCH-${codeWithoutPrefix}`;

        const vtRes = await client.query(
            `SELECT voucher_type_id, voucher_type_code FROM voucher_types
             WHERE (company_id = $1 OR company_id IS NULL)
               AND (
                 UPPER(voucher_type_code) = $2
                 OR UPPER(voucher_type_code) = $3
                 OR UPPER(base_category) = $4
               )
             ORDER BY company_id NULLS LAST LIMIT 1`,
            [companyId, cleanCode, codeWithPrefix, codeWithoutPrefix]
        );
        if (vtRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Invalid voucher type: ${voucher_type_code}` });
        }
        const matchedVoucherType = vtRes.rows[0];
        const voucherTypeId = matchedVoucherType.voucher_type_id;

        // Generate voucher number using the canonical voucher type code
        const voucherCodeForNumber = matchedVoucherType.voucher_type_code || codeWithPrefix;
        const voucherNumber = await generateVoucherNumber(client, companyId, branchId, voucherCodeForNumber);

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

        // Insert Voucher Lines and track affected ledgers
        const affectedLedgerIds = new Set();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;

            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                voucher.voucher_id,
                i + 1,
                line.ledger_id,
                dr,
                cr,
                line.narration || narration || null
            ]);

            affectedLedgerIds.add(line.ledger_id);
        }

        // Recalculate each affected ledger's balance strictly using opening balance + posted voucher lines
        for (const ledgerId of affectedLedgerIds) {
            await recalculateLedgerBalance(client, ledgerId, companyId);
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
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
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
            const cleanVT = voucherType.trim().toUpperCase();
            const vtNoPrefix = cleanVT.replace(/^VCH-/, '');
            const vtWithPrefix = `VCH-${vtNoPrefix}`;
            params.push(cleanVT, vtWithPrefix, vtNoPrefix);
            query += ` AND (
                UPPER(vt.voucher_type_code) = $${params.length - 2}
                OR UPPER(vt.voucher_type_code) = $${params.length - 1}
                OR UPPER(vt.base_category) = $${params.length}
            )`;
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
        const companyId = req.scopeCompanyId || req.user?.company_id;
        const vRes = await pool.query(`
            SELECT 
                v.*,
                vt.voucher_type_name,
                vt.voucher_type_code,
                e.first_name || ' ' || COALESCE(e.last_name, '') AS created_by_name
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            LEFT JOIN employees e ON v.created_by = e.employee_id
            WHERE v.voucher_id = $1 AND v.company_id = $2
        `, [id, companyId]);

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

// 9a. Update Voucher (Double-entry validation, balance recalculation)
export const updateVoucher = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;
        const {
            voucher_date,
            reference_number,
            reference_date,
            narration,
            lines = []
        } = req.body;

        if (!companyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        // Fetch existing voucher
        const vRes = await client.query(
            `SELECT * FROM vouchers WHERE voucher_id = $1 AND company_id = $2 FOR UPDATE`,
            [id, companyId]
        );
        if (vRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        const existingVoucher = vRes.rows[0];

        if (existingVoucher.source_module === 'SALES_INVOICE' || existingVoucher.source_module === 'PURCHASE_BILL') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `This voucher was automatically generated by ${existingVoucher.source_module}. Please edit it via that module.`
            });
        }

        if (!Array.isArray(lines) || lines.length < 2) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'A valid voucher requires at least 2 lines.' });
        }

        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            const dr = parseFloat(line.debit_amount) || 0;
            const cr = parseFloat(line.credit_amount) || 0;
            if (dr < 0 || cr < 0 || (dr > 0 && cr > 0)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Each line must have either a Debit or Credit amount, not both.' });
            }
            if (dr === 0 && cr === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Each line must have a non-zero Debit or Credit amount.' });
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

        // Collect existing ledger IDs to recalculate later
        const oldLinesRes = await client.query(
            `SELECT DISTINCT ledger_id FROM voucher_lines WHERE voucher_id = $1`,
            [id]
        );
        const affectedLedgerIds = new Set(oldLinesRes.rows.map(r => r.ledger_id));

        // Update voucher header
        await client.query(`
            UPDATE vouchers
            SET voucher_date = COALESCE($1, voucher_date),
                reference_number = COALESCE($2, reference_number),
                reference_date = $3,
                narration = COALESCE($4, narration),
                updated_at = CURRENT_TIMESTAMP
            WHERE voucher_id = $5
        `, [voucher_date || null, reference_number || null, reference_date || null, narration || null, id]);

        // Unpost voucher temporarily so line updates/deletion do not trigger premature balance checks
        await client.query(`UPDATE vouchers SET is_posted = FALSE WHERE voucher_id = $1`, [id]);

        // Delete old bill_allocations and voucher_lines
        await client.query(
            `DELETE FROM bill_allocations WHERE voucher_line_id IN (SELECT line_id FROM voucher_lines WHERE voucher_id = $1)`,
            [id]
        );
        await client.query(`DELETE FROM voucher_lines WHERE voucher_id = $1`, [id]);

        // Insert new lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            affectedLedgerIds.add(line.ledger_id);
            await client.query(`
                INSERT INTO voucher_lines (
                    voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                id,
                i + 1,
                line.ledger_id,
                parseFloat(line.debit_amount) || 0,
                parseFloat(line.credit_amount) || 0,
                line.narration || narration || null
            ]);
        }

        // Re-post voucher to enforce balanced validation trigger
        await client.query(`UPDATE vouchers SET is_posted = TRUE WHERE voucher_id = $1`, [id]);

        // Recalculate balances for all affected ledgers (old and new)
        for (const ledgerId of affectedLedgerIds) {
            await recalculateLedgerBalance(client, ledgerId, companyId);
        }

        await client.query('COMMIT');
        return res.json({ success: true, message: 'Voucher updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateVoucher:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 9b. Delete Voucher (Safely delete manual vouchers and recalculate balances)
export const deleteVoucher = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const companyId = req.scopeCompanyId || req.user?.company_id;

        const vRes = await client.query(
            `SELECT * FROM vouchers WHERE voucher_id = $1 AND company_id = $2 FOR UPDATE`,
            [id, companyId]
        );
        if (vRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }
        const voucher = vRes.rows[0];

        if (voucher.source_module === 'SALES_INVOICE' || voucher.source_module === 'PURCHASE_BILL') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `This voucher was automatically generated by ${voucher.source_module} and cannot be deleted here.`
            });
        }

        // Collect affected ledger IDs
        const oldLinesRes = await client.query(
            `SELECT DISTINCT ledger_id FROM voucher_lines WHERE voucher_id = $1`,
            [id]
        );
        const affectedLedgerIds = oldLinesRes.rows.map(r => r.ledger_id);

        // Unpost voucher temporarily to satisfy trigger
        await client.query(`UPDATE vouchers SET is_posted = FALSE WHERE voucher_id = $1`, [id]);

        // Delete bill_allocations and voucher_lines
        await client.query(
            `DELETE FROM bill_allocations WHERE voucher_line_id IN (SELECT line_id FROM voucher_lines WHERE voucher_id = $1)`,
            [id]
        );
        await client.query(`DELETE FROM voucher_lines WHERE voucher_id = $1`, [id]);
        await client.query(`DELETE FROM vouchers WHERE voucher_id = $1`, [id]);

        // Recalculate balances for all affected ledgers
        for (const ledgerId of affectedLedgerIds) {
            await recalculateLedgerBalance(client, ledgerId, companyId);
        }

        await client.query('COMMIT');
        return res.json({ success: true, message: `Voucher ${voucher.voucher_number} deleted successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in deleteVoucher:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// 10. Trial Balance Report (Fully integrated with Opening Balances, Vouchers, and P&L)
export const getTrialBalance = async (req, res) => {
    try {
        const companyId = req.scopeCompanyId || req.query.company_id || req.user?.company_id;
        const asOnDate = req.query.as_on_date || new Date().toISOString().split('T')[0];

        // Query all ledgers with opening balance and aggregate posted voucher lines up to asOnDate
        const result = await pool.query(`
            SELECT 
                l.ledger_id,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                ag.nature,
                ag.affects_gross_profit,
                COALESCE(l.opening_balance, 0)::NUMERIC(16,2) AS opening_balance,
                COALESCE(l.opening_balance_type, 'DR') AS opening_balance_type,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.debit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS period_debit,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.credit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS period_credit
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            LEFT JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            LEFT JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE AND v.voucher_date <= $2
            WHERE l.company_id = $1
            GROUP BY l.ledger_id, l.ledger_name, l.ledger_code, ag.group_name, ag.nature, ag.affects_gross_profit, l.opening_balance, l.opening_balance_type
            ORDER BY ag.nature, l.ledger_name ASC
        `, [companyId, asOnDate]);

        let totalOpeningDebit = 0;
        let totalOpeningCredit = 0;
        let totalPeriodDebit = 0;
        let totalPeriodCredit = 0;
        let totalClosingDebit = 0;
        let totalClosingCredit = 0;

        let totalIncome = 0;
        let totalExpense = 0;
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;

        const rows = result.rows.map(r => {
            const opBal = parseFloat(r.opening_balance) || 0;
            const opDr = r.opening_balance_type === 'DR' ? opBal : 0;
            const opCr = r.opening_balance_type === 'CR' ? opBal : 0;

            const pDr = parseFloat(r.period_debit) || 0;
            const pCr = parseFloat(r.period_credit) || 0;

            totalOpeningDebit += opDr;
            totalOpeningCredit += opCr;
            totalPeriodDebit += pDr;
            totalPeriodCredit += pCr;

            // Cumulative double-entry balance:
            // For any account: Total Debit = opDr + pDr; Total Credit = opCr + pCr; Net = Total Debit - Total Credit
            const cumulativeDr = opDr + pDr;
            const cumulativeCr = opCr + pCr;
            const net = cumulativeDr - cumulativeCr;

            let closingDebit = 0;
            let closingCredit = 0;
            let closingBalance = 0;
            let closingBalanceType = 'DR';

            if (net > 0) {
                closingDebit = net;
                closingBalance = net;
                closingBalanceType = 'DR';
            } else if (net < 0) {
                closingCredit = Math.abs(net);
                closingBalance = Math.abs(net);
                closingBalanceType = 'CR';
            }

            totalClosingDebit += closingDebit;
            totalClosingCredit += closingCredit;

            // Classification flows
            if (r.nature === 'INCOME') {
                totalIncome += (closingCredit - closingDebit);
            } else if (r.nature === 'EXPENSE') {
                totalExpense += (closingDebit - closingCredit);
            } else if (r.nature === 'ASSET') {
                totalAssets += (closingDebit - closingCredit);
            } else if (r.nature === 'LIABILITY') {
                totalLiabilities += (closingCredit - closingDebit);
            } else if (r.nature === 'EQUITY') {
                totalEquity += (closingCredit - closingDebit);
            }

            return {
                ...r,
                opening_debit: opDr.toFixed(2),
                opening_credit: opCr.toFixed(2),
                period_debit: pDr.toFixed(2),
                period_credit: pCr.toFixed(2),
                closing_debit: closingDebit.toFixed(2),
                closing_credit: closingCredit.toFixed(2),
                closing_balance: closingBalance.toFixed(2),
                closing_balance_type: closingBalanceType
            };
        });

        const netProfitLoss = +(totalIncome - totalExpense).toFixed(2);

        return res.json({
            success: true,
            data: {
                as_on_date: asOnDate,
                rows,
                totals: {
                    total_opening_debit: totalOpeningDebit.toFixed(2),
                    total_opening_credit: totalOpeningCredit.toFixed(2),
                    opening_difference: Math.abs(totalOpeningDebit - totalOpeningCredit).toFixed(2),
                    total_period_debit: totalPeriodDebit.toFixed(2),
                    total_period_credit: totalPeriodCredit.toFixed(2),
                    total_debit: totalClosingDebit.toFixed(2),
                    total_credit: totalClosingCredit.toFixed(2),
                    closing_difference: Math.abs(totalClosingDebit - totalClosingCredit).toFixed(2),
                    difference: Math.abs(totalClosingDebit - totalClosingCredit).toFixed(2),
                    is_balanced: Math.abs(totalClosingDebit - totalClosingCredit) < 0.05
                },
                profit_and_loss_summary: {
                    total_income: totalIncome.toFixed(2),
                    total_expense: totalExpense.toFixed(2),
                    net_profit_loss: Math.abs(netProfitLoss).toFixed(2),
                    is_profit: netProfitLoss >= 0
                },
                balance_sheet_summary: {
                    total_assets: totalAssets.toFixed(2),
                    total_liabilities: totalLiabilities.toFixed(2),
                    total_equity: totalEquity.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error('Error in getTrialBalance:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Day Book (Daily Chronological Voucher Register)
export const getDayBook = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const date = req.query.date;
        const fromDate = req.query.from_date || date || new Date().toISOString().split('T')[0];
        const toDate = req.query.to_date || date || fromDate;
        const voucherType = req.query.voucher_type;

        if (fromDate > toDate) {
            return res.status(400).json({
                success: false,
                message: 'From date cannot be after To date.'
            });
        }

        let query = `
            SELECT 
                v.voucher_id,
                v.voucher_number,
                v.voucher_date,
                v.reference_number,
                v.narration,
                v.is_posted,
                vt.voucher_type_name,
                vt.voucher_type_code,
                vt.base_category,
                e.first_name || ' ' || COALESCE(e.last_name, '') AS created_by_name,
                COALESCE(SUM(vl.debit_amount), 0)::NUMERIC(16,2) AS total_debit,
                COALESCE(SUM(vl.credit_amount), 0)::NUMERIC(16,2) AS total_credit
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.voucher_type_id
            LEFT JOIN employees e ON v.created_by = e.employee_id
            LEFT JOIN voucher_lines vl ON v.voucher_id = vl.voucher_id
            WHERE v.company_id = $1
              AND v.voucher_date >= $2
              AND v.voucher_date <= $3
              AND v.source_module IS DISTINCT FROM 'SALES_INVOICE'
              AND NOT (
                  COALESCE(v.source_module, '') = ''
                  AND vt.base_category = 'SALES'
                  AND COALESCE(v.narration, '') LIKE 'Sales Invoice %'
              )
        `;
        const params = [companyId, fromDate, toDate];

        if (voucherType) {
            const cleanVT = voucherType.trim().toUpperCase();
            const vtNoPrefix = cleanVT.replace(/^VCH-/, '');
            const vtWithPrefix = `VCH-${vtNoPrefix}`;
            params.push(cleanVT, vtWithPrefix, vtNoPrefix);
            query += ` AND (
                UPPER(vt.voucher_type_code) = $${params.length - 2}
                OR UPPER(vt.voucher_type_code) = $${params.length - 1}
                OR UPPER(vt.base_category) = $${params.length}
            )`;
        }

        query += ` GROUP BY v.voucher_id, vt.voucher_type_name, vt.voucher_type_code, vt.base_category, e.first_name, e.last_name ORDER BY v.voucher_date DESC, v.voucher_id DESC`;

        const vouchersRes = await pool.query(query, params);

        const openingCashRes = await pool.query(`
            SELECT COALESCE(SUM(
                CASE WHEN l.opening_balance_type = 'CR'
                    THEN -l.opening_balance
                    ELSE l.opening_balance
                END
            ), 0)::NUMERIC(16,2) AS opening_cash
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.company_id = $1
              AND ag.group_code IN ('GRP-CASH', 'GRP-BANK')
              AND l.is_active = TRUE
        `, [companyId]);

        const cashMovementParams = [companyId, toDate];
        let cashMovementQuery = `
            SELECT v.voucher_date,
                   COALESCE(SUM(vl.debit_amount - vl.credit_amount), 0)::NUMERIC(16,2) AS movement
            FROM vouchers v
            JOIN voucher_lines vl ON vl.voucher_id = v.voucher_id
            JOIN ledgers l ON l.ledger_id = vl.ledger_id
            JOIN account_groups ag ON ag.group_id = l.group_id
            WHERE v.company_id = $1
              AND v.is_posted = TRUE
              AND v.voucher_date <= $2
              AND ag.group_code IN ('GRP-CASH', 'GRP-BANK')
        `;
        if (voucherType) {
            const cleanVT = voucherType.trim().toUpperCase();
            const vtNoPrefix = cleanVT.replace(/^VCH-/, '');
            const vtWithPrefix = `VCH-${vtNoPrefix}`;
            cashMovementParams.push(cleanVT, vtWithPrefix, vtNoPrefix);
            cashMovementQuery += ` AND v.voucher_type_id IN (
                SELECT voucher_type_id
                FROM voucher_types
                WHERE (
                    UPPER(voucher_type_code) = $${cashMovementParams.length - 2}
                    OR UPPER(voucher_type_code) = $${cashMovementParams.length - 1}
                    OR UPPER(base_category) = $${cashMovementParams.length}
                )
                  AND (company_id = $1 OR company_id IS NULL)
            )`;
        }
        cashMovementQuery += ' GROUP BY v.voucher_date ORDER BY v.voucher_date ASC';
        const cashMovementsRes = await pool.query(cashMovementQuery, cashMovementParams);

        const openingCash = parseFloat(openingCashRes.rows[0]?.opening_cash || 0);
        const movementByDate = new Map(cashMovementsRes.rows.map((row) => {
            const date = row.voucher_date.toISOString
                ? row.voucher_date.toISOString().split('T')[0]
                : String(row.voucher_date).split('T')[0];
            return [date, parseFloat(row.movement) || 0];
        }));
        const balanceDates = new Set([
            ...cashMovementsRes.rows.map((row) => row.voucher_date.toISOString
                ? row.voucher_date.toISOString().split('T')[0]
                : String(row.voucher_date).split('T')[0]),
            ...vouchersRes.rows.map((row) => row.voucher_date.toISOString
                ? row.voucher_date.toISOString().split('T')[0]
                : String(row.voucher_date).split('T')[0])
        ]);
        let runningCash = openingCash;
        const dailyBalances = [];
        for (const date of Array.from(balanceDates).sort()) {
            if (date > toDate) continue;
            const movement = movementByDate.get(date) || 0;
            const openingBalance = runningCash;
            runningCash += movement;
            if (date >= fromDate && date <= toDate) {
                dailyBalances.push({
                    date,
                    opening_balance: openingBalance.toFixed(2),
                    movement: movement.toFixed(2),
                    closing_balance: runningCash.toFixed(2),
                    opening_balance_type: openingBalance >= 0 ? 'DR' : 'CR',
                    closing_balance_type: runningCash >= 0 ? 'DR' : 'CR'
                });
            }
        }

        // Fetch lines for these vouchers
        const voucherIds = vouchersRes.rows.map(v => v.voucher_id);
        let linesByVoucher = {};
        if (voucherIds.length > 0) {
            const linesRes = await pool.query(`
                SELECT 
                    vl.*,
                    l.ledger_name,
                    l.ledger_code,
                    ag.group_name,
                    ag.nature
                FROM voucher_lines vl
                JOIN ledgers l ON vl.ledger_id = l.ledger_id
                JOIN account_groups ag ON l.group_id = ag.group_id
                WHERE vl.voucher_id = ANY($1)
                ORDER BY vl.line_number ASC
            `, [voucherIds]);

            for (const line of linesRes.rows) {
                if (!linesByVoucher[line.voucher_id]) {
                    linesByVoucher[line.voucher_id] = [];
                }
                linesByVoucher[line.voucher_id].push(line);
            }
        }

        let totalDebitSum = 0;
        let totalCreditSum = 0;
        const vouchers = vouchersRes.rows.map(v => {
            const lines = linesByVoucher[v.voucher_id] || [];
            const debitLines = lines.filter(l => parseFloat(l.debit_amount) > 0);
            const creditLines = lines.filter(l => parseFloat(l.credit_amount) > 0);
            let particulars = '';
            if (v.base_category === 'SALES' || v.base_category === 'RECEIPT') {
                particulars = debitLines[0]?.ledger_name || creditLines[0]?.ledger_name || 'Voucher Entry';
            } else {
                particulars = creditLines[0]?.ledger_name || debitLines[0]?.ledger_name || 'Voucher Entry';
            }
            totalDebitSum += parseFloat(v.total_debit) || 0;
            totalCreditSum += parseFloat(v.total_credit) || 0;

            return {
                ...v,
                particulars,
                total_amount: v.total_debit,
                lines
            };
        });

        return res.json({
            success: true,
            data: {
                from_date: fromDate,
                to_date: toDate,
                count: vouchers.length,
                total_amount: totalDebitSum.toFixed(2),
                total_debit: totalDebitSum.toFixed(2),
                total_credit: totalCreditSum.toFixed(2),
                daily_balances: dailyBalances,
                vouchers
            }
        });
    } catch (error) {
        console.error('Error in getDayBook:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Profit & Loss Account (Trading & P&L Statement)
export const getProfitAndLoss = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const today = new Date();
        const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const fromDate = req.query.from_date || `${fiscalYearStart}-04-01`;
        const toDate = req.query.to_date || today.toISOString().split('T')[0];

        // 1. Calculate Real-Time Closing Stock Valuation
        const rawStockValRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS total_raw_val
            FROM raw_material_inventory
            WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);
        const fgStockValRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS total_fg_val
            FROM product_inventory
            WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);

        const rawClosingVal = parseFloat(rawStockValRes.rows[0]?.total_raw_val || 0);
        const fgClosingVal = parseFloat(fgStockValRes.rows[0]?.total_fg_val || 0);
        const totalClosingStock = +(rawClosingVal + fgClosingVal).toFixed(2);

        // 2. Fetch Opening Stock (Stock Ledgers opening balances)
        const opStockRes = await pool.query(`
            SELECT COALESCE(SUM(opening_balance), 0)::NUMERIC(16,2) AS op_stock
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.company_id = $1 AND (ag.group_code = 'GRP-STOCK' OR ag.group_code = 'STOCK_IN_HAND')
        `, [companyId]);
        const openingStock = parseFloat(opStockRes.rows[0]?.op_stock || 0);

        // 3. Query all Income and Expense ledger balances from posted voucher lines
        const ledgerFlows = await pool.query(`
            SELECT 
                l.ledger_id,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                ag.group_code,
                ag.nature,
                ag.affects_gross_profit,
                COALESCE(l.opening_balance, 0)::NUMERIC(16,2) AS opening_balance,
                COALESCE(l.opening_balance_type, 'DR') AS opening_balance_type,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.debit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS debit_sum,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.credit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS credit_sum
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            LEFT JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            LEFT JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE AND v.voucher_date >= $2 AND v.voucher_date <= $3
              AND v.source_module IS DISTINCT FROM 'PURCHASE_INVOICE'
            WHERE l.company_id = $1 AND ag.nature IN ('INCOME', 'EXPENSE')
            GROUP BY l.ledger_id, l.ledger_name, l.ledger_code, ag.group_name, ag.group_code, ag.nature, ag.affects_gross_profit, l.opening_balance, l.opening_balance_type
            ORDER BY ag.nature, l.ledger_name ASC
        `, [companyId, fromDate, toDate]);

        let totalPurchases = 0;
        const purchaseLedgers = [];
        let totalDirectExpenses = 0;
        const directExpenseLedgers = [];
        let totalSales = 0;
        const salesLedgers = [];
        let totalIndirectIncomes = 0;
        const indirectIncomeLedgers = [];
        let totalIndirectExpenses = 0;
        const indirectExpenseLedgers = [];

        for (const row of ledgerFlows.rows) {
            const deb = parseFloat(row.debit_sum) || 0;
            const cred = parseFloat(row.credit_sum) || 0;
            const opBal = parseFloat(row.opening_balance) || 0;

            if (row.nature === 'INCOME') {
                const opSigned = row.opening_balance_type === 'CR' ? opBal : -opBal;
                const netIncome = opSigned + cred - deb;
                if (netIncome === 0) continue;
                if (row.affects_gross_profit || row.group_code === 'GRP-SALES' || row.group_code === 'GRP-DIR-INC') {
                    totalSales += netIncome;
                    salesLedgers.push({ ...row, amount: netIncome.toFixed(2) });
                } else {
                    totalIndirectIncomes += netIncome;
                    indirectIncomeLedgers.push({ ...row, amount: netIncome.toFixed(2) });
                }
            } else if (row.nature === 'EXPENSE') {
                const opSigned = row.opening_balance_type === 'DR' ? opBal : -opBal;
                const netExpense = opSigned + deb - cred;
                if (netExpense === 0) continue;
                if (row.group_code === 'GRP-PURCHASE' || row.group_code === 'PURCHASE_ACCOUNTS') {
                    totalPurchases += netExpense;
                    purchaseLedgers.push({ ...row, amount: netExpense.toFixed(2) });
                } else if (row.affects_gross_profit || row.group_code === 'GRP-DIR-EXP' || row.group_code === 'DIRECT_EXPENSES') {
                    totalDirectExpenses += netExpense;
                    directExpenseLedgers.push({ ...row, amount: netExpense.toFixed(2) });
                } else {
                    totalIndirectExpenses += netExpense;
                    indirectExpenseLedgers.push({ ...row, amount: netExpense.toFixed(2) });
                }
            }
        }

        const tradingCreditTotal = +(totalSales + totalClosingStock).toFixed(2);
        const tradingDebitTotal = +(openingStock + totalPurchases + totalDirectExpenses).toFixed(2);
        const grossProfit = +(tradingCreditTotal - tradingDebitTotal).toFixed(2);

        const plCreditTotal = +(grossProfit + totalIndirectIncomes).toFixed(2);
        const netProfit = +(plCreditTotal - totalIndirectExpenses).toFixed(2);

        return res.json({
            success: true,
            data: {
                from_date: fromDate,
                to_date: toDate,
                trading_account: {
                    debit: {
                        opening_stock: openingStock.toFixed(2),
                        purchases: {
                            total: totalPurchases.toFixed(2),
                            ledgers: purchaseLedgers
                        },
                        direct_expenses: {
                            total: totalDirectExpenses.toFixed(2),
                            ledgers: directExpenseLedgers
                        },
                        total_debit: tradingDebitTotal.toFixed(2)
                    },
                    credit: {
                        sales: {
                            total: totalSales.toFixed(2),
                            ledgers: salesLedgers
                        },
                        closing_stock: {
                            total: totalClosingStock.toFixed(2),
                            raw_materials: rawClosingVal.toFixed(2),
                            finished_goods: fgClosingVal.toFixed(2)
                        },
                        total_credit: tradingCreditTotal.toFixed(2)
                    },
                    gross_profit: grossProfit.toFixed(2),
                    is_gross_profit: grossProfit >= 0
                },
                profit_and_loss: {
                    credit: {
                        gross_profit_brought_down: grossProfit.toFixed(2),
                        indirect_incomes: {
                            total: totalIndirectIncomes.toFixed(2),
                            ledgers: indirectIncomeLedgers
                        },
                        total_credit: plCreditTotal.toFixed(2)
                    },
                    debit: {
                        indirect_expenses: {
                            total: totalIndirectExpenses.toFixed(2),
                            ledgers: indirectExpenseLedgers
                        },
                        total_debit: totalIndirectExpenses.toFixed(2)
                    },
                    net_profit: netProfit.toFixed(2),
                    is_net_profit: netProfit >= 0
                }
            }
        });
    } catch (error) {
        console.error('Error in getProfitAndLoss:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Balance Sheet (Real Tally Double-Entry Format)
export const getBalanceSheet = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const asOnDate = req.query.as_on_date || new Date().toISOString().split('T')[0];

        // 1. Calculate Net Profit up to asOnDate for Equity inclusion (including opening balances of Income & Expense)
        const incExpRes = await pool.query(`
            SELECT 
                ag.nature,
                l.opening_balance,
                l.opening_balance_type,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.debit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS total_dr,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.credit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS total_cr
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            LEFT JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            LEFT JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE AND v.voucher_date <= $2
              AND v.source_module IS DISTINCT FROM 'PURCHASE_INVOICE'
            WHERE l.company_id = $1 AND ag.nature IN ('INCOME', 'EXPENSE')
            GROUP BY l.ledger_id, ag.nature, l.opening_balance, l.opening_balance_type
        `, [companyId, asOnDate]);

        let netIncomeFromOps = 0;
        let netExpenseFromOps = 0;
        for (const row of incExpRes.rows) {
            const opBal = parseFloat(row.opening_balance) || 0;
            const dr = parseFloat(row.total_dr) || 0;
            const cr = parseFloat(row.total_cr) || 0;
            if (row.nature === 'INCOME') {
                const opSigned = row.opening_balance_type === 'CR' ? opBal : -opBal;
                netIncomeFromOps += (opSigned + cr - dr);
            } else if (row.nature === 'EXPENSE') {
                const opSigned = row.opening_balance_type === 'DR' ? opBal : -opBal;
                netExpenseFromOps += (opSigned + dr - cr);
            }
        }
        // Purchases are posted to expense ledgers while stock is maintained in
        // inventory tables, so closing stock must be brought into current P&L.
        const closingRawRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS val
            FROM raw_material_inventory
            WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);
        const closingFgRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS val
            FROM product_inventory
            WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);
        const closingStock = (parseFloat(closingRawRes.rows[0]?.val || 0) || 0) +
            (parseFloat(closingFgRes.rows[0]?.val || 0) || 0);
        const openingStockRes = await pool.query(`
            SELECT COALESCE(SUM(opening_balance), 0)::NUMERIC(16,2) AS val
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            WHERE l.company_id = $1
              AND (ag.group_code = 'GRP-STOCK' OR ag.group_code = 'STOCK_IN_HAND')
        `, [companyId]);
        const openingStock = parseFloat(openingStockRes.rows[0]?.val || 0) || 0;
        const currentPeriodNetProfit = +(netIncomeFromOps - netExpenseFromOps + closingStock - openingStock).toFixed(2);

        // 2. Fetch Assets & Liabilities Ledgers with running balances
        const balLedgersRes = await pool.query(`
            SELECT 
                l.ledger_id,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                ag.group_code,
                ag.nature,
                l.opening_balance,
                l.opening_balance_type,
                l.current_balance,
                l.current_balance_type,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.debit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS period_debit,
                COALESCE(SUM(CASE WHEN v.voucher_id IS NOT NULL THEN vl.credit_amount ELSE 0 END), 0)::NUMERIC(16,2) AS period_credit
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            LEFT JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            LEFT JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE AND v.voucher_date <= $2
            WHERE l.company_id = $1 AND ag.nature IN ('ASSET', 'LIABILITY', 'EQUITY')
            GROUP BY l.ledger_id, l.ledger_name, l.ledger_code, ag.group_name, ag.group_code, ag.nature, l.opening_balance, l.opening_balance_type, l.current_balance, l.current_balance_type
            ORDER BY ag.nature, ag.group_name, l.ledger_name ASC
        `, [companyId, asOnDate]);

        // Physical Stock Valuation
        const stockRawRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS val
            FROM raw_material_inventory WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);
        const stockFgRes = await pool.query(`
            SELECT COALESCE(SUM(available_quantity * unit_cost), 0)::NUMERIC(16,2) AS val
            FROM product_inventory WHERE company_id = $1 AND available_quantity > 0
        `, [companyId]);
        const physicalStockTotal = +(parseFloat(stockRawRes.rows[0]?.val || 0) + parseFloat(stockFgRes.rows[0]?.val || 0)).toFixed(2);

        const liabilities = {
            capital_and_reserves: { total: 0, ledgers: [] },
            profit_and_loss: { total: currentPeriodNetProfit, is_profit: currentPeriodNetProfit >= 0 },
            loans_and_borrowings: { total: 0, ledgers: [] },
            current_liabilities: {
                total: 0,
                sundry_creditors: { total: 0, ledgers: [] },
                duties_and_taxes: { total: 0, ledgers: [] },
                other_liabilities: { total: 0, ledgers: [] }
            },
            total: 0
        };

        const assets = {
            fixed_assets: { total: 0, ledgers: [] },
            investments: { total: 0, ledgers: [] },
            current_assets: {
                total: 0,
                stock_in_hand: {
                    total: physicalStockTotal,
                    raw_material_valuation: parseFloat(stockRawRes.rows[0]?.val || 0).toFixed(2),
                    finished_goods_valuation: parseFloat(stockFgRes.rows[0]?.val || 0).toFixed(2)
                },
                sundry_debtors: { total: 0, ledgers: [] },
                cash_in_hand: { total: 0, ledgers: [] },
                bank_accounts: { total: 0, ledgers: [] },
                other_assets: { total: 0, ledgers: [] }
            },
            total: 0
        };

        for (const l of balLedgersRes.rows) {
            const opBal = (l.opening_balance_type === 'CR' ? -1 : 1) * (parseFloat(l.opening_balance) || 0);
            const dr = parseFloat(l.period_debit) || 0;
            const cr = parseFloat(l.period_credit) || 0;
            const netDr = opBal + dr - cr;
            const netCr = -netDr;

            const taxInputLedger = l.ledger_code?.startsWith('LED-TAX-IN-');

            if (l.nature === 'EQUITY') {
                const amt = netCr;
                liabilities.capital_and_reserves.total += amt;
                liabilities.capital_and_reserves.ledgers.push({ ...l, amount: amt.toFixed(2) });
            } else if (l.nature === 'LIABILITY') {
                if (netCr < 0 && taxInputLedger) {
                    const inputTaxAsset = Math.abs(netCr);
                    assets.current_assets.other_assets.total += inputTaxAsset;
                    assets.current_assets.other_assets.ledgers.push({ ...l, amount: inputTaxAsset.toFixed(2), classification: 'DEBIT_BALANCE' });
                    continue;
                }
                if (netCr < 0) {
                    const debitBalance = Math.abs(netCr);
                    assets.current_assets.other_assets.total += debitBalance;
                    assets.current_assets.other_assets.ledgers.push({ ...l, amount: debitBalance.toFixed(2), classification: 'DEBIT_BALANCE' });
                    continue;
                }
                if (l.group_code === 'GRP-LOAN') {
                    liabilities.loans_and_borrowings.total += netCr;
                    liabilities.loans_and_borrowings.ledgers.push({ ...l, amount: netCr.toFixed(2) });
                } else if (l.group_code === 'GRP-CREDITORS' || l.group_code === 'SUNDRY_CREDITORS') {
                    liabilities.current_liabilities.sundry_creditors.total += netCr;
                    liabilities.current_liabilities.sundry_creditors.ledgers.push({ ...l, amount: netCr.toFixed(2) });
                } else if (l.group_code === 'GRP-TAXES' || l.group_code === 'DUTIES_AND_TAXES') {
                    liabilities.current_liabilities.duties_and_taxes.total += netCr;
                    liabilities.current_liabilities.duties_and_taxes.ledgers.push({ ...l, amount: netCr.toFixed(2) });
                } else {
                    liabilities.current_liabilities.other_liabilities.total += netCr;
                    liabilities.current_liabilities.other_liabilities.ledgers.push({ ...l, amount: netCr.toFixed(2) });
                }
            } else if (l.nature === 'ASSET') {
                if (netDr < 0) {
                    const overdraft = Math.abs(netDr);
                    liabilities.current_liabilities.other_liabilities.total += overdraft;
                    liabilities.current_liabilities.other_liabilities.ledgers.push({ ...l, amount: overdraft.toFixed(2), classification: 'CREDIT_BALANCE' });
                    continue;
                }
                if (l.group_code === 'GRP-FA') {
                    assets.fixed_assets.total += netDr;
                    assets.fixed_assets.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else if (l.group_code === 'GRP-INV') {
                    assets.investments.total += netDr;
                    assets.investments.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else if (l.group_code === 'GRP-DEBTORS' || l.group_code === 'SUNDRY_DEBTORS') {
                    assets.current_assets.sundry_debtors.total += netDr;
                    assets.current_assets.sundry_debtors.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else if (l.group_code === 'GRP-CASH' || l.group_code === 'CASH_IN_HAND') {
                    assets.current_assets.cash_in_hand.total += netDr;
                    assets.current_assets.cash_in_hand.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else if (l.group_code === 'GRP-BANK' || l.group_code === 'BANK_ACCOUNTS') {
                    assets.current_assets.bank_accounts.total += netDr;
                    assets.current_assets.bank_accounts.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else if (l.group_code === 'GRP-STOCK') {
                    // Physical stock valuation reflects real-time stock
                } else if (taxInputLedger) {
                    assets.current_assets.other_assets.total += netDr;
                    assets.current_assets.other_assets.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                } else {
                    assets.current_assets.other_assets.total += netDr;
                    assets.current_assets.other_assets.ledgers.push({ ...l, amount: netDr.toFixed(2) });
                }
            }
        }

        liabilities.current_liabilities.total = +(
            liabilities.current_liabilities.sundry_creditors.total +
            liabilities.current_liabilities.duties_and_taxes.total +
            liabilities.current_liabilities.other_liabilities.total
        ).toFixed(2);

        liabilities.total = +(
            liabilities.capital_and_reserves.total +
            liabilities.profit_and_loss.total +
            liabilities.loans_and_borrowings.total +
            liabilities.current_liabilities.total
        ).toFixed(2);

        assets.current_assets.total = +(
            assets.current_assets.stock_in_hand.total +
            assets.current_assets.sundry_debtors.total +
            assets.current_assets.cash_in_hand.total +
            assets.current_assets.bank_accounts.total +
            assets.current_assets.other_assets.total
        ).toFixed(2);

        assets.total = +(
            assets.fixed_assets.total +
            assets.investments.total +
            assets.current_assets.total
        ).toFixed(2);

        const workingCapital = +(assets.current_assets.total - liabilities.current_liabilities.total).toFixed(2);
        const diff = +(Math.abs(liabilities.total - assets.total)).toFixed(2);

        return res.json({
            success: true,
            data: {
                as_on_date: asOnDate,
                liabilities: {
                    ...liabilities,
                    capital_and_reserves_total: liabilities.capital_and_reserves.total.toFixed(2),
                    loans_total: liabilities.loans_and_borrowings.total.toFixed(2),
                    current_liabilities_total: liabilities.current_liabilities.total.toFixed(2),
                    total_liabilities: liabilities.total.toFixed(2)
                },
                assets: {
                    ...assets,
                    fixed_assets_total: assets.fixed_assets.total.toFixed(2),
                    investments_total: assets.investments.total.toFixed(2),
                    current_assets_total: assets.current_assets.total.toFixed(2),
                    total_assets: assets.total.toFixed(2)
                },
                summary: {
                    total_liabilities: liabilities.total.toFixed(2),
                    total_assets: assets.total.toFixed(2),
                    difference: diff.toFixed(2),
                    is_balanced: diff < 0.05,
                    working_capital: workingCapital.toFixed(2)
                }
            }
        });
    } catch (error) {
        console.error('Error in getBalanceSheet:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 14. Expense Statement (Direct vs. Indirect Breakdown)
export const getExpenseStatement = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const today = new Date();
        const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const fromDate = req.query.from_date || `${fiscalYearStart}-04-01`;
        const toDate = req.query.to_date || today.toISOString().split('T')[0];

        const expensesRes = await pool.query(`
            SELECT 
                l.ledger_id,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                ag.group_code,
                ag.affects_gross_profit,
                COUNT(vl.line_id)::INT AS voucher_count,
                COALESCE(SUM(vl.debit_amount - vl.credit_amount), 0)::NUMERIC(16,2) AS total_expense
            FROM ledgers l
            JOIN account_groups ag ON l.group_id = ag.group_id
            JOIN voucher_lines vl ON l.ledger_id = vl.ledger_id
            JOIN vouchers v ON vl.voucher_id = v.voucher_id AND v.is_posted = TRUE
            WHERE l.company_id = $1 AND v.voucher_date >= $2 AND v.voucher_date <= $3
              AND v.source_module IS DISTINCT FROM 'PURCHASE_INVOICE'
              AND ag.nature = 'EXPENSE'
            GROUP BY l.ledger_id, l.ledger_name, l.ledger_code, ag.group_name, ag.group_code, ag.affects_gross_profit
            ORDER BY ag.affects_gross_profit DESC, total_expense DESC
        `, [companyId, fromDate, toDate]);

        let directTotal = 0;
        let indirectTotal = 0;
        const directList = [];
        const indirectList = [];

        for (const exp of expensesRes.rows) {
            const amt = parseFloat(exp.total_expense) || 0;
            if (exp.affects_gross_profit || exp.group_code === 'GRP-DIR-EXP' || exp.group_code === 'GRP-PURCHASE') {
                directTotal += amt;
                directList.push(exp);
            } else {
                indirectTotal += amt;
                indirectList.push(exp);
            }
        }

        const grandTotal = +(directTotal + indirectTotal).toFixed(2);

        return res.json({
            success: true,
            data: {
                from_date: fromDate,
                to_date: toDate,
                direct_expenses: {
                    total: directTotal.toFixed(2),
                    count: directList.length,
                    ledgers: directList
                },
                indirect_expenses: {
                    total: indirectTotal.toFixed(2),
                    count: indirectList.length,
                    ledgers: indirectList
                },
                grand_total: grandTotal.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error in getExpenseStatement:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getFinancialYears = async (req, res) => {
    try {
        const companyId = req.scopeCompanyId || req.user?.company_id;
        const result = await pool.query(`
            SELECT fy.*, COUNT(ap.period_id)::INT AS period_count,
                   COUNT(ap.period_id) FILTER (WHERE ap.is_locked)::INT AS locked_period_count
            FROM financial_years fy
            LEFT JOIN accounting_periods ap ON ap.financial_year_id = fy.financial_year_id
            WHERE fy.company_id = $1
            GROUP BY fy.financial_year_id
            ORDER BY fy.start_date DESC
        `, [companyId]);
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createFinancialYear = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyId = req.scopeCompanyId || req.body.company_id || req.user?.company_id;
        const { year_label, start_date, end_date } = req.body;
        if (!companyId || !year_label || !start_date || !end_date || new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({ success: false, message: 'Valid company, label, start date, and end date are required.' });
        }
        await client.query('BEGIN');
        const yearRes = await client.query(`
            INSERT INTO financial_years (company_id, year_label, start_date, end_date)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [companyId, year_label.trim(), start_date, end_date]);
        await client.query(`
            INSERT INTO accounting_periods (financial_year_id, period_number, start_date, end_date)
            SELECT $1, month_no,
                   GREATEST($2::date, ($2::date + ((month_no - 1) || ' months')::interval)::date),
                   LEAST($3::date, (($2::date + (month_no || ' months')::interval) - interval '1 day')::date)
            FROM generate_series(1, 12) AS month_no
            WHERE ($2::date + ((month_no - 1) || ' months')::interval)::date <= $3::date
        `, [yearRes.rows[0].financial_year_id, start_date, end_date]);
        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: yearRes.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

export const setPeriodLock = async (req, res) => {
    try {
        const companyId = req.scopeCompanyId || req.user?.company_id;
        const periodId = req.params.period_id;
        const locked = req.body.locked !== false;
        const result = await pool.query(`
            UPDATE accounting_periods ap
            SET is_locked = $1, locked_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
                locked_by = CASE WHEN $1 THEN $2 ELSE NULL END
            FROM financial_years fy
            WHERE ap.period_id = $3 AND ap.financial_year_id = fy.financial_year_id AND fy.company_id = $4
            RETURNING ap.*
        `, [locked, req.user?.employee_id || null, periodId, companyId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Accounting period not found.' });
        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const reverseVoucher = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyId = req.scopeCompanyId || req.user?.company_id;
        const voucherId = req.params.id;
        await client.query('BEGIN');
        const originalRes = await client.query(`
            SELECT v.* FROM vouchers v
            WHERE v.voucher_id = $1 AND v.company_id = $2
            FOR UPDATE
        `, [voucherId, companyId]);
        const original = originalRes.rows[0];
        if (!original) throw new Error('Voucher not found.');
        if (!original.is_posted || original.is_reversed) throw new Error('Only a posted, unreversed voucher can be reversed.');

        const linesRes = await client.query(`SELECT * FROM voucher_lines WHERE voucher_id = $1 ORDER BY line_number`, [voucherId]);
        const voucherNumber = await generateVoucherNumber(client, companyId, original.voucher_number.slice(0, 8) + '-REV');
        const reversalRes = await client.query(`
            INSERT INTO vouchers (
                company_id, branch_id, financial_year_id, voucher_type_id, voucher_number, voucher_date,
                narration, reference_number, source_module, source_document_id, is_posted, is_reversed,
                created_by, posted_by, posted_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, 'MANUAL', $8, TRUE, FALSE, $9, $9, CURRENT_TIMESTAMP)
            RETURNING *
        `, [companyId, original.branch_id, original.financial_year_id, original.voucher_type_id, voucherNumber,
            `Reversal of ${original.voucher_number}: ${original.narration || ''}`, original.voucher_number, voucherId,
            req.user?.employee_id || null]);
        const reversal = reversalRes.rows[0];

        const affectedLedgerIds = new Set();
        for (const line of linesRes.rows) {
            await client.query(`
                INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [reversal.voucher_id, line.line_number, line.ledger_id, line.credit_amount, line.debit_amount, 'Reversal entry']);
            affectedLedgerIds.add(line.ledger_id);
        }
        for (const ledgerId of affectedLedgerIds) {
            await recalculateLedgerBalance(client, ledgerId, companyId);
        }
        await client.query(`UPDATE vouchers SET is_reversed = TRUE, reversed_by_voucher_id = $1 WHERE voucher_id = $2`, [reversal.voucher_id, voucherId]);
        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: reversal });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};
