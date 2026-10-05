import pool from '../config/database.js';

// Helper to generate a unique material code if none provided
const generateMaterialCode = async (companyId) => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `RM-${companyId || 'GEN'}-${randomDigits}`;
};

// 1. Create a new raw material item
export const createRawMaterial = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            material_code,
            material_name,
            category,
            unit_of_measure,
            hsn_code,
            gst_rate,
            unit_price,
            minimum_stock_level,
            reorder_quantity,
            lead_time_days,
            preferred_vendor_id = null,
            description,
            status,
            is_active,
            initial_stock,
            warehouse_location
        } = req.body;

        if (!material_name || !unit_of_measure) {
            return res.status(400).json({
                success: false,
                message: 'Material Name and Unit of Measure (UOM) are required.'
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

        const effectiveMaterialCode = material_code && material_code.trim() !== ''
            ? material_code.trim().toUpperCase()
            : await generateMaterialCode(effectiveCompanyId);

        const query = `
            INSERT INTO raw_materials (
                company_id, branch_id, material_code, material_name,
                category, unit_of_measure, hsn_code, gst_rate,
                unit_price, minimum_stock_level, reorder_quantity,
                lead_time_days, preferred_vendor_id, description,
                status, is_active, created_by, updated_by,
                category_id, code, name, unit, standard_cost, minimum_stock
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17, $17,
                $18, $3, $4, $6, $9, $10
            ) RETURNING *
        `;

        const values = [
            effectiveCompanyId,
            effectiveBranchId,
            effectiveMaterialCode,
            material_name.trim(),
            category ? category.trim() : 'General',
            unit_of_measure.trim(),
            hsn_code ? hsn_code.trim() : null,
            gst_rate !== undefined && gst_rate !== '' ? parseFloat(gst_rate) || 0 : 0.00,
            unit_price !== undefined && unit_price !== '' ? parseFloat(unit_price) || 0 : 0.00,
            minimum_stock_level !== undefined && minimum_stock_level !== '' ? parseFloat(minimum_stock_level) || 0 : 0.00,
            reorder_quantity !== undefined && reorder_quantity !== '' ? parseFloat(reorder_quantity) || 0 : 0.00,
            lead_time_days !== undefined && lead_time_days !== '' ? parseInt(lead_time_days, 10) || 0 : 0,
            preferred_vendor_id || null,
            description ? description.trim() : null,
            status || 'Active',
            is_active !== undefined ? is_active : true,
            createdBy,
            req.body.category_id || null
        ];

        const result = await pool.query(query, values);
        const newMaterial = result.rows[0];

        // Initialize inventory row if branch_id is present and initial_stock > 0
        if (effectiveBranchId) {
            const initialQty = parseFloat(initial_stock) || 0;
            const price = parseFloat(unit_price) || 0;
            const totalVal = initialQty * price;

            if (initialQty > 0) {
                const initBatchNumber = `INIT-${Date.now().toString().slice(-6)}`;
                await pool.query(`
                    INSERT INTO raw_material_inventory (
                        company_id, branch_id, material_id, raw_material_id, warehouse_location,
                        current_stock, allocated_stock, available_stock,
                        average_unit_cost, total_value, last_stock_update,
                        batch_number, received_quantity, available_quantity, reserved_quantity,
                        unit_cost, status
                    ) VALUES ($1, $2, $3, $3, $4, $5, 0, $5, $6, $7, CURRENT_TIMESTAMP, $8, $5, $5, 0, $6, 'AVAILABLE')
                `, [
                    effectiveCompanyId,
                    effectiveBranchId,
                    newMaterial.material_id,
                    warehouse_location || 'Main Storage',
                    initialQty,
                    price,
                    totalVal,
                    initBatchNumber
                ]);
            }

            if (initialQty > 0) {
                await pool.query(`
                    INSERT INTO raw_material_stock_movements (
                        company_id, branch_id, material_id, vendor_id,
                        movement_type, quantity, unit_cost, total_cost,
                        reference_no, notes, performed_by
                    ) VALUES ($1, $2, $3, $4, 'Opening Stock / Initial', $5, $6, $7, 'INIT-STOCK', 'Initial Stock Setup', $8)
                `, [
                    effectiveCompanyId,
                    effectiveBranchId,
                    newMaterial.material_id,
                    preferred_vendor_id || null,
                    initialQty,
                    price,
                    totalVal,
                    createdBy
                ]);
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Raw material created successfully',
            data: newMaterial
        });
    } catch (error) {
        console.error('Error creating raw material:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating raw material',
            error: error.message
        });
    }
};

