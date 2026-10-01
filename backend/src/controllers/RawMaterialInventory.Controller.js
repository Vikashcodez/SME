import pool from '../config/database.js';

// 1. Get Live Inventory Overview by branch/company
export const getInventoryOverview = async (req, res) => {
    try {
        const { company_id, branch_id, category, stock_status, search } = req.query;

        let query = `
            SELECT 
                rm.material_id,
                rm.material_code,
                rm.material_name,
                rm.category,
                rm.unit_of_measure,
                rm.hsn_code,
                rm.gst_rate,
                rm.unit_price,
                rm.minimum_stock_level,
                rm.reorder_quantity,
                rm.lead_time_days,
                v.vendor_name as preferred_vendor_name,
                c.company_name,
                b.branch_name,
                COALESCE(inv.inventory_id, 0) as inventory_id,
                COALESCE(inv.branch_id, rm.branch_id) as branch_id,
                COALESCE(inv.warehouse_location, 'Main Store') as warehouse_location,
                COALESCE(inv.current_stock, 0) as current_stock,
                COALESCE(inv.allocated_stock, 0) as allocated_stock,
                COALESCE(inv.available_stock, 0) as available_stock,
                COALESCE(inv.average_unit_cost, rm.unit_price) as average_unit_cost,
                COALESCE(inv.total_value, (COALESCE(inv.current_stock, 0) * rm.unit_price)) as total_value,
                inv.last_stock_update,
                CASE 
                    WHEN COALESCE(inv.current_stock, 0) <= 0 THEN 'Out of Stock'
                    WHEN COALESCE(inv.current_stock, 0) <= rm.minimum_stock_level THEN 'Low Stock'
                    ELSE 'In Stock'
                END as stock_status
            FROM raw_materials rm
            LEFT JOIN companies c ON rm.company_id = c.company_id
            LEFT JOIN branches b ON rm.branch_id = b.branch_id
            LEFT JOIN vendors v ON rm.preferred_vendor_id = v.vendor_id
            LEFT JOIN raw_material_inventory inv ON rm.material_id = inv.material_id 
                AND (inv.branch_id = $1 OR $1 IS NULL)
            WHERE rm.is_active = true
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

        if (search) {
            query += ` AND (
                rm.material_name ILIKE $${counter} OR 
                rm.material_code ILIKE $${counter} OR 
                rm.category ILIKE $${counter} OR
                v.vendor_name ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        if (stock_status && stock_status !== 'all') {
            if (stock_status === 'Low Stock') {
                query += ` AND COALESCE(inv.current_stock, 0) > 0 AND COALESCE(inv.current_stock, 0) <= rm.minimum_stock_level`;
            } else if (stock_status === 'Out of Stock') {
                query += ` AND COALESCE(inv.current_stock, 0) <= 0`;
            } else if (stock_status === 'In Stock') {
                query += ` AND COALESCE(inv.current_stock, 0) > rm.minimum_stock_level`;
            }
        }

        query += ` ORDER BY stock_status ASC, rm.material_name ASC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching inventory overview:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching inventory overview',
            error: error.message
        });
    }
};

// 2. Record Stock Movement (Stock IN / GRN, Stock OUT, Adjustment, Return) - with Invoice & Asset Support
export const recordStockMovement = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            company_id,
            branch_id,
            material_id,
            asset_id: existing_asset_id,
            item_type = 'Raw Material', // 'Raw Material' | 'Asset'
            create_asset_master,
            asset_name,
            asset_category,
            asset_tag,
            asset_location,
            brand_model,
            serial_number,
            department_id,
            assigned_employee_id,
            vendor_id,
            movement_type = 'Stock In / GRN',
            quantity,
            unit_cost,
            warehouse_location,
            reference_no,
            batch_no,
            invoice_number,
            invoice_date,
            notes
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;
        const performedBy = req.user?.employee_id || null;

        // Invoice URL from file upload if present, or from body
        let invoice_url = req.body.invoice_url || null;
        if (req.file) {
            invoice_url = `/uploads/invoices/${req.file.filename}`;
        }

        if (!effectiveCompanyId || !effectiveBranchId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and Branch ID are required.'
            });
        }

        const qty = parseFloat(quantity) || 1;
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number.'
            });
        }

        await client.query('BEGIN');

        // ==========================================
        // CASE A: ASSET INWARD / ASSET GRN
        // ==========================================
        if (item_type === 'Asset') {
            let targetAssetId = existing_asset_id || null;

            // If creating a new asset master or registering new asset
            if (create_asset_master || (!targetAssetId && asset_name)) {
                if (!asset_name || !asset_category) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Asset Name and Asset Category are required to create an Asset Master.'
                    });
                }

                const tag = asset_tag && asset_tag.trim() !== ''
                    ? asset_tag.trim().toUpperCase()
                    : `AST-${(asset_category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

                const cost = unit_cost !== undefined && unit_cost !== '' ? parseFloat(unit_cost) || 0 : 0.00;

                const createAssetQuery = `
                    INSERT INTO assets (
                        company_id, branch_id, department_id, assigned_employee_id, vendor_id,
                        asset_tag, asset_name, asset_category, brand_model, serial_number,
                        purchase_date, purchase_cost, current_value, location,
                        asset_status, condition, invoice_number, invoice_date, invoice_url,
                        notes, is_active, created_by, updated_by
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, $10,
                        $11, $12, $12, $13,
                        'In Use', 'Excellent', $14, $15, $16,
                        $17, true, $18, $18
                    ) RETURNING *
                `;

                const assetRes = await client.query(createAssetQuery, [
                    effectiveCompanyId,
                    effectiveBranchId,
                    department_id || null,
                    assigned_employee_id || null,
                    vendor_id || null,
                    tag,
                    asset_name.trim(),
                    asset_category.trim(),
                    brand_model ? brand_model.trim() : null,
                    serial_number ? serial_number.trim() : null,
                    invoice_date || new Date().toISOString().split('T')[0],
                    cost,
                    asset_location || warehouse_location || 'Branch Floor',
                    invoice_number || null,
                    invoice_date || null,
                    invoice_url,
                    notes || 'Asset received via GRN Inward',
                    performedBy
                ]);

                targetAssetId = assetRes.rows[0].asset_id;
            }

            const totalCost = qty * (parseFloat(unit_cost) || 0);

            // Insert Movement log for Asset Inward
            const movResult = await client.query(`
                INSERT INTO raw_material_stock_movements (
                    company_id, branch_id, material_id, asset_id, vendor_id,
                    movement_type, item_type, quantity, unit_cost, total_cost,
                    reference_no, batch_no, invoice_number, invoice_date, invoice_url,
                    notes, performed_by
                ) VALUES ($1, $2, NULL, $3, $4, $5, 'Asset', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `, [
                effectiveCompanyId,
                effectiveBranchId,
                targetAssetId,
                vendor_id || null,
                movement_type || 'Stock In / GRN',
                qty,
                parseFloat(unit_cost) || 0,
                totalCost,
                reference_no || null,
                batch_no || null,
                invoice_number || null,
                invoice_date || null,
                invoice_url,
                notes || null,
                performedBy
            ]);

            await client.query('COMMIT');

            return res.status(200).json({
                success: true,
                message: `Asset received and registered in inventory successfully.`,
                data: {
                    movement: movResult.rows[0],
                    asset_id: targetAssetId,
                    item_type: 'Asset'
                }
            });
        }

        // ==========================================
        // CASE B: RAW MATERIAL INWARD / GRN
        // ==========================================
        if (!material_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Raw Material selection is required.'
            });
        }

        // Fetch material default info
        const matRes = await client.query('SELECT * FROM raw_materials WHERE material_id = $1', [material_id]);
        if (matRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Material not found.' });
        }
        const material = matRes.rows[0];
        const costPerUnit = unit_cost !== undefined && unit_cost !== '' ? parseFloat(unit_cost) || 0 : parseFloat(material.unit_price) || 0;

        // Fetch current inventory record or create if missing
        let invRes = await client.query(
            'SELECT * FROM raw_material_inventory WHERE branch_id = $1 AND material_id = $2 FOR UPDATE',
            [effectiveBranchId, material_id]
        );

        let currentStock = 0;
        let avgCost = costPerUnit;

        if (invRes.rows.length === 0) {
            await client.query(`
                INSERT INTO raw_material_inventory (
                    company_id, branch_id, material_id, warehouse_location,
                    current_stock, allocated_stock, available_stock,
                    average_unit_cost, total_value, last_stock_update
                ) VALUES ($1, $2, $3, $4, 0, 0, 0, $5, 0, CURRENT_TIMESTAMP)
            `, [
                effectiveCompanyId,
                effectiveBranchId,
                material_id,
                warehouse_location || 'Main Storage',
                avgCost
            ]);
            currentStock = 0;
        } else {
            currentStock = parseFloat(invRes.rows[0].current_stock) || 0;
            avgCost = parseFloat(invRes.rows[0].average_unit_cost) || costPerUnit;
        }

        let newStock = currentStock;
        let totalCost = qty * costPerUnit;

        if (movement_type === 'Stock In / GRN') {
            newStock = currentStock + qty;
            const totalExistingVal = currentStock * avgCost;
            const totalNewVal = totalExistingVal + (qty * costPerUnit);
            avgCost = newStock > 0 ? (totalNewVal / newStock) : costPerUnit;
        } else if (movement_type === 'Stock Out / Issue' || movement_type === 'Return to Vendor') {
            if (currentStock < qty) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock. Current stock is ${currentStock} ${material.unit_of_measure}, requested: ${qty}.`
                });
            }
            newStock = currentStock - qty;
        } else if (movement_type === 'Stock Adjustment') {
            newStock = qty;
            totalCost = Math.abs(newStock - currentStock) * avgCost;
        }

        const totalInventoryValue = newStock * avgCost;

        // Update inventory record
        await client.query(`
            UPDATE raw_material_inventory
            SET current_stock = $1,
                available_stock = $1 - allocated_stock,
                average_unit_cost = $2,
                total_value = $3,
                warehouse_location = COALESCE($4, warehouse_location),
                last_stock_update = CURRENT_TIMESTAMP
            WHERE branch_id = $5 AND material_id = $6
        `, [
            newStock,
            avgCost,
            totalInventoryValue,
            warehouse_location || null,
            effectiveBranchId,
            material_id
        ]);

        // Insert Stock Movement audit log with invoice information
        const movResult = await client.query(`
            INSERT INTO raw_material_stock_movements (
                company_id, branch_id, material_id, asset_id, vendor_id,
                movement_type, item_type, quantity, unit_cost, total_cost,
                reference_no, batch_no, invoice_number, invoice_date, invoice_url,
                notes, performed_by
            ) VALUES ($1, $2, $3, NULL, $4, $5, 'Raw Material', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            effectiveCompanyId,
            effectiveBranchId,
            material_id,
            vendor_id || material.preferred_vendor_id || null,
            movement_type,
            qty,
            costPerUnit,
            totalCost,
            reference_no || null,
            batch_no || null,
            invoice_number || null,
            invoice_date || null,
            invoice_url,
            notes || null,
            performedBy
        ]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Stock movement '${movement_type}' recorded successfully.`,
            data: {
                movement: movResult.rows[0],
                updated_stock: newStock,
                unit_of_measure: material.unit_of_measure
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording stock movement:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while recording stock movement',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 3. Get Stock Movements Audit Trail / Ledger (With Asset & Invoice Data)
export const getStockMovements = async (req, res) => {
    try {
        const { company_id, branch_id, material_id, asset_id, item_type, movement_type, limit = 100 } = req.query;

        let query = `
            SELECT 
                sm.*,
                COALESCE(rm.material_name, a.asset_name) as item_display_name,
                COALESCE(rm.material_code, a.asset_tag) as item_code,
                rm.unit_of_measure,
                COALESCE(rm.category, a.asset_category) as category,
                a.asset_name,
                a.asset_tag,
                a.location as asset_location,
                v.vendor_name,
                b.branch_name,
                e.first_name as performed_by_name,
                e.employee_code as performed_by_code
            FROM raw_material_stock_movements sm
            LEFT JOIN raw_materials rm ON sm.material_id = rm.material_id
            LEFT JOIN assets a ON sm.asset_id = a.asset_id
            LEFT JOIN vendors v ON sm.vendor_id = v.vendor_id
            LEFT JOIN branches b ON sm.branch_id = b.branch_id
            LEFT JOIN employees e ON sm.performed_by = e.employee_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND sm.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND sm.branch_id = $${counter}`;
            values.push(branch_id);
            counter++;
        }

        if (material_id) {
            query += ` AND sm.material_id = $${counter}`;
            values.push(material_id);
            counter++;
        }

        if (asset_id) {
            query += ` AND sm.asset_id = $${counter}`;
            values.push(asset_id);
            counter++;
        }

        if (item_type && item_type !== 'all') {
            query += ` AND sm.item_type = $${counter}`;
            values.push(item_type);
            counter++;
        }

        if (movement_type && movement_type !== 'all') {
            query += ` AND sm.movement_type = $${counter}`;
            values.push(movement_type);
            counter++;
        }

        query += ` ORDER BY sm.created_at DESC LIMIT $${counter}`;
        values.push(parseInt(limit, 10) || 100);

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching stock movements',
            error: error.message
        });
    }
};

// 4. Record Damage, Quality Rejection or Vendor Return
export const recordRawMaterialReturn = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            company_id,
            branch_id,
            material_id,
            vendor_id,
            return_type, // 'Damaged in Transit', 'Defective / Quality Rejected', 'Expired Stock', 'Handling Damage', 'Excess Return'
            quantity,
            unit_cost,
            action_taken, // 'Return to Vendor / RMA', 'Scrapped / Written Off', 'Credit Note Requested', 'Replacement Received'
            reference_no,
            batch_no,
            reason_notes,
            deduct_from_stock = true
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;
        const reportedBy = req.user?.employee_id || null;

        if (!effectiveCompanyId || !effectiveBranchId || !material_id || !return_type || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Company, Branch, Material, Return Type, and Quantity are required.'
            });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number.'
            });
        }

        await client.query('BEGIN');

        // Material info
        const matRes = await client.query('SELECT * FROM raw_materials WHERE material_id = $1', [material_id]);
        if (matRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Material not found.' });
        }
        const material = matRes.rows[0];
        const costPerUnit = unit_cost !== undefined && unit_cost !== '' ? parseFloat(unit_cost) || 0 : parseFloat(material.unit_price) || 0;
        const totalLoss = qty * costPerUnit;

        // Insert into raw_material_returns
        const returnRes = await client.query(`
            INSERT INTO raw_material_returns (
                company_id, branch_id, material_id, vendor_id,
                return_type, quantity, unit_cost, total_loss_value,
                action_taken, reference_no, batch_no, reason_notes,
                reported_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Approved')
            RETURNING *
        `, [
            effectiveCompanyId,
            effectiveBranchId,
            material_id,
            vendor_id || material.preferred_vendor_id || null,
            return_type,
            qty,
            costPerUnit,
            totalLoss,
            action_taken || 'Return to Vendor / RMA',
            reference_no || null,
            batch_no || null,
            reason_notes || null,
            reportedBy
        ]);

        // If deduct_from_stock is true, reduce stock in inventory
        if (deduct_from_stock) {
            const invRes = await client.query(
                'SELECT * FROM raw_material_inventory WHERE branch_id = $1 AND material_id = $2 FOR UPDATE',
                [effectiveBranchId, material_id]
            );

            if (invRes.rows.length > 0) {
                const currentStock = parseFloat(invRes.rows[0].current_stock) || 0;
                const newStock = Math.max(0, currentStock - qty);
                const avgCost = parseFloat(invRes.rows[0].average_unit_cost) || costPerUnit;

                await client.query(`
                    UPDATE raw_material_inventory
                    SET current_stock = $1,
                        available_stock = $1 - allocated_stock,
                        total_value = $1 * $2,
                        last_stock_update = CURRENT_TIMESTAMP
                    WHERE branch_id = $3 AND material_id = $4
                `, [newStock, avgCost, effectiveBranchId, material_id]);

                // Create movement log
                await client.query(`
                    INSERT INTO raw_material_stock_movements (
                        company_id, branch_id, material_id, vendor_id,
                        movement_type, quantity, unit_cost, total_cost,
                        reference_no, batch_no, notes, performed_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    effectiveCompanyId,
                    effectiveBranchId,
                    material_id,
                    vendor_id || material.preferred_vendor_id || null,
                    action_taken === 'Scrapped / Written Off' ? 'Damaged / Scrapped' : 'Return to Vendor',
                    qty,
                    costPerUnit,
                    totalLoss,
                    reference_no || 'RET-LOG',
                    batch_no || null,
                    reason_notes || `Damage / Return: ${return_type}`,
                    reportedBy
                ]);
            }
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Raw material return / damage recorded successfully.',
            data: returnRes.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording raw material return:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while recording raw material return',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 5. Get All Raw Material Returns & Damaged Stock Records
export const getRawMaterialReturns = async (req, res) => {
    try {
        const { company_id, branch_id, material_id, return_type, status } = req.query;

        let query = `
            SELECT 
                r.*,
                rm.material_name,
                rm.material_code,
                rm.unit_of_measure,
                rm.category,
                v.vendor_name,
                v.vendor_code,
                b.branch_name,
                e.first_name as reported_by_name
            FROM raw_material_returns r
            LEFT JOIN raw_materials rm ON r.material_id = rm.material_id
            LEFT JOIN vendors v ON r.vendor_id = v.vendor_id
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            LEFT JOIN employees e ON r.reported_by = e.employee_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND r.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND r.branch_id = $${counter}`;
            values.push(branch_id);
            counter++;
        }

        if (material_id) {
            query += ` AND r.material_id = $${counter}`;
            values.push(material_id);
            counter++;
        }

        if (return_type && return_type !== 'all') {
            query += ` AND r.return_type = $${counter}`;
            values.push(return_type);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND r.status = $${counter}`;
            values.push(status);
            counter++;
        }

        query += ` ORDER BY r.created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching material returns:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 6. Update Material Return Status
export const updateReturnStatus = async (req, res) => {
    try {
        const { return_id } = req.params;
        const { status, action_taken, reason_notes } = req.body;

        const result = await pool.query(`
            UPDATE raw_material_returns
            SET status = COALESCE($1, status),
                action_taken = COALESCE($2, action_taken),
                reason_notes = COALESCE($3, reason_notes)
            WHERE return_id = $4
            RETURNING *
        `, [status, action_taken, reason_notes, return_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Return record not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Return status updated successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating return status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// 7. Get Summary Inventory Metrics
export const getInventorySummaryStats = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;

        let query = `
            SELECT 
                COUNT(DISTINCT rm.material_id) as total_materials,
                COUNT(CASE WHEN COALESCE(inv.current_stock, 0) <= 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN COALESCE(inv.current_stock, 0) > 0 AND COALESCE(inv.current_stock, 0) <= rm.minimum_stock_level THEN 1 END) as low_stock_count,
                COALESCE(SUM(inv.total_value), 0) as total_valuation,
                (SELECT COALESCE(SUM(total_loss_value), 0) FROM raw_material_returns WHERE (company_id = $1 OR $1 IS NULL) AND (branch_id = $2 OR $2 IS NULL)) as total_damage_loss
            FROM raw_materials rm
            LEFT JOIN raw_material_inventory inv ON rm.material_id = inv.material_id 
                AND (inv.branch_id = $2 OR $2 IS NULL)
            WHERE rm.is_active = true
        `;

        const values = [
            company_id || null,
            branch_id && branch_id !== 'all' ? branch_id : null
        ];

        if (company_id) {
            query += ` AND rm.company_id = $1`;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (rm.branch_id = $2 OR rm.branch_id IS NULL)`;
        }

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching inventory summary stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
