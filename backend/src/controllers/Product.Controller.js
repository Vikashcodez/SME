import pool from '../config/database.js';

// 1. Create Product Master with Bill of Materials (BOM) & Photos
export const createProduct = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            company_id,
            branch_id,
            product_code,
            product_name,
            category = 'Finished Goods',
            unit_of_measure = 'PCS',
            selling_price,
            cost_price,
            hsn_code,
            gst_rate = 18.00,
            product_specification,
            min_stock_level = 0,
            production_time_minutes = 0,
            workforce_required = 1,
            status = 'Active',
            raw_materials // Can be JSON array or JSON string
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

        if (!product_name || product_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Product Name is required.'
            });
        }

        const price = parseFloat(selling_price);
        if (isNaN(price) || price < 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid Selling Price is required.'
            });
        }

        // Auto-generate product code if not provided
        let code = product_code && product_code.trim() !== '' 
            ? product_code.trim().toUpperCase() 
            : `PRD-${Math.floor(1000 + Math.random() * 9000)}`;

        // Process uploaded images (up to 3 photos)
        let photo_1 = req.body.photo_1 || null;
        let photo_2 = req.body.photo_2 || null;
        let photo_3 = req.body.photo_3 || null;

        if (req.files) {
            if (req.files.photo_1 && req.files.photo_1[0]) {
                photo_1 = `/uploads/products/${req.files.photo_1[0].filename}`;
            }
            if (req.files.photo_2 && req.files.photo_2[0]) {
                photo_2 = `/uploads/products/${req.files.photo_2[0].filename}`;
            }
            if (req.files.photo_3 && req.files.photo_3[0]) {
                photo_3 = `/uploads/products/${req.files.photo_3[0].filename}`;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                if (!photo_1 && req.files.photos[0]) photo_1 = `/uploads/products/${req.files.photos[0].filename}`;
                if (!photo_2 && req.files.photos[1]) photo_2 = `/uploads/products/${req.files.photos[1].filename}`;
                if (!photo_3 && req.files.photos[2]) photo_3 = `/uploads/products/${req.files.photos[2].filename}`;
            }
        }

        // Parse raw materials BOM list
        let bomItems = [];
        if (raw_materials) {
            if (typeof raw_materials === 'string') {
                try {
                    bomItems = JSON.parse(raw_materials);
                } catch (e) {
                    bomItems = [];
                }
            } else if (Array.isArray(raw_materials)) {
                bomItems = raw_materials;
            }
        }

        await client.query('BEGIN');

        // Insert Product Master
        const productQuery = `
            INSERT INTO products (
                company_id, branch_id, product_code, product_name, category,
                unit_of_measure, selling_price, cost_price, hsn_code, gst_rate,
                product_specification, photo_1, photo_2, photo_3,
                min_stock_level, production_time_minutes, workforce_required,
                status, is_active, created_by, updated_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17,
                $18, true, $19, $19
            ) RETURNING *
        `;

        const productResult = await client.query(productQuery, [
            effectiveCompanyId,
            effectiveBranchId || null,
            code,
            product_name.trim(),
            category ? category.trim() : 'Finished Goods',
            unit_of_measure ? unit_of_measure.trim() : 'PCS',
            price,
            parseFloat(cost_price) || 0.00,
            hsn_code ? hsn_code.trim() : null,
            parseFloat(gst_rate) || 18.00,
            product_specification ? product_specification.trim() : null,
            photo_1,
            photo_2,
            photo_3,
            parseFloat(min_stock_level) || 0.00,
            parseFloat(production_time_minutes) || 0.00,
            parseInt(workforce_required, 10) || 1,
            status || 'Active',
            performedBy
        ]);

        const newProduct = productResult.rows[0];
        const insertedBom = [];

        // Insert BOM Recipe items
        if (bomItems && bomItems.length > 0) {
            for (const item of bomItems) {
                if (item.material_id && parseFloat(item.quantity_required) > 0) {
                    const bomRes = await client.query(`
                        INSERT INTO product_bom (
                            product_id, material_id, quantity_required, scrap_percentage, notes
                        ) VALUES ($1, $2, $3, $4, $5)
                        RETURNING *
                    `, [
                        newProduct.product_id,
                        item.material_id,
                        parseFloat(item.quantity_required),
                        parseFloat(item.scrap_percentage) || 0.00,
                        item.notes || null
                    ]);
                    insertedBom.push(bomRes.rows[0]);
                }
            }
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Product Master created successfully with BOM recipe.',
            data: {
                ...newProduct,
                bom: insertedBom
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating product:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating product',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 2. Get All Products with BOM recipe details
export const getAllProducts = async (req, res) => {
    try {
        const { company_id, branch_id, category, status, search, include_bom = 'true' } = req.query;

        let query = `
            SELECT 
                p.*,
                c.company_name,
                b.branch_name,
                e1.first_name as created_by_name,
                (
                    SELECT COUNT(*) 
                    FROM product_bom pb 
                    WHERE pb.product_id = p.product_id
                ) as total_bom_materials,
                (
                    SELECT COALESCE(SUM(pb.quantity_required * COALESCE(rm.unit_price, 0)), 0)
                    FROM product_bom pb
                    JOIN raw_materials rm ON pb.material_id = rm.material_id
                    WHERE pb.product_id = p.product_id
                ) as estimated_bom_cost
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN branches b ON p.branch_id = b.branch_id
            LEFT JOIN employees e1 ON p.created_by = e1.employee_id
            WHERE p.is_active = true
        `;

        const values = [];
        let counter = 1;

        if (company_id) {
            query += ` AND p.company_id = $${counter}`;
            values.push(company_id);
            counter++;
        }

        if (branch_id && branch_id !== 'all') {
            query += ` AND (p.branch_id = $${counter} OR p.branch_id IS NULL)`;
            values.push(branch_id);
            counter++;
        }

        if (category && category !== 'all') {
            query += ` AND p.category ILIKE $${counter}`;
            values.push(category);
            counter++;
        }

        if (status && status !== 'all') {
            query += ` AND p.status = $${counter}`;
            values.push(status);
            counter++;
        }

        if (search) {
            query += ` AND (
                p.product_name ILIKE $${counter} OR 
                p.product_code ILIKE $${counter} OR 
                p.category ILIKE $${counter} OR
                p.hsn_code ILIKE $${counter} OR
                p.product_specification ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY p.product_name ASC`;

        const result = await pool.query(query, values);

        // Fetch BOM details for all products if requested
        if (include_bom === 'true' && result.rows.length > 0) {
            const productIds = result.rows.map(r => r.product_id);
            const bomQuery = `
                SELECT 
                    pb.*,
                    rm.material_code,
                    rm.material_name,
                    rm.category as material_category,
                    rm.unit_of_measure,
                    rm.unit_price as material_unit_price,
                    (pb.quantity_required * COALESCE(rm.unit_price, 0)) as line_material_cost
                FROM product_bom pb
                JOIN raw_materials rm ON pb.material_id = rm.material_id
                WHERE pb.product_id = ANY($1)
                ORDER BY rm.material_name ASC
            `;
            const bomRes = await pool.query(bomQuery, [productIds]);
            
            // Map BOM items by product_id
            const bomMap = {};
            for (const item of bomRes.rows) {
                if (!bomMap[item.product_id]) bomMap[item.product_id] = [];
                bomMap[item.product_id].push(item);
            }

            for (const row of result.rows) {
                row.bom_items = bomMap[row.product_id] || [];
            }
        }

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching products',
            error: error.message
        });
    }
};

// 3. Get Product By ID with BOM Details
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const productQuery = `
            SELECT 
                p.*,
                c.company_name,
                b.branch_name,
                e.first_name as created_by_name
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.company_id
            LEFT JOIN branches b ON p.branch_id = b.branch_id
            LEFT JOIN employees e ON p.created_by = e.employee_id
            WHERE p.product_id = $1 AND p.is_active = true
        `;

        const productResult = await pool.query(productQuery, [id]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        const product = productResult.rows[0];

        // Fetch Bill of Materials Recipe items
        const bomQuery = `
            SELECT 
                pb.*,
                rm.material_code,
                rm.material_name,
                rm.category as material_category,
                rm.unit_of_measure,
                rm.unit_price as material_unit_price,
                (pb.quantity_required * COALESCE(rm.unit_price, 0)) as line_material_cost
            FROM product_bom pb
            JOIN raw_materials rm ON pb.material_id = rm.material_id
            WHERE pb.product_id = $1
            ORDER BY rm.material_name ASC
        `;

        const bomResult = await pool.query(bomQuery, [id]);
        product.bom_items = bomResult.rows;

        // Calculate total BOM cost
        product.total_bom_cost = bomResult.rows.reduce((sum, item) => sum + parseFloat(item.line_material_cost || 0), 0);

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching product details',
            error: error.message
        });
    }
};

