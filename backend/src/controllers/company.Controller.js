import pool from '../config/database.js';

// Create a new company
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
            company_type
        } = req.body;

        // Validate required fields
        if (!company_name || !company_code) {
            return res.status(400).json({
                success: false,
                message: 'Company name and code are required'
            });
        }

        const query = `
            INSERT INTO companies (
                company_name, company_code, logo_url, establishment_year,
                pan, cin, gst_no, full_address, phone_number, email_id, company_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            company_name, company_code, logo_url, establishment_year,
            pan, cin, gst_no, full_address, phone_number, email_id, company_type
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Duplicate entry. Company code, PAN, CIN, or GST already exists.'
            });
        }
        console.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create company'
        });
    }
};

// Get all companies
export const getAllCompanies = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM companies ORDER BY created_at DESC'
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch companies'
        });
    }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM companies WHERE company_id = $1',
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
        console.error('Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch company'
        });
    }
};

// Update company
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
            company_type
        } = req.body;

        const query = `
            UPDATE companies 
            SET 
                company_name = $1,
                company_code = $2,
                logo_url = $3,
                establishment_year = $4,
                pan = $5,
                cin = $6,
                gst_no = $7,
                full_address = $8,
                phone_number = $9,
                email_id = $10,
                company_type = $11
            WHERE company_id = $12
            RETURNING *
        `;

        const values = [
            company_name, company_code, logo_url, establishment_year,
            pan, cin, gst_no, full_address, phone_number, email_id,
            company_type, id
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
        console.error('Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company'
        });
    }
};

// Delete company
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM companies WHERE company_id = $1 RETURNING *',
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
        console.error('Error deleting company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete company'
        });
    }
};