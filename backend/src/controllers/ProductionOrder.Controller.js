import pool from '../config/database.js';
import { postAccountingVoucher, resolveLedger } from '../services/AccountingPosting.js';

// Helper to auto-generate production order number
const generateProductionNumber = async (client) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(`SELECT COUNT(*) FROM production_orders WHERE production_number LIKE $1`, [`PROD-${year}-%`]);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0');
    return `PROD-${year}-${nextSeq}`;
};

// Helper to auto-generate finished good batch number
const generateBatchNumber = async (client) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(`SELECT COUNT(*) FROM production_batches WHERE batch_number LIKE $1`, [`FG-${year}-%`]);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0');
    return `FG-${year}-${nextSeq}`;
};

// 1. Calculate Raw Material Requirements & Availability (FEFO/FIFO allocation preview)
export const calculateRequirements = async (req, res) => {
    try {
        const { product_id, production_master_id, planned_quantity = 1, branch_id } = req.query;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Product ID is required.' });
        }

        const qty = parseFloat(planned_quantity) || 1;
        if (qty <= 0) {
            return res.status(400).json({ success: false, message: 'Planned quantity must be greater than 0.' });
        }

        // Fetch Product
        const prodRes = await pool.query('SELECT * FROM products WHERE product_id = $1', [product_id]);
        if (prodRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        const product = prodRes.rows[0];

        // Fetch active Production Master
        let masterQuery = 'SELECT * FROM production_masters WHERE product_id = $1';
        const masterValues = [product_id];
        if (production_master_id) {
            masterQuery += ' AND id = $2';
            masterValues.push(production_master_id);
        } else {
            masterQuery += " AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1";
        }

        const masterRes = await pool.query(masterQuery, masterValues);
        if (masterRes.rows.length === 0) {
            return res.status(200).json({
                success: true,
                has_bom: false,
                can_produce: false,
                message: 'No Production Master / BOM configured for this product.',
                product,
                materials: []
            });
        }

        const master = masterRes.rows[0];
        const outputQty = parseFloat(master.output_quantity) || 1;
        const multiplier = qty / outputQty;

        // Fetch BOM Materials
        const materialsRes = await pool.query(`
            SELECT 
                pmm.*,
                rm.material_code,
                rm.material_name,
                rm.unit_of_measure,
                rm.unit_price as standard_price
            FROM production_master_materials pmm
            JOIN raw_materials rm ON pmm.raw_material_id = rm.material_id
            WHERE pmm.production_master_id = $1
            ORDER BY pmm.sequence ASC
        `, [master.id]);

        const materials = materialsRes.rows;
        let canProduceAll = true;
        const calculatedMaterials = [];

        for (const mat of materials) {
            const wastageFactor = 1 + (parseFloat(mat.wastage_percentage) || 0) / 100;
            const requiredQty = parseFloat(mat.quantity) * multiplier * wastageFactor;

            // Fetch available batches in inventory ordered by FEFO (expiry_date ASC NULLS LAST, id ASC)
            const batchesRes = await pool.query(`
                SELECT 
                    inventory_id,
                    id,
                    batch_number,
                    available_quantity,
                    received_quantity,
                    unit_cost,
                    expiry_date,
                    warehouse_location,
                    status
                FROM raw_material_inventory
                WHERE (raw_material_id = $1 OR material_id = $1)
                  AND (branch_id = $2 OR $2 IS NULL)
                  AND available_quantity > 0
                  AND status = 'AVAILABLE'
                ORDER BY expiry_date ASC NULLS LAST, inventory_id ASC
            `, [mat.raw_material_id, branch_id && branch_id !== 'all' ? branch_id : null]);

            const batches = batchesRes.rows;
            const totalAvailableStock = batches.reduce((acc, b) => acc + parseFloat(b.available_quantity || 0), 0);

            // Simulate FIFO/FEFO allocation
            let remainingNeed = requiredQty;
            const allocatedBatches = [];

            for (const batch of batches) {
                if (remainingNeed <= 0) break;
                const batchAvail = parseFloat(batch.available_quantity || 0);
                const consumeFromBatch = Math.min(batchAvail, remainingNeed);
                remainingNeed -= consumeFromBatch;

                allocatedBatches.push({
                    inventory_id: batch.inventory_id || batch.id,
                    batch_number: batch.batch_number,
                    available_before: batchAvail,
                    will_consume: consumeFromBatch,
                    available_after: batchAvail - consumeFromBatch,
                    unit_cost: batch.unit_cost,
                    expiry_date: batch.expiry_date
                });
            }

            const isShortage = remainingNeed > 0.0001;
            if (isShortage) {
                canProduceAll = false;
            }

            calculatedMaterials.push({
                raw_material_id: mat.raw_material_id,
                material_code: mat.material_code,
                material_name: mat.material_name,
                unit: mat.unit || mat.unit_of_measure,
                bom_quantity_per_unit: mat.quantity,
                wastage_percentage: mat.wastage_percentage,
                total_required_quantity: parseFloat(requiredQty.toFixed(4)),
                total_available_stock: parseFloat(totalAvailableStock.toFixed(4)),
                shortage_quantity: isShortage ? parseFloat(remainingNeed.toFixed(4)) : 0,
                is_sufficient: !isShortage,
                allocated_batches: allocatedBatches
            });
        }

        // Calculate planned time, workforce, expenses
        const masterTimePerUnitMinutes = parseFloat(master.production_time_minutes || 0);
        const plannedTimeMinutes = masterTimePerUnitMinutes * multiplier;
        const plannedDays = Math.floor(plannedTimeMinutes / 1440);
        const remMinutesAfterDays = plannedTimeMinutes % 1440;
        const plannedHours = Math.floor(remMinutesAfterDays / 60);
        const plannedMins = +(remMinutesAfterDays % 60).toFixed(2);

        const formatParts = (d, h, m) => {
            const parts = [];
            if (d > 0) parts.push(`${d} ${d === 1 ? 'Day' : 'Days'}`);
            if (h > 0) parts.push(`${h} ${h === 1 ? 'Hour' : 'Hours'}`);
            if (m > 0 || parts.length === 0) parts.push(`${m} ${m == 1 ? 'Minute' : 'Minutes'}`);
            return parts.join(', ');
        };

        const formattedPlannedTime = formatParts(plannedDays, plannedHours, plannedMins);
        const plannedWorkforceCount = parseFloat(master.workforce_count || 1);
        const plannedExpense = (
            parseFloat(master.labor_cost || 0) +
            parseFloat(master.overhead_cost || 0) +
            parseFloat(master.other_expense || 0)
        ) * multiplier;

        return res.status(200).json({
            success: true,
            has_bom: true,
            can_produce: canProduceAll,
            product,
            production_master: master,
            planned_quantity: qty,
            planned_time_minutes: parseFloat(plannedTimeMinutes.toFixed(2)),
            planned_days: plannedDays,
            planned_hours: plannedHours,
            planned_remaining_minutes: plannedMins,
            formatted_planned_time: formattedPlannedTime,
            planned_workforce_count: plannedWorkforceCount,
            planned_expense: plannedExpense,
            materials: calculatedMaterials
        });

    } catch (error) {
        console.error('Error calculating requirements:', error);
        return res.status(500).json({ success: false, message: 'Failed to calculate production requirements', error: error.message });
    }
};

