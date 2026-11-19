import pool from '../config/database.js';

const companyIdOf = (req) => req.scopeCompanyId || req.query.company_id || req.body.company_id || req.user?.company_id;

const resolveGroup = async (client, companyId, code, name, nature) => {
    const existing = await client.query(
        `SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = $2 LIMIT 1`,
        [companyId, code]
    );
    if (existing.rows.length) return existing.rows[0].group_id;
    const created = await client.query(`
        INSERT INTO account_groups (company_id, group_name, group_code, nature, affects_gross_profit, is_system_group)
        VALUES ($1, $2, $3, $4, FALSE, TRUE)
        ON CONFLICT (company_id, group_code) DO UPDATE SET group_name = EXCLUDED.group_name
        RETURNING group_id
    `, [companyId, name, code, nature]);
    return created.rows[0].group_id;
};

export const getParties = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const role = String(req.query.role || '').toUpperCase();
        const search = req.query.search?.trim();
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID is required.' });

        const params = [companyId];
        let query = `
            SELECT pm.*,
                   cl.current_balance AS customer_balance,
                   sl.current_balance AS supplier_balance
            FROM party_master pm
            LEFT JOIN ledgers cl ON cl.ledger_id = pm.customer_ledger_id
            LEFT JOIN ledgers sl ON sl.ledger_id = pm.supplier_ledger_id
            WHERE pm.company_id = $1
        `;
        if (role === 'CUSTOMER') {
            params.push(role);
            query += ` AND pm.party_type IN ('CUSTOMER', 'BOTH')`;
        } else if (role === 'SUPPLIER') {
            params.push(role);
            query += ` AND pm.party_type IN ('SUPPLIER', 'BOTH')`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (pm.party_name ILIKE $${params.length} OR pm.party_code ILIKE $${params.length} OR pm.gstin ILIKE $${params.length})`;
        }
        query += ` ORDER BY pm.party_name ASC`;
        const result = await pool.query(query, params);

        const data = result.rows.map(party => ({
            ...party,
            customer_id: party.customer_profile_id,
            trade_name: party.party_name,
            billing_state_code: party.state_code,
            vendor_profile_id: party.vendor_profile_id,
            vendor_id: party.vendor_profile_id,
            vendor_name: party.party_name,
            state: party.state_code
        }));
        return res.json({ success: true, count: data.length, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createParty = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const companyId = companyIdOf(req);
        const {
            party_code,
            party_name,
            party_type,
            gstin,
            pan,
            email,
            phone,
            address_line1,
            address_line2,
            city,
            state_code = '27',
            postal_code,
            country = 'India',
            payment_terms = 'Net 30',
            credit_limit = 0,
            credit_period_days = 30,
            opening_balance = 0,
            opening_balance_type = 'DR'
        } = req.body;

        if (!companyId || !party_name?.trim() || !['CUSTOMER', 'SUPPLIER', 'BOTH'].includes(party_type)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company, party name, and a valid party type are required.' });
        }

        const normalizedGstin = gstin ? String(gstin).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15) : '';
        if (normalizedGstin && normalizedGstin.length !== 15) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'GSTIN must contain exactly 15 characters.' });
        }
        const normalizedPan = normalizedGstin.length >= 12
            ? normalizedGstin.substring(2, 12)
            : (pan ? String(pan).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) : '');
        if (normalizedPan && normalizedPan.length !== 10) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'PAN must contain exactly 10 characters.' });
        }
        const normalizedStateCode = normalizedGstin.length >= 2
            ? normalizedGstin.substring(0, 2)
            : String(state_code || '27');

        const code = (party_code || `PTY-${companyId}-${Date.now().toString().slice(-8)}`).trim().toUpperCase();
        const existing = await client.query(`SELECT party_id FROM party_master WHERE company_id = $1 AND party_code = $2`, [companyId, code]);
        if (existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Party code ${code} already exists.` });
        }

        let customerProfileId = null;
        let vendorProfileId = null;
        let customerLedgerId = null;
        let supplierLedgerId = null;
        const balance = Math.max(0, Number(opening_balance) || 0);
        const normalizedOpeningType = opening_balance_type === 'CR' ? 'CR' : 'DR';

        if (party_type === 'CUSTOMER' || party_type === 'BOTH') {
            const debtorGroupId = await resolveGroup(client, companyId, 'GRP-DEBTORS', 'Sundry Debtors', 'ASSET');
            const customerLedger = await client.query(`
                INSERT INTO ledgers (
                    company_id, group_id, ledger_name, ledger_code, opening_balance,
                    opening_balance_type, current_balance, current_balance_type,
                    maintain_bill_by_bill, default_credit_period_days, credit_limit, is_active
                ) VALUES ($1,$2,$3,$4,$5,$6,$5,$6,TRUE,$7,$8,TRUE)
                ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
                RETURNING ledger_id
            `, [companyId, debtorGroupId, party_name.trim(), code, balance, normalizedOpeningType, Number(credit_period_days) || 0, Number(credit_limit) || 0]);
            customerLedgerId = customerLedger.rows[0].ledger_id;

            const customer = await client.query(`
                INSERT INTO customer_profiles (
                    company_id, ledger_id, customer_code, trade_name, legal_name, gstin,
                    gst_registration_type, pan, primary_contact_name, email, phone,
                    billing_address_line1, billing_address_line2, billing_city, billing_state_code,
                    billing_postal_code, billing_country, shipping_address_line1, shipping_address_line2,
                    shipping_city, shipping_state_code, shipping_postal_code, shipping_country,
                    is_composition, is_tds_applicable, is_tcs_applicable, is_active
                ) VALUES (
                    $1,$2,$3,$4,$4,$5,'REGULAR',$6,$7,$8,$9,
                    $10,$11,$12,$13,$14,$15,$10,$11,$12,$13,$14,$15,
                    FALSE,FALSE,FALSE,TRUE
                ) ON CONFLICT (company_id, customer_code) DO UPDATE SET ledger_id = EXCLUDED.ledger_id
                RETURNING customer_id
            `, [
                companyId, customerLedgerId, code, party_name.trim(),                 normalizedGstin || null,
                normalizedPan || null, party_name.trim(), email?.trim() || null,
                phone?.trim() || null, address_line1 || '', address_line2 || null,
                city || '', normalizedStateCode, postal_code || '', country
            ]);
            customerProfileId = customer.customerProfileId || customer.rows[0].customer_id;
        }

        if (party_type === 'SUPPLIER' || party_type === 'BOTH') {
            const creditorGroupId = await resolveGroup(client, companyId, 'GRP-CREDITORS', 'Sundry Creditors', 'LIABILITY');
            const supplierLedger = await client.query(`
                INSERT INTO ledgers (
                    company_id, group_id, ledger_name, ledger_code, opening_balance,
                    opening_balance_type, current_balance, current_balance_type,
                    maintain_bill_by_bill, is_active
                ) VALUES ($1,$2,$3,$4,$5,'CR',$5,'CR',TRUE,TRUE)
                ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
                RETURNING ledger_id
            `, [companyId, creditorGroupId, party_name.trim(), code, balance]);
            supplierLedgerId = supplierLedger.rows[0].ledger_id;

            const vendor = await client.query(`
                INSERT INTO vendors (
                    company_id, vendor_code, vendor_name, gstin, pan, address, city, state,
                    pincode, phone, email, payment_terms, opening_balance, status, is_active
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Active',TRUE)
                ON CONFLICT DO NOTHING
                RETURNING vendor_id
            `, [
                companyId, code, party_name.trim(), normalizedGstin || null,
                normalizedPan || null, address_line1 || '', city || '',
                normalizedStateCode, postal_code || null, phone?.trim() || null,
                email?.trim() || null, payment_terms, balance
            ]);
            let vendorId = vendor.rows[0]?.vendor_id;
            if (!vendorId) {
                const existingVendor = await client.query(`SELECT vendor_id FROM vendors WHERE company_id = $1 AND vendor_code = $2`, [companyId, code]);
                vendorId = existingVendor.rows[0]?.vendor_id;
            }

            if (vendorId) {
                const vendorProfile = await client.query(`
                    INSERT INTO vendor_profiles (
                        company_id, ledger_id, existing_vendor_id, vendor_code,
                        vendor_trade_name, vendor_legal_name, gstin, pan,
                        address_line1, address_line2, city, state_code, postal_code,
                        country, is_active
                    ) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE)
                    ON CONFLICT (company_id, vendor_code) DO UPDATE SET ledger_id = EXCLUDED.ledger_id
                    RETURNING vendor_profile_id
                `, [
                    companyId, supplierLedgerId, vendorId, code, party_name.trim(),
                    normalizedGstin || null, normalizedPan || null,
                    address_line1 || '', address_line2 || null, city || '',
                    normalizedStateCode, postal_code || null, country
                ]);
                vendorProfileId = vendorProfile.rows[0].vendor_profile_id;
            }
        }

        const party = await client.query(`
            INSERT INTO party_master (
                company_id, party_code, party_name, party_type, gstin, pan, email, phone,
                address_line1, address_line2, city, state_code, postal_code, country,
                payment_terms, credit_limit, credit_period_days, opening_balance, opening_balance_type,
                customer_profile_id, vendor_profile_id, customer_ledger_id, supplier_ledger_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
            RETURNING *
        `, [
            companyId, code, party_name.trim(), party_type, normalizedGstin || null,
            normalizedPan || null, email?.trim() || null, phone?.trim() || null,
            address_line1 || null, address_line2 || null, city || null, normalizedStateCode,
            postal_code || null, country, payment_terms, Number(credit_limit) || 0,
            Number(credit_period_days) || 0, balance, normalizedOpeningType,
            customerProfileId, vendorProfileId, customerLedgerId, supplierLedgerId
        ]);

        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: party.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};
