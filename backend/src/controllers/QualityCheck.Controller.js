import pool from '../config/database.js';

// 1. Get Pending Batches Waiting for Quality Check (including Rework Re-inspections)
export const getPendingBatches = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                pb.*,
                COALESCE(pb.product_id, po.product_id, rmp.product_id) as product_id,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                p.selling_price as product_price,
                COALESCE(po.production_number, rmp.production_code) as production_number,
                COALESCE(po.planned_expense, rmp.total_material_cost, 0) as estimated_cost,
                c.company_name,
                b.branch_name,
                pr.id as rework_id,
                pr.total_rework_cost,
                pr.rework_notes,
                pr.reason as previous_rejection_reason,
                CASE WHEN pb.status = 'REWORK_QC_PENDING' THEN true ELSE false END as is_rework_reinspection
            FROM production_batches pb
            LEFT JOIN production_orders po ON pb.production_order_id = po.id
            LEFT JOIN raw_material_production rmp ON pb.production_id = rmp.production_id
            LEFT JOIN products p ON COALESCE(pb.product_id, po.product_id, rmp.product_id) = p.product_id
            LEFT JOIN companies c ON pb.company_id = c.company_id
            LEFT JOIN branches b ON pb.branch_id = b.branch_id
            LEFT JOIN (
                SELECT DISTINCT ON (production_batch_id) id, production_batch_id, total_rework_cost, rework_notes, reason
                FROM production_rework
                ORDER BY production_batch_id, id DESC
            ) pr ON pb.id = pr.production_batch_id
            WHERE pb.status IN ('PENDING_QC', 'REWORK_QC_PENDING', 'REWORK_NEEDED', 'IN_PRODUCTION')
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND pb.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pb.branch_id = $${counter} OR pb.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        query += ` ORDER BY pb.id DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });

    } catch (error) {
        console.error('Error fetching pending batches for QC:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch pending batches', error: error.message });
    }
};

// 2. Record Quality Check for a Production Batch
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

        // Fetch Production Batch with LEFT JOIN for both production_orders and raw_material_production
        const batchRes = await client.query(`
            SELECT pb.*, 
                   COALESCE(pb.company_id, po.company_id, rmp.company_id) as company_id,
                   COALESCE(pb.branch_id, po.branch_id, rmp.branch_id) as branch_id,
                   COALESCE(pb.product_id, po.product_id, rmp.product_id) as product_id,
                   COALESCE(po.planned_expense, rmp.total_material_cost, 0) as total_mat_cost,
                   COALESCE(pb.produced_quantity, pb.planned_quantity, rmp.production_quantity) as default_prod_qty,
                   p.product_code, p.product_name, p.selling_price
            FROM production_batches pb
            LEFT JOIN production_orders po ON pb.production_order_id = po.id
            LEFT JOIN raw_material_production rmp ON pb.production_id = rmp.production_id
            LEFT JOIN products p ON COALESCE(pb.product_id, po.product_id, rmp.product_id) = p.product_id
            WHERE pb.id = $1
            FOR UPDATE OF pb
        `, [production_batch_id]);

        if (batchRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Production Batch not found.' });
        }

        const batch = batchRes.rows[0];

        // Material cost calculation
        let totalMatCost = parseFloat(batch.total_mat_cost || 0);
        if (batch.production_order_id) {
            const consRes = await client.query(`
                SELECT COALESCE(SUM(total_cost), 0) as total_mat_cost
                FROM production_material_consumptions
                WHERE production_order_id = $1
            `, [batch.production_order_id]);
            totalMatCost = parseFloat(consRes.rows[0].total_mat_cost || totalMatCost);
        }

        const prodQty = parseFloat(batch.produced_quantity || inspQty) || 1;
        const unitProductionCost = totalMatCost / prodQty;

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
                production_id, product_id,
                inspected_quantity, passed_quantity, rework_quantity,
                rejected_quantity, rework_cost, rejection_reason,
                rework_reason, quality_status, checked_by, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const qcRes = await client.query(qcInsertQuery, [
            batch.company_id,
            batch.branch_id,
            batch.id,
            batch.production_id || null,
            batch.product_id || null,
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

        // 1. PASSED QUANTITY: STRICTLY enters Product Stock Inventory
        let productInventoryEntry = null;
        if (passQty > 0) {
            // Check if batch already exists in product_inventory (e.g. from partial or rework)
            const existingInvRes = await client.query(`
                SELECT id, quantity, available_quantity
                FROM product_inventory
                WHERE production_batch_id = $1
            `, [batch.id]);

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
                productInventoryEntry = updatedInv.rows[0];
            } else {
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
        }

        // 2. DEFECTIVE / REJECTED / REWORK QUANTITY: Routes to Rework & Rejection Management
        let reworkEntry = null;
        const totalDefectiveQty = rejQty + rewQty;
        if (totalDefectiveQty > 0) {
            const defectiveReason = rejection_reason || rework_reason || remarks || 'Defects found during QC inspection';
            const rewInsertQuery = `
                INSERT INTO production_rework (
                    company_id, branch_id, production_batch_id,
                    production_id, product_id, quality_check_id,
                    quantity, reason, total_rework_cost, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_DECISION')
                RETURNING *
            `;

            const rewRes = await client.query(rewInsertQuery, [
                batch.company_id,
                batch.branch_id,
                batch.id,
                batch.production_id || null,
                batch.product_id || null,
                qc.id,
                totalDefectiveQty,
                defectiveReason,
                parseFloat(rework_cost) || 0
            ]);
            reworkEntry = rewRes.rows[0];
        }

        // 3. Update Production Batch Status
        let newBatchStatus = 'QC_DONE';
        if (totalDefectiveQty > 0 && passQty === 0) {
            newBatchStatus = 'QC_REJECTED';
        } else if (totalDefectiveQty > 0 && passQty > 0) {
            newBatchStatus = 'QC_PARTIALLY_PASSED';
        }

        await client.query(`
            UPDATE production_batches
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [newBatchStatus, batch.id]);

        // 4. Update raw_material_production status if linked
        if (batch.production_id) {
            let runStatus = 'Approved / In Stock';
            if (passQty === 0) {
                runStatus = 'Rejected by QC';
            } else if (totalDefectiveQty > 0) {
                runStatus = 'Partially Approved';
            }

            await client.query(`
                UPDATE raw_material_production
                SET production_status = $1
                WHERE production_id = $2
            `, [runStatus, batch.production_id]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Quality Check recorded. ${passQty} units approved and added to Product Stock. ${totalDefectiveQty > 0 ? `${totalDefectiveQty} defective units routed to Rework & Rejection Management.` : ''}`,
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

// 3. Send Defective Product to Rework (Adds Rework Cost & Queues for Quality Re-inspection)
export const sendToRework = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { reworkId } = req.params;
        const { rework_cost = 0, rework_notes } = req.body;

        const reworkRes = await client.query(`
            SELECT pr.*, pb.batch_number, pb.id as batch_id, pb.company_id, pb.branch_id
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            WHERE pr.id = $1 FOR UPDATE
        `, [reworkId]);

        if (reworkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Rework record not found.' });
        }

        const rework = reworkRes.rows[0];

        if (rework.status === 'COMPLETED' || rework.status === 'SCRAPPED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Cannot rework an item that is already ${rework.status}.` });
        }

        const cost = parseFloat(rework_cost) || 0;

        // Update Rework Record
        const updatedReworkRes = await client.query(`
            UPDATE production_rework
            SET total_rework_cost = $1,
                rework_notes = $2,
                status = 'IN_REWORK_QC'
            WHERE id = $3
            RETURNING *
        `, [cost, rework_notes || null, reworkId]);

        // Send Batch back to Quality Check for Re-inspection!
        await client.query(`
            UPDATE production_batches
            SET status = 'REWORK_QC_PENDING',
                produced_quantity = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [rework.quantity, rework.batch_id]);

        // Update raw_material_production if applicable
        if (rework.production_id) {
            await client.query(`
                UPDATE raw_material_production
                SET production_status = 'In Rework / Re-QC'
                WHERE production_id = $1
            `, [rework.production_id]);
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Rework initiated for batch "${rework.batch_number}" (${rework.quantity} units, rework cost: ₹${cost.toFixed(2)}). Sent to Quality Check for re-inspection!`,
            data: updatedReworkRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error sending to rework:', error);
        return res.status(500).json({ success: false, message: 'Failed to process rework', error: error.message });
    } finally {
        client.release();
    }
};

