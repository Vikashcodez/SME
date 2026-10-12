import pool from '../config/database.js';

// Generate unique customer code
const generateCustomerCode = async (companyId) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `CUST-${companyId || 'GEN'}-${randomDigits}`;
};

// 1. Create a new Customer Profile and Auto-provision Double-Entry Ledger
export const createCustomer = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            company_id,
            customer_code,
            trade_name,
            legal_name,
            gstin,
            gst_registration_type = 'UNREGISTERED',
            pan,
            primary_contact_name,
            email,
            phone,
            billing_address_line1,
            billing_address_line2,
            billing_city,
            billing_state_code,
            billing_postal_code,
            billing_country = 'India',
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state_code,
            shipping_postal_code,
            shipping_country = 'India',
            credit_limit = 0,
            credit_period_days = 30,
            opening_balance = 0,
            opening_balance_type = 'DR',
            is_composition = false,
            is_tds_applicable = false,
            is_tcs_applicable = false
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        if (!effectiveCompanyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Company ID is required.'
            });
        }

        if (!trade_name || !billing_address_line1 || !billing_city || !billing_state_code || !billing_postal_code) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Trade Name, Billing Address, City, State Code, and Postal Code are required.'
            });
        }

        const effectiveCustomerCode = customer_code && customer_code.trim() !== ''
            ? customer_code.trim().toUpperCase()
            : await generateCustomerCode(effectiveCompanyId);

        // Check if customer code already exists in this company
        const existingCust = await client.query(
            `SELECT customer_id FROM customer_profiles WHERE company_id = $1 AND customer_code = $2`,
            [effectiveCompanyId, effectiveCustomerCode]
        );
        if (existingCust.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Customer code ${effectiveCustomerCode} already exists.`
            });
        }

        // 1. Locate Sundry Debtors account group for the company
        const groupRes = await client.query(
            `SELECT group_id FROM account_groups WHERE (company_id = $1 OR company_id IS NULL) AND (group_code = 'GRP-DEBTORS' OR group_code = 'SUNDRY_DEBTORS') LIMIT 1`,
            [effectiveCompanyId]
        );
        let debtorGroupId;
        if (groupRes.rows.length === 0) {
            // Find root Assets or create fallback
            const assetRes = await client.query(
                `SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'ASSETS'`,
                [effectiveCompanyId]
            );
            const parentId = assetRes.rows.length > 0 ? assetRes.rows[0].group_id : null;
            const newGroup = await client.query(`
                INSERT INTO account_groups (company_id, parent_group_id, group_name, group_code, nature, is_system_group)
                VALUES ($1, $2, 'Sundry Debtors', 'SUNDRY_DEBTORS', 'ASSET', TRUE)
                RETURNING group_id
            `, [effectiveCompanyId, parentId]);
            debtorGroupId = newGroup.rows[0].group_id;
        } else {
            debtorGroupId = groupRes.rows[0].group_id;
        }

        // 2. Create Double-Entry Ledger for Customer
        const parsedOpeningBal = parseFloat(opening_balance) || 0;
        const ledgerRes = await client.query(`
            INSERT INTO ledgers (
                company_id, group_id, ledger_name, ledger_code, currency_code,
                opening_balance, opening_balance_type,
                current_balance, current_balance_type,
                maintain_bill_by_bill, default_credit_period_days, credit_limit,
                is_active
            ) VALUES (
                $1, $2, $3, $4, 'INR',
                $5, $6,
                $5, $6,
                TRUE, $7, $8,
                TRUE
            ) RETURNING ledger_id
        `, [
            effectiveCompanyId,
            debtorGroupId,
            trade_name.trim(),
            effectiveCustomerCode,
            parsedOpeningBal,
            opening_balance_type === 'CR' ? 'CR' : 'DR',
            parseInt(credit_period_days) || 0,
            parseFloat(credit_limit) || 0
        ]);
        const ledgerId = ledgerRes.rows[0].ledger_id;

        // 3. Create Customer Profile
        const shipAddress1 = shipping_address_line1 || billing_address_line1;
        const shipCity = shipping_city || billing_city;
        const shipState = shipping_state_code || billing_state_code;
        const shipPostal = shipping_postal_code || billing_postal_code;

        const customerRes = await client.query(`
            INSERT INTO customer_profiles (
                company_id, ledger_id, customer_code, trade_name, legal_name,
                gstin, gst_registration_type, pan, primary_contact_name, email, phone,
                billing_address_line1, billing_address_line2, billing_city, billing_state_code, billing_postal_code, billing_country,
                shipping_address_line1, shipping_address_line2, shipping_city, shipping_state_code, shipping_postal_code, shipping_country,
                is_composition, is_tds_applicable, is_tcs_applicable, is_active
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23,
                $24, $25, $26, TRUE
            ) RETURNING *
        `, [
            effectiveCompanyId,
            ledgerId,
            effectiveCustomerCode,
            trade_name.trim(),
            legal_name ? legal_name.trim() : trade_name.trim(),
            gstin ? gstin.trim().toUpperCase() : null,
            gst_registration_type,
            pan ? pan.trim().toUpperCase() : (gstin && gstin.length >= 12 ? gstin.substring(2, 12).toUpperCase() : null),
            primary_contact_name,
            email,
            phone,
            billing_address_line1,
            billing_address_line2 || null,
            billing_city,
            billing_state_code,
            billing_postal_code,
            billing_country,
            shipAddress1,
            shipping_address_line2 || null,
            shipCity,
            shipState,
            shipPostal,
            shipping_country,
            Boolean(is_composition),
            Boolean(is_tds_applicable),
            Boolean(is_tcs_applicable)
        ]);

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'Customer and Double-Entry Ledger created successfully',
            data: {
                ...customerRes.rows[0],
                current_balance: parsedOpeningBal,
                current_balance_type: opening_balance_type === 'CR' ? 'CR' : 'DR'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in createCustomer:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    } finally {
        client.release();
    }
};

// 2. Get All Customers with linked Ledger balances
export const getCustomers = async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const search = req.query.search || '';
        const status = req.query.status;

        let query = `
            SELECT 
                cp.*,
                l.ledger_name,
                l.current_balance,
                l.current_balance_type,
                l.opening_balance,
                l.opening_balance_type,
                l.credit_limit,
                l.default_credit_period_days,
                (
                    SELECT COUNT(*)::INT 
                    FROM sales_invoices si 
                    WHERE si.customer_id = cp.customer_id
                ) AS total_invoices,
                (
                    SELECT COALESCE(SUM(si.balance_due), 0)::NUMERIC(14,2)
                    FROM sales_invoices si 
                    WHERE si.customer_id = cp.customer_id AND si.payment_status != 'PAID' AND si.status = 'POSTED'
                ) AS total_outstanding_due
            FROM customer_profiles cp
            JOIN ledgers l ON cp.ledger_id = l.ledger_id
            WHERE 1=1
        `;
        const params = [];

        if (companyId) {
            params.push(companyId);
            query += ` AND cp.company_id = $${params.length}`;
        }

        if (status !== undefined && status !== '') {
            params.push(status === 'true' || status === true);
            query += ` AND cp.is_active = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (
                cp.trade_name ILIKE $${params.length} OR 
                cp.legal_name ILIKE $${params.length} OR 
                cp.customer_code ILIKE $${params.length} OR 
                cp.phone ILIKE $${params.length} OR 
                cp.gstin ILIKE $${params.length}
            )`;
        }

        query += ` ORDER BY cp.trade_name ASC`;

        const result = await pool.query(query, params);
        return res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error in getCustomers:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
};

// 3. Get Single Customer Profile with Details
export const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                cp.*,
                l.ledger_name,
                l.current_balance,
                l.current_balance_type,
                l.opening_balance,
                l.opening_balance_type,
                l.credit_limit,
                l.default_credit_period_days
            FROM customer_profiles cp
            JOIN ledgers l ON cp.ledger_id = l.ledger_id
            WHERE cp.customer_id = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Fetch recent invoices
        const invRes = await pool.query(`
            SELECT 
                invoice_id, invoice_number, invoice_date, due_date,
                total_amount, paid_amount, balance_due, payment_status, status
            FROM sales_invoices
            WHERE customer_id = $1
            ORDER BY invoice_date DESC
            LIMIT 10
        `, [id]);

        return res.json({
            success: true,
            data: {
                ...result.rows[0],
                recent_invoices: invRes.rows
            }
        });
    } catch (error) {
        console.error('Error in getCustomerById:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
};

// 4. Update Customer Profile
export const updateCustomer = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // Check customer exists
        const check = await client.query('SELECT * FROM customer_profiles WHERE customer_id = $1', [id]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        const current = check.rows[0];

        const {
            trade_name = current.trade_name,
            legal_name = current.legal_name,
            gstin = current.gstin,
            gst_registration_type = current.gst_registration_type,
            pan = current.pan,
            primary_contact_name = current.primary_contact_name,
            email = current.email,
            phone = current.phone,
            billing_address_line1 = current.billing_address_line1,
            billing_address_line2 = current.billing_address_line2,
            billing_city = current.billing_city,
            billing_state_code = current.billing_state_code,
            billing_postal_code = current.billing_postal_code,
            billing_country = current.billing_country,
            shipping_address_line1 = current.shipping_address_line1,
            shipping_address_line2 = current.shipping_address_line2,
            shipping_city = current.shipping_city,
            shipping_state_code = current.shipping_state_code,
            shipping_postal_code = current.shipping_postal_code,
            shipping_country = current.shipping_country,
            credit_limit,
            credit_period_days,
            is_active = current.is_active
        } = req.body;

        // Update customer profile
        const updateCust = await client.query(`
            UPDATE customer_profiles SET
                trade_name = $1,
                legal_name = $2,
                gstin = $3,
                gst_registration_type = $4,
                pan = $5,
                primary_contact_name = $6,
                email = $7,
                phone = $8,
                billing_address_line1 = $9,
                billing_address_line2 = $10,
                billing_city = $11,
                billing_state_code = $12,
                billing_postal_code = $13,
                billing_country = $14,
                shipping_address_line1 = $15,
                shipping_address_line2 = $16,
                shipping_city = $17,
                shipping_state_code = $18,
                shipping_postal_code = $19,
                shipping_country = $20,
                is_active = $21,
                updated_at = CURRENT_TIMESTAMP
            WHERE customer_id = $22
            RETURNING *
        `, [
            trade_name.trim(),
            legal_name ? legal_name.trim() : trade_name.trim(),
            gstin ? gstin.trim().toUpperCase() : null,
            gst_registration_type,
            pan ? pan.trim().toUpperCase() : null,
            primary_contact_name,
            email,
            phone,
            billing_address_line1,
            billing_address_line2,
            billing_city,
            billing_state_code,
            billing_postal_code,
            billing_country,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state_code,
            shipping_postal_code,
            shipping_country,
            Boolean(is_active),
            id
        ]);

        // Keep linked Ledger in sync
        const ledgerUpdates = [];
        const ledgerParams = [current.ledger_id];

        if (trade_name) {
            ledgerParams.push(trade_name.trim());
            ledgerUpdates.push(`ledger_name = $${ledgerParams.length}`);
        }
        if (credit_limit !== undefined) {
            ledgerParams.push(parseFloat(credit_limit) || 0);
            ledgerUpdates.push(`credit_limit = $${ledgerParams.length}`);
        }
        if (credit_period_days !== undefined) {
            ledgerParams.push(parseInt(credit_period_days) || 0);
            ledgerUpdates.push(`default_credit_period_days = $${ledgerParams.length}`);
        }
        if (is_active !== undefined) {
            ledgerParams.push(Boolean(is_active));
            ledgerUpdates.push(`is_active = $${ledgerParams.length}`);
        }

        if (ledgerUpdates.length > 0) {
            await client.query(`
                UPDATE ledgers 
                SET ${ledgerUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE ledger_id = $1
            `, ledgerParams);
        }

        await client.query('COMMIT');
        return res.json({
            success: true,
            message: 'Customer updated successfully',
            data: updateCust.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateCustomer:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    } finally {
        client.release();
    }
};
