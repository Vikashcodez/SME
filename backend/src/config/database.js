import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        return false;
    }
};

// Create companies table only
export const createTables = async () => {
    try {

        // company table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS companies (
                company_id BIGSERIAL PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                company_code VARCHAR(50) NOT NULL UNIQUE,
                logo_url VARCHAR(500),
                establishment_year INTEGER,
                pan VARCHAR(10) UNIQUE,
                cin VARCHAR(21) UNIQUE,
                gst_no VARCHAR(15) UNIQUE,
                address TEXT,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                email_id VARCHAR(255) UNIQUE NOT NULL,
                company_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        //Branches table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS branches (
                branch_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_name VARCHAR(255) NOT NULL,
                branch_code VARCHAR(50) NOT NULL UNIQUE,
                address TEXT,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                email_id VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        // employee table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                employee_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100),
                employee_code VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                dob DATE,
                gender VARCHAR(10),
                department VARCHAR(100),
                role VARCHAR(100),
                date_of_joining DATE,
                address TEXT,
                password VARCHAR(255) NOT NULL,
                is_company_admin BOOLEAN DEFAULT FALSE,
                is_baranch_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        //roles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                role_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                role_name VARCHAR(100) NOT NULL,
                role_description VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // department table 
        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                department_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                department_name VARCHAR(100) NOT NULL,
                department_description VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Vendors table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendors (
                vendor_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                vendor_code VARCHAR(50),
                vendor_name VARCHAR(200) NOT NULL,
                gstin VARCHAR(15),
                pan VARCHAR(10),
                address VARCHAR(300) NOT NULL,
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100) NOT NULL,
                pincode VARCHAR(10),
                phone VARCHAR(20),
                email VARCHAR(150),
                bank_account_no VARCHAR(30),
                ifsc_code VARCHAR(15),
                bank_name VARCHAR(100),
                payment_terms VARCHAR(100),
                opening_balance DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'Active',
                is_active BOOLEAN DEFAULT TRUE,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                updated_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Raw Materials Master table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_materials (
                material_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                material_code VARCHAR(50) NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                unit_of_measure VARCHAR(30) NOT NULL,
                hsn_code VARCHAR(20),
                gst_rate DECIMAL(5,2) DEFAULT 0.00,
                unit_price DECIMAL(14,2) DEFAULT 0.00,
                minimum_stock_level DECIMAL(14,2) DEFAULT 0.00,
                reorder_quantity DECIMAL(14,2) DEFAULT 0.00,
                lead_time_days INTEGER DEFAULT 0,
                preferred_vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'Active',
                is_active BOOLEAN DEFAULT TRUE,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                updated_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Raw Material Current Inventory table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_material_inventory (
                inventory_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE CASCADE,
                warehouse_location VARCHAR(100),
                current_stock DECIMAL(14,2) DEFAULT 0.00,
                allocated_stock DECIMAL(14,2) DEFAULT 0.00,
                available_stock DECIMAL(14,2) DEFAULT 0.00,
                average_unit_cost DECIMAL(14,2) DEFAULT 0.00,
                total_value DECIMAL(14,2) DEFAULT 0.00,
                last_stock_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unq_branch_material UNIQUE (branch_id, material_id)
            )
        `);

        // Raw Material Stock Movements / Ledger table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_material_stock_movements (
                movement_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE SET NULL,
                asset_id BIGINT REFERENCES assets(asset_id) ON DELETE SET NULL,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                movement_type VARCHAR(50) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'Raw Material',
                quantity DECIMAL(14,2) NOT NULL,
                unit_cost DECIMAL(14,2) DEFAULT 0.00,
                total_cost DECIMAL(14,2) DEFAULT 0.00,
                reference_no VARCHAR(100),
                batch_no VARCHAR(100),
                invoice_number VARCHAR(100),
                invoice_date DATE,
                invoice_url VARCHAR(500),
                notes TEXT,
                performed_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Raw Material Returns & Damaged Stock table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_material_returns (
                return_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE CASCADE,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                return_type VARCHAR(50) NOT NULL,
                quantity DECIMAL(14,2) NOT NULL,
                unit_cost DECIMAL(14,2) DEFAULT 0.00,
                total_loss_value DECIMAL(14,2) DEFAULT 0.00,
                action_taken VARCHAR(100) DEFAULT 'Return to Vendor / RMA',
                reference_no VARCHAR(100),
                batch_no VARCHAR(100),
                reason_notes TEXT,
                reported_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                status VARCHAR(30) DEFAULT 'Pending Review',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Assets Inventory Master & Registry table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS assets (
                asset_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                department_id BIGINT REFERENCES departments(department_id) ON DELETE SET NULL,
                assigned_employee_id BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                asset_tag VARCHAR(100) NOT NULL,
                asset_name VARCHAR(255) NOT NULL,
                asset_category VARCHAR(100) NOT NULL,
                brand_model VARCHAR(150),
                serial_number VARCHAR(100),
                purchase_date DATE,
                purchase_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                current_value DECIMAL(14,2) DEFAULT 0.00,
                depreciation_rate DECIMAL(5,2) DEFAULT 0.00,
                location VARCHAR(150),
                asset_status VARCHAR(30) DEFAULT 'In Use',
                condition VARCHAR(30) DEFAULT 'Good',
                invoice_number VARCHAR(100),
                invoice_date DATE,
                invoice_url VARCHAR(500),
                warranty_expiry_date DATE,
                last_service_date DATE,
                next_service_due DATE,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                updated_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Automatic column migrations if tables existed previously
        await pool.query(`
            ALTER TABLE raw_material_stock_movements ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
            ALTER TABLE raw_material_stock_movements ADD COLUMN IF NOT EXISTS invoice_date DATE;
            ALTER TABLE raw_material_stock_movements ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(500);
            ALTER TABLE raw_material_stock_movements ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'Raw Material';
            ALTER TABLE raw_material_stock_movements ADD COLUMN IF NOT EXISTS asset_id BIGINT;
            ALTER TABLE assets ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
            ALTER TABLE assets ADD COLUMN IF NOT EXISTS invoice_date DATE;
            ALTER TABLE assets ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(500);
        `);

        // Asset Maintenance Service Logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
                maintenance_id BIGSERIAL PRIMARY KEY,
                asset_id BIGINT REFERENCES assets(asset_id) ON DELETE CASCADE,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                service_date DATE NOT NULL,
                service_type VARCHAR(50) NOT NULL,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                cost DECIMAL(14,2) DEFAULT 0.00,
                description TEXT,
                performed_by VARCHAR(150),
                next_service_due DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Asset Damage, Breakdown, Returns & Disposal table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS asset_damage_returns (
                damage_id BIGSERIAL PRIMARY KEY,
                asset_id BIGINT REFERENCES assets(asset_id) ON DELETE CASCADE,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                event_type VARCHAR(50) NOT NULL,
                damage_severity VARCHAR(30) DEFAULT 'Moderate',
                incident_date DATE NOT NULL,
                reason_description TEXT,
                action_taken VARCHAR(100) DEFAULT 'Sent for Repair',
                salvage_value DECIMAL(14,2) DEFAULT 0.00,
                repair_cost_estimate DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Under Inspection',
                reported_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_code ON companies(company_code)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendors_company_branch ON vendors(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_raw_materials_company_branch ON raw_materials(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_material_branch ON raw_material_inventory(material_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_assets_company_branch ON assets(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag)`);
        console.log('✅ Indexes created');

        console.log('✅ All tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

// Export pool for queries
export default pool;