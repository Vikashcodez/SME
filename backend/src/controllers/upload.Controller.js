import pool from '../config/database.js';
import { logger } from '../config/logger.js';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch((err) => {
    logger.warn({ err: err.message }, 'Upload directory init notice');
});

export const uploadDocument = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { entity_type, entity_id, file_name, file_data_base64, mime_type, file_size_kb } = req.body;

        if (!entity_type || !entity_id || !file_name) {
            return res.status(400).json({ success: false, message: 'Entity type, entity ID, and file name are required' });
        }

        let savedUrl = `/uploads/${companyCode}/${Date.now()}-${file_name}`;

        if (file_data_base64) {
            const companyUploadDir = path.join(UPLOAD_DIR, companyCode);
            await fs.mkdir(companyUploadDir, { recursive: true });
            const safeName = `${Date.now()}-${file_name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const targetPath = path.join(companyUploadDir, safeName);
            const buffer = Buffer.from(file_data_base64.replace(/^data:.*?;base64,/, ''), 'base64');
            await fs.writeFile(targetPath, buffer);
            savedUrl = `/uploads/${companyCode}/${safeName}`;
        }

        const uploadedBy = req.user?.username || req.user?.email || 'Admin';

        const result = await pool.query(`
            INSERT INTO document_master (
                company_code, entity_type, entity_id, file_name, file_url,
                file_size_kb, mime_type, uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            companyCode,
            entity_type,
            String(entity_id),
            file_name,
            savedUrl,
            file_size_kb || 0,
            mime_type || 'application/octet-stream',
            uploadedBy
        ]);

        res.status(201).json({
            success: true,
            message: 'Document uploaded and attached successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'uploadDocument error');
        res.status(500).json({ success: false, message: 'Failed to attach document', error: error.message });
    }
};

export const getEntityDocuments = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { entityType, entityId } = req.params;

        const result = await pool.query(`
            SELECT * FROM document_master
            WHERE company_code = $1 AND entity_type = $2 AND entity_id = $3
            ORDER BY created_at DESC
        `, [companyCode, entityType, entityId]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getEntityDocuments error');
        res.status(500).json({ success: false, message: 'Failed to fetch entity documents' });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`DELETE FROM document_master WHERE doc_id = $1 RETURNING doc_id, file_name`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.status(200).json({ success: true, message: `Document '${result.rows[0].file_name}' deleted` });
    } catch (error) {
        logger.error({ err: error }, 'deleteDocument error');
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};
