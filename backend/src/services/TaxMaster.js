export const resolveTaxRates = async (client, companyId, taxRate) => {
    const totalRate = Number(taxRate) || 0;
    const result = await client.query(`
        SELECT total_rate, cgst_rate, sgst_rate, igst_rate, cess_rate
        FROM tax_master
        WHERE company_id = $1 AND is_active = TRUE
          AND ABS(total_rate - $2) < 0.001
        ORDER BY tax_id ASC
        LIMIT 1
    `, [companyId, totalRate]);

    if (!result.rows.length) {
        return {
            total: totalRate,
            cgst: +(totalRate / 2).toFixed(3),
            sgst: +(totalRate / 2).toFixed(3),
            igst: totalRate,
            cess: 0
        };
    }

    const tax = result.rows[0];
    return {
        total: Number(tax.total_rate),
        cgst: Number(tax.cgst_rate),
        sgst: Number(tax.sgst_rate),
        igst: Number(tax.igst_rate),
        cess: Number(tax.cess_rate)
    };
};
