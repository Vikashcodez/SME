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
            query += ` AND pm.party_type IN ('CUSTOMER', 'BOTH')`;
        } else if (role === 'SUPPLIER') {
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
            const supplierLedgerCode = party_type === 'BOTH' ? `${code}-SUP` : code;
            const supplierLedgerName = party_type === 'BOTH'
                ? `${party_name.trim()} (Supplier)`
                : party_name.trim();
            const supplierLedger = await client.query(`
                INSERT INTO ledgers (
                    company_id, group_id, ledger_name, ledger_code, opening_balance,
                    opening_balance_type, current_balance, current_balance_type,
                    maintain_bill_by_bill, is_active
                ) VALUES ($1,$2,$3,$4,$5,'CR',$5,'CR',TRUE,TRUE)
                ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
                RETURNING ledger_id
            `, [companyId, creditorGroupId, supplierLedgerName, supplierLedgerCode, balance]);
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

export const getPartyById = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const result = await pool.query(
            `SELECT * FROM party_master WHERE party_id = $1 AND company_id = $2`,
            [req.params.party_id, companyId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Party not found.' });
        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateParty = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const companyId = companyIdOf(req);
        const current = await client.query(
            `SELECT * FROM party_master WHERE party_id = $1 AND company_id = $2`,
            [req.params.party_id, companyId]
        );
        if (!current.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Party not found.' });
        }

        const oldParty = current.rows[0];
        const body = req.body;
        const partyName = String(body.party_name || oldParty.party_name).trim();
        const partyType = body.party_type || oldParty.party_type;
        if (!partyName || !['CUSTOMER', 'SUPPLIER', 'BOTH'].includes(partyType)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'A valid party name and type are required.' });
        }

        const normalizedGstin = body.gstin !== undefined
            ? String(body.gstin).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
            : String(oldParty.gstin || '');
        if (normalizedGstin && normalizedGstin.length !== 15) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'GSTIN must contain exactly 15 characters.' });
        }
        const normalizedPan = normalizedGstin.length >= 12
            ? normalizedGstin.substring(2, 12)
            : String(body.pan !== undefined ? body.pan : oldParty.pan || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const normalizedStateCode = normalizedGstin.length >= 2
            ? normalizedGstin.substring(0, 2)
            : String(body.state_code ?? oldParty.state_code ?? '27');
        const openingBalance = Math.max(0, Number(body.opening_balance ?? oldParty.opening_balance) || 0);
        const openingType = (body.opening_balance_type || oldParty.opening_balance_type) === 'CR' ? 'CR' : 'DR';

        await client.query(`
            UPDATE party_master SET
                party_name = $1, party_type = $2, gstin = $3, pan = $4,
                email = $5, phone = $6, address_line1 = $7, address_line2 = $8,
                city = $9, state_code = $10, postal_code = $11, country = $12,
                payment_terms = $13, credit_limit = $14, credit_period_days = $15,
                opening_balance = $16, opening_balance_type = $17, updated_at = CURRENT_TIMESTAMP
            WHERE party_id = $18 AND company_id = $19
            RETURNING *
        `, [
            partyName, partyType, normalizedGstin || null, normalizedPan || null,
            body.email ?? oldParty.email, body.phone ?? oldParty.phone,
            body.address_line1 ?? oldParty.address_line1, body.address_line2 ?? oldParty.address_line2,
            body.city ?? oldParty.city, normalizedStateCode, body.postal_code ?? oldParty.postal_code,
            body.country ?? oldParty.country, body.payment_terms ?? oldParty.payment_terms,
            Number(body.credit_limit ?? oldParty.credit_limit) || 0,
            Number(body.credit_period_days ?? oldParty.credit_period_days) || 0,
            openingBalance, openingType, req.params.party_id, companyId
        ]);

        if (oldParty.customer_ledger_id) {
            await client.query(`
                UPDATE ledgers SET ledger_name = $1, opening_balance = $2,
                    opening_balance_type = $3, credit_limit = $4,
                    default_credit_period_days = $5, updated_at = CURRENT_TIMESTAMP
                WHERE ledger_id = $6 AND company_id = $7
            `, [partyName, openingBalance, openingType,
                Number(body.credit_limit ?? oldParty.credit_limit) || 0,
                Number(body.credit_period_days ?? oldParty.credit_period_days) || 0,
                oldParty.customer_ledger_id, companyId]);
        }
        if (oldParty.supplier_ledger_id) {
            await client.query(`
                UPDATE ledgers SET ledger_name = $1, opening_balance = $2,
                    opening_balance_type = 'CR', updated_at = CURRENT_TIMESTAMP
                WHERE ledger_id = $3 AND company_id = $4
            `, [partyType === 'BOTH' ? `${partyName} (Supplier)` : partyName, openingBalance, oldParty.supplier_ledger_id, companyId]);
        }
        if (oldParty.customer_profile_id) {
            await client.query(`
                UPDATE customer_profiles SET trade_name = $1, legal_name = $1,
                    gstin = $2, pan = $3, email = $4, phone = $5,
                    billing_address_line1 = COALESCE($6, billing_address_line1),
                    billing_address_line2 = $7, billing_city = COALESCE($8, billing_city),
                    billing_state_code = $9, billing_postal_code = COALESCE($10, billing_postal_code),
                    shipping_address_line1 = COALESCE($6, shipping_address_line1),
                    shipping_address_line2 = $7, shipping_city = COALESCE($8, shipping_city),
                    shipping_state_code = $9, shipping_postal_code = COALESCE($10, shipping_postal_code),
                    is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = $11 AND company_id = $12
            `, [
                partyName, normalizedGstin || null, normalizedPan || null,
                body.email ?? oldParty.email, body.phone ?? oldParty.phone,
                body.address_line1 ?? oldParty.address_line1, body.address_line2 ?? oldParty.address_line2,
                body.city ?? oldParty.city, normalizedStateCode, body.postal_code ?? oldParty.postal_code,
                oldParty.customer_profile_id, companyId
            ]);
        }
        if (oldParty.vendor_profile_id) {
            await client.query(`
                UPDATE vendor_profiles SET vendor_trade_name = $1, vendor_legal_name = $1,
                    gstin = $2, pan = $3, address_line1 = COALESCE($4, address_line1),
                    address_line2 = $5, city = COALESCE($6, city), state_code = $7,
                    postal_code = COALESCE($8, postal_code), country = $9,
                    is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE vendor_profile_id = $10 AND company_id = $11
            `, [
                partyName, normalizedGstin || null, normalizedPan || null,
                body.address_line1 ?? oldParty.address_line1, body.address_line2 ?? oldParty.address_line2,
                body.city ?? oldParty.city, normalizedStateCode, body.postal_code ?? oldParty.postal_code,
                body.country ?? oldParty.country, oldParty.vendor_profile_id, companyId
            ]);
        }

        await client.query('COMMIT');
        const updated = await pool.query(`SELECT * FROM party_master WHERE party_id = $1 AND company_id = $2`, [req.params.party_id, companyId]);
        return res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

export const deleteParty = async (req, res) => {
    try {
        const companyId = companyIdOf(req);
        const party = await pool.query(
            `SELECT is_active FROM party_master WHERE party_id = $1 AND company_id = $2`,
            [req.params.party_id, companyId]
        );
        if (!party.rows.length) return res.status(404).json({ success: false, message: 'Party not found.' });
        await pool.query(
            `UPDATE party_master SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE party_id = $1 AND company_id = $2`,
            [req.params.party_id, companyId]
        );
        return res.json({ success: true, message: 'Party deactivated.' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// Bulk Import Parties from Excel / Google Sheets
export const bulkImportParties = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const companyId = companyIdOf(req);
        const { parties = [] } = req.body;

        if (!companyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID is required.' });
        }

        if (!Array.isArray(parties) || parties.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'No party records provided for import.' });
        }

        const inserted = [];
        const skipped = [];

        for (let i = 0; i < parties.length; i++) {
            const row = parties[i];
            const rowNum = i + 1;
            const name = (row.party_name || row['Party Name'] || row.name || '').toString().trim();
            if (!name) {
                skipped.push({ row: rowNum, reason: 'Missing Party Name' });
                continue;
            }

            let type = (row.party_type || row['Party Type'] || row.type || 'BOTH').toString().trim().toUpperCase();
            if (!['CUSTOMER', 'SUPPLIER', 'BOTH'].includes(type)) {
                if (type.includes('CUST')) type = 'CUSTOMER';
                else if (type.includes('SUPP') || type.includes('VEND')) type = 'SUPPLIER';
                else type = 'BOTH';
            }

            const rawGstin = (row.gstin || row['GSTIN'] || row['GST Number'] || '').toString().trim();
            const normalizedGstin = rawGstin ? rawGstin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15) : '';
            
            let rawPan = (row.pan || row['PAN'] || row['PAN Number'] || '').toString().trim();
            let normalizedPan = normalizedGstin.length >= 12
                ? normalizedGstin.substring(2, 12)
                : (rawPan ? rawPan.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) : '');

            const stateCode = normalizedGstin.length >= 2
                ? normalizedGstin.substring(0, 2)
                : String(row.state_code || row['State Code'] || '27').trim().padStart(2, '0');

            let code = (row.party_code || row['Party Code'] || row.code || '').toString().trim().toUpperCase();
            if (!code) {
                code = `PTY-${companyId}-${Date.now().toString().slice(-6)}-${i + 1}`;
            }

            // Check if code exists, append random if needed
            const existingCode = await client.query(`SELECT party_id FROM party_master WHERE company_id = $1 AND party_code = $2`, [companyId, code]);
            if (existingCode.rows.length > 0) {
                code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
            }

            const email = (row.email || row['Email'] || '').toString().trim() || null;
            const phone = (row.phone || row['Phone'] || row['Mobile'] || '').toString().trim() || null;
            const address1 = (row.address_line1 || row['Address'] || row['Address Line 1'] || 'Main Road').toString().trim();
            const address2 = (row.address_line2 || row['Address Line 2'] || '').toString().trim() || null;
            const city = (row.city || row['City'] || 'City').toString().trim();
            const postalCode = (row.postal_code || row['Postal Code'] || row['Pincode'] || '400001').toString().trim();
            const country = (row.country || row['Country'] || 'India').toString().trim();
            const paymentTerms = (row.payment_terms || row['Payment Terms'] || 'Net 30').toString().trim();
            const creditLimit = Math.max(0, parseFloat(row.credit_limit || row['Credit Limit'] || 0) || 0);
            const creditPeriod = Math.max(0, parseInt(row.credit_period_days || row['Credit Period (Days)'] || 30, 10) || 30);
            const balance = Math.max(0, parseFloat(row.opening_balance || row['Opening Balance'] || 0) || 0);
            const openingType = (row.opening_balance_type || row['Opening Balance Type'] || 'DR').toString().trim().toUpperCase() === 'CR' ? 'CR' : 'DR';

            let customerProfileId = null;
            let vendorProfileId = null;
            let customerLedgerId = null;
            let supplierLedgerId = null;

            if (type === 'CUSTOMER' || type === 'BOTH') {
                const debtorGroupId = await resolveGroup(client, companyId, 'GRP-DEBTORS', 'Sundry Debtors', 'ASSET');
                const customerLedger = await client.query(`
                    INSERT INTO ledgers (
                        company_id, group_id, ledger_name, ledger_code, opening_balance,
                        opening_balance_type, current_balance, current_balance_type,
                        maintain_bill_by_bill, default_credit_period_days, credit_limit, is_active
                    ) VALUES ($1,$2,$3,$4,$5,$6,$5,$6,TRUE,$7,$8,TRUE)
                    ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
                    RETURNING ledger_id
                `, [companyId, debtorGroupId, name, code, balance, openingType, creditPeriod, creditLimit]);
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
                    ) RETURNING customer_id
                `, [
                    companyId, customerLedgerId, code, name, normalizedGstin || null, normalizedPan || null,
                    name, email, phone, address1, address2, city, stateCode, postalCode, country
                ]);
                customerProfileId = customer.rows[0].customer_id;
            }

            if (type === 'SUPPLIER' || type === 'BOTH') {
                const creditorGroupId = await resolveGroup(client, companyId, 'GRP-CREDITORS', 'Sundry Creditors', 'LIABILITY');
                const supplierLedgerCode = `${code}-SUP`;
                const supplierLedger = await client.query(`
                    INSERT INTO ledgers (
                        company_id, group_id, ledger_name, ledger_code, opening_balance,
                        opening_balance_type, current_balance, current_balance_type,
                        maintain_bill_by_bill, default_credit_period_days, credit_limit, is_active
                    ) VALUES ($1,$2,$3,$4,$5,$6,$5,$6,TRUE,$7,$8,TRUE)
                    ON CONFLICT (company_id, ledger_code) DO UPDATE SET ledger_name = EXCLUDED.ledger_name
                    RETURNING ledger_id
                `, [companyId, creditorGroupId, `${name} (Supplier)`, supplierLedgerCode, balance, openingType, creditPeriod, creditLimit]);
                supplierLedgerId = supplierLedger.rows[0].ledger_id;

                const directVendor = await client.query(`
                    INSERT INTO vendors (
                        company_id, vendor_code, vendor_name, gstin, pan,
                        address, city, state, pincode, phone, email,
                        payment_terms, opening_balance, status, is_active
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Active',TRUE)
                    RETURNING vendor_id
                `, [
                    companyId, code, name, normalizedGstin || null, normalizedPan || null,
                    address1, city, stateCode, postalCode, phone, email, paymentTerms, balance
                ]);

                const vendor = await client.query(`
                    INSERT INTO vendor_profiles (
                        company_id, ledger_id, existing_vendor_id, vendor_code, vendor_trade_name,
                        vendor_legal_name, gstin, pan, address_line1, address_line2,
                        city, state_code, postal_code, country, is_active
                    ) VALUES (
                        $1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE
                    ) RETURNING vendor_profile_id
                `, [
                    companyId, supplierLedgerId, directVendor.rows[0].vendor_id, code, name,
                    normalizedGstin || null, normalizedPan || null, address1, address2, city, stateCode, postalCode, country
                ]);
                vendorProfileId = vendor.rows[0].vendor_profile_id;
            }

            const partyRes = await client.query(`
                INSERT INTO party_master (
                    company_id, party_code, party_name, party_type, gstin, pan,
                    email, phone, address_line1, address_line2, city, state_code,
                    postal_code, country, payment_terms, credit_limit, credit_period_days,
                    customer_profile_id, vendor_profile_id, customer_ledger_id, supplier_ledger_id, is_active
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,TRUE
                ) RETURNING party_id, party_code, party_name, party_type
            `, [
                companyId, code, name, type, normalizedGstin || null, normalizedPan || null,
                email, phone, address1, address2, city, stateCode, postalCode, country,
                paymentTerms, creditLimit, creditPeriod, customerProfileId, vendorProfileId,
                customerLedgerId, supplierLedgerId
            ]);

            inserted.push(partyRes.rows[0]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Successfully imported ${inserted.length} party/customer/supplier record(s).${skipped.length > 0 ? ` (${skipped.length} skipped)` : ''}`,
            count: inserted.length,
            skippedCount: skipped.length,
            data: inserted,
            skipped
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulkImportParties:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to bulk import parties.'
        });
    } finally {
        client.release();
    }
};
