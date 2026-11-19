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
    const total = Number(tax.total_rate);
    let cgst = Number(tax.cgst_rate);
    let sgst = Number(tax.sgst_rate);
    let igst = Number(tax.igst_rate);
    const cess = Number(tax.cess_rate);

    // GST split must never exceed the total tax rate. This also repairs
    // legacy/custom master rows that contain 18% CGST + 18% SGST for GST 18.
    if (total > 0) {
        const validIntraSplit = cgst > 0 && sgst > 0 && Math.abs(cgst + sgst - total) < 0.001;
        if (!validIntraSplit) {
            cgst = +(total / 2).toFixed(3);
            sgst = +(total / 2).toFixed(3);
        }
        if (!(igst > 0) || igst > total) igst = total;
    }

    return { total, cgst, sgst, igst, cess };
};
