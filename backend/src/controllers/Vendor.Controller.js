import pool from '../config/database.js';

// Helper to generate a unique vendor code if none provided
const generateVendorCode = async (companyId) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `VND-${companyId || 'GEN'}-${randomDigits}`;
};

// 1. Create a new vendor
export const createVendor = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            company_id,
            branch_id,
            vendor_code,
            vendor_name,
            gstin,
            pan,
            address,
            city,
            state,
            pincode,
            phone,
            email,
            bank_account_no,
            ifsc_code,
            bank_name,
            payment_terms,
            opening_balance,
            status,
            is_active
        } = req.body;

        // Validation
        if (!vendor_name || !address || !city || !state) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Vendor Name, Address, City, and State are required fields.'
            });
        }

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID is required.'
            });
        }

        const effectiveVendorCode = vendor_code && vendor_code.trim() !== '' 
            ? vendor_code.trim().toUpperCase() 
            : await generateVendorCode(effectiveCompanyId);

        const opBal = opening_balance !== undefined && opening_balance !== '' ? parseFloat(opening_balance) || 0.00 : 0.00;

        const query = `
            INSERT INTO vendors (
                company_id, branch_id, vendor_code, vendor_name,
                gstin, pan, address, city, state, pincode,
                phone, email, bank_account_no, ifsc_code, bank_name,
                payment_terms, opening_balance, status, is_active,
                created_by, updated_by
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, $18, $19,
                $20, $20
            ) RETURNING *
        `;

        const values = [
            effectiveCompanyId,
            effectiveBranchId,
            effectiveVendorCode,
            vendor_name.trim(),
            gstin ? gstin.trim().toUpperCase().substring(0, 30) : null,
            pan ? pan.trim().toUpperCase().substring(0, 30) : null,
            address.trim(),
            city.trim(),
            state.trim().substring(0, 50),
            pincode ? pincode.trim().substring(0, 30) : null,
            phone ? phone.trim() : null,
            email ? email.trim().toLowerCase() : null,
            bank_account_no ? bank_account_no.trim() : null,
            ifsc_code ? ifsc_code.trim().toUpperCase() : null,
            bank_name ? bank_name.trim() : null,
            payment_terms ? payment_terms.trim() : 'Net 30',
            opBal,
            status || 'Active',
            is_active !== undefined ? is_active : true,
            createdBy
        ];

        const result = await client.query(query, values);
        const createdVendor = result.rows[0];

        // Ensure Double-Entry Ledger under Sundry Creditors (GRP-CREDITORS)
        let credGrpRes = await client.query(
            `SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-CREDITORS' OR group_code = 'SUNDRY_CREDITORS') LIMIT 1`,
            [effectiveCompanyId]
        );
        let creditorsGroupId = credGrpRes.rows[0]?.group_id;
        if (!creditorsGroupId) {
            let clRes = await client.query(`SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND group_code = 'GRP-CL' LIMIT 1`, [effectiveCompanyId]);
            const parentId = clRes.rows[0]?.group_id;
            const newG = await client.query(`
                INSERT INTO account_groups (company_id, parent_group_id, group_name, group_code, nature, affects_gross_profit, is_system_group)
                VALUES ($1, $2, 'Sundry Creditors (Suppliers)', 'GRP-CREDITORS', 'LIABILITY', FALSE, TRUE)
                RETURNING group_id
            `, [effectiveCompanyId, parentId]);
            creditorsGroupId = newG.rows[0].group_id;
        }

        const newLed = await client.query(`
            INSERT INTO ledgers (
                company_id, group_id, ledger_name, ledger_code,
                opening_balance, opening_balance_type,
                current_balance, current_balance_type,
                maintain_bill_by_bill, is_active
            ) VALUES (
                $1, $2, $3, $4,
                $5, 'CR',
                $5, 'CR',
                TRUE, TRUE
            )
            ON CONFLICT (company_id, ledger_code) 
            DO UPDATE SET ledger_name = EXCLUDED.ledger_name
            RETURNING ledger_id
        `, [effectiveCompanyId, creditorsGroupId, vendor_name.trim(), effectiveVendorCode, opBal]);
        const ledgerId = newLed.rows[0].ledger_id;

        // Ensure vendor_profiles entry
        const vpRes = await client.query(`
            INSERT INTO vendor_profiles (
                company_id, ledger_id, existing_vendor_id, vendor_code,
                vendor_trade_name, vendor_legal_name, gstin, pan,
                address_line1, city, state_code, postal_code, is_active
            ) VALUES (
                $1, $2, $3, $4,
                $5, $5, $6, $7,
                $8, $9, $10, $11, TRUE
            )
            ON CONFLICT (company_id, vendor_code)
            DO UPDATE SET ledger_id = EXCLUDED.ledger_id, vendor_trade_name = EXCLUDED.vendor_trade_name
            RETURNING *
        `, [
            effectiveCompanyId,
            ledgerId,
            createdVendor.vendor_id,
            effectiveVendorCode,
            vendor_name.trim(),
            gstin ? gstin.trim().toUpperCase().substring(0, 30) : null,
            pan ? pan.trim().toUpperCase().substring(0, 30) : null,
            address.trim(),
            city.trim(),
            state.trim().substring(0, 50),
            pincode ? pincode.trim().substring(0, 30) : '400001'
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Vendor created and linked to accounting ledger successfully',
            data: {
                ...createdVendor,
                ledger_id: ledgerId,
                vendor_profile_id: vpRes.rows[0]?.vendor_profile_id
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating vendor:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating vendor',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 2. Get all vendors with filters & search
export const getAllVendors = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            status,
            is_active,
            search,
            page = 1,
            limit = 100
        } = req.query;

        let query = `
            SELECT 
                v.*,
                c.company_name,
                c.company_code,
                b.branch_name,
                b.branch_code,
                e1.first_name as created_by_name,
                e2.first_name as updated_by_name,
                vp.vendor_profile_id,
                l.ledger_id,
                COALESCE(l.current_balance, v.opening_balance, 0)::NUMERIC(16,2) AS ledger_balance,
                COALESCE(l.current_balance_type, 'CR') AS ledger_balance_type,
                (SELECT COALESCE(SUM(pi.outstanding_amount), 0)::NUMERIC(16,2) FROM purchase_invoices pi WHERE pi.vendor_id = vp.vendor_profile_id AND pi.outstanding_amount > 0) AS total_bills_due
            FROM vendors v
            LEFT JOIN companies c ON v.company_id = c.company_id
            LEFT JOIN branches b ON v.branch_id = b.branch_id
            LEFT JOIN employees e1 ON v.created_by = e1.employee_id
            LEFT JOIN employees e2 ON v.updated_by = e2.employee_id
            LEFT JOIN vendor_profiles vp ON (v.vendor_id = vp.existing_vendor_id OR v.vendor_code = vp.vendor_code) AND v.company_id = vp.company_id
            LEFT JOIN ledgers l ON vp.ledger_id = l.ledger_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND v.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (v.branch_id = $${counter} OR v.branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND v.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (is_active !== undefined && is_active !== 'all') {
            query += ` AND v.is_active = $${counter}`;
            values.push(is_active === 'true' || is_active === true);
            counter++;
        }

        if (search) {
            query += ` AND (
                v.vendor_name ILIKE $${counter} OR 
                v.vendor_code ILIKE $${counter} OR 
                v.gstin ILIKE $${counter} OR 
                v.pan ILIKE $${counter} OR 
                v.city ILIKE $${counter} OR 
                v.phone ILIKE $${counter} OR 
                v.email ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY v.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching vendors',
            error: error.message
        });
    }
};

