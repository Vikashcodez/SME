import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAndBuildRealHsnDataset } from '../scripts/fetch_real_hsn.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRealHsnDataset = async () => {
  const jsonPath = path.resolve(__dirname, '..', 'data', 'hsn_codes_real.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('⚠️ Could not read cached real HSN JSON, attempting live fetch...', e.message);
    }
  }

  // Fallback to fetch directly
  try {
    return await fetchAndBuildRealHsnDataset();
  } catch (err) {
    console.error('❌ Live fetch failed, fallback to empty array:', err.message);
    return [];
  }
};

export const initHsnSchemaAndSeed = async (pool) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hsn_master (
        id BIGSERIAL PRIMARY KEY,
        hsn_code VARCHAR(20) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        category VARCHAR(150) NOT NULL,
        gst_rate DECIMAL(5,2) DEFAULT 18.00,
        item_type VARCHAR(20) DEFAULT 'GOODS',
        chapter VARCHAR(10),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hsn_code ON hsn_master(hsn_code)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hsn_category ON hsn_master(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hsn_chapter ON hsn_master(chapter)`);

    // Check count of existing records
    const countRes = await pool.query(`SELECT COUNT(*) FROM hsn_master`);
    const currentCount = parseInt(countRes.rows[0].count, 10);

    const dataset = await getRealHsnDataset();
    if (dataset.length === 0) {
      console.log('ℹ️ No HSN dataset available to seed');
      return;
    }

    // If already seeded with realistic dataset (more than 1000 items), skip full reseed unless forced
    if (currentCount >= 1000) {
      console.log(`✅ HSN Master already populated with ${currentCount} real GST codes`);
      return;
    }

    console.log(`📦 Seeding ${dataset.length} real GST HSN codes into hsn_master...`);

    // Seed in batches of 400 for maximum PostgreSQL throughput
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

    const finalCountRes = await pool.query(`SELECT COUNT(*) FROM hsn_master`);
    console.log(`✅ HSN Master successfully seeded with ${finalCountRes.rows[0].count} real GST codes!`);
  } catch (error) {
    console.error('❌ Error initializing HSN master dataset:', error);
  }
};
