import pool from '../config/database.js';

// 1. Check Material Stock Availability & Cost Preview before Production
export const checkMaterialAvailability = async (req, res) => {
    try {
        const { product_id, production_quantity = 1, branch_id } = req.query;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Product ID is required.' });
        }

        const qty = parseFloat(production_quantity) || 1;
        if (qty <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than 0.' });
        }

        // Fetch Product
        const prodRes = await pool.query('SELECT * FROM products WHERE product_id = $1 AND is_active = true', [product_id]);
        if (prodRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        const product = prodRes.rows[0];

        // Fetch Product BOM Recipe items with current inventory stock for branch
        const bomQuery = `
            SELECT 
                pb.bom_id,
                pb.product_id,
                pb.material_id,
                pb.quantity_required as unit_quantity_required,
                pb.scrap_percentage,
                rm.material_code,
                rm.material_name,
                rm.category as material_category,
                rm.unit_of_measure,
                rm.unit_price as material_standard_price,
                COALESCE(inv.current_stock, 0) as current_stock,
                COALESCE(inv.available_stock, 0) as available_stock,
                COALESCE(inv.average_unit_cost, rm.unit_price) as average_unit_cost
            FROM product_bom pb
            JOIN raw_materials rm ON pb.material_id = rm.material_id
            LEFT JOIN (
                SELECT 
                    COALESCE(raw_material_id, material_id) as material_id,
                    branch_id,
                    COALESCE(SUM(available_quantity), SUM(current_stock), 0) as current_stock,
                    COALESCE(SUM(available_quantity - reserved_quantity), SUM(available_stock), 0) as available_stock,
                    CASE 
                        WHEN SUM(COALESCE(available_quantity, current_stock, 0)) > 0 
                        THEN SUM(COALESCE(available_quantity, current_stock, 0) * COALESCE(unit_cost, average_unit_cost, 0)) / SUM(COALESCE(available_quantity, current_stock, 0))
                        ELSE MAX(COALESCE(unit_cost, average_unit_cost, 0))
                    END as average_unit_cost
                FROM raw_material_inventory
                WHERE status != 'DEPLETED' AND status != 'EXHAUSTED'
                GROUP BY COALESCE(raw_material_id, material_id), branch_id
            ) inv ON pb.material_id = inv.material_id 
                AND (inv.branch_id = $2 OR $2 IS NULL)
            WHERE pb.product_id = $1
            ORDER BY rm.material_name ASC
        `;

        const bomRes = await pool.query(bomQuery, [
            product_id,
            branch_id && branch_id !== 'all' ? branch_id : null
        ]);

        const timePerUnit = parseFloat(product.production_time_minutes) || 0;
        const totalTimeMinutes = timePerUnit * qty;
        const totalTimeHours = totalTimeMinutes / 60;
        const workforceRequired = parseInt(product.workforce_required, 10) || 1;

        if (bomRes.rows.length === 0) {
            return res.status(200).json({
                success: true,
                has_bom: false,
                has_materials: false,
                can_produce: false,
                message: 'No Raw Materials configured for this product. Please assign raw materials in Product Master.',
                product,
                production_quantity: qty,
                production_time_per_unit_minutes: timePerUnit,
                total_production_time_minutes: parseFloat(totalTimeMinutes.toFixed(2)),
                total_production_time_hours: parseFloat(totalTimeHours.toFixed(2)),
                workforce_required: workforceRequired,
                materials: [],
                total_material_cost: 0
            });
        }

        let canProduce = true;
        let totalEstimatedCost = 0;
        const materials = bomRes.rows.map(item => {
            const unitReq = parseFloat(item.unit_quantity_required) || 0;
            const scrapRate = parseFloat(item.scrap_percentage) || 0;
            const grossUnitReq = unitReq * (1 + (scrapRate / 100));
            const totalRequired = grossUnitReq * qty;
            const stockAvail = parseFloat(item.current_stock) || 0;
            const hasSufficient = stockAvail >= totalRequired;
            const shortage = hasSufficient ? 0 : (totalRequired - stockAvail);
            const unitCost = parseFloat(item.average_unit_cost) || 0;
            const lineCost = totalRequired * unitCost;

            if (!hasSufficient) {
                canProduce = false;
            }
            totalEstimatedCost += lineCost;

            return {
                material_id: item.material_id,
                material_code: item.material_code,
                material_name: item.material_name,
                material_category: item.material_category,
                unit_of_measure: item.unit_of_measure,
                unit_quantity_required: unitReq,
                total_quantity_required: parseFloat(totalRequired.toFixed(4)),
                current_stock: stockAvail,
                has_sufficient_stock: hasSufficient,
                shortage_quantity: parseFloat(shortage.toFixed(4)),
                unit_cost: unitCost,
                total_cost: parseFloat(lineCost.toFixed(2))
            };
        });

        return res.status(200).json({
            success: true,
            has_bom: true,
            has_materials: true,
            can_produce: canProduce,
            product,
            production_quantity: qty,
            production_time_per_unit_minutes: timePerUnit,
            total_production_time_minutes: parseFloat(totalTimeMinutes.toFixed(2)),
            total_production_time_hours: parseFloat(totalTimeHours.toFixed(2)),
            workforce_required: workforceRequired,
            total_material_cost: parseFloat(totalEstimatedCost.toFixed(2)),
            materials
        });
    } catch (error) {
        console.error('Error checking material availability:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while checking material availability',
            error: error.message
        });
    }
};

