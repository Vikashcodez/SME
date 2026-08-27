import pool from '../src/config/database.js';
import initializeModularDatabase from '../src/db/initModularDb.js';

async function migrate() {
    try {
        console.log('🔄 Checking existing tables and running schema migration...');
        
        
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) DEFAULT 'CO-0001';
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(customer_id) ON DELETE SET NULL;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2) DEFAULT 0.00;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0.00;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_lead VARCHAR(100) DEFAULT 'Project Manager';
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'On Track';
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                    ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) DEFAULT 'CO-0001';
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS salvage_value DECIMAL(15,2) DEFAULT 0.00;
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS useful_life_years INTEGER DEFAULT 10;
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50) DEFAULT 'Straight Line';
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS accumulated_depreciation DECIMAL(15,2) DEFAULT 0.00;
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS net_book_value DECIMAL(15,2) DEFAULT 0.00;
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS location VARCHAR(150);
                    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_schedules') THEN
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) DEFAULT 'CO-0001';
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(customer_id);
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES sales_invoices(invoice_id);
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS destination_city VARCHAR(100) DEFAULT 'Pune';
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT '14ft Closed Container';
                    ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Scheduled';
                END IF;
            END $$;
        `);

        
        await initializeModularDatabase();
        console.log('✅ Database migration and seeds completed 100% successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

migrate();
