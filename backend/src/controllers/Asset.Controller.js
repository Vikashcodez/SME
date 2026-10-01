import pool from '../config/database.js';

// Helper to generate a unique asset tag if none provided
const generateAssetTag = async (companyId, category) => {
    const prefix = (category || 'AST').substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${companyId || 'GEN'}-${randomDigits}`;
};

// 1. Create a new Asset
export const createAsset = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            department_id,
            assigned_employee_id,
            vendor_id,
            asset_tag,
            asset_name,
            asset_category,
            brand_model,
            serial_number,
            purchase_date,
            purchase_cost,
            current_value,
            depreciation_rate,
            location,
            asset_status,
            condition,
            warranty_expiry_date,
            last_service_date,
            next_service_due,
            notes,
            is_active
        } = req.body;

        if (!asset_name || !asset_category) {
            return res.status(400).json({
                success: false,
                message: 'Asset Name and Asset Category are required.'
            });
        }

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required.'
            });
        }

        const effectiveAssetTag = asset_tag && asset_tag.trim() !== ''
            ? asset_tag.trim().toUpperCase()
            : await generateAssetTag(effectiveCompanyId, asset_category);

        const cost = purchase_cost !== undefined && purchase_cost !== '' ? parseFloat(purchase_cost) || 0 : 0.00;
        const val = current_value !== undefined && current_value !== '' ? parseFloat(current_value) || 0 : cost;

        const query = `
            INSERT INTO assets (
                company_id, branch_id, department_id, assigned_employee_id, vendor_id,
                asset_tag, asset_name, asset_category, brand_model, serial_number,
                purchase_date, purchase_cost, current_value, depreciation_rate,
                location, asset_status, condition, warranty_expiry_date,
                last_service_date, next_service_due, notes, is_active,
                created_by, updated_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17, $18,
                $19, $20, $21, $22,
                $23, $23
            ) RETURNING *
        `;

        const values = [
            effectiveCompanyId,
            effectiveBranchId,
            department_id || null,
            assigned_employee_id || null,
            vendor_id || null,
            effectiveAssetTag,
            asset_name.trim(),
            asset_category.trim(),
            brand_model ? brand_model.trim() : null,
            serial_number ? serial_number.trim() : null,
            purchase_date || null,
            cost,
            val,
            depreciation_rate !== undefined && depreciation_rate !== '' ? parseFloat(depreciation_rate) || 0 : 0.00,
            location ? location.trim() : 'Branch Premises',
            asset_status || 'In Use',
            condition || 'Good',
            warranty_expiry_date || null,
            last_service_date || null,
            next_service_due || null,
            notes ? notes.trim() : null,
            is_active !== undefined ? is_active : true,
            createdBy
        ];

        const result = await pool.query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Asset registered successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating asset:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating asset',
            error: error.message
        });
    }
};

// 2. Get all assets with filters
export const getAllAssets = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            asset_category,
            asset_status,
            condition,
            department_id,
            is_active,
            search
        } = req.query;

        let query = `
            SELECT 
                a.*,
                c.company_name,
                b.branch_name,
                d.department_name,
                e.first_name as employee_first_name,
                e.last_name as employee_last_name,
                e.employee_code,
                v.vendor_name,
                v.vendor_code
            FROM assets a
            LEFT JOIN companies c ON a.company_id = c.company_id
            LEFT JOIN branches b ON a.branch_id = b.branch_id
            LEFT JOIN departments d ON a.department_id = d.department_id
            LEFT JOIN employees e ON a.assigned_employee_id = e.employee_id
            LEFT JOIN vendors v ON a.vendor_id = v.vendor_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND a.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (a.branch_id = $${counter} OR a.branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        if (asset_category && asset_category !== 'all') {
            query += ` AND a.asset_category ILIKE $${counter}`;
            values.push(asset_category);
            counter++;
        }

        if (asset_status && asset_status !== 'all') {
            query += ` AND a.asset_status = $${counter}`;
            values.push(asset_status);
            counter++;
        }

        if (condition && condition !== 'all') {
            query += ` AND a.condition = $${counter}`;
            values.push(condition);
            counter++;
        }

        if (department_id && department_id !== 'all') {
            query += ` AND a.department_id = $${counter}`;
            values.push(department_id);
            counter++;
        }

        if (is_active !== undefined && is_active !== 'all') {
            query += ` AND a.is_active = $${counter}`;
            values.push(is_active === 'true' || is_active === true);
            counter++;
        }

        if (search) {
            query += ` AND (
                a.asset_name ILIKE $${counter} OR 
                a.asset_tag ILIKE $${counter} OR 
                a.serial_number ILIKE $${counter} OR 
                a.brand_model ILIKE $${counter} OR 
                a.location ILIKE $${counter} OR
                d.department_name ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY a.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching assets',
            error: error.message
        });
    }
};

// 3. Get single asset details by ID with maintenance & damage history
export const getAssetById = async (req, res) => {
    try {
        const { asset_id } = req.params;

        const assetQuery = `
            SELECT 
                a.*,
                c.company_name,
                b.branch_name,
                d.department_name,
                e.first_name as employee_first_name,
                e.last_name as employee_last_name,
                e.employee_code,
                v.vendor_name,
                v.phone as vendor_phone,
                v.email as vendor_email
            FROM assets a
            LEFT JOIN companies c ON a.company_id = c.company_id
            LEFT JOIN branches b ON a.branch_id = b.branch_id
            LEFT JOIN departments d ON a.department_id = d.department_id
            LEFT JOIN employees e ON a.assigned_employee_id = e.employee_id
            LEFT JOIN vendors v ON a.vendor_id = v.vendor_id
            WHERE a.asset_id = $1
        `;

        const assetRes = await pool.query(assetQuery, [asset_id]);

        if (assetRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Fetch maintenance logs
        const logsRes = await pool.query(`
            SELECT m.*, v.vendor_name 
            FROM asset_maintenance_logs m
            LEFT JOIN vendors v ON m.vendor_id = v.vendor_id
            WHERE m.asset_id = $1
            ORDER BY m.service_date DESC
        `, [asset_id]);

        // Fetch damage & returns logs
        const damageRes = await pool.query(`
            SELECT d.*, v.vendor_name, e.first_name as reported_by_name
            FROM asset_damage_returns d
            LEFT JOIN vendors v ON d.vendor_id = v.vendor_id
            LEFT JOIN employees e ON d.reported_by = e.employee_id
            WHERE d.asset_id = $1
            ORDER BY d.incident_date DESC
        `, [asset_id]);

        return res.status(200).json({
            success: true,
            data: {
                ...assetRes.rows[0],
                maintenance_history: logsRes.rows,
                damage_and_returns: damageRes.rows
            }
        });
    } catch (error) {
        console.error('Error fetching asset by ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 4. Update Asset
export const updateAsset = async (req, res) => {
    try {
        const { asset_id } = req.params;
        const {
            branch_id,
            department_id,
            assigned_employee_id,
            vendor_id,
            asset_tag,
            asset_name,
            asset_category,
            brand_model,
            serial_number,
            purchase_date,
            purchase_cost,
            current_value,
            depreciation_rate,
            location,
            asset_status,
            condition,
            warranty_expiry_date,
            last_service_date,
            next_service_due,
            notes,
            is_active
        } = req.body;

        const updatedBy = req.user?.employee_id || null;

        const check = await pool.query('SELECT * FROM assets WHERE asset_id = $1', [asset_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
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
        addField('department_id', department_id !== undefined ? (department_id || null) : undefined);
        addField('assigned_employee_id', assigned_employee_id !== undefined ? (assigned_employee_id || null) : undefined);
        addField('vendor_id', vendor_id !== undefined ? (vendor_id || null) : undefined);
        addField('asset_tag', asset_tag !== undefined ? asset_tag.trim().toUpperCase() : undefined);
        addField('asset_name', asset_name !== undefined ? asset_name.trim() : undefined);
        addField('asset_category', asset_category !== undefined ? asset_category.trim() : undefined);
        addField('brand_model', brand_model !== undefined ? (brand_model ? brand_model.trim() : null) : undefined);
        addField('serial_number', serial_number !== undefined ? (serial_number ? serial_number.trim() : null) : undefined);
        addField('purchase_date', purchase_date || null);
        addField('purchase_cost', purchase_cost !== undefined ? (parseFloat(purchase_cost) || 0) : undefined);
        addField('current_value', current_value !== undefined ? (parseFloat(current_value) || 0) : undefined);
        addField('depreciation_rate', depreciation_rate !== undefined ? (parseFloat(depreciation_rate) || 0) : undefined);
        addField('location', location !== undefined ? (location ? location.trim() : null) : undefined);
        addField('asset_status', asset_status);
        addField('condition', condition);
        addField('warranty_expiry_date', warranty_expiry_date || null);
        addField('last_service_date', last_service_date || null);
        addField('next_service_due', next_service_due || null);
        addField('notes', notes !== undefined ? (notes ? notes.trim() : null) : undefined);
        addField('is_active', is_active);

        updateFields.push(`updated_by = $${counter}`);
        values.push(updatedBy);
        counter++;

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(asset_id);
        const query = `
            UPDATE assets
            SET ${updateFields.join(', ')}
            WHERE asset_id = $${counter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating asset:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while updating asset',
            error: error.message
        });
    }
};

