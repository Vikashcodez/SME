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

// Bulk Import Taxes from Excel / CSV
export const bulkImportTaxes = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyId = companyIdOf(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No tax items provided for import.' });
        }

        await client.query('BEGIN');

        let insertedCount = 0;
        let updatedCount = 0;
        const errors = [];

        for (let i = 0; i < items.length; i++) {
            const row = items[i];
            const rowNum = i + 1;

            const taxName = (row.tax_name || row.name || '').trim();
            if (!taxName) {
                errors.push(`Row ${rowNum}: Tax Name is required.`);
                continue;
            }

            let taxType = (row.tax_type || 'GST').toUpperCase().trim();
            if (!validTaxTypes.includes(taxType)) {
                taxType = 'GST';
            }

            const totalRate = Math.min(100, Math.max(0, parseFloat(row.total_rate || row.rate) || 0));
            let cgst = parseFloat(row.cgst_rate) || 0;
            let sgst = parseFloat(row.sgst_rate) || 0;
            let igst = parseFloat(row.igst_rate) || 0;
            let cess = parseFloat(row.cess_rate) || 0;

            // Auto-calculate split if GST and individual rates not provided
            if (taxType === 'GST' && cgst === 0 && sgst === 0 && igst === 0 && totalRate > 0) {
                cgst = totalRate / 2;
                sgst = totalRate / 2;
                igst = totalRate;
            }

            const isActive = row.is_active !== undefined ? Boolean(row.is_active) : true;

            const existing = await client.query(
                `SELECT tax_id FROM tax_master WHERE company_id = $1 AND (tax_name ILIKE $2 OR (tax_type = $3 AND total_rate = $4))`,
                [companyId, taxName, taxType, totalRate]
            );

            if (existing.rows.length > 0) {
                await client.query(`
                    UPDATE tax_master SET
                        tax_name = $1, tax_type = $2, total_rate = $3,
                        cgst_rate = $4, sgst_rate = $5, igst_rate = $6,
                        cess_rate = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
                    WHERE tax_id = $9
                `, [
                    taxName, taxType, totalRate,
                    cgst, sgst, igst,
                    cess, isActive, existing.rows[0].tax_id
                ]);
                updatedCount++;
            } else {
                await client.query(`
                    INSERT INTO tax_master (
                        company_id, tax_name, tax_type, total_rate,
                        cgst_rate, sgst_rate, igst_rate, cess_rate, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    companyId, taxName, taxType, totalRate,
                    cgst, sgst, igst, cess, isActive
                ]);
                insertedCount++;
            }
        }

        if (errors.length > 0 && insertedCount === 0 && updatedCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Import failed.', errors });
        }

        await client.query('COMMIT');
        return res.status(200).json({
            success: true,
            message: `Successfully processed ${insertedCount + updatedCount} taxes (${insertedCount} added, ${updatedCount} updated).`,
            insertedCount,
            updatedCount,
            errors
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulkImportTaxes:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
        client.release();
    }
};
