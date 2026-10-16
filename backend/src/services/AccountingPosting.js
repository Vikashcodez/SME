const resolveLedger = async (client, companyId, code, name, groupCode, normalSide = 'DR') => {
    const existing = await client.query(
        `SELECT ledger_id FROM ledgers WHERE company_id = $1 AND ledger_code = $2`,
        [companyId, code]
    );
    if (existing.rows.length > 0) return existing.rows[0].ledger_id;

    const group = await client.query(
        `SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = $2`,
        [companyId, groupCode]
    );
    if (group.rows.length === 0) throw new Error(`Accounting group ${groupCode} is not configured.`);

    const created = await client.query(`
        INSERT INTO ledgers (
            company_id, group_id, ledger_name, ledger_code,
            opening_balance_type, current_balance_type, is_active
        ) VALUES ($1, $2, $3, $4, $5, $5, TRUE)
        ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
        RETURNING ledger_id
    `, [companyId, group.rows[0].group_id, name, code, normalSide]);
    return created.rows[0].ledger_id;
};

const applyBalance = async (client, companyId, ledgerId, debit, credit) => {
    const result = await client.query(`
        SELECT l.current_balance, l.current_balance_type, ag.nature
        FROM ledgers l
        JOIN account_groups ag ON ag.group_id = l.group_id
        WHERE l.ledger_id = $1 AND l.company_id = $2
        FOR UPDATE
    `, [ledgerId, companyId]);
    if (result.rows.length === 0) throw new Error(`Ledger ${ledgerId} is not part of this company.`);

    const ledger = result.rows[0];
    const debitNature = ['ASSET', 'EXPENSE'].includes(ledger.nature);
    const signed = debitNature
        ? (ledger.current_balance_type === 'DR' ? Number(ledger.current_balance) : -Number(ledger.current_balance)) + debit - credit
        : (ledger.current_balance_type === 'CR' ? Number(ledger.current_balance) : -Number(ledger.current_balance)) + credit - debit;
    const balance = Math.abs(signed);
    const type = signed >= 0 ? (debitNature ? 'DR' : 'CR') : (debitNature ? 'CR' : 'DR');

    await client.query(
        `UPDATE ledgers SET current_balance = $1, current_balance_type = $2, updated_at = CURRENT_TIMESTAMP WHERE ledger_id = $3`,
        [balance, type, ledgerId]
    );
};

export const postAccountingVoucher = async (client, {
    companyId,
    branchId,
    voucherDate,
    sourceDocumentId,
    narration,
    lines
}) => {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    if (!lines.length || Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit <= 0) {
        throw new Error('Automatic accounting entry is not balanced.');
    }

    const voucherType = await client.query(`
        SELECT voucher_type_id FROM voucher_types
        WHERE company_id = $1 AND voucher_type_code = 'VCH-JOURNAL'
        LIMIT 1
    `, [companyId]);
    if (voucherType.rows.length === 0) throw new Error('Journal voucher type is not configured.');

    const sequence = await client.query(
        `SELECT COUNT(*)::INT AS count FROM vouchers WHERE company_id = $1 AND voucher_number LIKE 'AUTO-JRN-%'`,
        [companyId]
    );
    const voucherNumber = `AUTO-JRN-${new Date(voucherDate).getFullYear()}-${String(sequence.rows[0].count + 1).padStart(6, '0')}`;
    const voucher = await client.query(`
        INSERT INTO vouchers (
            company_id, branch_id, voucher_type_id, voucher_number, voucher_date,
            narration, source_module, source_document_id, is_posted, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'INVENTORY_CLEARING', $7, TRUE, CURRENT_TIMESTAMP)
        RETURNING voucher_id, voucher_number
    `, [companyId, branchId || null, voucherType.rows[0].voucher_type_id, voucherNumber, voucherDate, narration, sourceDocumentId || null]);

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        await client.query(`
            INSERT INTO voucher_lines (voucher_id, line_number, ledger_id, debit_amount, credit_amount, narration)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [voucher.rows[0].voucher_id, index + 1, line.ledgerId, line.debit || 0, line.credit || 0, line.narration || narration]);
        await applyBalance(client, companyId, line.ledgerId, Number(line.debit || 0), Number(line.credit || 0));
    }

    return voucher.rows[0];
};

export { resolveLedger };