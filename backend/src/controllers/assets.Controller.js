import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getFixedAssets = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { category, search, status } = req.query;

        let query = `SELECT * FROM fixed_assets WHERE company_code = $1`;
        const params = [companyCode];
        let idx = 2;

        if (category) {
            query += ` AND asset_category = $${idx}`;
            params.push(category);
            idx++;
        }
        if (status === 'active') {
            query += ` AND is_active = true`;
        } else if (status === 'disposed') {
            query += ` AND is_active = false`;
        }
        if (search) {
            query += ` AND (asset_name ILIKE $${idx} OR asset_code ILIKE $${idx} OR location ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY purchase_date DESC, asset_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getFixedAssets error');
        res.status(500).json({ success: false, message: 'Failed to fetch fixed assets' });
    }
};

export const getFixedAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM fixed_assets WHERE asset_id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'getFixedAssetById error');
        res.status(500).json({ success: false, message: 'Failed to fetch asset' });
    }
};

export const createFixedAsset = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            asset_code, asset_name, asset_category = 'Machinery',
            purchase_date, purchase_cost = 0, salvage_value = 0,
            useful_life_years = 10, depreciation_method = 'Straight Line',
            location
        } = req.body;

        if (!asset_name) {
            return res.status(400).json({ success: false, message: 'Asset name is required' });
        }

        let aCode = asset_code;
        if (!aCode) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM fixed_assets WHERE company_code = $1`, [companyCode]);
            aCode = `AST-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const nbv = parseFloat(purchase_cost) - parseFloat(salvage_value || 0);

        const result = await pool.query(`
            INSERT INTO fixed_assets (
                company_code, asset_code, asset_name, asset_category, purchase_date,
                purchase_cost, salvage_value, useful_life_years, depreciation_method,
                accumulated_depreciation, net_book_value, location
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0.00, $10, $11)
            RETURNING *
        `, [
            companyCode, aCode, asset_name, asset_category,
            purchase_date || new Date().toISOString().slice(0, 10),
            purchase_cost, salvage_value, useful_life_years,
            depreciation_method, nbv > 0 ? nbv : purchase_cost, location
        ]);

        res.status(201).json({ success: true, message: 'Fixed asset registered', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createFixedAsset error');
        res.status(500).json({ success: false, message: 'Failed to register asset', error: error.message });
    }
};

export const updateFixedAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { asset_name, asset_category, location, salvage_value, useful_life_years, depreciation_method, is_active } = req.body;

        const result = await pool.query(`
            UPDATE fixed_assets
            SET asset_name = COALESCE($1, asset_name),
                asset_category = COALESCE($2, asset_category),
                location = COALESCE($3, location),
                salvage_value = COALESCE($4, salvage_value),
                useful_life_years = COALESCE($5, useful_life_years),
                depreciation_method = COALESCE($6, depreciation_method),
                is_active = COALESCE($7, is_active)
            WHERE asset_id = $8
            RETURNING *
        `, [asset_name, asset_category, location, salvage_value, useful_life_years, depreciation_method, is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        res.status(200).json({ success: true, message: 'Asset updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateFixedAsset error');
        res.status(500).json({ success: false, message: 'Failed to update asset' });
    }
};

export const disposeFixedAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { disposal_reason } = req.body;

        const result = await pool.query(`
            UPDATE fixed_assets
            SET is_active = false, net_book_value = 0.00
            WHERE asset_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        res.status(200).json({ success: true, message: 'Asset disposed', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'disposeFixedAsset error');
        res.status(500).json({ success: false, message: 'Failed to dispose asset' });
    }
};

export const calculateDepreciation = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';

        const assets = await pool.query(`
            SELECT * FROM fixed_assets WHERE company_code = $1 AND is_active = true
        `, [companyCode]);

        const depreciationSchedule = assets.rows.map(asset => {
            const cost = parseFloat(asset.purchase_cost);
            const salvage = parseFloat(asset.salvage_value);
            const life = parseInt(asset.useful_life_years, 10);
            const accumulated = parseFloat(asset.accumulated_depreciation);

            let annualDep = 0;
            if (asset.depreciation_method === 'Written Down Value') {
                const rate = (1 - Math.pow(salvage / cost, 1 / life)) * 100;
                annualDep = (cost - accumulated) * (rate / 100);
            } else {
                annualDep = (cost - salvage) / life;
            }

            return {
                asset_id: asset.asset_id,
                asset_code: asset.asset_code,
                asset_name: asset.asset_name,
                purchase_cost: cost,
                accumulated_depreciation: accumulated,
                annual_depreciation: Math.round(annualDep * 100) / 100,
                net_book_value: Math.round((cost - accumulated - annualDep) * 100) / 100,
                method: asset.depreciation_method,
                useful_life_years: life
            };
        });

        res.status(200).json({ success: true, data: depreciationSchedule });
    } catch (error) {
        logger.error({ err: error }, 'calculateDepreciation error');
        res.status(500).json({ success: false, message: 'Failed to calculate depreciation' });
    }
};

export const getMaintenanceSchedule = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT machine_id, machine_code, machine_name, make_model, capacity_hours,
                   maintenance_due_date, is_active,
                   CASE WHEN maintenance_due_date <= CURRENT_DATE THEN 'Overdue'
                        WHEN maintenance_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Due Soon'
                        ELSE 'Scheduled' END as maintenance_status
            FROM machine_master
            WHERE company_code = $1
            ORDER BY maintenance_due_date ASC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getMaintenanceSchedule error');
        res.status(500).json({ success: false, message: 'Failed to fetch maintenance schedule' });
    }
};

export const updateMaintenanceDueDate = async (req, res) => {
    try {
        const { id } = req.params;
        const { maintenance_due_date, notes } = req.body;

        const result = await pool.query(`
            UPDATE machine_master
            SET maintenance_due_date = $1
            WHERE machine_id = $2
            RETURNING *
        `, [maintenance_due_date, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Machine not found' });
        }

        res.status(200).json({ success: true, message: 'Maintenance date updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateMaintenanceDueDate error');
        res.status(500).json({ success: false, message: 'Failed to update maintenance date' });
    }
};

export const getCalibrationRecords = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT * FROM equipment_calibration_records WHERE company_code = $1 ORDER BY next_calibration_date ASC
        `, [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getCalibrationRecords error');
        res.status(500).json({ success: false, message: 'Failed to fetch calibration records' });
    }
};
