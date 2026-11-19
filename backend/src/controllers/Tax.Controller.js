import pool from '../config/database.js';

const companyIdOf = (req) => req.scopeCompanyId || req.query.company_id || req.body.company_id || req.user?.company_id;
const validTaxTypes = ['GST', 'IGST', 'TDS', 'CESS', 'VAT', 'OTHER'];

const rate = (value, field) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new Error(`${field} must be between 0 and 100.`);
    }
    return Number(parsed.toFixed(3));
};

export const getTaxes = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });
        const result = await pool.query(
            `SELECT * FROM tax_master WHERE company_id = $1 ORDER BY is_active DESC, total_rate ASC, tax_name ASC`,
            [companyId]
        );
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createTax = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const { tax_name, tax_type = 'GST', total_rate = 0, cgst_rate = 0, sgst_rate = 0, igst_rate = 0, cess_rate = 0, is_active = true } = req.body;
        if (!companyId || !tax_name?.trim()) return res.status(400).json({ success: false, message: 'Company and tax name are required.' });
        if (!validTaxTypes.includes(tax_type)) return res.status(400).json({ success: false, message: 'Invalid tax type.' });
        const result = await pool.query(`
            INSERT INTO tax_master (
                company_id, tax_name, tax_type, total_rate, cgst_rate,
                sgst_rate, igst_rate, cess_rate, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            companyId, tax_name.trim(), tax_type, rate(total_rate, 'Total rate'),
            rate(cgst_rate, 'CGST rate'), rate(sgst_rate, 'SGST rate'),
            rate(igst_rate, 'IGST rate'), rate(cess_rate, 'CESS rate'), Boolean(is_active)
        ]);
        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const updateTax = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const { tax_name, tax_type = 'GST', total_rate = 0, cgst_rate = 0, sgst_rate = 0, igst_rate = 0, cess_rate = 0, is_active = true } = req.body;
        if (!tax_name?.trim() || !validTaxTypes.includes(tax_type)) return res.status(400).json({ success: false, message: 'A valid tax name and type are required.' });
        const result = await pool.query(`
            UPDATE tax_master SET
                tax_name = $1, tax_type = $2, total_rate = $3,
                cgst_rate = $4, sgst_rate = $5, igst_rate = $6,
                cess_rate = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
            WHERE tax_id = $9 AND company_id = $10
            RETURNING *
        `, [
            tax_name.trim(), tax_type, rate(total_rate, 'Total rate'),
            rate(cgst_rate, 'CGST rate'), rate(sgst_rate, 'SGST rate'),
            rate(igst_rate, 'IGST rate'), rate(cess_rate, 'CESS rate'),
            Boolean(is_active), req.params.tax_id, companyId
        ]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Tax record not found.' });
        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteTax = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const result = await pool.query(
            `UPDATE tax_master SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE tax_id = $1 AND company_id = $2 RETURNING tax_id`,
            [req.params.tax_id, companyId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Tax record not found.' });
        return res.json({ success: true, message: 'Tax deactivated.' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