// 4. Update Product & BOM Recipe
export const updateProduct = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            product_code,
            product_name,
            category,
            unit_of_measure,
            selling_price,
            cost_price,
            hsn_code,
            gst_rate,
            product_specification,
            min_stock_level,
            production_time_minutes,
            workforce_required,
            status,
            raw_materials
        } = req.body;

        const performedBy = req.user?.employee_id || null;

        // Verify product exists
        const checkRes = await client.query('SELECT * FROM products WHERE product_id = $1 AND is_active = true', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        const existing = checkRes.rows[0];

        let photo_1 = existing.photo_1;
        let photo_2 = existing.photo_2;
        let photo_3 = existing.photo_3;

        if (req.body.photo_1 !== undefined) photo_1 = req.body.photo_1;
        if (req.body.photo_2 !== undefined) photo_2 = req.body.photo_2;
        if (req.body.photo_3 !== undefined) photo_3 = req.body.photo_3;

        if (req.files) {
            if (req.files.photo_1 && req.files.photo_1[0]) {
                photo_1 = `/uploads/products/${req.files.photo_1[0].filename}`;
            }
            if (req.files.photo_2 && req.files.photo_2[0]) {
                photo_2 = `/uploads/products/${req.files.photo_2[0].filename}`;
            }
            if (req.files.photo_3 && req.files.photo_3[0]) {
                photo_3 = `/uploads/products/${req.files.photo_3[0].filename}`;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                if (req.files.photos[0]) photo_1 = `/uploads/products/${req.files.photos[0].filename}`;
                if (req.files.photos[1]) photo_2 = `/uploads/products/${req.files.photos[1].filename}`;
                if (req.files.photos[2]) photo_3 = `/uploads/products/${req.files.photos[2].filename}`;
            }
        }

        await client.query('BEGIN');

        // Update Product Master
        const updateQuery = `
            UPDATE products
            SET product_code = COALESCE($1, product_code),
                product_name = COALESCE($2, product_name),
                category = COALESCE($3, category),
                unit_of_measure = COALESCE($4, unit_of_measure),
                selling_price = COALESCE($5, selling_price),
                cost_price = COALESCE($6, cost_price),
                hsn_code = COALESCE($7, hsn_code),
                gst_rate = COALESCE($8, gst_rate),
                product_specification = COALESCE($9, product_specification),
                photo_1 = $10,
                photo_2 = $11,
                photo_3 = $12,
                min_stock_level = COALESCE($13, min_stock_level),
                production_time_minutes = COALESCE($14, production_time_minutes),
                workforce_required = COALESCE($15, workforce_required),
                status = COALESCE($16, status),
                updated_by = $17,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $18
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            product_code ? product_code.trim() : null,
            product_name ? product_name.trim() : null,
            category ? category.trim() : null,
            unit_of_measure ? unit_of_measure.trim() : null,
            selling_price !== undefined ? parseFloat(selling_price) : null,
            cost_price !== undefined ? parseFloat(cost_price) : null,
            hsn_code ? hsn_code.trim() : null,
            gst_rate !== undefined ? parseFloat(gst_rate) : null,
            product_specification !== undefined ? product_specification.trim() : null,
            photo_1,
            photo_2,
            photo_3,
            min_stock_level !== undefined ? parseFloat(min_stock_level) : null,
            production_time_minutes !== undefined ? parseFloat(production_time_minutes) : null,
            workforce_required !== undefined ? parseInt(workforce_required, 10) : null,
            status || null,
            performedBy,
            id
        ]);

        // If raw_materials BOM was passed, sync the BOM table
        if (raw_materials !== undefined) {
            let bomItems = [];
            if (typeof raw_materials === 'string') {
                try {
                    bomItems = JSON.parse(raw_materials);
                } catch (e) {
                    bomItems = [];
                }
            } else if (Array.isArray(raw_materials)) {
                bomItems = raw_materials;
            }

            // Remove existing BOM lines
            await client.query('DELETE FROM product_bom WHERE product_id = $1', [id]);

            // Re-insert updated BOM lines
            for (const item of bomItems) {
                if (item.material_id && parseFloat(item.quantity_required) > 0) {
                    await client.query(`
                        INSERT INTO product_bom (
                            product_id, material_id, quantity_required, scrap_percentage, notes
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [
                        id,
                        item.material_id,
                        parseFloat(item.quantity_required),
                        parseFloat(item.scrap_percentage) || 0.00,
                        item.notes || null
                    ]);
                }
            }
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Product Master and BOM recipe updated successfully.',
            data: updateResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while updating product',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// 5. Soft Delete Product