// 2. Create Production Order
export const createProductionOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            company_id,
            branch_id,
            production_number,
            product_id,
            production_master_id,
            planned_quantity,
            planned_start_date,
            planned_end_date,
            workforce_count,
            planned_time_minutes,
            planned_expense,
            remarks
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID is required.' });
        }

        if (!product_id || !planned_quantity || parseFloat(planned_quantity) <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Product and a valid planned quantity (> 0) are required.' });
        }

        // Fetch or resolve Production Master
        let masterId = production_master_id;
        if (!masterId) {
            const masterCheck = await client.query(`
                SELECT id, workforce_count, production_time_minutes, labor_cost, overhead_cost, other_expense, output_quantity
                FROM production_masters
                WHERE product_id = $1 AND status = 'ACTIVE'
                ORDER BY version DESC LIMIT 1
            `, [product_id]);
            if (masterCheck.rows.length > 0) {
                masterId = masterCheck.rows[0].id;
            }
        }

        const finalProdNumber = production_number && production_number.trim() !== ''
            ? production_number.trim().toUpperCase()
            : await generateProductionNumber(client);

        const insertQuery = `
            INSERT INTO production_orders (
                company_id, branch_id, production_number, product_id,
                production_master_id, planned_quantity, planned_start_date,
                planned_end_date, workforce_count, planned_time_minutes,
                planned_expense, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PLANNED', $12)
            RETURNING *
        `;

        const orderRes = await client.query(insertQuery, [
            effectiveCompanyId,
            effectiveBranchId,
            finalProdNumber,
            product_id,
            masterId || null,
            parseFloat(planned_quantity),
            planned_start_date || new Date().toISOString(),
            planned_end_date || null,
            parseFloat(workforce_count || 1),
            parseFloat(planned_time_minutes || 0),
            parseFloat(planned_expense || 0),
            createdBy
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Production Order created successfully.',
            data: orderRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating production order:', error);
        return res.status(500).json({ success: false, message: 'Failed to create Production Order', error: error.message });
    } finally {
        client.release();
    }
};

