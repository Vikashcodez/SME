import pool from '../config/database.js';

// Helper to auto-generate GRN number
const generateGrnNumber = async (client) => {
    const year = new Date().getFullYear();
    const countRes = await client.query(`SELECT COUNT(*) FROM grns WHERE grn_number LIKE $1`, [`GRN-${year}-%`]);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0');
    return `GRN-${year}-${nextSeq}`;
};

// 1. Create a new GRN with Items & automatically populate Raw Material Inventory Batches
export const createGrn = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            company_id,
            branch_id,
            grn_number,
            vendor_id,
            invoice_number,
            invoice_date,
            received_date,
            remarks,
            items // Can be JSON array or JSON string
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID is required.' });
        }

        if (!vendor_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Vendor / Supplier is required.' });
        }

        // Parse items
        let parsedItems = [];
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                parsedItems = [];
            }
        } else if (Array.isArray(items)) {
            parsedItems = items;
        }

        if (!parsedItems || parsedItems.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'At least one Raw Material item is required in GRN.' });
        }

        // Invoice file path if uploaded
        let invoiceFile = null;
        if (req.file) {
            invoiceFile = `/uploads/invoices/${req.file.filename}`;
        }

        // Generate or validate GRN Number
        let finalGrnNumber = grn_number && grn_number.trim() !== ''
            ? grn_number.trim().toUpperCase()
            : await generateGrnNumber(client);

        // Check if GRN number exists
        const dupCheck = await client.query('SELECT id FROM grns WHERE grn_number = $1', [finalGrnNumber]);
        if (dupCheck.rows.length > 0) {
            finalGrnNumber = await generateGrnNumber(client);
        }

        // Insert GRN Header
        const grnInsertQuery = `
            INSERT INTO grns (
                company_id, branch_id, grn_number, vendor_id,
                invoice_number, invoice_date, received_date,
                invoice_file, remarks, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const grnRes = await client.query(grnInsertQuery, [
            effectiveCompanyId,
            effectiveBranchId,
            finalGrnNumber,
            vendor_id,
            invoice_number || null,
            invoice_date || null,
            received_date || new Date().toISOString().split('T')[0],
            invoiceFile,
            remarks || null,
            createdBy
        ]);

        const grn = grnRes.rows[0];

        // Insert Items & Create Inventory Batches
        const createdItems = [];
        for (let i = 0; i < parsedItems.length; i++) {
            const item = parsedItems[i];
            const rawMaterialId = item.raw_material_id || item.material_id;
            const receivedQty = parseFloat(item.received_quantity || item.quantity || 0);
            const freeQty = parseFloat(item.free_quantity || 0);
            const unitCost = parseFloat(item.unit_cost || item.unit_price || 0);
            const tax = parseFloat(item.tax || 0);
            const expiryDate = item.expiry_date || null;
            const mfgDate = item.manufacturing_date || null;
            const itemRemarks = item.remarks || null;

            if (!rawMaterialId || receivedQty <= 0) {
                continue;
            }

            const batchNumber = item.batch_number && item.batch_number.trim() !== ''
                ? item.batch_number.trim()
                : `BATCH-${Date.now().toString().slice(-6)}-${i + 1}`;

            // Insert GRN Item
            const itemInsertQuery = `
                INSERT INTO grn_items (
                    grn_id, raw_material_id, batch_number,
                    received_quantity, free_quantity, unit_cost,
                    tax, expiry_date, manufacturing_date, remarks
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const itemRes = await client.query(itemInsertQuery, [
                grn.id,
                rawMaterialId,
                batchNumber,
                receivedQty,
                freeQty,
                unitCost,
                tax,
                expiryDate,
                mfgDate,
                itemRemarks
            ]);

            const createdItem = itemRes.rows[0];
            createdItems.push(createdItem);

            const totalReceivedBatchQty = receivedQty + freeQty;

            // Automatically create Raw Material Inventory Batch Record
            const invInsertQuery = `
                INSERT INTO raw_material_inventory (
                    company_id, branch_id, raw_material_id, material_id,
                    grn_item_id, batch_number, received_quantity,
                    available_quantity, reserved_quantity, unit_cost,
                    current_stock, available_stock, average_unit_cost, total_value,
                    expiry_date, warehouse_location, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            await client.query(invInsertQuery, [
                effectiveCompanyId,
                effectiveBranchId,
                rawMaterialId,
                rawMaterialId,
                createdItem.id,
                batchNumber,
                totalReceivedBatchQty,
                totalReceivedBatchQty,
                0,
                unitCost,
                totalReceivedBatchQty,
                totalReceivedBatchQty,
                unitCost,
                totalReceivedBatchQty * unitCost,
                expiryDate,
                item.warehouse_location || 'Main Store',
                'AVAILABLE'
            ]);

            // Insert stock movement record for audit trail
            await client.query(`
                INSERT INTO raw_material_stock_movements (
                    company_id, branch_id, material_id, vendor_id,
                    movement_type, item_type, quantity, unit_cost, total_cost,
                    reference_no, batch_no, invoice_number, invoice_date, invoice_url,
                    performed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                effectiveCompanyId,
                effectiveBranchId,
                rawMaterialId,
                vendor_id,
                'GRN Inward',
                'Raw Material',
                totalReceivedBatchQty,
                unitCost,
                totalReceivedBatchQty * unitCost,
                finalGrnNumber,
                batchNumber,
                invoice_number || null,
                invoice_date || null,
                invoiceFile,
                createdBy
            ]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'GRN created successfully and raw material batch inventory updated.',
            data: {
                ...grn,
                items: createdItems
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating GRN:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create GRN',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 2. Get all GRNs with filters & aggregated metrics
export const getAllGrns = async (req, res) => {
    try {
        const {
            company_id,
            branch_id,
            vendor_id,
            search,
            start_date,
            end_date,
            page = 1,
            limit = 50
        } = req.query;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                g.*,
                v.vendor_name,
                v.vendor_code,
                v.phone as vendor_phone,
                v.email as vendor_email,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as received_by_name,
                COUNT(gi.id) as total_items,
                COALESCE(SUM(gi.received_quantity * gi.unit_cost), 0) as total_value
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.vendor_id
            LEFT JOIN companies c ON g.company_id = c.company_id
            LEFT JOIN branches b ON g.branch_id = b.branch_id
            LEFT JOIN employees e ON g.created_by = e.employee_id
            LEFT JOIN grn_items gi ON g.id = gi.grn_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND g.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (g.branch_id = $${counter} OR g.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (vendor_id && vendor_id !== 'all') {
            query += ` AND g.vendor_id = $${counter}`;
            values.push(vendor_id);
            counter++;
        }

        if (start_date) {
            query += ` AND g.received_date >= $${counter}`;
            values.push(start_date);
            counter++;
        }

        if (end_date) {
            query += ` AND g.received_date <= $${counter}`;
            values.push(end_date);
            counter++;
        }

        if (search) {
            query += ` AND (
                g.grn_number ILIKE $${counter} OR
                g.invoice_number ILIKE $${counter} OR
                v.vendor_name ILIKE $${counter}
            )`;
            values.push(`%${search}%`);
            counter++;
        }

        query += ` GROUP BY g.id, v.vendor_id, c.company_id, b.branch_id, e.employee_id ORDER BY g.received_date DESC, g.id DESC`;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        query += ` LIMIT $${counter} OFFSET $${counter + 1}`;
        values.push(parseInt(limit, 10), offset);

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching GRNs:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch GRNs',
            error: error.message
        });
    }
};

// 3. Get single GRN with full Line Items
export const getGrnById = async (req, res) => {
    try {
        const { id } = req.params;

        const grnQuery = `
            SELECT 
                g.*,
                v.vendor_name,
                v.vendor_code,
                v.address as vendor_address,
                v.phone as vendor_phone,
                v.email as vendor_email,
                v.gstin as vendor_gstin,
                c.company_name,
                b.branch_name,
                CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as received_by_name
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.vendor_id
            LEFT JOIN companies c ON g.company_id = c.company_id
            LEFT JOIN branches b ON g.branch_id = b.branch_id
            LEFT JOIN employees e ON g.created_by = e.employee_id
            WHERE g.id = $1
        `;

        const grnRes = await pool.query(grnQuery, [id]);
        if (grnRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        const itemsQuery = `
            SELECT 
                gi.*,
                rm.material_code,
                rm.material_name,
                rm.unit_of_measure,
                rm.category,
                rmi.available_quantity as current_available_qty,
                rmi.status as inventory_status
            FROM grn_items gi
            JOIN raw_materials rm ON gi.raw_material_id = rm.material_id
            LEFT JOIN raw_material_inventory rmi ON gi.id = rmi.grn_item_id
            WHERE gi.grn_id = $1
            ORDER BY gi.id ASC
        `;

        const itemsRes = await pool.query(itemsQuery, [id]);

        return res.status(200).json({
            success: true,
            data: {
                ...grnRes.rows[0],
                items: itemsRes.rows
            }
        });

    } catch (error) {
        console.error('Error fetching GRN details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch GRN details',
            error: error.message
        });
    }
};

// 4. Update GRN header remarks / invoice details
export const updateGrn = async (req, res) => {
    try {
        const { id } = req.params;
        const { invoice_number, invoice_date, remarks } = req.body;

        const updateRes = await pool.query(`
            UPDATE grns SET
                invoice_number = COALESCE($1, invoice_number),
                invoice_date = COALESCE($2, invoice_date),
                remarks = COALESCE($3, remarks),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [invoice_number, invoice_date, remarks, id]);

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'GRN updated successfully',
            data: updateRes.rows[0]
        });

    } catch (error) {
        console.error('Error updating GRN:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update GRN',
            error: error.message
        });
    }
};
