import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getQcInspections = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, type, search } = req.query;

        let query = `
            SELECT qc.*, p.product_name, p.product_code, p.uom_code
            FROM qc_inspections qc
            LEFT JOIN products p ON qc.product_id = p.product_id
            WHERE qc.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND qc.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (type) {
            query += ` AND qc.inspection_type = $${idx}`;
            params.push(type);
            idx++;
        }
        if (search) {
            query += ` AND (qc.inspection_number ILIKE $${idx} OR p.product_name ILIKE $${idx} OR qc.inspector_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY qc.inspection_date DESC, qc.inspection_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getQcInspections error');
        res.status(500).json({ success: false, message: 'Failed to fetch QC inspections' });
    }
};

export const createQcInspection = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            inspection_number, inspection_type = 'Final Quality Gate',
            product_id, product_name, batch_number, sample_size = 5,
            accepted_qty = 5, rejected_qty = 0, status = 'Pass',
            inspector_name = 'QC Inspector', inspection_date, observations
        } = req.body;

        let resolvedProductId = product_id ? parseInt(product_id, 10) : null;
        if (!resolvedProductId && product_name) {
            const pRes = await pool.query(`SELECT product_id FROM products WHERE company_code = $1 AND product_name ILIKE $2 LIMIT 1`, [companyCode, `%${product_name}%`]);
            if (pRes.rows.length > 0) resolvedProductId = pRes.rows[0].product_id;
        }

        if (!resolvedProductId) {
            const pRes = await pool.query(`SELECT product_id FROM products WHERE company_code = $1 LIMIT 1`, [companyCode]);
            if (pRes.rows.length > 0) resolvedProductId = pRes.rows[0].product_id;
        }

        let iNum = inspection_number;
        if (!iNum) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM qc_inspections WHERE company_code = $1`, [companyCode]);
            iNum = `QC-2026-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO qc_inspections (
                company_code, inspection_number, inspection_type, product_id,
                batch_number, sample_size, accepted_qty, rejected_qty, status,
                inspector_name, inspection_date, observations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            companyCode, iNum, inspection_type, resolvedProductId,
            batch_number || `BAT-${Date.now().toString().slice(-4)}`,
            parseFloat(sample_size) || 5,
            parseFloat(accepted_qty) || 5,
            parseFloat(rejected_qty) || 0,
            status,
            inspector_name,
            inspection_date || new Date().toISOString().slice(0, 10),
            observations || ''
        ]);

        res.status(201).json({ success: true, message: 'QC inspection recorded successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createQcInspection error');
        res.status(500).json({ success: false, message: 'Failed to record QC inspection', error: error.message });
    }
};

export const updateQcInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, accepted_qty, rejected_qty, observations, inspector_name } = req.body;

        const result = await pool.query(`
            UPDATE qc_inspections
            SET status = COALESCE($1, status),
                accepted_qty = COALESCE($2, accepted_qty),
                rejected_qty = COALESCE($3, rejected_qty),
                observations = COALESCE($4, observations),
                inspector_name = COALESCE($5, inspector_name)
            WHERE inspection_id = $6
            RETURNING *
        `, [status, accepted_qty, rejected_qty, observations, inspector_name, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'QC inspection not found' });
        }

        res.status(200).json({ success: true, message: 'QC inspection updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateQcInspection error');
        res.status(500).json({ success: false, message: 'Failed to update QC inspection' });
    }
};

export const getNcrReports = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { severity, status, search } = req.query;

        let query = `
            SELECT ncr.*, p.product_name, p.product_code
            FROM non_conformance_reports ncr
            LEFT JOIN products p ON ncr.product_id = p.product_id
            WHERE ncr.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (severity) {
            query += ` AND ncr.severity = $${idx}`;
            params.push(severity);
            idx++;
        }
        if (status) {
            query += ` AND ncr.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (search) {
            query += ` AND (ncr.ncr_number ILIKE $${idx} OR ncr.defect_type ILIKE $${idx} OR p.product_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY ncr.ncr_date DESC, ncr.ncr_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getNcrReports error');
        res.status(500).json({ success: false, message: 'Failed to fetch NCR reports' });
    }
};

export const createNcrReport = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            ncr_number, ncr_date, product_id, product_name,
            defect_type, defect_description, severity = 'Minor',
            disposition = 'Rework', root_cause, capa_required = false, status = 'Open'
        } = req.body;

        if (!defect_type) {
            return res.status(400).json({ success: false, message: 'Defect type is required' });
        }

        let resolvedProductId = product_id ? parseInt(product_id, 10) : null;
        if (!resolvedProductId && product_name) {
            const pRes = await pool.query(`SELECT product_id FROM products WHERE company_code = $1 AND product_name ILIKE $2 LIMIT 1`, [companyCode, `%${product_name}%`]);
            if (pRes.rows.length > 0) resolvedProductId = pRes.rows[0].product_id;
        }

        if (!resolvedProductId) {
            const pRes = await pool.query(`SELECT product_id FROM products WHERE company_code = $1 LIMIT 1`, [companyCode]);
            if (pRes.rows.length > 0) resolvedProductId = pRes.rows[0].product_id;
        }

        let nNum = ncr_number;
        if (!nNum) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM non_conformance_reports WHERE company_code = $1`, [companyCode]);
            nNum = `NCR-2026-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO non_conformance_reports (
                company_code, ncr_number, ncr_date, product_id, defect_type,
                defect_description, severity, disposition, root_cause, capa_required, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            companyCode, nNum,
            ncr_date || new Date().toISOString().slice(0, 10),
            resolvedProductId, defect_type, defect_description || '',
            severity, disposition, root_cause || '', capa_required, status
        ]);

        res.status(201).json({ success: true, message: 'NCR report generated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createNcrReport error');
        res.status(500).json({ success: false, message: 'Failed to create NCR report', error: error.message });
    }
};

export const updateNcrReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, disposition, root_cause, capa_required } = req.body;

        const result = await pool.query(`
            UPDATE non_conformance_reports
            SET status = COALESCE($1, status),
                disposition = COALESCE($2, disposition),
                root_cause = COALESCE($3, root_cause),
                capa_required = COALESCE($4, capa_required)
            WHERE ncr_id = $5
            RETURNING *
        `, [status, disposition, root_cause, capa_required, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'NCR report not found' });
        }

        res.status(200).json({ success: true, message: 'NCR updated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateNcrReport error');
        res.status(500).json({ success: false, message: 'Failed to update NCR report' });
    }
};
