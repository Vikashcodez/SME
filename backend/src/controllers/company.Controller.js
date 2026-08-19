import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';


// Helper function to delete old logo
const deleteOldLogo = (logoUrl) => {
    if (!logoUrl) return;
    
    try {
        const filename = path.basename(logoUrl);
        const filePath = path.join('uploads', 'companies', filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('✅ Old logo deleted:', filePath);
        }
    } catch (error) {
        console.error('Error deleting old logo:', error);
    }
};

// Helper function to get server URL
const getServerUrl = (req) => {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}`;
};

// Helper function to build address object
const buildAddressObject = (address) => {
    if (!address) return null;
    
    if (typeof address === 'string') {
        return address;
    }
    
    if (typeof address === 'object') {
        const parts = [
            address.street,
            address.building_no,
            address.district,
            address.city,
            address.state,
            address.country,
            address.pincode
        ].filter(Boolean);
        return parts.join(', ');
    }
    
    return address;
};

//  CREATE COMPANY WITH COMPANY ADMIN EMPLOYEE

export const createCompany = async (req, res) => {
    try {
        const {
            company_name,
            company_code,
            establishment_year,
            pan,
            cin,
            gst_no,
            address,
            phone_number,
            email_id,
            company_type,
            admin_password // Password for company admin
        } = req.body;

        // Validate required fields
        if (!company_name || !company_code || !phone_number || !email_id || !admin_password) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Company name, code, phone number, email and admin password are required'
            });
        }

        // Validate password strength
        if (admin_password.length < 6) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Admin password must be at least 6 characters long'
            });
        }

        // Validate company type
        const validTypes = ['manufacturing', 'service', 'both'];
        if (company_type && !validTypes.includes(company_type)) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid company type. Must be: manufacturing, service, or both'
            });
        }

        // Process logo if uploaded
        let logo_url = null;
        if (req.file) {
            const serverUrl = getServerUrl(req);
            logo_url = `${serverUrl}/uploads/companies/${req.file.filename}`;
        }

        // Format address
        const formattedAddress = buildAddressObject(address);

        // Hash password
        const hashedPassword = await bcrypt.hash(admin_password, 10);

        // Start transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Insert company
            const companyQuery = `
                INSERT INTO companies (
                    company_name,
                    company_code,
                    logo_url,
                    establishment_year,
                    pan,
                    cin,
                    gst_no,
                    address,
                    phone_number,
                    email_id,
                    company_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING company_id, created_at
            `;

            const companyValues = [
                company_name,
                company_code,
                logo_url,
                establishment_year || null,
                pan || null,
                cin || null,
                gst_no || null,
                formattedAddress,
                phone_number,
                email_id,
                company_type || null
            ];

            const companyResult = await client.query(companyQuery, companyValues);
            const companyId = companyResult.rows[0].company_id;
            const createdAt = companyResult.rows[0].created_at;

            // 2. Insert employee (company admin)
            const employeeQuery = `
                INSERT INTO employees (
                    company_id,
                    first_name,
                    last_name,
                    employee_code,
                    email,
                    phone_number,
                    date_of_joining,
                    role,
                    password,
                    is_company_admin,
                    address,
                    dob,
                    gender,
                    department,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING employee_id
            `;

            const employeeValues = [
                companyId,
                company_name, // first_name = company name
                'Admin', // last_name = Admin
                `ADMIN-${company_code}`, // employee_code
                email_id, // same email as company
                phone_number, // same phone as company
                createdAt, // date_of_joining = company created date
                'Company Admin', // role
                hashedPassword, // hashed password
                true, // is_company_admin = true
                formattedAddress, // same address as company
                null, // dob = null
                null, // gender = null
                null, // department = null
                createdAt // created_at = company created date
            ];

            await client.query(employeeQuery, employeeValues);

            await client.query('COMMIT');

            // Get complete company data with employee
            const finalResult = await pool.query(`
                SELECT c.*, 
                       json_build_object(
                           'employee_id', e.employee_id,
                           'first_name', e.first_name,
                           'last_name', e.last_name,
                           'employee_code', e.employee_code,
                           'email', e.email,
                           'phone_number', e.phone_number,
                           'role', e.role,
                           'is_company_admin', e.is_company_admin,
                           'date_of_joining', e.date_of_joining
                       ) as company_admin
                FROM companies c
                LEFT JOIN employees e ON c.company_id = e.company_id AND e.is_company_admin = true
                WHERE c.company_id = $1
            `, [companyId]);

            res.status(201).json({
                success: true,
                message: 'Company created successfully with company admin',
                data: finalResult.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        // Delete uploaded file if database error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        if (error.code === '23505') {
            const field = error.constraint?.replace('companies_', '').replace('_key', '') || 'field';
            return res.status(400).json({
                success: false,
                message: `Duplicate entry: ${field} already exists`
            });
        }
        
        console.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create company',
            error: error.message
        });
    }
};


//  UPDATE COMPANY WITH LOGO UPLOAD
export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            company_name,
            company_code,
            establishment_year,
            pan,
            cin,
            gst_no,
            address,
            phone_number,
            email_id,
            company_type,
            remove_logo // If 'true', remove existing logo
        } = req.body;

        // Validate company type
        const validTypes = ['manufacturing', 'service', 'both'];
        if (company_type && !validTypes.includes(company_type)) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid company type. Must be: manufacturing, service, or both'
            });
        }

        // Check if company exists
        const existingCompany = await pool.query(
            'SELECT * FROM companies WHERE company_id = $1',
            [id]
        );

        if (!existingCompany.rows[0]) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Process logo
        let logo_url = existingCompany.rows[0].logo_url;
        
        // If remove_logo is true, delete existing logo
        if (remove_logo === 'true' || remove_logo === true) {
            deleteOldLogo(logo_url);
            logo_url = null;
        }
        
        // If new logo uploaded, replace old one
        if (req.file) {
            // Delete old logo
            if (logo_url) {
                deleteOldLogo(logo_url);
            }
            
            const serverUrl = getServerUrl(req);
            logo_url = `${serverUrl}/uploads/companies/${req.file.filename}`;
        }

        // Format address
        const formattedAddress = buildAddressObject(address);

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
                address = $8,
                phone_number = $9,
                email_id = $10,
                company_type = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = $12
            RETURNING *
        `;

        const values = [
            company_name || existingCompany.rows[0].company_name,
            company_code || existingCompany.rows[0].company_code,
            logo_url,
            establishment_year || existingCompany.rows[0].establishment_year,
            pan !== undefined ? pan : existingCompany.rows[0].pan,
            cin !== undefined ? cin : existingCompany.rows[0].cin,
            gst_no !== undefined ? gst_no : existingCompany.rows[0].gst_no,
            formattedAddress || existingCompany.rows[0].address,
            phone_number || existingCompany.rows[0].phone_number,
            email_id || existingCompany.rows[0].email_id,
            company_type || existingCompany.rows[0].company_type,
            id
        ];

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        if (error.code === '23505') {
            const field = error.constraint?.replace('companies_', '').replace('_key', '') || 'field';
            return res.status(400).json({
                success: false,
                message: `Duplicate entry: ${field} already exists`
            });
        }
        
        console.error('Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update company',
            error: error.message
        });
    }
};