// 3. Start Production Order: Executes FIFO/FEFO Raw Material Consumption and generates Production Batch
export const startProductionOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const performedBy = req.user?.employee_id || null;

        // Fetch Order
        const orderRes = await client.query(`
            SELECT po.*, p.product_name, p.product_code 
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            WHERE po.id = $1 FOR UPDATE
        `, [id]);

        if (orderRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Production Order not found.' });
        }

        const order = orderRes.rows[0];
        if (order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Production Order is already ${order.status}.` });
        }

        if (!order.production_master_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'No Production Master (BOM) linked to this Production Order.' });
        }

        const masterRes = await client.query('SELECT * FROM production_masters WHERE id = $1', [order.production_master_id]);
        const master = masterRes.rows[0];
        const outputQty = parseFloat(master.output_quantity) || 1;
        const multiplier = parseFloat(order.planned_quantity) / outputQty;

        // Fetch BOM materials
        const materialsRes = await client.query(`
            SELECT * FROM production_master_materials WHERE production_master_id = $1 ORDER BY sequence ASC
        `, [master.id]);

        const materials = materialsRes.rows;
        if (materials.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'No raw materials defined in this BOM.' });
        }

        const consumptions = [];

        // Deduct raw materials using FEFO / FIFO
        for (const mat of materials) {
            const wastageFactor = 1 + (parseFloat(mat.wastage_percentage) || 0) / 100;
            const totalRequired = parseFloat(mat.quantity) * multiplier * wastageFactor;

            // Fetch available batches with locking
            const batchQuery = `
                SELECT * 
                FROM raw_material_inventory
                WHERE (raw_material_id = $1 OR material_id = $1)
                  AND (branch_id = $2 OR $2 IS NULL)
                  AND available_quantity > 0
                  AND status = 'AVAILABLE'
                ORDER BY expiry_date ASC NULLS LAST, inventory_id ASC
                FOR UPDATE
            `;

            const batchRes = await client.query(batchQuery, [mat.raw_material_id, order.branch_id]);
            let remainingToConsume = totalRequired;

            for (const batch of batchRes.rows) {
                if (remainingToConsume <= 0) break;
                const batchAvail = parseFloat(batch.available_quantity || 0);
                const deduct = Math.min(batchAvail, remainingToConsume);
                remainingToConsume -= deduct;

                const newAvail = batchAvail - deduct;
                const newStatus = newAvail <= 0.0001 ? 'EXHAUSTED' : 'AVAILABLE';

                // Update Raw Material Inventory Batch
                await client.query(`
                    UPDATE raw_material_inventory
                    SET available_quantity = $1,
                        status = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE inventory_id = $3
                `, [newAvail, newStatus, batch.inventory_id]);

                // Insert into production_material_consumptions
                const consRes = await client.query(`
                    INSERT INTO production_material_consumptions (
                        production_order_id, raw_material_id, raw_material_inventory_id,
                        batch_number, required_quantity, consumed_quantity,
                        unit_cost, total_cost
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `, [
                    order.id,
                    mat.raw_material_id,
                    batch.inventory_id,
                    batch.batch_number,
                    totalRequired,
                    deduct,
                    batch.unit_cost,
                    deduct * parseFloat(batch.unit_cost || 0)
                ]);

                consumptions.push(consRes.rows[0]);

                // Insert movement log
                await client.query(`
                    INSERT INTO raw_material_stock_movements (
                        company_id, branch_id, material_id, movement_type,
                        item_type, quantity, unit_cost, total_cost,
                        reference_no, batch_no, notes, performed_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    order.company_id,
                    order.branch_id,
                    mat.raw_material_id,
                    'Production Consumption',
                    'Raw Material',
                    -deduct,
                    batch.unit_cost,
                    -(deduct * parseFloat(batch.unit_cost || 0)),
                    order.production_number,
                    batch.batch_number,
                    `Consumed for Production Order ${order.production_number}`,
                    performedBy
                ]);
            }

            if (remainingToConsume > 0.0001) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Insufficient inventory for material ID ${mat.raw_material_id}. Short by ${remainingToConsume.toFixed(4)}`
                });
            }
        }

        // Generate Production Batch
        const fgBatchNumber = await generateBatchNumber(client);
        const batchInsertQuery = `
            INSERT INTO production_batches (
                company_id, branch_id, production_order_id,
                batch_number, planned_quantity, produced_quantity,
                production_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'IN_PRODUCTION')
            RETURNING *
        `;

        const batchRes = await client.query(batchInsertQuery, [
            order.company_id,
            order.branch_id,
            order.id,
            fgBatchNumber,
            order.planned_quantity,
            0
        ]);

        // Update Production Order status to IN_PROGRESS
        await client.query(`
            UPDATE production_orders
            SET status = 'IN_PROGRESS',
                actual_start_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [order.id]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Production started successfully. Raw material batches consumed and production batch generated.',
            data: {
                order_id: order.id,
                production_number: order.production_number,
                batch: batchRes.rows[0],
                consumptions_count: consumptions.length
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error starting production:', error);
        return res.status(500).json({ success: false, message: 'Failed to start production', error: error.message });
    } finally {
        client.release();
    }
};