// 4. Complete Reject / Scrap Product Permanently
export const scrapRejectedProduct = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { reworkId } = req.params;
        const { scrap_reason } = req.body;

        const reworkRes = await client.query(`
            SELECT pr.*, pb.batch_number, pb.id as batch_id
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            WHERE pr.id = $1 FOR UPDATE
        `, [reworkId]);

        if (reworkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Rework record not found.' });
        }

        const rework = reworkRes.rows[0];

        // Update Rework status to SCRAPPED
        const updatedReworkRes = await client.query(`
            UPDATE production_rework
            SET scrap_reason = $1,
                status = 'SCRAPPED',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [scrap_reason || 'Permanently Scrapped / Beyond Repair', reworkId]);

        // Update Batch status to SCRAPPED
        await client.query(`
            UPDATE production_batches
            SET status = 'SCRAPPED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [rework.batch_id]);

        // Update raw_material_production if applicable
        if (rework.production_id) {
            await client.query(`
                UPDATE raw_material_production
                SET production_status = 'Scrapped'
                WHERE production_id = $1
            `, [rework.production_id]);
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Batch "${rework.batch_number}" (${rework.quantity} units) has been permanently marked as SCRAPPED. It will not enter inventory.`,
            data: updatedReworkRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error scrapping product:', error);
        return res.status(500).json({ success: false, message: 'Failed to scrap product', error: error.message });
    } finally {
        client.release();
    }
};

// 5. Complete Rework directly from Rework tab
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
            SELECT pr.*, pb.batch_number, 
                   COALESCE(pr.product_id, pb.product_id) as product_id,
                   pb.company_id, pb.branch_id
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            WHERE pr.id = $1 FOR UPDATE
        `, [reworkId]);

        if (reworkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Rework record not found.' });
        }

        const rework = reworkRes.rows[0];

        if (rework.status === 'COMPLETED' || rework.status === 'SCRAPPED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `This rework has already been marked as ${rework.status}.` });
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
                total_rework_cost = total_rework_cost + $4,
                status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [addMat, addLab, addOth, totalCost, reworkId]);

        // Passed pieces enter Product Inventory
        let invEntry = null;
        if (passQty > 0) {
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
            message: `Rework completed. ${passQty} units approved and added to Product Inventory.`,
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

// 6. Get all Quality Checks with inspection details
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
                COALESCE(po.production_number, rmp.production_code) as production_number,
                p.product_id,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as checked_by_name
            FROM quality_checks qc
            JOIN production_batches pb ON qc.production_batch_id = pb.id
            LEFT JOIN production_orders po ON pb.production_order_id = po.id
            LEFT JOIN raw_material_production rmp ON COALESCE(qc.production_id, pb.production_id) = rmp.production_id
            LEFT JOIN products p ON COALESCE(qc.product_id, pb.product_id, po.product_id, rmp.product_id) = p.product_id
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

// 7. Get Rework Queue (All Rejected / Rework Products)
export const getAllReworks = async (req, res) => {
    try {
        const { company_id, branch_id, status } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                pr.*,
                pb.batch_number,
                pb.production_date,
                COALESCE(po.production_number, rmp.production_code) as production_number,
                p.product_id,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                p.selling_price as product_price,
                c.company_name,
                b.branch_name,
                qc.inspected_quantity,
                qc.passed_quantity,
                qc.rejected_quantity,
                qc.checked_at as qc_inspection_date,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as qc_inspector_name
            FROM production_rework pr
            JOIN production_batches pb ON pr.production_batch_id = pb.id
            LEFT JOIN production_orders po ON pb.production_order_id = po.id
            LEFT JOIN raw_material_production rmp ON COALESCE(pr.production_id, pb.production_id) = rmp.production_id
            LEFT JOIN products p ON COALESCE(pr.product_id, pb.product_id, po.product_id, rmp.product_id) = p.product_id
            LEFT JOIN quality_checks qc ON pr.quality_check_id = qc.id
            LEFT JOIN employees e ON qc.checked_by = e.employee_id
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
