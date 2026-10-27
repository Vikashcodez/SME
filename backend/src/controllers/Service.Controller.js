import pool from '../config/database.js';

// Standard Service Categories
export const SERVICE_CATEGORIES = [
    'Consulting & Professional',
    'IT & Software Development',
    'Maintenance & AMC',
    'Installation & Commissioning',
    'Repair & Overhaul Services',
    'Engineering & Technical Design',
    'Logistics & Transportation',
    'Fabrication & Machining Services',
    'Testing & Quality Certification',
    'Manpower & Facility Management',
    'Marketing & Digital Services',
    'General Business Services'
];

// 1. Create Service Master
export const createService = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            company_id,
            branch_id,
            service_code,
            service_name,
            category = 'General Business Services',
            billing_type = 'Per Service',
            unit_of_measure = 'HRS',
            service_charge,
            cost_estimate = 0,
            sac_code = '9983',
            gst_rate = 18.00,
            service_description,
            service_duration_hours = 1,
            terms_and_conditions,
            status = 'Active'
        } = req.body;

        const effectiveCompanyId = company_id || req.user?.company_id;
        const effectiveBranchId = branch_id || req.user?.branch_id;
        const performedBy = req.user?.employee_id || null;

        if (!effectiveCompanyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required.'
            });
        }

        if (!service_name || service_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Service Name is required.'
            });
        }

        const charge = parseFloat(service_charge);
        if (isNaN(charge) || charge < 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid Service Charge / Price is required.'
            });
        }

        // Auto-generate service code if not provided
        let code = service_code && service_code.trim() !== ''
            ? service_code.trim().toUpperCase()
            : `SRV-${Math.floor(1000 + Math.random() * 9000)}`;

        // Process uploaded images (up to 3 photos)
        let photo_1 = req.body.photo_1 || null;
        let photo_2 = req.body.photo_2 || null;
        let photo_3 = req.body.photo_3 || null;

        if (req.files) {
            if (req.files.photo_1 && req.files.photo_1[0]) {
                photo_1 = `/uploads/services/${req.files.photo_1[0].filename}`;
            }
            if (req.files.photo_2 && req.files.photo_2[0]) {
                photo_2 = `/uploads/services/${req.files.photo_2[0].filename}`;
            }
            if (req.files.photo_3 && req.files.photo_3[0]) {
                photo_3 = `/uploads/services/${req.files.photo_3[0].filename}`;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                if (!photo_1 && req.files.photos[0]) photo_1 = `/uploads/services/${req.files.photos[0].filename}`;
                if (!photo_2 && req.files.photos[1]) photo_2 = `/uploads/services/${req.files.photos[1].filename}`;
                if (!photo_3 && req.files.photos[2]) photo_3 = `/uploads/services/${req.files.photos[2].filename}`;
            }
        }

        const insertQuery = `
            INSERT INTO services (
                company_id, branch_id, service_code, service_name, category,
                billing_type, unit_of_measure, service_charge, selling_price,
                cost_estimate, cost_price, sac_code, hsn_code, gst_rate,
                service_description, service_duration_hours, terms_and_conditions,
                photo_1, photo_2, photo_3, status, is_active, created_by, updated_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $8,
                $9, $9, $10, $10, $11,
                $12, $13, $14,
                $15, $16, $17, $18, true, $19, $19
            ) RETURNING *
        `;

        const result = await client.query(insertQuery, [
            effectiveCompanyId,
            effectiveBranchId || null,
            code,
            service_name.trim(),
            category ? category.trim() : 'General Business Services',
            billing_type ? billing_type.trim() : 'Per Service',
            unit_of_measure ? unit_of_measure.trim() : 'HRS',
            charge,
            parseFloat(cost_estimate) || 0.00,
            sac_code ? sac_code.trim() : '9983',
            parseFloat(gst_rate) || 18.00,
            service_description ? service_description.trim() : null,
            parseFloat(service_duration_hours) || 1.00,
            terms_and_conditions ? terms_and_conditions.trim() : null,
            photo_1,
            photo_2,
            photo_3,
            status || 'Active',
            performedBy
        ]);

        return res.status(201).json({
            success: true,
            message: 'Service Master created successfully.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating service:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating service',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 2. Get All Services
export const getAllServices = async (req, res) => {
    try {
        const { company_id, branch_id, category, status, search } = req.query;

        let query = `
            SELECT 
                s.*,
                c.company_name,
                b.branch_name,
                e1.first_name as created_by_name
            FROM services s
            LEFT JOIN companies c ON s.company_id = c.company_id
            LEFT JOIN branches b ON s.branch_id = b.branch_id
            LEFT JOIN employees e1 ON s.created_by = e1.employee_id
            WHERE s.is_active = true
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND s.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (s.branch_id = $${counter} OR s.branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        if (category && category !== 'all') {
            query += ` AND s.category ILIKE $${counter}`;
            values.push(category);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND s.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (search) {
            query += ` AND (
                s.service_name ILIKE $${counter} OR 
                s.service_code ILIKE $${counter} OR 
                s.category ILIKE $${counter} OR
                s.sac_code ILIKE $${counter} OR
                s.service_description ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY s.service_name ASC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: error.message
        });
    }
};

// 3. Get Service By ID
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const serviceQuery = `
            SELECT 
                s.*,
                c.company_name,
                b.branch_name,
                e1.first_name as created_by_name,
                e2.first_name as updated_by_name
            FROM services s
            LEFT JOIN companies c ON s.company_id = c.company_id
            LEFT JOIN branches b ON s.branch_id = b.branch_id
            LEFT JOIN employees e1 ON s.created_by = e1.employee_id
            LEFT JOIN employees e2 ON s.updated_by = e2.employee_id
            WHERE s.service_id = $1
        `;

        const result = await pool.query(serviceQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching service by ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch service details',
            error: error.message
        });
    }
};