// 3. GET COMPANIES (DISPLAY)
export const getCompanies = async (req, res) => {
    try {
        const { id } = req.params;
        
        // If ID is provided, get single company
        if (id) {
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

            return res.status(200).json({
                success: true,
                data: result.rows[0]
            });
        }

        // Get all companies with pagination and filters
        const {
            page = 1,
            limit = 10,
            search,
            company_type,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM companies';
        const values = [];
        let whereClause = [];

        // Apply filters
        if (search) {
            whereClause.push(`(company_name ILIKE $${values.length + 1} OR company_code ILIKE $${values.length + 1} OR email_id ILIKE $${values.length + 1})`);
            values.push(`%${search}%`);
        }

        if (company_type) {
            whereClause.push(`company_type = $${values.length + 1}`);
            values.push(company_type);
        }

        if (whereClause.length > 0) {
            query += ' WHERE ' + whereClause.join(' AND ');
        }

        // Apply sorting
        const allowedSortFields = ['company_name', 'company_code', 'created_at', 'establishment_year'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Apply pagination
        query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(parseInt(limit), parseInt(offset));

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM companies';
        const countValues = [];
        let countWhereClause = [];

        if (search) {
            countWhereClause.push(`(company_name ILIKE $${countValues.length + 1} OR company_code ILIKE $${countValues.length + 1} OR email_id ILIKE $${countValues.length + 1})`);
            countValues.push(`%${search}%`);
        }

        if (company_type) {
            countWhereClause.push(`company_type = $${countValues.length + 1}`);
            countValues.push(company_type);
        }

        if (countWhereClause.length > 0) {
            countQuery += ' WHERE ' + countWhereClause.join(' AND ');
        }

        const countResult = await pool.query(countQuery, countValues);
        const total = parseInt(countResult.rows[0].total);

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch companies',
            error: error.message
        });
    }
};