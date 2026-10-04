import pool from '../config/database.js';

// 1. Create a new Production Master (BOM) with Materials & Workforce
export const createProductionMaster = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            company_id,
            branch_id,
            product_id,
            version = 1,
            name,
            output_quantity = 1,
            output_unit = 'PCS',
            production_time_minutes = 0,
            overhead_cost = 0,
            other_expense = 0,
            status = 'ACTIVE',
            effective_from,
            materials = [], // Array of { raw_material_id, quantity, unit, wastage_percentage, sequence }
            workforce = []  // Array of { role, workers_required, hours_required, cost_per_hour }
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id || null;
        const createdBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Company ID is required.' });
        }

        if (!product_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Product is required.' });
        }

        // Calculate labor cost and workforce count from workforce entries if provided
        let parsedWorkforce = Array.isArray(workforce) ? workforce : [];
        if (typeof workforce === 'string') {
            try { parsedWorkforce = JSON.parse(workforce); } catch (e) { parsedWorkforce = []; }
        }

        let calculatedLaborCost = 0;
        let totalWorkers = 0;
        for (const wf of parsedWorkforce) {
            const workers = parseFloat(wf.workers_required || 1);
            const hours = parseFloat(wf.hours_required || 1);
            const costPerHour = parseFloat(wf.cost_per_hour || 0);
            calculatedLaborCost += workers * hours * costPerHour;
            totalWorkers += workers;
        }

        const finalLaborCost = req.body.labor_cost !== undefined ? parseFloat(req.body.labor_cost) : calculatedLaborCost;
        const finalWorkforceCount = req.body.workforce_count !== undefined ? parseFloat(req.body.workforce_count) : (totalWorkers || 1);

        const bomName = name && name.trim() !== '' ? name.trim() : `BOM - Version ${version}`;

        const masterInsertQuery = `
            INSERT INTO production_masters (
                company_id, branch_id, product_id, version,
                name, output_quantity, output_unit, workforce_count,
                production_time_minutes, labor_cost, overhead_cost,
                other_expense, status, effective_from, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const masterRes = await client.query(masterInsertQuery, [
            effectiveCompanyId,
            effectiveBranchId,
            product_id,
            parseInt(version, 10) || 1,
            bomName,
            parseFloat(output_quantity) || 1,
            output_unit || 'PCS',
            finalWorkforceCount,
            parseFloat(production_time_minutes) || 0,
            finalLaborCost,
            parseFloat(overhead_cost) || 0,
            parseFloat(other_expense) || 0,
            status || 'ACTIVE',
            effective_from || new Date().toISOString().split('T')[0],
            createdBy
        ]);

        const master = masterRes.rows[0];

        // Insert Materials
        let parsedMaterials = Array.isArray(materials) ? materials : [];
        if (typeof materials === 'string') {
            try { parsedMaterials = JSON.parse(materials); } catch (e) { parsedMaterials = []; }
        }

        const createdMaterials = [];
        for (let i = 0; i < parsedMaterials.length; i++) {
            const mat = parsedMaterials[i];
            const rawMaterialId = mat.raw_material_id || mat.material_id;
            const qty = parseFloat(mat.quantity || 0);
            if (!rawMaterialId || qty <= 0) continue;

            const matRes = await client.query(`
                INSERT INTO production_master_materials (
                    production_master_id, raw_material_id, quantity,
                    unit, wastage_percentage, sequence
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                master.id,
                rawMaterialId,
                qty,
                mat.unit || 'PCS',
                parseFloat(mat.wastage_percentage || 0),
                mat.sequence || (i + 1)
            ]);
            createdMaterials.push(matRes.rows[0]);
        }

        // Insert Workforce
        const createdWorkforce = [];
        for (const wf of parsedWorkforce) {
            const role = wf.role && wf.role.trim() !== '' ? wf.role.trim() : 'Worker';
            const workers = parseFloat(wf.workers_required || 1);
            const hours = parseFloat(wf.hours_required || 1);
            const costPerHour = parseFloat(wf.cost_per_hour || 0);

            const wfRes = await client.query(`
                INSERT INTO production_master_workforce (
                    production_master_id, role, workers_required,
                    hours_required, cost_per_hour
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                master.id,
                role,
                workers,
                hours,
                costPerHour
            ]);
            createdWorkforce.push(wfRes.rows[0]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Production Master / BOM created successfully.',
            data: {
                ...master,
                materials: createdMaterials,
                workforce: createdWorkforce
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating production master:', error);
        return res.status(500).json({ success: false, message: 'Failed to create Production Master', error: error.message });
    } finally {
        client.release();
    }
};

// 2. Get all Production Masters with aggregated cost calculations & product info
export const getAllProductionMasters = async (req, res) => {
    try {
        const { company_id, branch_id, product_id, status } = req.query;
        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;

        let query = `
            SELECT 
                pm.*,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                p.selling_price as product_selling_price,
                c.company_name,
                b.branch_name,
                COUNT(DISTINCT pmm.id) as material_items_count,
                COUNT(DISTINCT pmw.id) as workforce_items_count,
                COALESCE(SUM(pmm.quantity * rm.unit_price * (1 + COALESCE(pmm.wastage_percentage, 0)/100)), 0) as estimated_material_cost,
                (
                    COALESCE(SUM(pmm.quantity * rm.unit_price * (1 + COALESCE(pmm.wastage_percentage, 0)/100)), 0) +
                    COALESCE(pm.labor_cost, 0) +
                    COALESCE(pm.overhead_cost, 0) +
                    COALESCE(pm.other_expense, 0)
                ) as total_estimated_cost
            FROM production_masters pm
            JOIN products p ON pm.product_id = p.product_id
            LEFT JOIN companies c ON pm.company_id = c.company_id
            LEFT JOIN branches b ON pm.branch_id = b.branch_id
            LEFT JOIN production_master_materials pmm ON pm.id = pmm.production_master_id
            LEFT JOIN raw_materials rm ON pmm.raw_material_id = rm.material_id
            LEFT JOIN production_master_workforce pmw ON pm.id = pmw.production_master_id
            WHERE 1=1
        `;

        const values = [];
        let counter = 1;

        if (effectiveCompanyId) {
            query += ` AND pm.company_id = $${counter}`;
            values.push(effectiveCompanyId);
            counter++;
        }

        if (effectiveBranchId && effectiveBranchId !== 'all') {
            query += ` AND (pm.branch_id = $${counter} OR pm.branch_id IS NULL)`;
            values.push(effectiveBranchId);
            counter++;
        }

        if (product_id) {
            query += ` AND pm.product_id = $${counter}`;
            values.push(product_id);
            counter++;
        }

        if (status) {
            query += ` AND pm.status = $${counter}`;
            values.push(status);
            counter++;
        }

        query += ` GROUP BY pm.id, p.product_id, c.company_id, b.branch_id ORDER BY pm.product_id ASC, pm.version DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });

    } catch (error) {
        console.error('Error fetching production masters:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch Production Masters', error: error.message });
    }
};

