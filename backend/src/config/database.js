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

        // Product Master table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                product_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                product_code VARCHAR(50) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'Finished Goods',
                unit_of_measure VARCHAR(30) DEFAULT 'PCS',
                selling_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                cost_price DECIMAL(14,2) DEFAULT 0.00,
                hsn_code VARCHAR(20),
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                product_specification TEXT,
                photo_1 VARCHAR(500),
                photo_2 VARCHAR(500),
                photo_3 VARCHAR(500),
                min_stock_level DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'Active',
                is_active BOOLEAN DEFAULT TRUE,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                updated_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Product Bill of Materials (BOM) / Raw Materials Recipe table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_bom (
                bom_id BIGSERIAL PRIMARY KEY,
                product_id BIGINT REFERENCES products(product_id) ON DELETE CASCADE NOT NULL,
                material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE CASCADE NOT NULL,
                quantity_required DECIMAL(14,4) NOT NULL,
                scrap_percentage DECIMAL(5,2) DEFAULT 0.00,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unq_product_material UNIQUE (product_id, material_id)
            )
        `);

        // Raw Material Production Runs / Batches table (Daily, Monthly, Custom)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_material_production (
                production_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE NOT NULL,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE NOT NULL,
                production_code VARCHAR(50) NOT NULL,
                batch_number VARCHAR(100),
                production_date DATE NOT NULL,
                production_period_type VARCHAR(20) DEFAULT 'Daily',
                product_id BIGINT REFERENCES products(product_id) ON DELETE RESTRICT NOT NULL,
                production_quantity DECIMAL(14,2) NOT NULL,
                total_material_cost DECIMAL(14,2) DEFAULT 0.00,
                production_status VARCHAR(30) DEFAULT 'Completed',
                warehouse_location VARCHAR(100) DEFAULT 'Main Store',
                notes TEXT,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Detailed Line Items of Raw Materials Consumed per Production Run
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_materials_consumed (
                consumption_id BIGSERIAL PRIMARY KEY,
                production_id BIGINT REFERENCES raw_material_production(production_id) ON DELETE CASCADE NOT NULL,
                material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT NOT NULL,
                unit_quantity_required DECIMAL(14,4) NOT NULL,
                total_quantity_deducted DECIMAL(14,4) NOT NULL,
                unit_cost DECIMAL(14,2) DEFAULT 0.00,
                total_cost DECIMAL(14,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ==========================================
        // 17-TABLE MANUFACTURING & INVENTORY MODULE
        // ==========================================

        // 1. Raw Material Categories
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_material_categories (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                status BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Update raw_materials with category_id and alias columns
        await pool.query(`
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES raw_material_categories(id) ON DELETE SET NULL;
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS code VARCHAR(50);
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS unit VARCHAR(30);
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS standard_cost DECIMAL(14,2) DEFAULT 0.00;
            ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS minimum_stock DECIMAL(14,2) DEFAULT 0.00;
            UPDATE raw_materials SET code = material_code WHERE code IS NULL;
            UPDATE raw_materials SET name = material_name WHERE name IS NULL;
            UPDATE raw_materials SET unit = unit_of_measure WHERE unit IS NULL;
            UPDATE raw_materials SET standard_cost = unit_price WHERE standard_cost = 0 OR standard_cost IS NULL;
            UPDATE raw_materials SET minimum_stock = minimum_stock_level WHERE minimum_stock = 0 OR minimum_stock IS NULL;
        `);

        // 2. GRN Header
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grns (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                grn_number VARCHAR(100) NOT NULL UNIQUE,
                vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
                invoice_number VARCHAR(100),
                invoice_date DATE,
                received_date DATE DEFAULT CURRENT_DATE,
                invoice_file VARCHAR(500),
                remarks TEXT,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. GRN Items
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grn_items (
                id BIGSERIAL PRIMARY KEY,
                grn_id BIGINT REFERENCES grns(id) ON DELETE CASCADE,
                raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT,
                batch_number VARCHAR(100) NOT NULL,
                received_quantity DECIMAL(14,4) NOT NULL,
                free_quantity DECIMAL(14,4) DEFAULT 0.0000,
                unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                tax DECIMAL(14,2) DEFAULT 0.00,
                expiry_date DATE,
                manufacturing_date DATE,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Raw Material Inventory (Batch-level tracking)
        await pool.query(`
            ALTER TABLE raw_material_inventory DROP CONSTRAINT IF EXISTS unq_branch_material;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE CASCADE;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS grn_item_id BIGINT REFERENCES grn_items(id) ON DELETE SET NULL;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS received_quantity DECIMAL(14,4) DEFAULT 0.0000;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS available_quantity DECIMAL(14,4) DEFAULT 0.0000;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(14,4) DEFAULT 0.0000;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(14,2) DEFAULT 0.00;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AVAILABLE';
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE raw_material_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            UPDATE raw_material_inventory SET raw_material_id = material_id WHERE raw_material_id IS NULL AND material_id IS NOT NULL;
            UPDATE raw_material_inventory SET available_quantity = available_stock WHERE (available_quantity = 0 OR available_quantity IS NULL) AND available_stock IS NOT NULL;
            UPDATE raw_material_inventory SET received_quantity = current_stock WHERE (received_quantity = 0 OR received_quantity IS NULL) AND current_stock IS NOT NULL;
            UPDATE raw_material_inventory SET reserved_quantity = allocated_stock WHERE (reserved_quantity = 0 OR reserved_quantity IS NULL) AND allocated_stock IS NOT NULL;
            UPDATE raw_material_inventory SET unit_cost = average_unit_cost WHERE (unit_cost = 0 OR unit_cost IS NULL) AND average_unit_cost IS NOT NULL;
        `);

        // 5. Product Categories
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                status BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Update products with category_id and alias columns
        await pool.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES product_categories(id) ON DELETE SET NULL;
            ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(50);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(30);
            ALTER TABLE products ADD COLUMN IF NOT EXISTS standard_cost DECIMAL(14,2) DEFAULT 0.00;
            UPDATE products SET code = product_code WHERE code IS NULL;
            UPDATE products SET name = product_name WHERE name IS NULL;
            UPDATE products SET unit = unit_of_measure WHERE unit IS NULL;
            UPDATE products SET standard_cost = cost_price WHERE standard_cost = 0 OR standard_cost IS NULL;
        `);

        // 6. Production Master / BOM Header
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_masters (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE SET NULL,
                product_id BIGINT REFERENCES products(product_id) ON DELETE CASCADE,
                version INT DEFAULT 1,
                name VARCHAR(150) NOT NULL,
                output_quantity DECIMAL(14,4) DEFAULT 1.0000,
                output_unit VARCHAR(30) DEFAULT 'PCS',
                workforce_count DECIMAL(10,2) DEFAULT 1,
                production_time_minutes DECIMAL(10,2) DEFAULT 0,
                labor_cost DECIMAL(14,2) DEFAULT 0.00,
                overhead_cost DECIMAL(14,2) DEFAULT 0.00,
                other_expense DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'ACTIVE',
                effective_from DATE DEFAULT CURRENT_DATE,
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 7. Production Master Raw Materials (BOM Details)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_master_materials (
                id BIGSERIAL PRIMARY KEY,
                production_master_id BIGINT REFERENCES production_masters(id) ON DELETE CASCADE,
                raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT,
                quantity DECIMAL(14,4) NOT NULL,
                unit VARCHAR(30) NOT NULL,
                wastage_percentage DECIMAL(5,2) DEFAULT 0.00,
                sequence INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 8. Production Master Workforce
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_master_workforce (
                id BIGSERIAL PRIMARY KEY,
                production_master_id BIGINT REFERENCES production_masters(id) ON DELETE CASCADE,
                role VARCHAR(100) NOT NULL,
                workers_required DECIMAL(10,2) NOT NULL DEFAULT 1,
                hours_required DECIMAL(10,2) NOT NULL DEFAULT 1,
                cost_per_hour DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 9. Production Orders
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_orders (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                production_number VARCHAR(100) NOT NULL UNIQUE,
                product_id BIGINT REFERENCES products(product_id) ON DELETE RESTRICT,
                production_master_id BIGINT REFERENCES production_masters(id) ON DELETE SET NULL,
                planned_quantity DECIMAL(14,4) NOT NULL,
                planned_start_date TIMESTAMP,
                planned_end_date TIMESTAMP,
                actual_start_date TIMESTAMP,
                actual_end_date TIMESTAMP,
                workforce_count DECIMAL(10,2) DEFAULT 0,
                planned_time_minutes DECIMAL(12,2) DEFAULT 0,
                actual_time_minutes DECIMAL(12,2) DEFAULT 0,
                planned_expense DECIMAL(14,2) DEFAULT 0.00,
                actual_expense DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'PLANNED',
                created_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 10. Production Material Consumptions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_material_consumptions (
                id BIGSERIAL PRIMARY KEY,
                production_order_id BIGINT REFERENCES production_orders(id) ON DELETE CASCADE,
                raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT,
                raw_material_inventory_id BIGINT REFERENCES raw_material_inventory(inventory_id) ON DELETE SET NULL,
                batch_number VARCHAR(100),
                required_quantity DECIMAL(14,4) NOT NULL,
                consumed_quantity DECIMAL(14,4) NOT NULL,
                unit_cost DECIMAL(14,2) DEFAULT 0.00,
                total_cost DECIMAL(14,2) DEFAULT 0.00,
                consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 11. Production Batches
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_batches (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                production_order_id BIGINT REFERENCES production_orders(id) ON DELETE CASCADE,
                batch_number VARCHAR(100) NOT NULL UNIQUE,
                planned_quantity DECIMAL(14,4) NOT NULL,
                produced_quantity DECIMAL(14,4) DEFAULT 0.0000,
                production_date DATE DEFAULT CURRENT_DATE,
                status VARCHAR(30) DEFAULT 'IN_PRODUCTION',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 12. Quality Checks
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quality_checks (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                production_batch_id BIGINT REFERENCES production_batches(id) ON DELETE CASCADE,
                inspected_quantity DECIMAL(14,4) NOT NULL,
                passed_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                rework_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                rejected_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                rework_cost DECIMAL(14,2) DEFAULT 0.00,
                rejection_reason TEXT,
                rework_reason TEXT,
                quality_status VARCHAR(30) DEFAULT 'PASSED',
                checked_by BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT
            )
        `);

        // 13. Quality Check Items
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quality_check_items (
                id BIGSERIAL PRIMARY KEY,
                quality_check_id BIGINT REFERENCES quality_checks(id) ON DELETE CASCADE,
                parameter_name VARCHAR(100) NOT NULL,
                specification VARCHAR(255),
                actual_value VARCHAR(255),
                result VARCHAR(20) DEFAULT 'PASS',
                remarks TEXT
            )
        `);

        // 14. Production Rework
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_rework (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                production_batch_id BIGINT REFERENCES production_batches(id) ON DELETE CASCADE,
                quality_check_id BIGINT REFERENCES quality_checks(id) ON DELETE SET NULL,
                quantity DECIMAL(14,4) NOT NULL,
                reason TEXT,
                additional_material_cost DECIMAL(14,2) DEFAULT 0.00,
                additional_labor_cost DECIMAL(14,2) DEFAULT 0.00,
                other_cost DECIMAL(14,2) DEFAULT 0.00,
                total_rework_cost DECIMAL(14,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'IN_REWORK',
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 15. Product Inventory (Finished Goods Batch Inventory)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_inventory (
                id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                product_id BIGINT REFERENCES products(product_id) ON DELETE RESTRICT,
                production_batch_id BIGINT REFERENCES production_batches(id) ON DELETE SET NULL,
                batch_number VARCHAR(100) NOT NULL,
                quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                available_quantity DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
                reserved_quantity DECIMAL(14,4) DEFAULT 0.0000,
                unit_cost DECIMAL(14,2) DEFAULT 0.00,
                manufacturing_date DATE DEFAULT CURRENT_DATE,
                expiry_date DATE,
                warehouse_location VARCHAR(100) DEFAULT 'Finished Goods Warehouse',
                status VARCHAR(30) DEFAULT 'AVAILABLE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_code ON companies(company_code)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendors_company_branch ON vendors(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_raw_materials_company_branch ON raw_materials(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_material_branch ON raw_material_inventory(material_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_batch ON raw_material_inventory(batch_number)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_assets_company_branch ON assets(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_company_branch ON products(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_bom_product ON product_bom(product_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_company_branch ON raw_material_production(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_product ON raw_material_production(product_id)`);

        // Additional manufacturing indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_grns_company_branch ON grns(company_id, branch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_masters_product ON production_masters(product_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_production_batches_order ON production_batches(production_order_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_quality_checks_batch ON quality_checks(production_batch_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_inventory_product ON product_inventory(product_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_inventory_batch ON product_inventory(batch_number)`);
        console.log('✅ Indexes created');

        console.log('✅ All tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

// Export pool for queries
export default pool;