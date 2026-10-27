import pool from '../config/database.js';
import { fetchAndBuildRealHsnDataset } from '../scripts/fetch_real_hsn.js';

// 1. Search and Get All HSN Codes
export const getAllHsn = async (req, res) => {
    try {
        const { search, category, chapter, type = 'GOODS', limit = 150, offset = 0 } = req.query;

        let query = `
            SELECT 
                id,
                hsn_code,
                description,
                category,
                gst_rate,
                item_type,
                chapter
            FROM hsn_master
            WHERE is_active = true
        `;

        const values = [];
        let counter = 1;

        if (type && type !== 'all') {
            query += ` AND item_type = $${counter}`;
            values.push(type.toUpperCase());
            counter++;
        }

        if (chapter && chapter !== 'all') {
            query += ` AND chapter = $${counter}`;
            values.push(chapter.padStart(2, '0'));
            counter++;
        }

        if (category && category !== 'all') {
            query += ` AND category ILIKE $${counter}`;
            values.push(category);
            counter++;
        }

        if (search && search.trim() !== '') {
            query += ` AND (
                hsn_code ILIKE $${counter} OR 
                description ILIKE $${counter} OR 
                category ILIKE $${counter}
            )`;
            values.push(`%${search.trim()}%`);
            counter++;
        }

        query += ` ORDER BY hsn_code ASC LIMIT $${counter} OFFSET $${counter + 1}`;
        values.push(parseInt(limit, 10) || 150, parseInt(offset, 10) || 0);

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching HSN codes:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch HSN dataset',
            error: error.message
        });
    }
};

// 2. Get HSN Details by exact code
export const getHsnByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({ success: false, message: 'HSN code is required' });
        }

        const cleanCode = code.trim();
        // Exact match first, or prefix match
        const result = await pool.query(`
            SELECT 
                id,
                hsn_code,
                description,
                category,
                gst_rate,
                item_type,
                chapter
            FROM hsn_master
            WHERE hsn_code = $1 OR hsn_code LIKE $2
            ORDER BY CASE WHEN hsn_code = $1 THEN 1 ELSE 2 END
            LIMIT 1
        `, [cleanCode, `${cleanCode}%`]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `HSN Code '${cleanCode}' not found in master dataset`
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching HSN by code:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to look up HSN code',
            error: error.message
        });
    }
};

// 3. Get All Distinct HSN Categories with Code Counts & Chapters
export const getHsnCategories = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                category,
                chapter,
                COUNT(*) AS code_count
            FROM hsn_master 
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category, chapter
            ORDER BY chapter ASC, category ASC
        `);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching HSN categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch HSN categories',
            error: error.message
        });
    }
};

// 4. Sync / Refresh HSN Dataset from Live Official Source
export const syncHsnFromApi = async (req, res) => {
    try {
        const dataset = await fetchAndBuildRealHsnDataset();
        if (!dataset || dataset.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve HSN records from source'
            });
        }

        // Batch insert/update into database
        const BATCH_SIZE = 400;
        for (let i = 0; i < dataset.length; i += BATCH_SIZE) {
            const chunk = dataset.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = [];

            chunk.forEach((item, idx) => {
                const offset = idx * 6;
                placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
                values.push(
                    item.hsn_code,
                    item.description,
                    item.category,
                    item.gst_rate || 18.00,
                    item.item_type || 'GOODS',
                    item.chapter || item.hsn_code.slice(0, 2)
                );
            });

            const queryText = `
                INSERT INTO hsn_master (hsn_code, description, category, gst_rate, item_type, chapter)
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (hsn_code) DO UPDATE
                SET 
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    gst_rate = EXCLUDED.gst_rate,
                    chapter = EXCLUDED.chapter
            `;

            await pool.query(queryText, values);
        }

        const countRes = await pool.query(`SELECT COUNT(*) FROM hsn_master`);
        return res.status(200).json({
            success: true,
            message: `Successfully synchronized ${countRes.rows[0].count} real GST HSN records into database`,
            total_count: parseInt(countRes.rows[0].count, 10)
        });
    } catch (error) {
        console.error('Error syncing HSN dataset:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to sync HSN dataset from API',
            error: error.message
        });
    }
};

// 5. Create / Register Custom HSN Code
export const createHsn = async (req, res) => {
    try {
        const { hsn_code, description, category, gst_rate = 18.00, item_type = 'GOODS', chapter } = req.body;

        if (!hsn_code || !description || !category) {
            return res.status(400).json({
                success: false,
                message: 'HSN code, description and category are required'
            });
        }

        const result = await pool.query(`
            INSERT INTO hsn_master (hsn_code, description, category, gst_rate, item_type, chapter)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (hsn_code) DO UPDATE
            SET 
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                gst_rate = EXCLUDED.gst_rate,
                chapter = EXCLUDED.chapter
            RETURNING *
        `, [
            hsn_code.trim(),
            description.trim(),
            category.trim(),
            parseFloat(gst_rate) || 18.00,
            item_type ? item_type.trim().toUpperCase() : 'GOODS',
            chapter ? chapter.trim() : null
        ]);

        return res.status(201).json({
            success: true,
            message: 'HSN code registered successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving HSN code:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to save HSN code',
            error: error.message
        });
    }
};
