import pool from '../config/database.js';
import { applyLedgerBalance, resolveLedger } from '../services/AccountingPosting.js';

const companyIdOf = (req) => req.scopeCompanyId || req.body.company_id || req.query.company_id || req.user?.company_id;
const money = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Amounts must be valid non-negative numbers.');
    return Number(amount.toFixed(2));
};

const postJournal = async (client, { companyId, branchId, date, narration, lines, sourceDocumentId }) => {
    const debit = lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (debit <= 0 || Math.abs(debit - credit) > 0.01) throw new Error('Compliance accounting entry is not balanced.');
    const type = await client.query(
        `SELECT voucher_type_id FROM voucher_types WHERE (company_id = $1 OR company_id IS NULL) AND voucher_type_code IN ('VCH-JOURNAL', 'JOURNAL') ORDER BY company_id NULLS LAST LIMIT 1`,
        [companyId]
    );
    if (!type.rows[0]) throw new Error('Journal voucher type is not configured.');
    const number = `CMP-${new Date(date).getFullYear()}-${Date.now()}`;
    const voucher = await client.query(`
        INSERT INTO vouchers (company_id, branch_id, voucher_type_id, voucher_number, voucher_date, narration, source_module, source_document_id, is_posted, created_by, posted_by, posted_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'PAYROLL', $7, TRUE, $8, $8, CURRENT_TIMESTAMP)
        RETURNING voucher_id, voucher_number
    `, [companyId, branchId || null, type.rows[0].voucher_type_id, number, date, narration, sourceDocumentId || null, null]);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        await client.query(
            `INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration) VALUES ($1, $2, $3, $4, $5, $6)`,
            [voucher.rows[0].voucher_id, index + 1, line.ledgerId, line.debit, line.credit, line.narration || narration]
        );
        await applyLedgerBalance(client, companyId, line.ledgerId, line.debit, line.credit);
    }
    return voucher.rows[0];
};