// 4. Update Service Master
export const updateService = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            service_code,
            service_name,
            category,
            billing_type,
            unit_of_measure,
            service_charge,
            cost_estimate,
            sac_code,
            gst_rate,
            service_description,
            service_duration_hours,
            terms_and_conditions,
            status,
            branch_id
        } = req.body;

        const performedBy = req.user?.employee_id || null;

        // Verify service exists
        const checkQuery = `SELECT * FROM services WHERE service_id = $1`;
        const checkRes = await client.query(checkQuery, [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const existingService = checkRes.rows[0];

        // Process updated images (keep old if not newly provided)
        let photo_1 = existingService.photo_1;
        let photo_2 = existingService.photo_2;
        let photo_3 = existingService.photo_3;

        if (req.body.photo_1 !== undefined) photo_1 = req.body.photo_1;
        if (req.body.photo_2 !== undefined) photo_2 = req.body.photo_2;
        if (req.body.photo_3 !== undefined) photo_3 = req.body.photo_3;

        if (req.files) {
            if (req.files.photo_1 && req.files.photo_1[0]) {
                photo_1 = `/uploads/services/${req.files.photo_1[0].filename}`;
            }
            if (req.files.photo_2 && req.files.photo_2[0]) {
                photo_2 = `/uploads/services/${req.files.photo_2[0].filename}`;
            }
            if (req.files.photo_3 && req.files.photo_3[0]) {
                photo_3 = `/uploads/services/${req.files.photo_3[0].filename}`;
            }
        }

        const charge = service_charge !== undefined ? parseFloat(service_charge) : parseFloat(existingService.service_charge);
        const cost = cost_estimate !== undefined ? parseFloat(cost_estimate) : parseFloat(existingService.cost_estimate);
        const sac = sac_code !== undefined ? sac_code : existingService.sac_code;

        const updateQuery = `
            UPDATE services
            SET 
                service_code = COALESCE($1, service_code),
                service_name = COALESCE($2, service_name),
                category = COALESCE($3, category),
                billing_type = COALESCE($4, billing_type),
                unit_of_measure = COALESCE($5, unit_of_measure),
                service_charge = $6,
                selling_price = $6,
                cost_estimate = $7,
                cost_price = $7,
                sac_code = $8,
                hsn_code = $8,
                gst_rate = COALESCE($9, gst_rate),
                service_description = COALESCE($10, service_description),
                service_duration_hours = COALESCE($11, service_duration_hours),
                terms_and_conditions = COALESCE($12, terms_and_conditions),
                photo_1 = $13,
                photo_2 = $14,
                photo_3 = $15,
                status = COALESCE($16, status),
                branch_id = COALESCE($17, branch_id),
                updated_by = $18,
                updated_at = CURRENT_TIMESTAMP
            WHERE service_id = $19
            RETURNING *
        `;

        const updateRes = await client.query(updateQuery, [
            service_code ? service_code.trim().toUpperCase() : null,
            service_name ? service_name.trim() : null,
            category ? category.trim() : null,
            billing_type ? billing_type.trim() : null,
            unit_of_measure ? unit_of_measure.trim() : null,
            charge,
            cost,
            sac,
            gst_rate !== undefined ? parseFloat(gst_rate) : null,
            service_description !== undefined ? service_description : null,
            service_duration_hours !== undefined ? parseFloat(service_duration_hours) : null,
            terms_and_conditions !== undefined ? terms_and_conditions : null,
            photo_1,
            photo_2,
            photo_3,
            status || null,
            branch_id !== undefined ? branch_id : null,
            performedBy,
            id
        ]);

        return res.status(200).json({
            success: true,
            message: 'Service Master updated successfully.',
            data: updateRes.rows[0]
        });
    } catch (error) {
        console.error('Error updating service:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update service master',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 5. Soft Delete Service
export const softDeleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const performedBy = req.user?.employee_id || null;

        const result = await pool.query(`
            UPDATE services
            SET is_active = false, status = 'Inactive', updated_by = $1, updated_at = CURRENT_TIMESTAMP
            WHERE service_id = $2
            RETURNING service_id, service_name, status, is_active
        `, [performedBy, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Service '${result.rows[0].service_name}' deactivated successfully.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error deactivating service:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to deactivate service',
            error: error.message
        });
    }
};

// 6. Restore Service
export const restoreService = async (req, res) => {
    try {
        const { id } = req.params;
        const performedBy = req.user?.employee_id || null;

        const result = await pool.query(`
            UPDATE services
            SET is_active = true, status = 'Active', updated_by = $1, updated_at = CURRENT_TIMESTAMP
            WHERE service_id = $2
            RETURNING service_id, service_name, status, is_active
        `, [performedBy, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Service '${result.rows[0].service_name}' restored successfully.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error restoring service:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to restore service',
            error: error.message
        });
    }
};

// 7. Get Service Categories
export const getServiceCategories = async (req, res) => {
    try {
        const { company_id } = req.query;
        let query = `
            SELECT DISTINCT category 
            FROM services 
            WHERE category IS NOT NULL AND category != ''
        `;
        const values = [];
        if (company_id) {
            query += ` AND company_id = $1`;
            values.push(company_id);
        }

        const result = await pool.query(query, values);
        const dbCategories = result.rows.map(r => r.category);
        
        // Merge with preset categories without duplicates
        const allCategories = Array.from(new Set([...SERVICE_CATEGORIES, ...dbCategories]));

        return res.status(200).json({
            success: true,
            data: allCategories
        });
    } catch (error) {
        console.error('Error fetching service categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch service categories',
            error: error.message
        });
    }
};
