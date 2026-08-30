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


        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_code ON companies(company_code)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)`);
        console.log('✅ Indexes created');

        console.log('✅ All tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

// Export pool for queries
export default pool;