// 4. Complete Production Run on Batch (before Quality Check)
export const completeProductionBatch = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { batchId } = req.params;
        const {
            produced_quantity,
            physical_quantity,
            actual_time_minutes,
            actual_expense,
            workforce_cost,
            wastage_reason
        } = req.body;

        const producedQty = parseFloat(produced_quantity);
        if (isNaN(producedQty) || producedQty < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Valid produced quantity is required.' });
        }

        const physQty = (physical_quantity !== undefined && physical_quantity !== null && physical_quantity !== '')
            ? parseFloat(physical_quantity)
            : producedQty;

        if (isNaN(physQty) || physQty < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Physical quantity cannot be negative.' });
        }

        let wastageQty = 0;
        let reason = null;
        if (physQty < producedQty) {
            wastageQty = +(producedQty - physQty).toFixed(4);
            reason = wastage_reason && wastage_reason.trim() !== '' ? wastage_reason.trim() : 'Production loss / wastage';
        }

        const wfCost = Math.max(0, parseFloat(workforce_cost !== undefined ? workforce_cost : actual_expense) || 0);

        // Fetch batch along with order and product details
        const batchQuery = `
            SELECT pb.*, po.company_id, po.branch_id, po.product_id, po.production_number,
                   p.product_name, p.product_code
            FROM production_batches pb
            JOIN production_orders po ON pb.production_order_id = po.id
            JOIN products p ON po.product_id = p.product_id
            WHERE pb.id = $1
            FOR UPDATE OF pb
        `;
        const batchRes = await client.query(batchQuery, [batchId]);
        if (batchRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Production Batch not found.' });
        }
        const batch = batchRes.rows[0];

        // Fetch material consumptions for this order
        const consRes = await client.query(
            `SELECT COALESCE(SUM(total_cost), 0) as mat_cost 
             FROM production_material_consumptions 
             WHERE production_order_id = $1`,
            [batch.production_order_id]
        );
        const matCost = parseFloat(consRes.rows[0]?.mat_cost || 0);
        const totalProdCost = +(matCost + wfCost).toFixed(2);
        const unitCost = producedQty > 0 ? +(totalProdCost / producedQty).toFixed(4) : 0;
        const wastageCost = +(wastageQty * unitCost).toFixed(2);
        const goodCost = +(totalProdCost - wastageCost).toFixed(2);

        // Automatic Accounting Voucher
        let voucher = null;
        if (batch.company_id && (totalProdCost > 0 || wfCost > 0)) {
            const rawStockLedgerId = await resolveLedger(client, batch.company_id, 'LED-STOCK-RAW', 'Raw Material Stock', 'GRP-STOCK', 'DR');
            const wipLedgerId = await resolveLedger(client, batch.company_id, 'LED-MFG-WIP', 'Work In Progress Stock', 'GRP-STOCK', 'DR');

            const accountingLines = [];

            // 1. Debit WIP for good physical quantity cost
            accountingLines.push({
                ledgerId: wipLedgerId,
                debit: goodCost,
                credit: 0,
                narration: `Production WIP: ${physQty} units of "${batch.product_name}" (Batch: ${batch.batch_number}) @ ₹${unitCost.toFixed(2)}/unit`
            });

            // 2. Debit Spoilage / Wastage Loss if shortfall occurred
            if (wastageCost > 0) {
                const spoilageLedgerId = await resolveLedger(client, batch.company_id, 'LED-LOSS-SPOILAGE', 'Production Loss & Wastage Expense', 'GRP-DIR-EXP', 'DR');
                accountingLines.push({
                    ledgerId: spoilageLedgerId,
                    debit: wastageCost,
                    credit: 0,
                    narration: `Production loss / wastage: ${wastageQty} units of "${batch.product_name}" (${reason})`
                });
            }

            // 3. Credit Raw Material Stock for consumed materials
            accountingLines.push({
                ledgerId: rawStockLedgerId,
                debit: 0,
                credit: matCost,
                narration: `Raw material stock consumed for batch ${batch.batch_number} (${batch.production_number})`
            });

            // 4. Direct Workforce / Labor Expense entries if workforce cost was entered
            if (wfCost > 0) {
                const wagesExpLedgerId = await resolveLedger(client, batch.company_id, 'LED-EXP-WAGES', 'Direct Wages & Workforce Cost', 'GRP-DIR-EXP', 'DR');
                const wagesPayableLedgerId = await resolveLedger(client, batch.company_id, 'LED-WAGES-PAYABLE', 'Wages & Workforce Payable', 'GRP-CL', 'CR');
                const laborAbsorbedLedgerId = await resolveLedger(client, batch.company_id, 'LED-MFG-LABOR-ABSORBED', 'Workforce Cost Absorbed in Production', 'GRP-DIR-EXP', 'CR');

                accountingLines.push({
                    ledgerId: wagesExpLedgerId,
                    debit: wfCost,
                    credit: 0,
                    narration: `Direct workforce charges for batch ${batch.batch_number}`
                });

                accountingLines.push({
                    ledgerId: wagesPayableLedgerId,
                    debit: 0,
                    credit: wfCost,
                    narration: `Workforce labor payable for batch ${batch.batch_number}`
                });

                accountingLines.push({
                    ledgerId: laborAbsorbedLedgerId,
                    debit: 0,
                    credit: wfCost,
                    narration: `Workforce labor capitalized into WIP (Batch: ${batch.batch_number})`
                });
            }

            voucher = await postAccountingVoucher(client, {
                companyId: batch.company_id,
                branchId: batch.branch_id,
                voucherDate: new Date().toISOString().split('T')[0],
                sourceDocumentId: batch.id,
                sourceModule: 'MANUFACTURING',
                referenceNumber: batch.batch_number,
                narration: `Production completion for batch ${batch.batch_number} of "${batch.product_name}". Generated: ${producedQty}, Physical: ${physQty}, Shortfall: ${wastageQty}${wastageQty > 0 ? ` (${reason})` : ''}. Material: ₹${matCost.toFixed(2)}, Workforce: ₹${wfCost.toFixed(2)}, Wastage Loss Expense: ₹${wastageCost.toFixed(2)}`,
                lines: accountingLines
            });
        }

        const batchResUpdated = await client.query(`
            UPDATE production_batches
            SET produced_quantity = $1,
                physical_quantity = $2,
                wastage_quantity = $3,
                wastage_reason = $4,
                wastage_cost = $5,
                material_cost = $6,
                workforce_cost = $7,
                total_production_cost = $8,
                unit_cost = $9,
                accounting_voucher_id = $10,
                status = 'PENDING_QC',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *
        `, [
            producedQty,
            physQty,
            wastageQty,
            reason,
            wastageCost,
            matCost,
            wfCost,
            totalProdCost,
            unitCost,
            voucher?.voucher_id || null,
            batchId
        ]);

        const updatedBatch = batchResUpdated.rows[0];

        // Also update parent Production Order
        await client.query(`
            UPDATE production_orders
            SET actual_time_minutes = COALESCE($1, actual_time_minutes),
                actual_expense = COALESCE($2, actual_expense),
                workforce_cost = $3,
                total_production_cost = $4,
                physical_quantity = $5,
                wastage_quantity = $6,
                wastage_reason = $7,
                wastage_cost = $8,
                accounting_voucher_id = $9,
                actual_end_date = CURRENT_TIMESTAMP,
                status = 'COMPLETED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
        `, [
            actual_time_minutes || null,
            wfCost,
            wfCost,
            totalProdCost,
            physQty,
            wastageQty,
            reason,
            wastageCost,
            voucher?.voucher_id || null,
            batch.production_order_id
        ]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Production batch marked as completed (${physQty} physical units verified${wastageQty > 0 ? `, ${wastageQty} wasted noted as expense` : ''}) and ready for Quality Inspection.`,
            data: {
                ...updatedBatch,
                voucher_id: voucher?.voucher_id,
                voucher_number: voucher?.voucher_number
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completing production batch:', error);
        return res.status(500).json({ success: false, message: 'Failed to complete production batch', error: error.message });
    } finally {
        client.release();
    }
};

// 5. Get all Production Orders
export const getAllProductionOrders = async (req, res) => {
    try {
        const { company_id, branch_id, status, product_id, search } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                po.*,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                pm.name as bom_name,
                pm.version as bom_version,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as created_by_name,
                COUNT(DISTINCT pb.id) as batches_count,
                COALESCE(SUM(pb.produced_quantity), 0) as total_produced_quantity,
                COALESCE(SUM(pb.physical_quantity), 0) as total_physical_quantity,
                COALESCE(SUM(pb.wastage_quantity), 0) as total_wastage_quantity,
                COALESCE(SUM(pb.wastage_cost), 0) as total_wastage_cost,
                v.voucher_number
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN production_masters pm ON po.production_master_id = pm.id
            LEFT JOIN companies c ON po.company_id = c.company_id
            LEFT JOIN branches b ON po.branch_id = b.branch_id
            LEFT JOIN employees e ON po.created_by = e.employee_id
            LEFT JOIN production_batches pb ON po.id = pb.production_order_id
            LEFT JOIN vouchers v ON po.accounting_voucher_id = v.voucher_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND po.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (po.branch_id = $${counter} OR po.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND po.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (product_id) {
            query += ` AND po.product_id = $${counter}`;
            values.push(product_id);
            counter++;
        }

        if (search) {
            query += ` AND (po.production_number ILIKE $${counter} OR p.product_name ILIKE $${counter})`;
            values.push(`%${search}%`);
            counter++;
        }

        query += ` GROUP BY po.id, p.product_id, pm.id, c.company_id, b.branch_id, e.employee_id, v.voucher_number ORDER BY po.id DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });

    } catch (error) {
        console.error('Error fetching production orders:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch production orders', error: error.message });
    }
};

