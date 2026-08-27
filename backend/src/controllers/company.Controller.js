import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const createCompany = async (req, res) => {
    try {
        const {
            company_name,
            company_code,
            logo_url,
            establishment_year,
            pan,
            cin,
            gst_no,
            full_address,
            phone_number,
            email_id,
            company_type,
            country_name = 'India',
            state_name = 'Maharashtra',
            state_code = '27',
            city = 'Pune',
            currency_code = 'INR',
            currency_symbol = '₹',
            business_type = 'hybrid'
        } = req.body;

        
        if (!company_name || !company_code) {
            return res.status(400).json({
                success: false,
                message: 'Company name and code are required'
            });
        }

        const query = `
            INSERT INTO companies (
                company_name, company_code, logo_url, establishment_year,
                pan, cin, gst_no, full_address, phone_number, email_id, company_type,
                country_name, state_name, state_code, city, currency_code, currency_symbol, business_type,
                is_active, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW())
            ON CONFLICT (company_code) DO UPDATE
            SET company_name = EXCLUDED.company_name,
                logo_url = EXCLUDED.logo_url,
                establishment_year = EXCLUDED.establishment_year,
                pan = EXCLUDED.pan,
                cin = EXCLUDED.cin,
                gst_no = EXCLUDED.gst_no,
                full_address = EXCLUDED.full_address,
                phone_number = EXCLUDED.phone_number,
                email_id = EXCLUDED.email_id,
                company_type = EXCLUDED.company_type,
                country_name = EXCLUDED.country_name,
                state_name = EXCLUDED.state_name,
                state_code = EXCLUDED.state_code,
                city = EXCLUDED.city,
                currency_code = EXCLUDED.currency_code,
                currency_symbol = EXCLUDED.currency_symbol,
                business_type = EXCLUDED.business_type,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            company_name, company_code, logo_url || '', establishment_year || new Date().getFullYear(),
            pan || '', cin || '', gst_no || '', full_address || '', phone_number || '', email_id || '', company_type || 'Private Limited',
            country_name, state_name, state_code, city, currency_code, currency_symbol, business_type
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error({ err: error }, 'Error creating company');
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create company'
        });
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM companies WHERE is_active = true ORDER BY company_id ASC'
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error({ err: error }, 'Error fetching companies');
        res.status(500).json({
            success: false,
            message: 'Failed to fetch companies'
        });
    }
};

export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM companies WHERE (company_id::text = $1 OR company_code = $1) AND is_active = true',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error({ err: error }, 'Error fetching company');
        res.status(500).json({
            success: false,
            message: 'Failed to fetch company'
        });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            company_name,
            company_code,
            logo_url,
            establishment_year,
            pan,
            cin,
            gst_no,
            full_address,
            phone_number,
            email_id,
            company_type,
            country_name,
            state_name,
            state_code,
            city,
            currency_code,
            currency_symbol,
            business_type
        } = req.body;

        const query = `
            UPDATE companies 
            SET 
                company_name = COALESCE($1, company_name),
                company_code = COALESCE($2, company_code),
                logo_url = COALESCE($3, logo_url),
                establishment_year = COALESCE($4, establishment_year),
                pan = COALESCE($5, pan),
                cin = COALESCE($6, cin),
                gst_no = COALESCE($7, gst_no),
                full_address = COALESCE($8, full_address),
                phone_number = COALESCE($9, phone_number),
                email_id = COALESCE($10, email_id),
                company_type = COALESCE($11, company_type),
                country_name = COALESCE($12, country_name),
                state_name = COALESCE($13, state_name),
                state_code = COALESCE($14, state_code),
                city = COALESCE($15, city),
                currency_code = COALESCE($16, currency_code),
                currency_symbol = COALESCE($17, currency_symbol),
                business_type = COALESCE($18, business_type),
                updated_at = NOW()
            WHERE (company_id::text = $19 OR company_code = $19) AND is_active = true
            RETURNING *
        `;

        const values = [
            company_name, company_code, logo_url, establishment_year,
            pan, cin, gst_no, full_address, phone_number, email_id,
            company_type, country_name, state_name, state_code, city,
            currency_code, currency_symbol, business_type, id
        ];

        const result = await pool.query(query, values);

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Duplicate entry. Company code, PAN, CIN, or GST already exists.'
            });
        }
        logger.error({ err: error }, 'Error updating company');
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update company'
        });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE companies SET is_active = false, updated_at = NOW() WHERE (company_id::text = $1 OR company_code = $1) RETURNING *',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Company deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting company');
        res.status(500).json({
            success: false,
            message: 'Failed to delete company'
        });
    }
};