// 3. Get single Production Master by ID with materials & workforce details
export const getProductionMasterById = async (req, res) => {
    try {
        const { id } = req.params;

        const masterQuery = `
            SELECT 
                pm.*,
                p.product_code,
                p.product_name,
                p.unit_of_measure as product_unit,
                p.selling_price,
                c.company_name,
                b.branch_name
            FROM production_masters pm
            JOIN products p ON pm.product_id = p.product_id
            LEFT JOIN companies c ON pm.company_id = c.company_id
            LEFT JOIN branches b ON pm.branch_id = b.branch_id
            WHERE pm.id = $1
        `;

        const masterRes = await pool.query(masterQuery, [id]);
        if (masterRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Production Master not found' });
        }

        const materialsQuery = `
            SELECT 
                pmm.*,
                rm.material_code,
                rm.material_name,
                rm.unit_of_measure as rm_unit,
                rm.unit_price as standard_price,
                (pmm.quantity * rm.unit_price * (1 + COALESCE(pmm.wastage_percentage, 0)/100)) as estimated_line_cost
            FROM production_master_materials pmm
            JOIN raw_materials rm ON pmm.raw_material_id = rm.material_id
            WHERE pmm.production_master_id = $1
            ORDER BY pmm.sequence ASC, pmm.id ASC
        `;

        const workforceQuery = `
            SELECT 
                pmw.*,
                (pmw.workers_required * pmw.hours_required * pmw.cost_per_hour) as line_labor_cost
            FROM production_master_workforce pmw
            WHERE pmw.production_master_id = $1
            ORDER BY pmw.id ASC
        `;

        const [materialsRes, workforceRes] = await Promise.all([
            pool.query(materialsQuery, [id]),
            pool.query(workforceQuery, [id])
        ]);

        return res.status(200).json({
            success: true,
            data: {
                ...masterRes.rows[0],
                materials: materialsRes.rows,
                workforce: workforceRes.rows
            }
        });

    } catch (error) {
        console.error('Error fetching production master by ID:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch Production Master details', error: error.message });
    }
};