// 2. Record Production Batch Run (Automatic Inventory Deduction & Movement Log)
export const recordProductionRun = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            company_id,
            branch_id,
            product_id,
            production_quantity,
            total_production_time_minutes,
            workforce_count,
            production_date = new Date().toISOString().split('T')[0],
            production_period_type = 'Daily', // 'Daily' | 'Monthly' | 'Weekly' | 'Custom'
            batch_number,
            warehouse_location = 'Main Store',
            notes
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;
        const performedBy = req.user?.employee_id || null;

        if (!effectiveCompanyId || !effectiveBranchId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and Branch ID are required for production runs.'
            });
        }

        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: 'Please select a finished product for production.'
            });
        }

        const qty = parseFloat(production_quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Production quantity must be greater than 0.'
            });
        }

        await client.query('BEGIN');

        // 1. Fetch Product details
        const prodRes = await client.query('SELECT * FROM products WHERE product_id = $1 AND is_active = true', [product_id]);
        if (prodRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Selected product not found.' });
        }
        const product = prodRes.rows[0];

        // 2. Fetch Product BOM Recipe items
        const bomRes = await client.query(`
            SELECT 
                pb.*,
                rm.material_name,
                rm.material_code,
                rm.unit_of_measure,
                rm.unit_price
            FROM product_bom pb
            JOIN raw_materials rm ON pb.material_id = rm.material_id
            WHERE pb.product_id = $1
        `, [product_id]);

        if (bomRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Product "${product.product_name}" has no raw materials configured. Please define required raw materials in the Product Master first.`
            });
        }

        // 3. Verify Stock for every BOM item and lock inventory rows
        const deductions = [];
        let totalProductionMaterialCost = 0;

        for (const bomItem of bomRes.rows) {
            const unitReq = parseFloat(bomItem.quantity_required) || 0;
            const scrap = parseFloat(bomItem.scrap_percentage) || 0;
            const grossPerUnit = unitReq * (1 + (scrap / 100));
            const totalRequired = grossPerUnit * qty;

            // Fetch live inventory for this raw material in this branch with row locking
            const invRes = await client.query(`
                SELECT 
                    COALESCE(SUM(available_quantity), SUM(current_stock), 0) as total_available,
                    CASE 
                        WHEN SUM(COALESCE(available_quantity, current_stock, 0)) > 0 
                        THEN SUM(COALESCE(available_quantity, current_stock, 0) * COALESCE(unit_cost, average_unit_cost, 0)) / SUM(COALESCE(available_quantity, current_stock, 0))
                        ELSE MAX(COALESCE(unit_cost, average_unit_cost, 0))
                    END as avg_cost
                FROM raw_material_inventory 
                WHERE (branch_id = $1 OR $1 IS NULL) 
                  AND (material_id = $2 OR raw_material_id = $2)
                  AND status != 'DEPLETED' AND status != 'EXHAUSTED'
            `, [effectiveBranchId, bomItem.material_id]);

            let currentStock = 0;
            let avgCost = parseFloat(bomItem.unit_price) || 0;

            if (invRes.rows.length > 0 && invRes.rows[0].total_available !== null) {
                currentStock = parseFloat(invRes.rows[0].total_available) || 0;
                avgCost = parseFloat(invRes.rows[0].avg_cost) || avgCost;
            }

            if (currentStock < totalRequired) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for raw material "${bomItem.material_name}" (${bomItem.material_code}). Required: ${totalRequired.toFixed(2)} ${bomItem.unit_of_measure}, Available: ${currentStock.toFixed(2)} ${bomItem.unit_of_measure}.`
                });
            }

            const lineCost = totalRequired * avgCost;
            totalProductionMaterialCost += lineCost;

            deductions.push({
                material_id: bomItem.material_id,
                material_name: bomItem.material_name,
                material_code: bomItem.material_code,
                unit_of_measure: bomItem.unit_of_measure,
                unit_quantity_required: unitReq,
                total_quantity_deducted: totalRequired,
                current_stock_before: currentStock,
                new_stock_after: currentStock - totalRequired,
                unit_cost: avgCost,
                total_cost: lineCost
            });
        }

        // 4. Generate Production Run Code and Batch Number
        const todayStr = (production_date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
        const autoBatch = batch_number && batch_number.trim() !== '' 
            ? batch_number.trim() 
            : `BATCH-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

        const prodCode = `PRD-RUN-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

        const totalTime = total_production_time_minutes !== undefined && total_production_time_minutes !== ''
            ? parseFloat(total_production_time_minutes)
            : (parseFloat(product.production_time_minutes || 0) * qty);

        const workforce = workforce_count !== undefined && workforce_count !== ''
            ? parseInt(workforce_count, 10)
            : (parseInt(product.workforce_required || 1, 10));

        // 5. Create Raw Material Production Record
        const prodInsertQuery = `
            INSERT INTO raw_material_production (
                company_id, branch_id, production_code, batch_number,
                production_date, production_period_type, product_id,
                production_quantity, total_material_cost,
                total_production_time_minutes, workforce_count,
                production_status, warehouse_location, notes, created_by
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9,
                $10, $11,
                'Pending Quality Check', $12, $13, $14
            ) RETURNING *
        `;

        const prodRunRes = await client.query(prodInsertQuery, [
            effectiveCompanyId,
            effectiveBranchId,
            prodCode,
            autoBatch,
            production_date,
            production_period_type || 'Daily',
            product_id,
            qty,
            totalProductionMaterialCost,
            totalTime,
            workforce,
            warehouse_location || 'Main Store',
            notes || null,
            performedBy
        ]);

        const productionRecord = prodRunRes.rows[0];

        // Create Production Batch entry for Quality Check tracking
        const batchInsertQuery = `
            INSERT INTO production_batches (
                company_id, branch_id, production_id, product_id,
                batch_number, planned_quantity, produced_quantity,
                production_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_QC')
            RETURNING *
        `;
        const batchRes = await client.query(batchInsertQuery, [
            effectiveCompanyId,
            effectiveBranchId,
            productionRecord.production_id,
            product_id,
            autoBatch,
            qty,
            qty,
            production_date || new Date().toISOString().split('T')[0]
        ]);
        const batchRecord = batchRes.rows[0];

        // 6. Deduct Inventory & Create Stock Movement / Consumption Logs for each raw material
        for (const item of deductions) {
            // Deduct from batches FIFO
            const batchesToDeduct = await client.query(`
                SELECT * FROM raw_material_inventory
                WHERE (branch_id = $1 OR $1 IS NULL)
                  AND (material_id = $2 OR raw_material_id = $2)
                  AND available_quantity > 0
                  AND status = 'AVAILABLE'
                ORDER BY expiry_date ASC NULLS LAST, inventory_id ASC
                FOR UPDATE
            `, [effectiveBranchId, item.material_id]);

            let remainingDeduct = item.total_quantity_deducted;
            for (const b of batchesToDeduct.rows) {
                if (remainingDeduct <= 0) break;
                const bAvail = parseFloat(b.available_quantity) || 0;
                const toTake = Math.min(bAvail, remainingDeduct);
                remainingDeduct -= toTake;
                const newB = bAvail - toTake;
                await client.query(`
                    UPDATE raw_material_inventory
                    SET available_quantity = $1,
                        current_stock = $1,
                        available_stock = $1,
                        status = CASE WHEN $1 <= 0.0001 THEN 'DEPLETED' ELSE 'AVAILABLE' END,
                        last_stock_update = CURRENT_TIMESTAMP
                    WHERE inventory_id = $2
                `, [newB, b.inventory_id]);
            }

            // Create Stock Movement Issue / Out log
            await client.query(`
                INSERT INTO raw_material_stock_movements (
                    company_id, branch_id, material_id, asset_id, vendor_id,
                    movement_type, item_type, quantity, unit_cost, total_cost,
                    reference_no, batch_no, notes, performed_by
                ) VALUES (
                    $1, $2, $3, NULL, NULL,
                    'Stock Out / Issue', 'Raw Material', $4, $5, $6,
                    $7, $8, $9, $10
                )
            `, [
                effectiveCompanyId,
                effectiveBranchId,
                item.material_id,
                item.total_quantity_deducted,
                item.unit_cost,
                item.total_cost,
                autoBatch,
                prodCode,
                `Consumed in ${production_period_type} production of ${qty} ${product.unit_of_measure} of "${product.product_name}"`,
                performedBy
            ]);

            // Insert into production_materials_consumed
            await client.query(`
                INSERT INTO production_materials_consumed (
                    production_id, material_id, unit_quantity_required,
                    total_quantity_deducted, unit_cost, total_cost
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                productionRecord.production_id,
                item.material_id,
                item.unit_quantity_required,
                item.total_quantity_deducted,
                item.unit_cost,
                item.total_cost
            ]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Production order batch created for ${qty} ${product.unit_of_measure} of "${product.product_name}". Raw materials deducted and batch sent to Quality Check.`,
            data: {
                production: productionRecord,
                batch: batchRecord,
                product_name: product.product_name,
                materials_consumed: deductions
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording production run:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while recording production run',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 3. Get All Production Runs & History (Daily, Monthly, Custom)
export const getAllProductionRuns = async (req, res) => {
    try {
        const { company_id, branch_id, product_id, period_type, start_date, end_date, search, limit = 100 } = req.query;

        let query = `
            SELECT 
                pr.*,
                p.product_code,
                p.product_name,
                p.category as product_category,
                p.unit_of_measure as product_uom,
                p.selling_price as product_selling_price,
                p.photo_1 as product_photo,
                p.production_time_minutes as unit_production_time_minutes,
                p.workforce_required as standard_workforce_required,
                c.company_name,
                b.branch_name,
                e.first_name as created_by_name,
                (
                    SELECT COUNT(*) 
                    FROM production_materials_consumed pmc 
                    WHERE pmc.production_id = pr.production_id
                ) as total_materials_used
            FROM raw_material_production pr
            JOIN products p ON pr.product_id = p.product_id
            LEFT JOIN companies c ON pr.company_id = c.company_id
            LEFT JOIN branches b ON pr.branch_id = b.branch_id
            LEFT JOIN employees e ON pr.created_by = e.employee_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND pr.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND pr.branch_id = $${counter}`;
            values.push(branch_id);
            counter++;
        }

        if (product_id) {
            query += ` AND pr.product_id = $${counter}`;
            values.push(product_id);
            counter++;
        }

        if (period_type && period_type !== 'all') {
            query += ` AND pr.production_period_type = $${counter}`;
            values.push(period_type);
            counter++;
        }

        if (start_date) {
            query += ` AND pr.production_date >= $${counter}`;
            values.push(start_date);
            counter++;
        }

        if (end_date) {
            query += ` AND pr.production_date <= $${counter}`;
            values.push(end_date);
            counter++;
        }

        if (search) {
            query += ` AND (
                p.product_name ILIKE $${counter} OR 
                p.product_code ILIKE $${counter} OR 
                pr.batch_number ILIKE $${counter} OR
                pr.production_code ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY pr.production_date DESC, pr.created_at DESC LIMIT $${counter}`;
        values.push(parseInt(limit, 10) || 100);

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching production runs:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching production runs',
            error: error.message
        });
    }
};

// 4. Get Single Production Run with Material Consumption Details
export const getProductionRunById = async (req, res) => {
    try {
        const { id } = req.params;

        const runQuery = `
            SELECT 
                pr.*,
                p.product_code,
                p.product_name,
                p.category as product_category,
                p.unit_of_measure as product_uom,
                p.selling_price as product_selling_price,
                p.photo_1,
                p.photo_2,
                p.photo_3,
                p.product_specification,
                p.production_time_minutes as unit_production_time_minutes,
                p.workforce_required as standard_workforce_required,
                c.company_name,
                b.branch_name,
                e.first_name as created_by_name
            FROM raw_material_production pr
            JOIN products p ON pr.product_id = p.product_id
            LEFT JOIN companies c ON pr.company_id = c.company_id
            LEFT JOIN branches b ON pr.branch_id = b.branch_id
            LEFT JOIN employees e ON pr.created_by = e.employee_id
            WHERE pr.production_id = $1
        `;

        const runResult = await pool.query(runQuery, [id]);
        if (runResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Production run not found.' });
        }

        const production = runResult.rows[0];

        // Fetch consumed materials
        const consumedQuery = `
            SELECT 
                pmc.*,
                rm.material_code,
                rm.material_name,
                rm.category as material_category,
                rm.unit_of_measure
            FROM production_materials_consumed pmc
            JOIN raw_materials rm ON pmc.material_id = rm.material_id
            WHERE pmc.production_id = $1
            ORDER BY rm.material_name ASC
        `;

        const consumedRes = await pool.query(consumedQuery, [id]);
        production.materials_consumed = consumedRes.rows;

        return res.status(200).json({
            success: true,
            data: production
        });
    } catch (error) {
        console.error('Error fetching production run:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching production run',
            error: error.message
        });
    }
};

// 5. Get Production Summary Statistics
export const getProductionStats = async (req, res) => {
    try {
        const { company_id, branch_id } = req.query;

        const effectiveBranch = branch_id && branch_id !== 'all' ? branch_id : null;

        const statsQuery = `
            SELECT 
                COUNT(*) as total_batches,
                COALESCE(SUM(production_quantity), 0) as total_units_produced,
                COALESCE(SUM(total_material_cost), 0) as total_production_cost,
                COUNT(DISTINCT product_id) as distinct_products_manufactured,
                COALESCE(SUM(CASE WHEN production_period_type = 'Daily' THEN production_quantity ELSE 0 END), 0) as daily_units_produced,
                COALESCE(SUM(CASE WHEN production_period_type = 'Monthly' THEN production_quantity ELSE 0 END), 0) as monthly_units_produced
            FROM raw_material_production
            WHERE ($1::BIGINT IS NULL OR company_id = $1)
              AND ($2::BIGINT IS NULL OR branch_id = $2)
        `;

        const result = await pool.query(statsQuery, [company_id || null, effectiveBranch]);

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching production stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching production stats',
            error: error.message
        });
    }
};