// 5. Soft delete asset
export const softDeleteAsset = async (req, res) => {
    try {
        const { asset_id } = req.params;

        const query = `
            UPDATE assets
            SET is_active = false, asset_status = 'Disposed / Scrapped', updated_at = CURRENT_TIMESTAMP
            WHERE asset_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [asset_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Asset archived/disposed successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting asset:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 6. Record Maintenance Service Log
export const recordAssetMaintenance = async (req, res) => {
    try {
        const { asset_id } = req.params;
        const {
            service_date,
            service_type, // 'Routine Maintenance', 'Emergency Repair', 'Calibration', 'Inspection'
            vendor_id,
            cost,
            description,
            performed_by,
            next_service_due,
            new_condition,
            update_status_to_active = true
        } = req.body;

        const check = await pool.query('SELECT * FROM assets WHERE asset_id = $1', [asset_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        const asset = check.rows[0];

        const logRes = await pool.query(`
            INSERT INTO asset_maintenance_logs (
                asset_id, company_id, branch_id, service_date,
                service_type, vendor_id, cost, description,
                performed_by, next_service_due
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            asset_id,
            asset.company_id,
            asset.branch_id,
            service_date || new Date().toISOString().split('T')[0],
            service_type || 'Routine Maintenance',
            vendor_id || null,
            cost !== undefined && cost !== '' ? parseFloat(cost) || 0 : 0.00,
            description || null,
            performed_by || null,
            next_service_due || null
        ]);

        // Update asset timestamp & condition
        await pool.query(`
            UPDATE assets
            SET last_service_date = $1,
                next_service_due = COALESCE($2, next_service_due),
                condition = COALESCE($3, condition),
                asset_status = CASE WHEN $4 = true THEN 'In Use' ELSE asset_status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE asset_id = $5
        `, [
            service_date || new Date().toISOString().split('T')[0],
            next_service_due || null,
            new_condition || null,
            update_status_to_active,
            asset_id
        ]);

        return res.status(201).json({
            success: true,
            message: 'Maintenance service recorded successfully',
            data: logRes.rows[0]
        });
    } catch (error) {
        console.error('Error recording asset maintenance:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 7. Record Asset Damage, Breakdown, Warranty Return, or Scrap Disposal
export const recordAssetDamageOrReturn = async (req, res) => {
    try {
        const { asset_id } = req.params;
        const {
            event_type, // 'Damage / Breakdown', 'Return to Vendor (Warranty/RMA)', 'Scrapped / Write-Off', 'Lost / Stolen'
            damage_severity, // 'Minor', 'Moderate', 'Severe / Total Loss', 'Beyond Economical Repair'
            incident_date,
            reason_description,
            action_taken, // 'Sent for Repair', 'Returned to Vendor for Replacement', 'Scrapped & Written Off', 'Insurance Claim Filed'
            salvage_value,
            repair_cost_estimate,
            vendor_id,
            status = 'Under Inspection'
        } = req.body;

        const reportedBy = req.user?.employee_id || null;

        const check = await pool.query('SELECT * FROM assets WHERE asset_id = $1', [asset_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        const asset = check.rows[0];

        const damageRes = await pool.query(`
            INSERT INTO asset_damage_returns (
                asset_id, company_id, branch_id, vendor_id,
                event_type, damage_severity, incident_date,
                reason_description, action_taken, salvage_value,
                repair_cost_estimate, status, reported_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            asset_id,
            asset.company_id,
            asset.branch_id,
            vendor_id || asset.vendor_id || null,
            event_type || 'Damage / Breakdown',
            damage_severity || 'Moderate',
            incident_date || new Date().toISOString().split('T')[0],
            reason_description || null,
            action_taken || 'Sent for Repair',
            salvage_value !== undefined && salvage_value !== '' ? parseFloat(salvage_value) || 0 : 0.00,
            repair_cost_estimate !== undefined && repair_cost_estimate !== '' ? parseFloat(repair_cost_estimate) || 0 : 0.00,
            status,
            reportedBy
        ]);

        // Automatically update asset status & condition based on event
        let newAssetStatus = asset.asset_status;
        let newCondition = asset.condition;

        if (event_type === 'Damage / Breakdown') {
            newAssetStatus = 'Under Maintenance';
            newCondition = damage_severity === 'Severe / Total Loss' ? 'Critical' : 'Needs Repair';
        } else if (event_type === 'Return to Vendor (Warranty/RMA)') {
            newAssetStatus = 'In Storage';
            newCondition = 'Needs Repair';
        } else if (event_type === 'Scrapped / Write-Off') {
            newAssetStatus = 'Disposed / Scrapped';
            newCondition = 'Critical';
        } else if (event_type === 'Lost / Stolen') {
            newAssetStatus = 'Lost';
        }

        await pool.query(`
            UPDATE assets
            SET asset_status = $1, condition = $2, updated_at = CURRENT_TIMESTAMP
            WHERE asset_id = $3
        `, [newAssetStatus, newCondition, asset_id]);

        return res.status(201).json({
            success: true,
            message: `Asset incident '${event_type}' recorded successfully.`,
            data: damageRes.rows[0]
        });
    } catch (error) {
        console.error('Error recording asset damage/return:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while recording asset incident',
            error: error.message
        });
    }
};

// 8. Get All Asset Damage / Returns Logs across branch/company
export const getAllAssetDamageReturns = async (req, res) => {
    try {
        const { company_id, branch_id, event_type, status } = req.query;

        let query = `
            SELECT 
                adr.*,
                a.asset_name,
                a.asset_tag,
                a.asset_category,
                a.brand_model,
                v.vendor_name,
                b.branch_name,
                e.first_name as reported_by_name
            FROM asset_damage_returns adr
            LEFT JOIN assets a ON adr.asset_id = a.asset_id
            LEFT JOIN vendors v ON adr.vendor_id = v.vendor_id
            LEFT JOIN branches b ON adr.branch_id = b.branch_id
            LEFT JOIN employees e ON adr.reported_by = e.employee_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND adr.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND adr.branch_id = $${counter}`;
            values.push(branch_id);
            counter++;
        }

        if (event_type && event_type !== 'all') {
            query += ` AND adr.event_type = $${counter}`;
            values.push(event_type);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND adr.status = $${counter}`;
            values.push(status);
            counter++;
        }

        query += ` ORDER BY adr.incident_date DESC, adr.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching asset damage/returns logs:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 9. Get Asset Summary Metrics
export const getAssetSummaryStats = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_assets,
                COUNT(CASE WHEN asset_status = 'In Use' AND is_active = true THEN 1 END) as in_use_count,
                COUNT(CASE WHEN asset_status = 'Under Maintenance' THEN 1 END) as maintenance_count,
                COUNT(CASE WHEN asset_status = 'Disposed / Scrapped' OR is_active = false THEN 1 END) as disposed_count,
                COUNT(CASE WHEN condition = 'Needs Repair' OR condition = 'Critical' THEN 1 END) as attention_needed_count,
                COALESCE(SUM(purchase_cost), 0) as total_purchase_cost,
                COALESCE(SUM(current_value), 0) as total_current_value,
                (SELECT COALESCE(SUM(cost), 0) FROM asset_maintenance_logs WHERE (company_id = $1 OR $1 IS NULL) AND (branch_id = $2 OR $2 IS NULL)) as total_maintenance_spent
            FROM assets
            WHERE 1=1
        `;

        const values = [
            company_id || null,
            branch_id && branch_id !== 'all' ? branch_id : null
        ];

        if (company_id) {
            query += ` AND company_id = $1`;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (branch_id = $2 OR branch_id IS NULL)`;
        }

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching asset stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
