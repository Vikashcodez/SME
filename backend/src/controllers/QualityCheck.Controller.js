import pool from '../config/database.js';

// 1. Record Quality Check for a Production Batch
export const recordQualityCheck = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            production_batch_id,
            inspected_quantity,
            passed_quantity = 0,
            rework_quantity = 0,
            rejected_quantity = 0,
            rework_cost = 0,
            rejection_reason,
            rework_reason,
            remarks,
            items = [] // Checklist parameters: [{ parameter_name, specification, actual_value, result, remarks }]
        } = req.body;

        const checkedBy = req.user?.employee_id || null;

        if (!production_batch_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Production Batch ID is required.' });
        }

        const inspQty = parseFloat(inspected_quantity);
        const passQty = parseFloat(passed_quantity) || 0;
        const rewQty = parseFloat(rework_quantity) || 0;
        const rejQty = parseFloat(rejected_quantity) || 0;

        if (isNaN(inspQty) || inspQty <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Valid inspected quantity (> 0) is required.' });
        }

        if (Math.abs((passQty + rewQty + rejQty) - inspQty) > 0.001) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Sum of Passed (${passQty}), Rework (${rewQty}), and Rejected (${rejQty}) must equal Inspected Quantity (${inspQty}).`
            });
        }

        // Fetch Production Batch & Order & Product
        const batchRes = await client.query(`
            SELECT pb.*, po.company_id, po.branch_id, po.product_id, po.planned_expense, po.planned_quantity,
                   p.product_code, p.product_name, p.selling_price
            FROM production_batches pb
            JOIN production_orders po ON pb.production_order_id = po.id
            JOIN products p ON po.product_id = p.product_id
            WHERE pb.id = $1
            FOR UPDATE
        `, [production_batch_id]);

        if (batchRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Production Batch not found.' });
        }

        const batch = batchRes.rows[0];

        // Calculate material cost per unit from actual consumptions
        const consRes = await client.query(`
            SELECT COALESCE(SUM(total_cost), 0) as total_mat_cost
            FROM production_material_consumptions
            WHERE production_order_id = $1
        `, [batch.production_order_id]);

        const totalMatCost = parseFloat(consRes.rows[0].total_mat_cost || 0);
        const plannedExp = parseFloat(batch.planned_expense || 0);
        const prodQty = parseFloat(batch.produced_quantity || inspQty) || 1;
        const unitProductionCost = (totalMatCost + plannedExp) / prodQty;

        // Determine quality status
        let qualityStatus = 'PASSED';
        if (rejQty > 0 && passQty === 0 && rewQty === 0) {
            qualityStatus = 'REJECTED';
        } else if (rewQty > 0) {
            qualityStatus = 'REWORK';
        } else if (rejQty > 0 || passQty < inspQty) {
            qualityStatus = 'PARTIALLY_PASSED';
        }

        // Insert Quality Check Header
        const qcInsertQuery = `
            INSERT INTO quality_checks (
                company_id, branch_id, production_batch_id,
                inspected_quantity, passed_quantity, rework_quantity,
                rejected_quantity, rework_cost, rejection_reason,
                rework_reason, quality_status, checked_by, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const qcRes = await client.query(qcInsertQuery, [
            batch.company_id,
            batch.branch_id,
            batch.id,
            inspQty,
            passQty,
            rewQty,
            rejQty,
            parseFloat(rework_cost) || 0,
            rejection_reason || null,
            rework_reason || null,
            qualityStatus,
            checkedBy,
            remarks || null
        ]);

        const qc = qcRes.rows[0];

        // Insert Quality Check Parameter Items if provided
        let parsedItems = Array.isArray(items) ? items : [];
        if (typeof items === 'string') {
            try { parsedItems = JSON.parse(items); } catch (e) { parsedItems = []; }
        }

        const createdItems = [];
        for (const item of parsedItems) {
            if (!item.parameter_name) continue;
            const itemRes = await client.query(`
                INSERT INTO quality_check_items (
                    quality_check_id, parameter_name, specification,
                    actual_value, result, remarks
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                qc.id,
                item.parameter_name,
                item.specification || null,
                item.actual_value || null,
                item.result || 'PASS',
                item.remarks || null
            ]);
            createdItems.push(itemRes.rows[0]);
        }

        // AUTOMATIC FLOW 1: PASSED QUANTITY -> enters Product Inventory
        let productInventoryEntry = null;
        if (passQty > 0) {
            const invInsertQuery = `
                INSERT INTO product_inventory (
                    company_id, branch_id, product_id,
                    production_batch_id, batch_number, quantity,
                    available_quantity, reserved_quantity, unit_cost,
                    manufacturing_date, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, CURRENT_DATE, 'AVAILABLE')
                RETURNING *
            `;

            const invRes = await client.query(invInsertQuery, [
                batch.company_id,
                batch.branch_id,
                batch.product_id,
                batch.id,
                batch.batch_number,
                passQty,
                passQty,
                unitProductionCost
            ]);
            productInventoryEntry = invRes.rows[0];
        }

        // AUTOMATIC FLOW 2: REWORK QUANTITY -> enters Production Rework
        let reworkEntry = null;
        if (rewQty > 0) {
            const rewInsertQuery = `
                INSERT INTO production_rework (
                    company_id, branch_id, production_batch_id,
                    quality_check_id, quantity, reason,
                    total_rework_cost, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'IN_REWORK')
                RETURNING *
            `;

            const rewRes = await client.query(rewInsertQuery, [
                batch.company_id,
                batch.branch_id,
                batch.id,
                qc.id,
                rewQty,
                rework_reason || 'Identified during QC inspection',
                parseFloat(rework_cost) || 0
            ]);
            reworkEntry = rewRes.rows[0];
        }

        // Update Production Batch Status
        const newBatchStatus = rewQty > 0 ? 'REWORK_NEEDED' : 'QC_DONE';
        await client.query(`
            UPDATE production_batches
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [newBatchStatus, batch.id]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Quality Check recorded. ${passQty} units added to Product Inventory. ${rewQty} sent to Rework.`,
            data: {
                quality_check: qc,
                items: createdItems,
                product_inventory: productInventoryEntry,
                rework: reworkEntry
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording quality check:', error);
        return res.status(500).json({ success: false, message: 'Failed to record Quality Check', error: error.message });
    } finally {
        client.release();
    }
};

// 2. Complete Rework & Re-QC into Product Inventory
export const completeRework = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { reworkId } = req.params;
        const {
            passed_quantity,
            rejected_quantity = 0,
            additional_material_cost = 0,
            additional_labor_cost = 0,
            other_cost = 0
        } = req.body;

        const reworkRes = await client.query(`
            SELECT pr.*, pb.batch_number, pb.product_id, pb.company_id, pb.branch_id
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            WHERE pr.id = $1 FOR UPDATE
        `, [reworkId]);

        if (reworkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Rework record not found.' });
        }

        const rework = reworkRes.rows[0];
        if (rework.status === 'COMPLETED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'This rework has already been completed.' });
        }

        const passQty = parseFloat(passed_quantity) || 0;
        const rejQty = parseFloat(rejected_quantity) || 0;
        const reworkQty = parseFloat(rework.quantity);

        if (passQty + rejQty > reworkQty + 0.001) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Sum of passed (${passQty}) and rejected (${rejQty}) cannot exceed total rework quantity (${reworkQty}).`
            });
        }

        const addMat = parseFloat(additional_material_cost) || 0;
        const addLab = parseFloat(additional_labor_cost) || 0;
        const addOth = parseFloat(other_cost) || 0;
        const totalCost = addMat + addLab + addOth;

        // Update Rework status
        await client.query(`
            UPDATE production_rework SET
                additional_material_cost = $1,
                additional_labor_cost = $2,
                other_cost = $3,
                total_rework_cost = $4,
                status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [addMat, addLab, addOth, totalCost, reworkId]);

        // Passed pieces enter Product Inventory!
        let invEntry = null;
        if (passQty > 0) {
            // Check if product inventory entry for this batch already exists
            const existingInvRes = await client.query(`
                SELECT id, quantity, available_quantity
                FROM product_inventory
                WHERE production_batch_id = $1
            `, [rework.production_batch_id]);

            if (existingInvRes.rows.length > 0) {
                const existing = existingInvRes.rows[0];
                const updatedInv = await client.query(`
                    UPDATE product_inventory
                    SET quantity = quantity + $1,
                        available_quantity = available_quantity + $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING *
                `, [passQty, existing.id]);
                invEntry = updatedInv.rows[0];
            } else {
                const newInv = await client.query(`
                    INSERT INTO product_inventory (
                        company_id, branch_id, product_id,
                        production_batch_id, batch_number, quantity,
                        available_quantity, reserved_quantity, manufacturing_date, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_DATE, 'AVAILABLE')
                    RETURNING *
                `, [
                    rework.company_id,
                    rework.branch_id,
                    rework.product_id,
                    rework.production_batch_id,
                    rework.batch_number,
                    passQty,
                    passQty
                ]);
                invEntry = newInv.rows[0];
            }
        }

        // Update Batch status to QC_DONE
        await client.query(`
            UPDATE production_batches
            SET status = 'QC_DONE',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [rework.production_batch_id]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Rework completed. ${passQty} units passed and added to Product Inventory.`,
            data: invEntry
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completing rework:', error);
        return res.status(500).json({ success: false, message: 'Failed to complete rework', error: error.message });
    } finally {
        client.release();
    }
};

// 3. Get all Quality Checks with inspection details
export const getAllQualityChecks = async (req, res) => {
    try {
        const { company_id, branch_id, quality_status, batch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                qc.*,
                pb.batch_number,
                pb.production_date,
                po.production_number,
                p.product_id,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as checked_by_name
            FROM quality_checks qc
            JOIN production_batches pb ON qc.production_batch_id = pb.id
            JOIN production_orders po ON pb.production_order_id = po.id
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN companies c ON qc.company_id = c.company_id
            LEFT JOIN branches b ON qc.branch_id = b.branch_id
            LEFT JOIN employees e ON qc.checked_by = e.employee_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND qc.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (qc.branch_id = $${counter} OR qc.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (quality_status && quality_status !== 'all') {
            query += ` AND qc.quality_status = $${counter}`;
            values.push(quality_status);
            counter++;
        }

        if (batch_id) {
            query += ` AND qc.production_batch_id = $${counter}`;
            values.push(batch_id);
            counter++;
        }

        query += ` ORDER BY qc.id DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });

    } catch (error) {
        console.error('Error fetching quality checks:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch Quality Checks', error: error.message });
    }
};

// 4. Get Rework Queue
export const getAllReworks = async (req, res) => {
    try {
        const { company_id, branch_id, status } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                pr.*,
                pb.batch_number,
                po.production_number,
                p.product_id,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                c.company_name,
                b.branch_name
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            JOIN production_orders po ON pb.production_order_id = po.id
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN companies c ON pr.company_id = c.company_id
            LEFT JOIN branches b ON pr.branch_id = b.branch_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND pr.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pr.branch_id = $${counter} OR pr.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND pr.status = $${counter}`;
            values.push(status);
            counter++;
        }

        query += ` ORDER BY pr.id DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });

    } catch (error) {
        console.error('Error fetching reworks:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch reworks', error: error.message });
    }
};