// 6. Get single Production Order details with batches and consumptions
export const getProductionOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const orderQuery = `
            SELECT 
                po.*,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                pm.name as bom_name,
                pm.version as bom_version,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as created_by_name,
                v.voucher_number
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN production_masters pm ON po.production_master_id = pm.id
            LEFT JOIN companies c ON po.company_id = c.company_id
            LEFT JOIN branches b ON po.branch_id = b.branch_id
            LEFT JOIN employees e ON po.created_by = e.employee_id
            LEFT JOIN vouchers v ON po.accounting_voucher_id = v.voucher_id
            WHERE po.id = $1
        `;

        const orderRes = await pool.query(orderQuery, [id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Production Order not found' });
        }

        // Batches for this order
        const batchesRes = await pool.query(`
            SELECT pb.*, v.voucher_number, qc.quality_status, qc.passed_quantity, qc.rework_quantity, qc.rejected_quantity
            FROM production_batches pb
            LEFT JOIN vouchers v ON pb.accounting_voucher_id = v.voucher_id
            LEFT JOIN quality_checks qc ON pb.id = qc.production_batch_id
            WHERE pb.production_order_id = $1
            ORDER BY pb.id ASC
        `, [id]);

        // Consumptions for this order
        const consumptionsRes = await pool.query(`
            SELECT 
                pmc.*,
                rm.material_code,
                rm.material_name,
                rm.unit_of_measure as rm_unit
            FROM production_material_consumptions pmc
            JOIN raw_materials rm ON pmc.raw_material_id = rm.material_id
            WHERE pmc.production_order_id = $1
            ORDER BY pmc.id ASC
        `, [id]);

        return res.status(200).json({
            success: true,
            data: {
                ...orderRes.rows[0],
                batches: batchesRes.rows,
                consumptions: consumptionsRes.rows
            }
        });

    } catch (error) {
        console.error('Error fetching production order details:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch Production Order details', error: error.message });
    }
};