// 3. Get single vendor by ID
export const getVendorById = async (req, res) => {
    try {
        const { vendor_id } = req.params;

        const query = `
            SELECT 
                v.*,
                c.company_name,
                c.company_code,
                b.branch_name,
                b.branch_code,
                e1.first_name as created_by_name,
                e2.first_name as updated_by_name
            FROM vendors v
            LEFT JOIN companies c ON v.company_id = c.company_id
            LEFT JOIN branches b ON v.branch_id = b.branch_id
            LEFT JOIN employees e1 ON v.created_by = e1.employee_id
            LEFT JOIN employees e2 ON v.updated_by = e2.employee_id
            WHERE v.vendor_id = $1
        `;

        const result = await pool.query(query, [vendor_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 4. Update vendor
export const updateVendor = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const {
            branch_id,
            vendor_code,
            vendor_name,
            gstin,
            pan,
            address,
            city,
            state,
            pincode,
            phone,
            email,
            bank_account_no,
            ifsc_code,
            bank_name,
            payment_terms,
            opening_balance,
            status,
            is_active
        } = req.body;

        const updatedBy = req.user?.employee_id || null;

        // Check if exists
        const check = await pool.query('SELECT * FROM vendors WHERE vendor_id = $1', [vendor_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        let updateFields = [];
        let values = [];
        let counter = 1;

        const addField = (fieldName, val) => {
            if (val !== undefined) {
                updateFields.push(`${fieldName} = $${counter}`);
                values.push(val);
                counter++;
            }
        };

        addField('branch_id', branch_id !== undefined ? (branch_id || null) : undefined);
        addField('vendor_code', vendor_code !== undefined ? vendor_code.trim().toUpperCase() : undefined);
        addField('vendor_name', vendor_name !== undefined ? vendor_name.trim() : undefined);
        addField('gstin', gstin !== undefined ? (gstin ? gstin.trim().toUpperCase() : null) : undefined);
        addField('pan', pan !== undefined ? (pan ? pan.trim().toUpperCase() : null) : undefined);
        addField('address', address !== undefined ? address.trim() : undefined);
        addField('city', city !== undefined ? city.trim() : undefined);
        addField('state', state !== undefined ? state.trim() : undefined);
        addField('pincode', pincode !== undefined ? (pincode ? pincode.trim() : null) : undefined);
        addField('phone', phone !== undefined ? (phone ? phone.trim() : null) : undefined);
        addField('email', email !== undefined ? (email ? email.trim().toLowerCase() : null) : undefined);
        addField('bank_account_no', bank_account_no !== undefined ? (bank_account_no ? bank_account_no.trim() : null) : undefined);
        addField('ifsc_code', ifsc_code !== undefined ? (ifsc_code ? ifsc_code.trim().toUpperCase() : null) : undefined);
        addField('bank_name', bank_name !== undefined ? (bank_name ? bank_name.trim() : null) : undefined);
        addField('payment_terms', payment_terms !== undefined ? (payment_terms ? payment_terms.trim() : null) : undefined);
        addField('opening_balance', opening_balance !== undefined ? parseFloat(opening_balance) || 0.00 : undefined);
        addField('status', status);
        addField('is_active', is_active);
        
        updateFields.push(`updated_by = $${counter}`);
        values.push(createdByOrUpdatedBy(updatedBy));
        counter++;

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(vendor_id);
        const query = `
            UPDATE vendors
            SET ${updateFields.join(', ')}
            WHERE vendor_id = $${counter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: 'Vendor updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating vendor:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while updating vendor',
            error: error.message
        });
    }
};

const createdByOrUpdatedBy = (val) => val || null;

// 5. Soft delete / Deactivate vendor
export const softDeleteVendor = async (req, res) => {
    try {
        const { vendor_id } = req.params;

        const query = `
            UPDATE vendors
            SET is_active = false, status = 'Inactive', updated_at = CURRENT_TIMESTAMP
            WHERE vendor_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [vendor_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Vendor deactivated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deactivating vendor:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 6. Restore vendor
export const restoreVendor = async (req, res) => {
    try {
        const { vendor_id } = req.params;

        const query = `
            UPDATE vendors
            SET is_active = true, status = 'Active', updated_at = CURRENT_TIMESTAMP
            WHERE vendor_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [vendor_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Vendor activated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error activating vendor:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 7. Get Vendor Statistics summary
export const getVendorStats = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_vendors,
                COUNT(CASE WHEN is_active = true AND status = 'Active' THEN 1 END) as active_vendors,
                COUNT(CASE WHEN is_active = false OR status = 'Inactive' THEN 1 END) as inactive_vendors,
                COUNT(CASE WHEN status = 'Blacklisted' THEN 1 END) as blacklisted_vendors,
                COALESCE(SUM(opening_balance), 0) as total_opening_balance
            FROM vendors
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (branch_id = $${counter} OR branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching vendor stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