export const getComplianceDashboard = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });
        const [payroll, challans, returns, forms] = await Promise.all([
            pool.query(`SELECT COUNT(*)::INT AS count, COALESCE(SUM(gross_amount), 0)::NUMERIC(16,2) AS gross, COALESCE(SUM(tds_amount), 0)::NUMERIC(16,2) AS tds, COALESCE(SUM(employee_pf_amount + employer_pf_amount), 0)::NUMERIC(16,2) AS pf FROM payroll_runs WHERE company_id = $1 AND status = 'POSTED'`, [companyId]),
            pool.query(`SELECT challan_type, status, COUNT(*)::INT AS count, COALESCE(SUM(amount), 0)::NUMERIC(16,2) AS amount FROM compliance_challans WHERE company_id = $1 GROUP BY challan_type, status ORDER BY challan_type, status`, [companyId]),
            pool.query(`SELECT return_type, status, period_end, due_date FROM compliance_returns WHERE company_id = $1 ORDER BY period_end DESC LIMIT 25`, [companyId]),
            pool.query(`SELECT form16_id, employee_id, financial_year, status, gross_salary, tds_deducted FROM form16_records WHERE company_id = $1 ORDER BY financial_year DESC LIMIT 25`, [companyId])
        ]);
        return res.json({ success: true, data: { payroll: payroll.rows[0], challans: challans.rows, returns: returns.rows, forms16: forms.rows } });
    } catch (error) {
        console.error('Error loading compliance dashboard:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getComplianceSettings = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const result = await pool.query(`SELECT * FROM compliance_settings WHERE company_id = $1 ORDER BY financial_year DESC`, [companyId]);
        return res.json({ success: true, data: result.rows });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

export const saveComplianceSettings = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const { financial_year, tax_regime = 'NEW', pf_enabled = false, pf_employee_rate = 0.12, pf_employer_rate = 0.12, pf_wage_ceiling = 15000, professional_tax_enabled = false, tds_enabled = true } = req.body;
        if (!companyId || !/^\d{4}-\d{4}$/.test(financial_year || '')) return res.status(400).json({ success: false, message: 'A financial year such as 2026-2027 is required.' });
        const result = await pool.query(`
            INSERT INTO compliance_settings (company_id, financial_year, tax_regime, pf_enabled, pf_employee_rate, pf_employer_rate, pf_wage_ceiling, professional_tax_enabled, tds_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (company_id, financial_year) DO UPDATE SET tax_regime = EXCLUDED.tax_regime, pf_enabled = EXCLUDED.pf_enabled, pf_employee_rate = EXCLUDED.pf_employee_rate, pf_employer_rate = EXCLUDED.pf_employer_rate, pf_wage_ceiling = EXCLUDED.pf_wage_ceiling, professional_tax_enabled = EXCLUDED.professional_tax_enabled, tds_enabled = EXCLUDED.tds_enabled, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [companyId, financial_year, tax_regime, Boolean(pf_enabled), money(pf_employee_rate), money(pf_employer_rate), money(pf_wage_ceiling), Boolean(professional_tax_enabled), Boolean(tds_enabled)]);
        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

export const createPayrollRun = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const companyId = companyIdOf(req);
        const { branch_id: branchId = req.user?.branch_id || null, period_start, period_end, payment_date = period_end, employees = [], financial_year } = req.body;
        if (!companyId || !period_start || !period_end || !employees.length) throw new Error('Company, payroll period, and at least one employee are required.');
        const setting = await client.query(`SELECT * FROM compliance_settings WHERE company_id = $1 AND financial_year = $2`, [companyId, financial_year]);
        const config = setting.rows[0] || { pf_enabled: false, pf_employee_rate: 0.12, pf_employer_rate: 0.12, pf_wage_ceiling: 15000 };
        const entries = employees.map((item) => {
            const gross = money(item.gross_amount);
            const basic = money(item.basic_amount ?? gross);
            const pfBase = Math.min(basic, money(config.pf_wage_ceiling));
            const employeePf = config.pf_enabled && item.pf_applicable !== false ? money(pfBase * Number(config.pf_employee_rate)) : 0;
            const employerPf = config.pf_enabled && item.pf_applicable !== false ? money(pfBase * Number(config.pf_employer_rate)) : 0;
            const tds = money(item.tds_amount || 0);
            const professionalTax = money(item.professional_tax_amount || 0);
            return { employeeId: item.employee_id, gross, employeePf, employerPf, tds, professionalTax, net: money(gross - employeePf - tds - professionalTax) };
        });
        const totals = entries.reduce((sum, item) => ({ gross: sum.gross + item.gross, employeePf: sum.employeePf + item.employeePf, employerPf: sum.employerPf + item.employerPf, tds: sum.tds + item.tds, professionalTax: sum.professionalTax + item.professionalTax, net: sum.net + item.net }), { gross: 0, employeePf: 0, employerPf: 0, tds: 0, professionalTax: 0, net: 0 });
        const run = await client.query(`INSERT INTO payroll_runs (company_id, branch_id, period_start, period_end, payment_date, gross_amount, employee_pf_amount, employer_pf_amount, tds_amount, net_amount, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [companyId, branchId, period_start, period_end, payment_date, totals.gross, totals.employeePf, totals.employerPf, totals.tds, totals.net, req.user?.employee_id || null]);
        for (const entry of entries) await client.query(`INSERT INTO payroll_entries (payroll_run_id, employee_id, gross_amount, employee_pf_amount, employer_pf_amount, tds_amount, professional_tax_amount, net_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [run.rows[0].payroll_run_id, entry.employeeId, entry.gross, entry.employeePf, entry.employerPf, entry.tds, entry.professionalTax, entry.net]);
        const expense = await resolveLedger(client, companyId, 'LED-SALARY-EXPENSE', 'Salary Expense', 'GRP-INDIR-EXP', 'DR');
        const salaryPayable = await resolveLedger(client, companyId, 'LED-SALARY-PAYABLE', 'Salary Payable', 'GRP-CREDITORS', 'CR');
        const pfPayable = await resolveLedger(client, companyId, 'LED-PF-PAYABLE', 'Provident Fund Payable', 'GRP-CREDITORS', 'CR');
        const tdsPayable = await resolveLedger(client, companyId, 'LED-TDS-PAYABLE', 'TDS Payable', 'GRP-CREDITORS', 'CR');
        const lines = [
            { ledgerId: expense, debit: money(totals.gross + totals.employerPf), credit: 0, narration: 'Payroll salary and employer statutory cost' },
            { ledgerId: salaryPayable, debit: 0, credit: totals.net, narration: 'Net salary payable' },
            { ledgerId: pfPayable, debit: 0, credit: money(totals.employeePf + totals.employerPf), narration: 'Employee and employer PF payable' },
            { ledgerId: tdsPayable, debit: 0, credit: totals.tds, narration: 'TDS payable' }
        ];
        if (totals.professionalTax > 0) {
            const ptPayable = await resolveLedger(client, companyId, 'LED-PT-PAYABLE', 'Professional Tax Payable', 'GRP-CREDITORS', 'CR');
            lines.push({ ledgerId: ptPayable, debit: 0, credit: totals.professionalTax, narration: 'Professional tax payable' });
        }
        const voucher = await postJournal(client, { companyId, branchId, date: payment_date, narration: `Payroll ${period_start} to ${period_end}`, lines, sourceDocumentId: run.rows[0].payroll_run_id });
        await client.query(`UPDATE payroll_runs SET accounting_voucher_id = $1 WHERE payroll_run_id = $2`, [voucher.voucher_id, run.rows[0].payroll_run_id]);
        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: { payroll_run_id: run.rows[0].payroll_run_id, voucher, totals } });
    } catch (error) { await client.query('ROLLBACK'); console.error('Error creating payroll run:', error); return res.status(400).json({ success: false, message: error.message }); } finally { client.release(); }
};

export const createChallan = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const companyId = companyIdOf(req);
        const { challan_type, period_start, period_end, amount, challan_number, payment_date } = req.body;
        if (!companyId || !['TDS', 'PF', 'PT'].includes(challan_type) || money(amount) <= 0) return res.status(400).json({ success: false, message: 'Valid challan type and amount are required.' });
        const result = await client.query(`INSERT INTO compliance_challans (company_id, challan_type, period_start, period_end, amount, challan_number, payment_date, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [companyId, challan_type, period_start, period_end, money(amount), challan_number || null, payment_date || null, payment_date ? 'PAID' : 'PENDING', req.user?.employee_id || null]);
        let voucher = null;
        if (payment_date) {
            const payableCode = challan_type === 'PF' ? 'LED-PF-PAYABLE' : challan_type === 'PT' ? 'LED-PT-PAYABLE' : 'LED-TDS-PAYABLE';
            const payableName = challan_type === 'PF' ? 'Provident Fund Payable' : challan_type === 'PT' ? 'Professional Tax Payable' : 'TDS Payable';
            const payable = await resolveLedger(client, companyId, payableCode, payableName, 'GRP-CREDITORS', 'CR');
            const bank = await resolveLedger(client, companyId, 'LED-BANK-MAIN', 'Main Bank Account', 'GRP-BANK', 'DR');
            voucher = await postJournal(client, {
                companyId,
                branchId: req.body.branch_id || req.user?.branch_id || null,
                date: payment_date,
                narration: `${challan_type} challan payment ${challan_number || ''}`.trim(),
                sourceDocumentId: result.rows[0].challan_id,
                lines: [
                    { ledgerId: payable, debit: money(amount), credit: 0, narration: `${challan_type} statutory liability paid` },
                    { ledgerId: bank, debit: 0, credit: money(amount), narration: `Bank payment for ${challan_type} challan` }
                ]
            });
            await client.query(`UPDATE compliance_challans SET accounting_voucher_id = $1 WHERE challan_id = $2`, [voucher.voucher_id, result.rows[0].challan_id]);
        }
        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: { ...result.rows[0], voucher } });
    } catch (error) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: error.message }); } finally { client.release(); }
};