export const softDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const performedBy = req.user?.employee_id || null;

        const result = await pool.query(`
            UPDATE products
            SET is_active = false, status = 'Inactive', updated_by = $1, updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $2 AND is_active = true
            RETURNING product_id, product_name
        `, [performedBy, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found or already deactivated.' });
        }

        return res.status(200).json({
            success: true,
            message: `Product "${result.rows[0].product_name}" deactivated successfully.`
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while deactivating product',
            error: error.message
        });
    }
};

// 6. Restore Product
export const restoreProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const performedBy = req.user?.employee_id || null;

        const result = await pool.query(`
            UPDATE products
            SET is_active = true, status = 'Active', updated_by = $1, updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $2
            RETURNING product_id, product_name
        `, [performedBy, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        return res.status(200).json({
            success: true,
            message: `Product "${result.rows[0].product_name}" restored successfully.`
        });
    } catch (error) {
        console.error('Error restoring product:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while restoring product',
            error: error.message
        });
    }
};

// 7. Get Product Categories
export const getProductCategories = async (req, res) => {
    try {
        const { company_id } = req.query;
        let query = `
            SELECT DISTINCT category 
            FROM products 
            WHERE is_active = true AND category IS NOT NULL AND category != ''
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
            message: 'Internal server error while fetching categories',
            error: error.message
        });
    }
};