// 4. Update Production Master
export const updateProductionMaster = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const {
            name,
            output_quantity,
            output_unit,
            workforce_count,
            production_time_minutes,
            labor_cost,
            overhead_cost,
            other_expense,
            status,
            effective_from,
            materials,
            workforce
        } = req.body;

        const updateMasterQuery = `
            UPDATE production_masters SET
                name = COALESCE($1, name),
                output_quantity = COALESCE($2, output_quantity),
                output_unit = COALESCE($3, output_unit),
                workforce_count = COALESCE($4, workforce_count),
                production_time_minutes = COALESCE($5, production_time_minutes),
                labor_cost = COALESCE($6, labor_cost),
                overhead_cost = COALESCE($7, overhead_cost),
                other_expense = COALESCE($8, other_expense),
                status = COALESCE($9, status),
                effective_from = COALESCE($10, effective_from),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *
        `;

        const masterRes = await client.query(updateMasterQuery, [
            name, output_quantity, output_unit, workforce_count,
            production_time_minutes, labor_cost, overhead_cost,
            other_expense, status, effective_from, id
        ]);

        if (masterRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Production Master not found' });
        }

        // If materials provided, replace materials
        if (materials !== undefined) {
            let parsedMaterials = Array.isArray(materials) ? materials : [];
            if (typeof materials === 'string') {
                try { parsedMaterials = JSON.parse(materials); } catch (e) { parsedMaterials = []; }
            }
            await client.query(`DELETE FROM production_master_materials WHERE production_master_id = $1`, [id]);
            for (let i = 0; i < parsedMaterials.length; i++) {
                const mat = parsedMaterials[i];
                const rawMaterialId = mat.raw_material_id || mat.material_id;
                const qty = parseFloat(mat.quantity || 0);
                if (!rawMaterialId || qty <= 0) continue;

                await client.query(`
                    INSERT INTO production_master_materials (
                        production_master_id, raw_material_id, quantity,
                        unit, wastage_percentage, sequence
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    id, rawMaterialId, qty, mat.unit || 'PCS',
                    parseFloat(mat.wastage_percentage || 0), mat.sequence || (i + 1)
                ]);
            }
        }

        // If workforce provided, replace workforce
        if (workforce !== undefined) {
            let parsedWorkforce = Array.isArray(workforce) ? workforce : [];
            if (typeof workforce === 'string') {
                try { parsedWorkforce = JSON.parse(workforce); } catch (e) { parsedWorkforce = []; }
            }
            await client.query(`DELETE FROM production_master_workforce WHERE production_master_id = $1`, [id]);
            for (const wf of parsedWorkforce) {
                const role = wf.role && wf.role.trim() !== '' ? wf.role.trim() : 'Worker';
                const workers = parseFloat(wf.workers_required || 1);
                const hours = parseFloat(wf.hours_required || 1);
                const costPerHour = parseFloat(wf.cost_per_hour || 0);

                await client.query(`
                    INSERT INTO production_master_workforce (
                        production_master_id, role, workers_required,
                        hours_required, cost_per_hour
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [id, role, workers, hours, costPerHour]);
            }
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Production Master updated successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating production master:', error);
        return res.status(500).json({ success: false, message: 'Failed to update Production Master', error: error.message });
    } finally {
        client.release();
    }
};