export const listComplianceRecords = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const [runs, challans, returns] = await Promise.all([
            pool.query(`SELECT * FROM payroll_runs WHERE company_id = $1 ORDER BY period_end DESC LIMIT 100`, [companyId]),
            pool.query(`SELECT * FROM compliance_challans WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`, [companyId]),
            pool.query(`SELECT * FROM compliance_returns WHERE company_id = $1 ORDER BY period_end DESC LIMIT 100`, [companyId])
        ]);
        return res.json({ success: true, data: { payroll_runs: runs.rows, challans: challans.rows, returns: returns.rows } });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

export const generateForm16 = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const { employee_id: employeeId, financial_year: financialYear } = req.body;
        if (!companyId || !employeeId || !/^\d{4}-\d{4}$/.test(financialYear || '')) {
            return res.status(400).json({ success: false, message: 'Company, employee, and financial year are required.' });
        }
        const result = await pool.query(`
            SELECT e.employee_id, COALESCE(SUM(pr_entry.gross_amount), 0)::NUMERIC(16,2) AS gross_salary,
                   COALESCE(SUM(pr_entry.tds_amount), 0)::NUMERIC(16,2) AS tds_deducted
            FROM employees e
            LEFT JOIN (
                SELECT pe.employee_id, pe.gross_amount, pe.tds_amount
                FROM payroll_entries pe
                INNER JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
                WHERE pr.company_id = $1
                  AND pr.period_start >= ($2 || '-04-01')::DATE
                  AND pr.period_start < (($2::INT + 1) || '-04-01')::DATE
                  AND pr.status = 'POSTED'
            ) pr_entry ON pr_entry.employee_id = e.employee_id
            WHERE e.employee_id = $3 AND e.company_id = $1
            GROUP BY e.employee_id
        `, [companyId, financialYear.slice(0, 4), employeeId]);
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Employee not found for this company.' });
        const row = result.rows[0];
        const form = await pool.query(`
            INSERT INTO form16_records (company_id, employee_id, financial_year, gross_salary, taxable_income, tds_deducted, certificate_number, status, generated_at)
            VALUES ($1, $2, $3, $4, $4, $5, $6, 'GENERATED', CURRENT_TIMESTAMP)
            ON CONFLICT (company_id, employee_id, financial_year) DO UPDATE SET gross_salary = EXCLUDED.gross_salary, taxable_income = EXCLUDED.taxable_income, tds_deducted = EXCLUDED.tds_deducted, status = 'GENERATED', generated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [companyId, employeeId, financialYear, row.gross_salary, row.tds_deducted, `FORM16-${financialYear}-${employeeId}`]);
        return res.status(201).json({ success: true, data: form.rows[0] });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

export const listForm16 = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const result = await pool.query(`
            SELECT f.*, e.employee_code, e.first_name, e.last_name, esp.pan
            FROM form16_records f
            JOIN employees e ON e.employee_id = f.employee_id
            LEFT JOIN employee_statutory_profiles esp
                ON esp.employee_id = e.employee_id AND esp.company_id = f.company_id
            WHERE f.company_id = $1
            ORDER BY f.financial_year DESC, e.first_name
        `, [companyId]);
        return res.json({ success: true, data: result.rows });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};