// 2. Get all raw materials with filters
export const getAllRawMaterials = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            category,
            status,
            is_active,
            search
        } = req.query;

        let query = `
            SELECT 
                rm.*,
                c.company_name,
                b.branch_name,
                v.vendor_name as preferred_vendor_name,
                v.vendor_code as preferred_vendor_code,
                COALESCE(inv.current_stock, 0) as current_stock,
                COALESCE(inv.available_stock, 0) as available_stock,
                inv.warehouse_location,
                COALESCE(inv.total_value, 0) as total_inventory_value
            FROM raw_materials rm
            LEFT JOIN companies c ON rm.company_id = c.company_id
            LEFT JOIN branches b ON rm.branch_id = b.branch_id
            LEFT JOIN vendors v ON rm.preferred_vendor_id = v.vendor_id
            LEFT JOIN (
                SELECT 
                    COALESCE(raw_material_id, material_id) as material_id,
                    branch_id,
                    COALESCE(SUM(available_quantity), SUM(current_stock), 0) as current_stock,
                    COALESCE(SUM(available_quantity - reserved_quantity), SUM(available_stock), 0) as available_stock,
                    MAX(warehouse_location) as warehouse_location,
                    SUM(COALESCE(available_quantity, current_stock, 0) * COALESCE(unit_cost, average_unit_cost, 0)) as total_value
                FROM raw_material_inventory
                WHERE status != 'DEPLETED' AND status != 'EXHAUSTED'
                GROUP BY COALESCE(raw_material_id, material_id), branch_id
            ) inv ON rm.material_id = inv.material_id 
                AND (inv.branch_id = rm.branch_id OR (inv.branch_id = $1 AND $1 IS NOT NULL))
            WHERE 1=1
        `;

        const values = [branch_id && branch_id !== 'all' ? branch_id : null];
        let counter = 2;

        if (company_id) {
            query += ` AND rm.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (rm.branch_id = $${counter} OR rm.branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        if (category && category !== 'all') {
            query += ` AND rm.category ILIKE $${counter}`;
            values.push(category);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND rm.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (is_active !== undefined && is_active !== 'all') {
            query += ` AND rm.is_active = $${counter}`;
            values.push(is_active === 'true' || is_active === true);
            counter++;
        }

        if (search) {
            query += ` AND (
                rm.material_name ILIKE $${counter} OR 
                rm.material_code ILIKE $${counter} OR 
                rm.category ILIKE $${counter} OR 
                rm.hsn_code ILIKE $${counter} OR
                v.vendor_name ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY rm.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching raw materials:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching raw materials',
            error: error.message
        });
    }
};

// 3. Get single raw material by ID
export const getRawMaterialById = async (req, res) => {
    try {
        const { material_id } = req.params;

        const query = `
            SELECT 
                rm.*,
                c.company_name,
                b.branch_name,
                v.vendor_name as preferred_vendor_name,
                v.vendor_code as preferred_vendor_code,
                v.phone as vendor_phone,
                v.email as vendor_email,
                COALESCE(inv.current_stock, 0) as current_stock,
                COALESCE(inv.available_stock, 0) as available_stock,
                inv.warehouse_location,
                COALESCE(inv.total_value, 0) as total_inventory_value
            FROM raw_materials rm
            LEFT JOIN companies c ON rm.company_id = c.company_id
            LEFT JOIN branches b ON rm.branch_id = b.branch_id
            LEFT JOIN vendors v ON rm.preferred_vendor_id = v.vendor_id
            LEFT JOIN (
                SELECT 
                    COALESCE(raw_material_id, material_id) as material_id,
                    branch_id,
                    COALESCE(SUM(available_quantity), SUM(current_stock), 0) as current_stock,
                    COALESCE(SUM(available_quantity - reserved_quantity), SUM(available_stock), 0) as available_stock,
                    MAX(warehouse_location) as warehouse_location,
                    SUM(COALESCE(available_quantity, current_stock, 0) * COALESCE(unit_cost, average_unit_cost, 0)) as total_value
                FROM raw_material_inventory
                WHERE status != 'DEPLETED' AND status != 'EXHAUSTED'
                GROUP BY COALESCE(raw_material_id, material_id), branch_id
            ) inv ON rm.material_id = inv.material_id
            WHERE rm.material_id = $1
        `;

        const result = await pool.query(query, [material_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Raw material not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching raw material:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 4. Update raw material
export const updateRawMaterial = async (req, res) => {
    try {
        const { material_id } = req.params;
        const {
            branch_id,
            material_code,
            material_name,
            category,
            unit_of_measure,
            hsn_code,
            gst_rate,
            unit_price,
            minimum_stock_level,
            reorder_quantity,
            lead_time_days,
            preferred_vendor_id,
            description,
            status,
            is_active
        } = req.body;

        const updatedBy = req.user?.employee_id || null;

        const check = await pool.query('SELECT * FROM raw_materials WHERE material_id = $1', [material_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Raw material not found'
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
        addField('material_code', material_code !== undefined ? material_code.trim().toUpperCase() : undefined);
        addField('material_name', material_name !== undefined ? material_name.trim() : undefined);
        addField('category', category !== undefined ? category.trim() : undefined);
        addField('unit_of_measure', unit_of_measure !== undefined ? unit_of_measure.trim() : undefined);
        addField('hsn_code', hsn_code !== undefined ? (hsn_code ? hsn_code.trim() : null) : undefined);
        addField('gst_rate', gst_rate !== undefined ? (parseFloat(gst_rate) || 0) : undefined);
        addField('unit_price', unit_price !== undefined ? (parseFloat(unit_price) || 0) : undefined);
        addField('minimum_stock_level', minimum_stock_level !== undefined ? (parseFloat(minimum_stock_level) || 0) : undefined);
        addField('reorder_quantity', reorder_quantity !== undefined ? (parseFloat(reorder_quantity) || 0) : undefined);
        addField('lead_time_days', lead_time_days !== undefined ? (parseInt(lead_time_days, 10) || 0) : undefined);
        addField('preferred_vendor_id', preferred_vendor_id !== undefined ? (preferred_vendor_id || null) : undefined);
        addField('description', description !== undefined ? (description ? description.trim() : null) : undefined);
        addField('status', status);
        addField('is_active', is_active);

        updateFields.push(`updated_by = $${counter}`);
        values.push(updatedBy);
        counter++;

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(material_id);
        const query = `
            UPDATE raw_materials
            SET ${updateFields.join(', ')}
            WHERE material_id = $${counter}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: 'Raw material updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating raw material:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 5. Soft delete / deactive raw material
export const softDeleteRawMaterial = async (req, res) => {
    try {
        const { material_id } = req.params;

        const query = `
            UPDATE raw_materials
            SET is_active = false, status = 'Inactive', updated_at = CURRENT_TIMESTAMP
            WHERE material_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [material_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Raw material not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Raw material deactivated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deactivating raw material:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 6. Restore raw material
export const restoreRawMaterial = async (req, res) => {
    try {
        const { material_id } = req.params;

        const query = `
            UPDATE raw_materials
            SET is_active = true, status = 'Active', updated_at = CURRENT_TIMESTAMP
            WHERE material_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [material_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Raw material not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Raw material restored successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restoring raw material:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 7. Get raw material categories
export const getRawMaterialCategories = async (req, res) => {
    try {
        const { company_id } = req.query;
        let query = `
            SELECT DISTINCT category 
            FROM raw_materials 
            WHERE category IS NOT NULL AND category != ''
        `;
        const values = [];
        if (company_id) {
            query += ` AND company_id = $1`;
            values.push(company_id);
        }
        query += ` ORDER BY category ASC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: result.rows.map(r => r.category)
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
