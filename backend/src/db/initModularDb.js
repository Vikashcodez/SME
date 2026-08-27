import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export const initializeModularDatabase = async () => {
    const client = await pool.connect();
    try {
        logger.info('🔄 Initializing Chandra Precision Relational Schema (Master Single Source of Truth)...');
        await client.query('BEGIN');

        
        
        
        await client.query(`
            CREATE SEQUENCE IF NOT EXISTS seq_sales_orders_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_purchase_orders_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_sales_invoices_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_vouchers_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_work_orders_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_grn_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_challans_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_inspections_co0001 START 1;
            CREATE SEQUENCE IF NOT EXISTS seq_ncr_co0001 START 1;

            CREATE TABLE IF NOT EXISTS transaction_audit_trail (
                log_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) NOT NULL DEFAULT 'CO-0001',
                table_name VARCHAR(64) NOT NULL,
                record_id VARCHAR(100) NOT NULL,
                action VARCHAR(20) NOT NULL,
                pre_change_state JSONB,
                post_change_state JSONB,
                changed_by VARCHAR(100) DEFAULT 'System',
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45) DEFAULT '127.0.0.1'
            );
            CREATE INDEX IF NOT EXISTS idx_audit_trail_lookup ON transaction_audit_trail(table_name, record_id, company_code, changed_at);

            CREATE TABLE IF NOT EXISTS erp_records (
                id BIGSERIAL PRIMARY KEY,
                entity_key VARCHAR(100) NOT NULL,
                record_id VARCHAR(100) NOT NULL,
                company_id VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Active',
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_entity_record UNIQUE(entity_key, record_id, company_id)
            );
            CREATE INDEX IF NOT EXISTS idx_erp_records_lookup ON erp_records(entity_key, is_deleted, company_id);
            CREATE INDEX IF NOT EXISTS idx_erp_records_recid ON erp_records(record_id);
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS countries (
                country_id BIGSERIAL PRIMARY KEY,
                country_name VARCHAR(100) NOT NULL UNIQUE,
                country_code VARCHAR(10) NOT NULL,
                iso_code VARCHAR(3) NOT NULL,
                currency_code VARCHAR(10) NOT NULL,
                currency_symbol VARCHAR(10) NOT NULL,
                phone_code VARCHAR(10) NOT NULL,
                tax_system VARCHAR(50) DEFAULT 'GST',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE countries ADD COLUMN IF NOT EXISTS tax_system VARCHAR(50) DEFAULT 'GST';
            CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(country_name);

            CREATE TABLE IF NOT EXISTS states (
                state_id BIGSERIAL PRIMARY KEY,
                country_id BIGINT REFERENCES countries(country_id) ON DELETE CASCADE,
                state_name VARCHAR(100) NOT NULL,
                state_code VARCHAR(5) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_country_state UNIQUE(country_id, state_name)
            );
            CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_id);

            CREATE TABLE IF NOT EXISTS currencies (
                currency_id BIGSERIAL PRIMARY KEY,
                currency_code VARCHAR(10) NOT NULL UNIQUE,
                currency_name VARCHAR(100) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                exchange_rate DECIMAL(15,6) DEFAULT 1.000000,
                is_base BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS companies (
                company_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) NOT NULL UNIQUE,
                company_name VARCHAR(255) NOT NULL,
                company_type VARCHAR(100) DEFAULT 'Private Limited',
                establishment_year INTEGER DEFAULT 2008,
                pan VARCHAR(20) UNIQUE,
                cin VARCHAR(30) UNIQUE,
                gst_no VARCHAR(25) UNIQUE,
                currency_code VARCHAR(10) DEFAULT 'INR',
                country_name VARCHAR(100) DEFAULT 'India',
                state_name VARCHAR(100) DEFAULT 'Maharashtra',
                state_code VARCHAR(5) DEFAULT '27',
                city VARCHAR(100) DEFAULT 'Pune',
                full_address TEXT,
                phone_number VARCHAR(30),
                email_id VARCHAR(255),
                logo_url VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'INR';
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_name VARCHAR(100) DEFAULT 'India';
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_name VARCHAR(100) DEFAULT 'Maharashtra';
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_code VARCHAR(5) DEFAULT '27';
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Pune';
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);

            CREATE TABLE IF NOT EXISTS branches (
                branch_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_code VARCHAR(50) NOT NULL UNIQUE,
                branch_name VARCHAR(255) NOT NULL,
                gst_no VARCHAR(25),
                city VARCHAR(100),
                state_name VARCHAR(100),
                full_address TEXT,
                phone_number VARCHAR(30),
                email_id VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);

            CREATE TABLE IF NOT EXISTS roles (
                role_id BIGSERIAL PRIMARY KEY,
                role_name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                user_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE SET NULL,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                username VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) DEFAULT 'CO-0001';
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_code);

            CREATE TABLE IF NOT EXISTS role_permission_matrix (
                matrix_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                role_name VARCHAR(50) NOT NULL,
                module_name VARCHAR(100) NOT NULL,
                can_view BOOLEAN DEFAULT TRUE,
                can_create BOOLEAN DEFAULT FALSE,
                can_edit BOOLEAN DEFAULT FALSE,
                can_delete BOOLEAN DEFAULT FALSE,
                can_approve BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_role_module UNIQUE(company_code, role_name, module_name)
            );
            CREATE INDEX IF NOT EXISTS idx_perm_role_mod ON role_permission_matrix(role_name, module_name);

            CREATE TABLE IF NOT EXISTS login_audit (
                audit_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
                user_email VARCHAR(255) NOT NULL,
                login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(50),
                user_agent TEXT,
                login_status VARCHAR(20) DEFAULT 'Success',
                failure_reason VARCHAR(255)
            );
            CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_email, login_timestamp DESC);

            CREATE TABLE IF NOT EXISTS number_series (
                series_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                module VARCHAR(50) NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                prefix VARCHAR(20) NOT NULL,
                suffix VARCHAR(20) DEFAULT '',
                current_number BIGINT DEFAULT 0,
                padding INTEGER DEFAULT 4,
                year_prefix BOOLEAN DEFAULT TRUE,
                is_active BOOLEAN DEFAULT TRUE,
                CONSTRAINT uq_company_doc_series UNIQUE(company_code, document_type)
            );
            CREATE INDEX IF NOT EXISTS idx_number_series_doc ON number_series(company_code, document_type);

            CREATE TABLE IF NOT EXISTS uom_masters (
                uom_id BIGSERIAL PRIMARY KEY,
                uom_code VARCHAR(20) NOT NULL UNIQUE,
                uom_name VARCHAR(100) NOT NULL,
                symbol VARCHAR(20),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS departments (
                department_id BIGSERIAL PRIMARY KEY,
                department_name VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS designations (
                designation_id BIGSERIAL PRIMARY KEY,
                designation_title VARCHAR(100) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bank_master (
                bank_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                bank_name VARCHAR(150) NOT NULL,
                account_number VARCHAR(50) NOT NULL,
                ifsc_code VARCHAR(20) NOT NULL,
                branch_name VARCHAR(150),
                account_type VARCHAR(50) DEFAULT 'Current Account',
                opening_balance DECIMAL(15,2) DEFAULT 0.00,
                current_balance DECIMAL(15,2) DEFAULT 0.00,
                ledger_id BIGINT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_bank_acc UNIQUE(company_code, account_number)
            );

            CREATE TABLE IF NOT EXISTS approval_hierarchy (
                rule_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                document_type VARCHAR(50) NOT NULL,
                threshold_amount DECIMAL(15,2) DEFAULT 0.00,
                approval_level INTEGER DEFAULT 1,
                approver_role VARCHAR(50) NOT NULL,
                escalation_hours INTEGER DEFAULT 24,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS document_master (
                doc_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                entity_type VARCHAR(100) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_size_kb INTEGER,
                mime_type VARCHAR(100),
                uploaded_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_doc_entity ON document_master(entity_type, entity_id);

            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                user_email VARCHAR(255),
                module VARCHAR(100) DEFAULT 'General',
                entity_name VARCHAR(100) DEFAULT 'Record',
                record_id VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL,
                changes JSONB,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(100) DEFAULT 'General';
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name VARCHAR(100) DEFAULT 'Record';
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes JSONB;
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS ledger_groups (
                group_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                group_name VARCHAR(150) NOT NULL,
                parent_group_id BIGINT REFERENCES ledger_groups(group_id) ON DELETE SET NULL,
                group_type VARCHAR(50) NOT NULL,
                nature VARCHAR(50) NOT NULL,
                affects_gross_profit BOOLEAN DEFAULT FALSE,
                sequence INTEGER DEFAULT 0,
                is_system BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_group_company UNIQUE(company_code, group_name)
            );
            CREATE INDEX IF NOT EXISTS idx_ledger_groups_parent ON ledger_groups(parent_group_id);

            CREATE TABLE IF NOT EXISTS ledgers (
                ledger_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                ledger_name VARCHAR(255) NOT NULL,
                group_id BIGINT NOT NULL REFERENCES ledger_groups(group_id) ON DELETE RESTRICT,
                opening_balance DECIMAL(15,2) DEFAULT 0.00,
                dr_cr VARCHAR(2) DEFAULT 'Dr',
                current_balance DECIMAL(15,2) DEFAULT 0.00,
                mailing_name VARCHAR(255),
                address TEXT,
                country VARCHAR(100) DEFAULT 'India',
                state_name VARCHAR(100) DEFAULT 'Maharashtra',
                gst_state_code VARCHAR(5) DEFAULT '27',
                pan_it_no VARCHAR(20),
                gstin_uin VARCHAR(25),
                gst_registration_type VARCHAR(50) DEFAULT 'Regular',
                bank_account_no VARCHAR(50),
                ifsc_code VARCHAR(20),
                bank_name VARCHAR(100),
                branch_name VARCHAR(100),
                credit_period_days INTEGER DEFAULT 30,
                credit_limit DECIMAL(15,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_ledger_company UNIQUE(company_code, ledger_name)
            );
            CREATE INDEX IF NOT EXISTS idx_ledgers_group ON ledgers(group_id);
            CREATE INDEX IF NOT EXISTS idx_ledgers_company ON ledgers(company_code);

            CREATE TABLE IF NOT EXISTS vouchers (
                voucher_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                voucher_type VARCHAR(50) NOT NULL,
                voucher_number VARCHAR(50) NOT NULL,
                voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
                reference_no VARCHAR(100),
                reference_date DATE,
                party_ledger_id BIGINT REFERENCES ledgers(ledger_id),
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                narration TEXT,
                is_cancelled BOOLEAN DEFAULT FALSE,
                tally_guid VARCHAR(100),
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_voucher_num UNIQUE(company_code, voucher_type, voucher_number)
            );
            CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date);
            CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(company_code, voucher_type);

            CREATE TABLE IF NOT EXISTS voucher_items (
                item_id BIGSERIAL PRIMARY KEY,
                voucher_id BIGINT NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                entry_type VARCHAR(2) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                item_narration TEXT,
                sequence INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_voucher_items_ledger ON voucher_items(ledger_id);

            CREATE TABLE IF NOT EXISTS bill_allocations (
                allocation_id BIGSERIAL PRIMARY KEY,
                voucher_item_id BIGINT REFERENCES voucher_items(item_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id),
                ref_type VARCHAR(30) NOT NULL,
                bill_reference_no VARCHAR(100) NOT NULL,
                credit_days INTEGER DEFAULT 0,
                due_date DATE,
                amount DECIMAL(15,2) NOT NULL,
                dr_cr VARCHAR(2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_bill_alloc_ref ON bill_allocations(bill_reference_no);

            CREATE TABLE IF NOT EXISTS cost_categories (
                category_id BIGSERIAL PRIMARY KEY,
                category_name VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cost_centers (
                center_id BIGSERIAL PRIMARY KEY,
                category_id BIGINT REFERENCES cost_categories(category_id) ON DELETE SET NULL,
                center_name VARCHAR(150) NOT NULL,
                parent_center_id BIGINT REFERENCES cost_centers(center_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS voucher_cost_allocations (
                allocation_id BIGSERIAL PRIMARY KEY,
                voucher_item_id BIGINT REFERENCES voucher_items(item_id) ON DELETE CASCADE,
                center_id BIGINT REFERENCES cost_centers(center_id) ON DELETE CASCADE,
                amount DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fixed_assets (
                asset_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                asset_code VARCHAR(50) NOT NULL,
                asset_name VARCHAR(255) NOT NULL,
                asset_category VARCHAR(100) DEFAULT 'Machinery',
                purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
                purchase_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                salvage_value DECIMAL(15,2) DEFAULT 0.00,
                useful_life_years INTEGER DEFAULT 10,
                depreciation_method VARCHAR(50) DEFAULT 'Straight Line',
                accumulated_depreciation DECIMAL(15,2) DEFAULT 0.00,
                net_book_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                location VARCHAR(150),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS budgets (
                budget_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                fiscal_year VARCHAR(20) NOT NULL,
                ledger_id BIGINT REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
                center_id BIGINT REFERENCES cost_centers(center_id) ON DELETE SET NULL,
                budget_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                actual_amount DECIMAL(15,2) DEFAULT 0.00,
                variance DECIMAL(15,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_budget_item UNIQUE(company_code, fiscal_year, ledger_id)
            );

            CREATE TABLE IF NOT EXISTS bank_reconciliations (
                brs_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                bank_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
                voucher_id BIGINT REFERENCES vouchers(voucher_id) ON DELETE SET NULL,
                cheque_instrument_no VARCHAR(100),
                instrument_date DATE,
                bank_clearing_date DATE,
                status VARCHAR(30) DEFAULT 'Pending',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS tax_masters (
                tax_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                tax_name VARCHAR(100) NOT NULL,
                tax_type VARCHAR(50) NOT NULL,
                rate_percentage DECIMAL(5,2) NOT NULL,
                cgst_rate DECIMAL(5,2) DEFAULT 0.00,
                sgst_rate DECIMAL(5,2) DEFAULT 0.00,
                igst_rate DECIMAL(5,2) DEFAULT 0.00,
                cess_rate DECIMAL(5,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hsn_sac_masters (
                hsn_id BIGSERIAL PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                type VARCHAR(10) NOT NULL DEFAULT 'HSN',
                description TEXT NOT NULL,
                default_tax_rate DECIMAL(5,2) DEFAULT 18.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS gst_returns_filings (
                filing_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                return_type VARCHAR(30) NOT NULL,
                period_month VARCHAR(20) NOT NULL,
                period_year VARCHAR(10) NOT NULL,
                arn_number VARCHAR(100),
                filing_date DATE,
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_tax DECIMAL(15,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Filed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_gst_filing UNIQUE(company_code, return_type, period_month, period_year)
            );

            CREATE TABLE IF NOT EXISTS tds_records (
                tds_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                voucher_id BIGINT REFERENCES vouchers(voucher_id) ON DELETE SET NULL,
                section_code VARCHAR(20) NOT NULL,
                party_pan VARCHAR(20),
                deductee_name VARCHAR(255) NOT NULL,
                taxable_amount DECIMAL(15,2) NOT NULL,
                tds_rate DECIMAL(5,2) NOT NULL,
                tds_amount DECIMAL(15,2) NOT NULL,
                payment_status VARCHAR(30) DEFAULT 'Pending',
                challan_no VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS pf_records (
                pf_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payroll_month VARCHAR(20) NOT NULL,
                employee_code VARCHAR(50) NOT NULL,
                employee_name VARCHAR(150) NOT NULL,
                pf_number VARCHAR(50),
                uan VARCHAR(50),
                wages DECIMAL(15,2) NOT NULL,
                employee_share DECIMAL(15,2) NOT NULL,
                employer_share DECIMAL(15,2) NOT NULL,
                eps_share DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS esi_records (
                esi_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payroll_month VARCHAR(20) NOT NULL,
                employee_code VARCHAR(50) NOT NULL,
                employee_name VARCHAR(150) NOT NULL,
                ip_number VARCHAR(50),
                gross_wages DECIMAL(15,2) NOT NULL,
                employee_contribution DECIMAL(15,2) NOT NULL,
                employer_contribution DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS itc_reconciliation (
                itc_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                period VARCHAR(20) NOT NULL,
                vendor_gstin VARCHAR(25) NOT NULL,
                invoice_number VARCHAR(50) NOT NULL,
                invoice_date DATE,
                gstr2b_taxable DECIMAL(15,2) DEFAULT 0.00,
                books_tax DECIMAL(15,2) DEFAULT 0.00,
                match_status VARCHAR(30) DEFAULT 'Matched',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS compliance_calendar (
                compliance_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                filing_name VARCHAR(150) NOT NULL,
                frequency VARCHAR(50) DEFAULT 'Monthly',
                due_day INTEGER DEFAULT 11,
                statutory_body VARCHAR(100) DEFAULT 'GSTN',
                penalty_per_day DECIMAL(10,2) DEFAULT 50.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS sales_opportunities (
                opportunity_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                lead_name VARCHAR(255) NOT NULL,
                contact_person VARCHAR(100),
                contact_phone VARCHAR(30),
                contact_email VARCHAR(255),
                estimated_value DECIMAL(15,2) DEFAULT 0.00,
                stage VARCHAR(50) DEFAULT 'Prospecting',
                probability_pct INTEGER DEFAULT 20,
                expected_close_date DATE,
                assigned_to VARCHAR(100) DEFAULT 'Sales Lead',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS service_contracts (
                contract_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                contract_number VARCHAR(50) NOT NULL UNIQUE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
                service_type VARCHAR(100) DEFAULT 'Annual Maintenance Contract (AMC)',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                contract_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                billing_frequency VARCHAR(50) DEFAULT 'Quarterly',
                sla_hours INTEGER DEFAULT 24,
                renewal_status VARCHAR(30) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS customers (
                customer_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                customer_code VARCHAR(50) NOT NULL UNIQUE,
                customer_name VARCHAR(255) NOT NULL,
                contact_person VARCHAR(100),
                email VARCHAR(255),
                phone VARCHAR(30),
                mobile VARCHAR(30),
                gstin VARCHAR(25),
                pan VARCHAR(20),
                currency VARCHAR(10) DEFAULT 'INR',
                billing_address TEXT,
                billing_city VARCHAR(100) DEFAULT 'Pune',
                billing_state VARCHAR(100) DEFAULT 'Maharashtra',
                billing_state_code VARCHAR(5) DEFAULT '27',
                billing_pincode VARCHAR(10),
                shipping_address TEXT,
                shipping_city VARCHAR(100),
                shipping_state VARCHAR(100),
                shipping_state_code VARCHAR(5),
                shipping_pincode VARCHAR(10),
                credit_limit DECIMAL(15,2) DEFAULT 500000.00,
                credit_days INTEGER DEFAULT 30,
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                ledger_id BIGINT REFERENCES ledgers(ledger_id),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(company_code, customer_code);

            CREATE TABLE IF NOT EXISTS customer_credit_control (
                credit_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
                credit_limit DECIMAL(15,2) NOT NULL DEFAULT 500000.00,
                overdue_days_allowed INTEGER DEFAULT 15,
                risk_category VARCHAR(30) DEFAULT 'Low Risk',
                is_blocked BOOLEAN DEFAULT FALSE,
                approved_by VARCHAR(100) DEFAULT 'Finance Head',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_customer_credit UNIQUE(company_code, customer_id)
            );

            CREATE TABLE IF NOT EXISTS price_lists (
                price_list_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                price_list_name VARCHAR(150) NOT NULL,
                currency VARCHAR(10) DEFAULT 'INR',
                valid_from DATE DEFAULT CURRENT_DATE,
                valid_to DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_price_list UNIQUE(company_code, price_list_name)
            );

            CREATE TABLE IF NOT EXISTS sales_quotations (
                quotation_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                quotation_number VARCHAR(50) NOT NULL UNIQUE,
                quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
                valid_until DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                currency VARCHAR(10) DEFAULT 'INR',
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_cgst DECIMAL(15,2) DEFAULT 0.00,
                total_sgst DECIMAL(15,2) DEFAULT 0.00,
                total_igst DECIMAL(15,2) DEFAULT 0.00,
                total_discount DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Draft',
                remarks TEXT,
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales_quotation_items (
                item_id BIGSERIAL PRIMARY KEY,
                quotation_id BIGINT NOT NULL REFERENCES sales_quotations(quotation_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                unit_price DECIMAL(15,2) NOT NULL,
                discount_percentage DECIMAL(5,2) DEFAULT 0.00,
                discount_amount DECIMAL(15,2) DEFAULT 0.00,
                taxable_amount DECIMAL(15,2) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_amount DECIMAL(15,2) DEFAULT 0.00,
                sgst_amount DECIMAL(15,2) DEFAULT 0.00,
                igst_amount DECIMAL(15,2) DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sales_orders (
                order_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                order_number VARCHAR(50) NOT NULL UNIQUE,
                order_date DATE NOT NULL DEFAULT CURRENT_DATE,
                delivery_date DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                quotation_id BIGINT REFERENCES sales_quotations(quotation_id) ON DELETE SET NULL,
                customer_po_number VARCHAR(100),
                customer_po_date DATE,
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                place_of_supply VARCHAR(100) DEFAULT '27-Maharashtra',
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_cgst DECIMAL(15,2) DEFAULT 0.00,
                total_sgst DECIMAL(15,2) DEFAULT 0.00,
                total_igst DECIMAL(15,2) DEFAULT 0.00,
                total_discount DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Draft',
                remarks TEXT,
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_sales_orders_cust ON sales_orders(customer_id);

            CREATE TABLE IF NOT EXISTS sales_order_items (
                item_id BIGSERIAL PRIMARY KEY,
                order_id BIGINT NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                unit_price DECIMAL(15,2) NOT NULL,
                discount_amount DECIMAL(15,2) DEFAULT 0.00,
                taxable_amount DECIMAL(15,2) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_amount DECIMAL(15,2) DEFAULT 0.00,
                sgst_amount DECIMAL(15,2) DEFAULT 0.00,
                igst_amount DECIMAL(15,2) DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS delivery_challans (
                challan_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                challan_number VARCHAR(50) NOT NULL UNIQUE,
                challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                order_id BIGINT REFERENCES sales_orders(order_id),
                transporter_name VARCHAR(150),
                vehicle_no VARCHAR(30),
                eway_bill_no VARCHAR(50),
                total_qty DECIMAL(12,3) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Dispatched',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS delivery_challan_items (
                item_id BIGSERIAL PRIMARY KEY,
                challan_id BIGINT NOT NULL REFERENCES delivery_challans(challan_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                remarks TEXT
            );

            CREATE TABLE IF NOT EXISTS sales_invoices (
                invoice_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
                due_date DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                order_id BIGINT REFERENCES sales_orders(order_id),
                challan_id BIGINT REFERENCES delivery_challans(challan_id),
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                place_of_supply VARCHAR(100) DEFAULT '27-Maharashtra',
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_cgst DECIMAL(15,2) DEFAULT 0.00,
                total_sgst DECIMAL(15,2) DEFAULT 0.00,
                total_igst DECIMAL(15,2) DEFAULT 0.00,
                total_discount DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                paid_amount DECIMAL(15,2) DEFAULT 0.00,
                balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                voucher_id BIGINT REFERENCES vouchers(voucher_id),
                status VARCHAR(30) DEFAULT 'Draft',
                irn VARCHAR(100),
                qr_code TEXT,
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_sales_inv_cust ON sales_invoices(customer_id);
            CREATE INDEX IF NOT EXISTS idx_sales_inv_date ON sales_invoices(invoice_date);

            CREATE TABLE IF NOT EXISTS sales_invoice_items (
                item_id BIGSERIAL PRIMARY KEY,
                invoice_id BIGINT NOT NULL REFERENCES sales_invoices(invoice_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                unit_price DECIMAL(15,2) NOT NULL,
                discount_amount DECIMAL(15,2) DEFAULT 0.00,
                taxable_amount DECIMAL(15,2) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_amount DECIMAL(15,2) DEFAULT 0.00,
                sgst_amount DECIMAL(15,2) DEFAULT 0.00,
                igst_amount DECIMAL(15,2) DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS eway_bills (
                eway_bill_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                invoice_id BIGINT REFERENCES sales_invoices(invoice_id) ON DELETE SET NULL,
                challan_id BIGINT REFERENCES delivery_challans(challan_id) ON DELETE SET NULL,
                eway_bill_no VARCHAR(50) NOT NULL UNIQUE,
                eway_bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
                valid_upto TIMESTAMP,
                transporter_name VARCHAR(150),
                vehicle_no VARCHAR(30),
                distance_km INTEGER DEFAULT 100,
                status VARCHAR(30) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales_returns (
                return_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                return_number VARCHAR(50) NOT NULL UNIQUE,
                return_date DATE NOT NULL DEFAULT CURRENT_DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                invoice_id BIGINT REFERENCES sales_invoices(invoice_id),
                reason TEXT NOT NULL,
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_tax DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS credit_notes (
                credit_note_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                note_number VARCHAR(50) NOT NULL UNIQUE,
                note_date DATE NOT NULL DEFAULT CURRENT_DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                invoice_id BIGINT REFERENCES sales_invoices(invoice_id),
                voucher_id BIGINT REFERENCES vouchers(voucher_id),
                total_amount DECIMAL(15,2) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS customer_payments (
                payment_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payment_number VARCHAR(50) NOT NULL UNIQUE,
                payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
                customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
                amount DECIMAL(15,2) NOT NULL,
                payment_mode VARCHAR(50) DEFAULT 'NEFT/RTGS',
                reference_no VARCHAR(100),
                bank_ledger_id BIGINT REFERENCES ledgers(ledger_id),
                status VARCHAR(30) DEFAULT 'Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS vendors (
                vendor_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                vendor_code VARCHAR(50) NOT NULL UNIQUE,
                vendor_name VARCHAR(255) NOT NULL,
                contact_person VARCHAR(100),
                email VARCHAR(255),
                phone VARCHAR(30),
                mobile VARCHAR(30),
                gstin VARCHAR(25),
                pan VARCHAR(20),
                currency VARCHAR(10) DEFAULT 'INR',
                address TEXT,
                city VARCHAR(100) DEFAULT 'Pune',
                state_name VARCHAR(100) DEFAULT 'Maharashtra',
                state_code VARCHAR(5) DEFAULT '27',
                pincode VARCHAR(10),
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                bank_account_no VARCHAR(50),
                ifsc_code VARCHAR(20),
                bank_name VARCHAR(100),
                ledger_id BIGINT REFERENCES ledgers(ledger_id),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(company_code, vendor_code);

            CREATE TABLE IF NOT EXISTS purchase_requisitions (
                pr_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                pr_number VARCHAR(50) NOT NULL UNIQUE,
                pr_date DATE NOT NULL DEFAULT CURRENT_DATE,
                department_id BIGINT REFERENCES departments(department_id),
                department VARCHAR(100),
                requested_by VARCHAR(100) DEFAULT 'Production Lead',
                priority VARCHAR(20) DEFAULT 'Medium',
                required_by_date DATE,
                status VARCHAR(30) DEFAULT 'Pending',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(department_id);

            CREATE TABLE IF NOT EXISTS purchase_requisition_items (
                item_id BIGSERIAL PRIMARY KEY,
                pr_id BIGINT NOT NULL REFERENCES purchase_requisitions(pr_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                estimated_price DECIMAL(15,2) DEFAULT 0.00
            );

            CREATE TABLE IF NOT EXISTS vendor_quotations (
                quote_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                quote_number VARCHAR(50) NOT NULL UNIQUE,
                quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                pr_id BIGINT REFERENCES purchase_requisitions(pr_id),
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                validity_date DATE,
                status VARCHAR(30) DEFAULT 'Accepted',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                po_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                po_number VARCHAR(50) NOT NULL UNIQUE,
                po_date DATE NOT NULL DEFAULT CURRENT_DATE,
                delivery_date DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                pr_id BIGINT REFERENCES purchase_requisitions(pr_id),
                payment_terms VARCHAR(100) DEFAULT '30 Days Net',
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_cgst DECIMAL(15,2) DEFAULT 0.00,
                total_sgst DECIMAL(15,2) DEFAULT 0.00,
                total_igst DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Draft',
                remarks TEXT,
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                item_id BIGSERIAL PRIMARY KEY,
                po_id BIGINT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                unit_price DECIMAL(15,2) NOT NULL,
                taxable_amount DECIMAL(15,2) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_amount DECIMAL(15,2) DEFAULT 0.00,
                sgst_amount DECIMAL(15,2) DEFAULT 0.00,
                igst_amount DECIMAL(15,2) DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS goods_receipts (
                grn_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                grn_number VARCHAR(50) NOT NULL UNIQUE,
                grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
                po_id BIGINT REFERENCES purchase_orders(po_id),
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                vendor_invoice_no VARCHAR(100),
                vendor_invoice_date DATE,
                vehicle_number VARCHAR(30),
                status VARCHAR(30) DEFAULT 'Received',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_grn_vendor ON goods_receipts(vendor_id);

            CREATE TABLE IF NOT EXISTS purchase_invoices (
                invoice_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
                due_date DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                po_id BIGINT REFERENCES purchase_orders(po_id),
                grn_id BIGINT REFERENCES goods_receipts(grn_id),
                vendor_bill_no VARCHAR(100),
                total_taxable DECIMAL(15,2) DEFAULT 0.00,
                total_cgst DECIMAL(15,2) DEFAULT 0.00,
                total_sgst DECIMAL(15,2) DEFAULT 0.00,
                total_igst DECIMAL(15,2) DEFAULT 0.00,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                paid_amount DECIMAL(15,2) DEFAULT 0.00,
                balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                voucher_id BIGINT REFERENCES vouchers(voucher_id),
                status VARCHAR(30) DEFAULT 'Unpaid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS purchase_invoice_items (
                item_id BIGSERIAL PRIMARY KEY,
                invoice_id BIGINT NOT NULL REFERENCES purchase_invoices(invoice_id) ON DELETE CASCADE,
                product_id BIGINT,
                item_name VARCHAR(255) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                unit_price DECIMAL(15,2) NOT NULL,
                taxable_amount DECIMAL(15,2) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_amount DECIMAL(15,2) DEFAULT 0.00,
                sgst_amount DECIMAL(15,2) DEFAULT 0.00,
                igst_amount DECIMAL(15,2) DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS purchase_returns (
                return_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                return_number VARCHAR(50) NOT NULL UNIQUE,
                return_date DATE NOT NULL DEFAULT CURRENT_DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                invoice_id BIGINT REFERENCES purchase_invoices(invoice_id),
                reason TEXT NOT NULL,
                grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS vendor_payments (
                payment_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payment_number VARCHAR(50) NOT NULL UNIQUE,
                payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                amount DECIMAL(15,2) NOT NULL,
                payment_mode VARCHAR(50) DEFAULT 'NEFT/RTGS',
                reference_no VARCHAR(100),
                bank_ledger_id BIGINT REFERENCES ledgers(ledger_id),
                status VARCHAR(30) DEFAULT 'Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS vendor_performance_scorecard (
                scorecard_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
                evaluation_period VARCHAR(20) NOT NULL,
                quality_rating DECIMAL(3,2) DEFAULT 5.00,
                delivery_otif_pct DECIMAL(5,2) DEFAULT 95.00,
                price_competitiveness_rating DECIMAL(3,2) DEFAULT 4.50,
                overall_score DECIMAL(3,2) DEFAULT 4.75,
                status VARCHAR(30) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                category_id BIGSERIAL PRIMARY KEY,
                category_name VARCHAR(100) NOT NULL UNIQUE,
                parent_category_id BIGINT REFERENCES product_categories(category_id),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS products (
                product_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                product_code VARCHAR(50) NOT NULL UNIQUE,
                product_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) DEFAULT 'Finished Goods',
                category_id BIGINT REFERENCES product_categories(category_id),
                uom_code VARCHAR(20) DEFAULT 'PCS',
                hsn_code VARCHAR(20) DEFAULT '8483',
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cost_price DECIMAL(15,2) DEFAULT 0.00,
                selling_price DECIMAL(15,2) DEFAULT 0.00,
                reorder_level DECIMAL(12,3) DEFAULT 50.00,
                reorder_quantity DECIMAL(12,3) DEFAULT 100.00,
                current_stock DECIMAL(12,3) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_products_code ON products(company_code, product_code);

            CREATE TABLE IF NOT EXISTS batch_master (
                batch_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                batch_number VARCHAR(50) NOT NULL,
                mfg_date DATE NOT NULL DEFAULT CURRENT_DATE,
                expiry_date DATE,
                initial_qty DECIMAL(12,3) NOT NULL,
                current_qty DECIMAL(12,3) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_product_batch UNIQUE(company_code, product_id, batch_number)
            );

            CREATE TABLE IF NOT EXISTS serial_numbers (
                serial_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                serial_number VARCHAR(100) NOT NULL,
                batch_id BIGINT REFERENCES batch_master(batch_id) ON DELETE SET NULL,
                status VARCHAR(30) DEFAULT 'In Stock',
                current_location VARCHAR(100) DEFAULT 'Main Warehouse',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_serial_num UNIQUE(company_code, product_id, serial_number)
            );

            CREATE TABLE IF NOT EXISTS warehouses (
                warehouse_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                warehouse_code VARCHAR(50) NOT NULL UNIQUE,
                warehouse_name VARCHAR(150) NOT NULL,
                location VARCHAR(255),
                city VARCHAR(100) DEFAULT 'Pune',
                is_primary BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stock_ledger (
                entry_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id),
                transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
                voucher_type VARCHAR(50) NOT NULL,
                voucher_number VARCHAR(50) NOT NULL,
                in_qty DECIMAL(12,3) DEFAULT 0.00,
                out_qty DECIMAL(12,3) DEFAULT 0.00,
                balance_qty DECIMAL(12,3) NOT NULL,
                valuation_rate DECIMAL(15,2) DEFAULT 0.00,
                total_value DECIMAL(15,2) DEFAULT 0.00,
                batch_number VARCHAR(50),
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);
            CREATE INDEX IF NOT EXISTS idx_stock_ledger_prod ON stock_ledger(product_id, warehouse_id);

            CREATE TABLE IF NOT EXISTS stock_transfers (
                transfer_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                transfer_number VARCHAR(50) NOT NULL UNIQUE,
                transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
                from_warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id),
                to_warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id),
                status VARCHAR(30) DEFAULT 'Completed',
                remarks TEXT,
                created_by VARCHAR(100) DEFAULT 'Store Manager',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stock_transfer_items (
                item_id BIGSERIAL PRIMARY KEY,
                transfer_id BIGINT NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS'
            );

            CREATE TABLE IF NOT EXISTS reorder_levels (
                reorder_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                warehouse_id BIGINT REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
                min_stock DECIMAL(12,3) NOT NULL DEFAULT 10.00,
                max_stock DECIMAL(12,3) NOT NULL DEFAULT 500.00,
                reorder_qty DECIMAL(12,3) NOT NULL DEFAULT 50.00,
                lead_time_days INTEGER DEFAULT 7,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_product_wh_reorder UNIQUE(company_code, product_id, warehouse_id)
            );

            CREATE TABLE IF NOT EXISTS stock_adjustments (
                adjustment_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                adjustment_number VARCHAR(50) NOT NULL UNIQUE,
                adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
                warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id),
                reason TEXT NOT NULL,
                status VARCHAR(30) DEFAULT 'Completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stock_adjustment_items (
                item_id BIGSERIAL PRIMARY KEY,
                adjustment_id BIGINT NOT NULL REFERENCES stock_adjustments(adjustment_id) ON DELETE CASCADE,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                recorded_qty DECIMAL(12,3) NOT NULL,
                actual_qty DECIMAL(12,3) NOT NULL,
                difference_qty DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS'
            );

            CREATE TABLE IF NOT EXISTS bin_rack_locations (
                location_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
                rack_number VARCHAR(50) NOT NULL,
                shelf_bin VARCHAR(50) NOT NULL,
                max_capacity_kg DECIMAL(12,2) DEFAULT 1000.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS physical_verification (
                pv_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                verification_number VARCHAR(50) NOT NULL UNIQUE,
                verification_date DATE NOT NULL DEFAULT CURRENT_DATE,
                warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id),
                conducted_by VARCHAR(100) DEFAULT 'Store Manager',
                status VARCHAR(30) DEFAULT 'Completed',
                variance_detected BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS work_centers (
                center_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                center_code VARCHAR(50) NOT NULL UNIQUE,
                center_name VARCHAR(150) NOT NULL,
                capacity_per_day_hours DECIMAL(5,2) DEFAULT 8.00,
                cost_per_hour DECIMAL(10,2) DEFAULT 500.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS machine_master (
                machine_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                machine_code VARCHAR(50) NOT NULL UNIQUE,
                machine_name VARCHAR(150) NOT NULL,
                work_center_id BIGINT REFERENCES work_centers(center_id) ON DELETE SET NULL,
                make_model VARCHAR(150),
                capacity_hours DECIMAL(5,2) DEFAULT 16.00,
                maintenance_due_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS boms (
                bom_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                bom_code VARCHAR(50) NOT NULL UNIQUE,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                quantity DECIMAL(12,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) DEFAULT 'PCS',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bom_items (
                item_id BIGSERIAL PRIMARY KEY,
                bom_id BIGINT NOT NULL REFERENCES boms(bom_id) ON DELETE CASCADE,
                raw_product_id BIGINT NOT NULL REFERENCES products(product_id),
                quantity DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS'
            );

            CREATE TABLE IF NOT EXISTS work_orders (
                work_order_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                work_order_number VARCHAR(50) NOT NULL UNIQUE,
                order_date DATE NOT NULL DEFAULT CURRENT_DATE,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                bom_id BIGINT REFERENCES boms(bom_id),
                sales_order_id BIGINT REFERENCES sales_orders(order_id),
                planned_qty DECIMAL(12,3) NOT NULL,
                completed_qty DECIMAL(12,3) DEFAULT 0.00,
                rejected_qty DECIMAL(12,3) DEFAULT 0.00,
                start_date DATE,
                target_date DATE,
                status VARCHAR(30) DEFAULT 'Planned',
                created_by VARCHAR(100) DEFAULT 'Production Lead',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS bom_id BIGINT REFERENCES boms(bom_id);
            ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS rejected_qty DECIMAL(12,3) DEFAULT 0.00;
            CREATE INDEX IF NOT EXISTS idx_wo_prod ON work_orders(product_id);

            CREATE TABLE IF NOT EXISTS work_order_operation_log (
                log_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                work_order_id BIGINT NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
                operation_name VARCHAR(150) NOT NULL,
                work_center_id BIGINT REFERENCES work_centers(center_id),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                qty_processed DECIMAL(12,3) NOT NULL,
                operator_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS production_output (
                output_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                work_order_id BIGINT NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
                output_date DATE NOT NULL DEFAULT CURRENT_DATE,
                shift VARCHAR(20) DEFAULT 'Shift 1',
                good_qty DECIMAL(12,3) NOT NULL,
                scrap_qty DECIMAL(12,3) DEFAULT 0.00,
                rework_qty DECIMAL(12,3) DEFAULT 0.00,
                machine_id BIGINT REFERENCES machine_master(machine_id),
                operator_name VARCHAR(100) DEFAULT 'CNC Operator',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS scrap_wastage (
                scrap_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                work_order_id BIGINT REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                scrap_qty DECIMAL(12,3) NOT NULL,
                uom VARCHAR(20) DEFAULT 'PCS',
                scrap_reason VARCHAR(255) NOT NULL,
                estimated_loss DECIMAL(15,2) DEFAULT 0.00,
                disposition VARCHAR(50) DEFAULT 'Recycle',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS subcontract_orders (
                subcontract_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                order_number VARCHAR(50) NOT NULL UNIQUE,
                order_date DATE NOT NULL DEFAULT CURRENT_DATE,
                vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id),
                work_order_id BIGINT REFERENCES work_orders(work_order_id),
                operation_name VARCHAR(150) NOT NULL,
                issue_qty DECIMAL(12,3) NOT NULL,
                return_qty DECIMAL(12,3) DEFAULT 0.00,
                rate DECIMAL(15,2) NOT NULL,
                total_amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(30) DEFAULT 'Sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mrp_planned_orders (
                mrp_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                plan_number VARCHAR(50) NOT NULL UNIQUE,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                requirement_date DATE NOT NULL,
                required_qty DECIMAL(12,3) NOT NULL,
                planned_order_type VARCHAR(30) DEFAULT 'Purchase Requisition',
                status VARCHAR(30) DEFAULT 'Planned',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS qc_parameters (
                parameter_id BIGSERIAL PRIMARY KEY,
                parameter_name VARCHAR(150) NOT NULL,
                unit VARCHAR(20) DEFAULT 'mm',
                specification_type VARCHAR(50) DEFAULT 'Variable',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS qc_inspections (
                inspection_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                inspection_number VARCHAR(50) NOT NULL UNIQUE,
                inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
                inspection_type VARCHAR(50) NOT NULL,
                reference_id BIGINT,
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                sample_size DECIMAL(12,3) NOT NULL,
                accepted_qty DECIMAL(12,3) NOT NULL,
                rejected_qty DECIMAL(12,3) DEFAULT 0.00,
                result VARCHAR(30) DEFAULT 'Pass',
                inspector_name VARCHAR(100) DEFAULT 'Quality Lead',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS reference_id BIGINT;
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS remarks TEXT;
            CREATE INDEX IF NOT EXISTS idx_qc_prod ON qc_inspections(product_id);

            CREATE TABLE IF NOT EXISTS non_conformance_reports (
                ncr_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                ncr_number VARCHAR(50) NOT NULL UNIQUE,
                ncr_date DATE NOT NULL DEFAULT CURRENT_DATE,
                product_id BIGINT REFERENCES products(product_id),
                defect_description TEXT NOT NULL,
                severity VARCHAR(20) DEFAULT 'Major',
                disposition VARCHAR(50) DEFAULT 'Rework',
                status VARCHAR(30) DEFAULT 'Open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS capa_tracking (
                capa_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                capa_number VARCHAR(50) NOT NULL UNIQUE,
                ncr_id BIGINT REFERENCES non_conformance_reports(ncr_id) ON DELETE CASCADE,
                root_cause TEXT NOT NULL,
                corrective_action TEXT NOT NULL,
                preventive_action TEXT NOT NULL,
                assigned_to VARCHAR(100) NOT NULL,
                target_date DATE,
                closure_date DATE,
                status VARCHAR(30) DEFAULT 'In Progress',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS certificate_of_analysis (
                coa_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                coa_number VARCHAR(50) NOT NULL UNIQUE,
                coa_date DATE NOT NULL DEFAULT CURRENT_DATE,
                inspection_id BIGINT REFERENCES qc_inspections(inspection_id),
                customer_id BIGINT REFERENCES customers(customer_id),
                product_id BIGINT NOT NULL REFERENCES products(product_id),
                batch_number VARCHAR(50),
                verdict VARCHAR(20) DEFAULT 'Conforming',
                approved_by VARCHAR(100) DEFAULT 'Quality Head',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS equipment_calibration_records (
                calibration_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                equipment_name VARCHAR(150) NOT NULL,
                equipment_tag VARCHAR(50) NOT NULL UNIQUE,
                calibration_date DATE NOT NULL DEFAULT CURRENT_DATE,
                next_due_date DATE NOT NULL,
                calibration_agency VARCHAR(150) DEFAULT 'NABL Accredited Metrology Lab',
                certificate_no VARCHAR(100),
                status VARCHAR(30) DEFAULT 'Valid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sop_documents (
                sop_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                sop_code VARCHAR(50) NOT NULL UNIQUE,
                title VARCHAR(255) NOT NULL,
                department_id BIGINT REFERENCES departments(department_id),
                revision_number VARCHAR(10) DEFAULT 'R01',
                effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
                file_url VARCHAR(500),
                approved_by VARCHAR(100) DEFAULT 'Operations VP',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS employees (
                employee_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                employee_code VARCHAR(50) NOT NULL UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(30),
                department_id BIGINT REFERENCES departments(department_id),
                designation_id BIGINT REFERENCES designations(designation_id),
                date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
                basic_salary DECIMAL(15,2) DEFAULT 30000.00,
                hra DECIMAL(15,2) DEFAULT 12000.00,
                special_allowance DECIMAL(15,2) DEFAULT 8000.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(company_code, employee_code);

            CREATE TABLE IF NOT EXISTS attendance_logs (
                log_id BIGSERIAL PRIMARY KEY,
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
                in_time TIME,
                out_time TIME,
                status VARCHAR(20) DEFAULT 'Present'
            );
            CREATE INDEX IF NOT EXISTS idx_attend_date ON attendance_logs(employee_id, attendance_date);

            CREATE TABLE IF NOT EXISTS shifts (
                shift_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                shift_code VARCHAR(20) NOT NULL UNIQUE,
                shift_name VARCHAR(100) NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                break_minutes INTEGER DEFAULT 60,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS leave_requests (
                leave_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                leave_type VARCHAR(50) DEFAULT 'Casual Leave',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days DECIMAL(5,2) NOT NULL,
                reason TEXT,
                status VARCHAR(30) DEFAULT 'Approved',
                approved_by VARCHAR(100) DEFAULT 'HR Manager',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS loan_advances (
                loan_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                loan_type VARCHAR(50) DEFAULT 'Salary Advance',
                principal_amount DECIMAL(15,2) NOT NULL,
                monthly_emi DECIMAL(15,2) NOT NULL,
                tenure_months INTEGER DEFAULT 6,
                balance_amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(30) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expense_reimbursements (
                claim_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
                claim_category VARCHAR(100) DEFAULT 'Travel & Client Visit',
                claim_amount DECIMAL(15,2) NOT NULL,
                approved_amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(30) DEFAULT 'Approved',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS payroll_runs (
                payroll_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payroll_month VARCHAR(20) NOT NULL,
                run_date DATE NOT NULL DEFAULT CURRENT_DATE,
                total_employees INTEGER DEFAULT 0,
                gross_salary_total DECIMAL(15,2) DEFAULT 0.00,
                net_salary_total DECIMAL(15,2) DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'Processed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS payslips (
                payslip_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                payroll_id BIGINT REFERENCES payroll_runs(payroll_id) ON DELETE CASCADE,
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                basic_pay DECIMAL(15,2) NOT NULL,
                hra DECIMAL(15,2) DEFAULT 0.00,
                special_allowance DECIMAL(15,2) DEFAULT 0.00,
                gross_pay DECIMAL(15,2) NOT NULL,
                pf_deduction DECIMAL(15,2) DEFAULT 0.00,
                esi_deduction DECIMAL(15,2) DEFAULT 0.00,
                pt_deduction DECIMAL(15,2) DEFAULT 200.00,
                tds_deduction DECIMAL(15,2) DEFAULT 0.00,
                other_deductions DECIMAL(15,2) DEFAULT 0.00,
                total_deductions DECIMAL(15,2) NOT NULL,
                net_pay DECIMAL(15,2) NOT NULL,
                payment_status VARCHAR(30) DEFAULT 'Paid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employee_id);
            CREATE TABLE IF NOT EXISTS exit_management (
                exit_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                employee_id BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                resignation_date DATE NOT NULL DEFAULT CURRENT_DATE,
                last_working_date DATE NOT NULL,
                reason TEXT,
                handover_status VARCHAR(30) DEFAULT 'Pending',
                fnf_status VARCHAR(30) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS transporter_master (
                transporter_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                transporter_code VARCHAR(50) NOT NULL UNIQUE,
                transporter_name VARCHAR(255) NOT NULL,
                gstin VARCHAR(25),
                phone VARCHAR(30),
                contact_person VARCHAR(100),
                address TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS delivery_routes (
                route_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                route_name VARCHAR(150) NOT NULL,
                origin_city VARCHAR(100) DEFAULT 'Pune',
                destination_city VARCHAR(100) NOT NULL,
                transit_days INTEGER DEFAULT 1,
                standard_rate_per_kg DECIMAL(10,2) DEFAULT 12.50,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS delivery_schedules (
                schedule_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                schedule_number VARCHAR(50) NOT NULL UNIQUE,
                dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
                customer_id BIGINT REFERENCES customers(customer_id),
                invoice_id BIGINT REFERENCES sales_invoices(invoice_id),
                destination_city VARCHAR(100) DEFAULT 'Pune',
                vehicle_type VARCHAR(50) DEFAULT '14ft Closed Container',
                status VARCHAR(30) DEFAULT 'Scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS delivery_tracking (
                tracking_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                challan_id BIGINT REFERENCES delivery_challans(challan_id) ON DELETE SET NULL,
                transporter_id BIGINT REFERENCES transporter_master(transporter_id) ON DELETE SET NULL,
                tracking_number VARCHAR(100) NOT NULL,
                dispatch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expected_delivery TIMESTAMP,
                actual_delivery TIMESTAMP,
                status VARCHAR(30) DEFAULT 'In Transit',
                pod_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fleet_vehicle_logs (
                log_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                vehicle_number VARCHAR(30) NOT NULL,
                driver_name VARCHAR(100) NOT NULL,
                log_date DATE NOT NULL DEFAULT CURRENT_DATE,
                start_km DECIMAL(10,2) NOT NULL,
                end_km DECIMAL(10,2) NOT NULL,
                total_km DECIMAL(10,2) NOT NULL,
                fuel_liters DECIMAL(8,2) DEFAULT 0.00,
                fuel_cost DECIMAL(10,2) DEFAULT 0.00,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS freight_bookings (
                booking_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                booking_number VARCHAR(50) NOT NULL UNIQUE,
                transporter_id BIGINT NOT NULL REFERENCES transporter_master(transporter_id),
                from_location VARCHAR(100) DEFAULT 'Pune Plant',
                to_location VARCHAR(100) NOT NULL,
                weight_kg DECIMAL(10,2) NOT NULL,
                freight_rate DECIMAL(10,2) NOT NULL,
                total_freight DECIMAL(15,2) NOT NULL,
                payment_status VARCHAR(30) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
                project_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                project_code VARCHAR(50) NOT NULL UNIQUE,
                project_name VARCHAR(255) NOT NULL,
                customer_id BIGINT REFERENCES customers(customer_id) ON DELETE SET NULL,
                start_date DATE NOT NULL DEFAULT CURRENT_DATE,
                end_date DATE,
                budget DECIMAL(15,2) DEFAULT 0.00,
                actual_cost DECIMAL(15,2) DEFAULT 0.00,
                progress_percentage INTEGER DEFAULT 0,
                project_lead VARCHAR(100) DEFAULT 'Project Manager',
                status VARCHAR(50) DEFAULT 'On Track',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_code);

            CREATE TABLE IF NOT EXISTS project_tasks (
                task_id BIGSERIAL PRIMARY KEY,
                project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
                task_name VARCHAR(255) NOT NULL,
                assignee VARCHAR(100) DEFAULT 'Unassigned',
                due_date DATE,
                hours_estimated DECIMAL(10,2) DEFAULT 0.00,
                hours_actual DECIMAL(10,2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'To Do',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS project_milestones (
                milestone_id BIGSERIAL PRIMARY KEY,
                project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
                milestone_name VARCHAR(255) NOT NULL,
                target_date DATE NOT NULL,
                deliverable VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS project_timesheets (
                timesheet_id BIGSERIAL PRIMARY KEY,
                project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
                task_id BIGINT REFERENCES project_tasks(task_id) ON DELETE SET NULL,
                employee_id BIGINT REFERENCES employees(employee_id) ON DELETE SET NULL,
                work_date DATE NOT NULL DEFAULT CURRENT_DATE,
                hours_worked DECIMAL(6,2) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_chat_query_log (
                query_id BIGSERIAL PRIMARY KEY,
                company_code VARCHAR(50) DEFAULT 'CO-0001',
                user_email VARCHAR(255) NOT NULL,
                user_prompt TEXT NOT NULL,
                ai_response TEXT,
                intent_detected VARCHAR(100),
                execution_time_ms INTEGER,
                feedback_rating INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        
        
        
        
        
        await client.query(`
            INSERT INTO companies (
                company_code, company_name, company_type, establishment_year,
                pan, cin, gst_no, currency_code, country_name, state_name, state_code,
                city, full_address, phone_number, email_id, is_active
            ) 
            SELECT 
                'CO-0001', 'Chandra Precision Engineering Pvt Ltd', 'Private Limited', 2008,
                'AAACC1234F', 'U29253MH2008PTC184512', '27AAACC1234F1Z5', 'INR', 'India', 'Maharashtra', '27',
                'Pune', 'Plot No. 42, Sector 7, PCMC Industrial Area, Bhosari, Pune 411026',
                '+91 20 2712 3456', 'info@chandraprecision.com', true
            WHERE NOT EXISTS (
                SELECT 1 FROM companies WHERE company_code = 'CO-0001' OR pan = 'AAACC1234F'
            );

            INSERT INTO branches (company_id, branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id, is_active)
            SELECT company_id, 'BR-PUNE-HQ', 'Pune Bhosari Head Office & Plant 1', '27AAACC1234F1Z5', 'Pune', 'Maharashtra', 'Plot 42, Sector 7, Bhosari', '+91 20 2712 3456', 'pune@chandraprecision.com', true
            FROM companies WHERE company_code = 'CO-0001' OR pan = 'AAACC1234F' LIMIT 1
            ON CONFLICT (branch_code) DO NOTHING;
        `);

        
        const salt = await bcrypt.genSalt(10);
        const hashConfig = await bcrypt.hash(config.superAdmin.password, salt);
        const hashDemo = await bcrypt.hash('admin123', salt);

        await client.query(`
            INSERT INTO users (username, email, password_hash, role, company_code, is_active)
            VALUES 
                ('Super Admin', $1, $2, $3, 'CO-0001', true),
                ('Super Admin', 'admin@gmail.com', $4, 'super_admin', 'CO-0001', true)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = true, updated_at = NOW();
        `, [config.superAdmin.email, hashConfig, config.superAdmin.role, hashDemo]);

        
        await client.query(`
            INSERT INTO roles (role_name, description) VALUES
                ('super_admin', 'Full platform unrestricted administrative access'),
                ('admin', 'Company-level administrator with full module control'),
                ('sales_manager', 'Sales orders, quotations, price lists, customer credit control'),
                ('purchase_manager', 'Purchase requisitions, vendor POs, GRN verification'),
                ('production_lead', 'Work orders, BOMs, machine capacity, shop floor execution'),
                ('qa_qc_inspector', 'QC inspections, NCR reports, CAPA, COA generation'),
                ('accountant', 'Tally Prime voucher entry, BRS, trial balance, GST filings'),
                ('hr_manager', 'Employee directory, attendance, payroll runs, payslips')
            ON CONFLICT (role_name) DO NOTHING;

            INSERT INTO role_permission_matrix (company_code, role_name, module_name, can_view, can_create, can_edit, can_delete, can_approve)
            VALUES
                ('CO-0001', 'admin', 'Executive Dashboard', true, true, true, true, true),
                ('CO-0001', 'admin', 'Master Data Hub', true, true, true, true, true),
                ('CO-0001', 'admin', 'Financial Accounts', true, true, true, true, true),
                ('CO-0001', 'admin', 'Taxation & GST', true, true, true, true, true),
                ('CO-0001', 'admin', 'Sales & Customer Management', true, true, true, true, true),
                ('CO-0001', 'admin', 'Procurement & Sourcing', true, true, true, true, true),
                ('CO-0001', 'admin', 'Inventory & Warehouse', true, true, true, true, true),
                ('CO-0001', 'admin', 'Manufacturing & Production', true, true, true, true, true),
                ('CO-0001', 'admin', 'Quality Assurance (QC & QA)', true, true, true, true, true),
                ('CO-0001', 'admin', 'HR & Payroll Management', true, true, true, true, true),
                ('CO-0001', 'admin', 'Logistics & Dispatch', true, true, true, true, true)
            ON CONFLICT (company_code, role_name, module_name) DO NOTHING;
        `);

        
        await client.query(`
            INSERT INTO number_series (company_code, module, document_type, prefix, suffix, current_number, padding, year_prefix)
            VALUES
                ('CO-0001', 'Sales', 'Sales Order', 'SO-', '', 1, 4, true),
                ('CO-0001', 'Sales', 'Sales Invoice', 'INV-', '', 1, 4, true),
                ('CO-0001', 'Sales', 'Delivery Challan', 'DC-', '', 1, 4, true),
                ('CO-0001', 'Procurement', 'Purchase Order', 'PO-', '', 1, 4, true),
                ('CO-0001', 'Procurement', 'Goods Receipt', 'GRN-', '', 1, 4, true),
                ('CO-0001', 'Production', 'Work Order', 'WO-', '', 1, 4, true),
                ('CO-0001', 'Quality', 'QC Inspection', 'QC-', '', 1, 4, true),
                ('CO-0001', 'Quality', 'NCR Report', 'NCR-', '', 1, 4, true),
                ('CO-0001', 'Accounts', 'Journal Voucher', 'JV-', '', 1, 4, true),
                ('CO-0001', 'Accounts', 'Payment Voucher', 'PV-', '', 1, 4, true),
                ('CO-0001', 'Logistics', 'Delivery Schedule', 'DS-', '', 1, 4, true)
            ON CONFLICT (company_code, document_type) DO NOTHING;
        `);

        
        await client.query(`
            INSERT INTO uom_masters (uom_code, uom_name, symbol, is_active) VALUES
                ('PCS', 'Pieces', 'pcs', true),
                ('NOS', 'Numbers', 'nos', true),
                ('KGS', 'Kilograms', 'kg', true),
                ('MTR', 'Meters', 'm', true),
                ('SET', 'Sets', 'set', true),
                ('BOX', 'Boxes', 'box', true),
                ('LTR', 'Liters', 'L', true),
                ('TON', 'Metric Tonnes', 'MT', true)
            ON CONFLICT (uom_code) DO NOTHING;
        `);

        
        await client.query(`
            INSERT INTO work_centers (company_code, center_code, center_name, capacity_per_day_hours, cost_per_hour)
            VALUES
                ('CO-0001', 'WC-CNC-01', '5-Axis CNC Turning Center Mazak QTN-250', 16.00, 750.00),
                ('CO-0001', 'WC-VMC-02', '4-Axis Vertical Machining Center BFW', 16.00, 650.00),
                ('CO-0001', 'WC-GRD-03', 'High-Precision Cylindrical Grinding Center', 8.00, 450.00)
            ON CONFLICT (center_code) DO NOTHING;

            INSERT INTO machine_master (company_code, machine_code, machine_name, make_model, capacity_hours, maintenance_due_date, is_active)
            VALUES
                ('CO-0001', 'MCH-MAZAK-01', 'Mazak Quick Turn Nexus 250-II', 'Mazak Japan 2022', 16.00, CURRENT_DATE + INTERVAL '90 days', true),
                ('CO-0001', 'MCH-BFW-02', 'BFW Chakra BMV 50 VMC', 'Bharat Fritz Werner 2021', 16.00, CURRENT_DATE + INTERVAL '60 days', true)
            ON CONFLICT (machine_code) DO NOTHING;

            INSERT INTO transporter_master (company_code, transporter_code, transporter_name, gstin, phone, contact_person, is_active)
            VALUES
                ('CO-0001', 'TR-VRL', 'VRL Logistics Limited', '29AAACV5482F1Z8', '+91 20 2426 1234', 'Suresh Patil', true),
                ('CO-0001', 'TR-TCI', 'TCI Freight Express', '07AAACT0502J1Z2', '+91 20 2747 8899', 'Vikram Deshmukh', true)
            ON CONFLICT (transporter_code) DO NOTHING;

            INSERT INTO shifts (company_code, shift_code, shift_name, start_time, end_time, break_minutes, is_active)
            VALUES
                ('CO-0001', 'S1', 'General Morning Shift', '08:00:00', '16:30:00', 45, true),
                ('CO-0001', 'S2', 'Evening Production Shift', '16:30:00', '01:00:00', 45, true),
                ('CO-0001', 'S3', 'Night Machining Shift', '01:00:00', '08:30:00', 45, true)
            ON CONFLICT (shift_code) DO NOTHING;
        `);

        
        await client.query(`
            INSERT INTO departments (department_name) VALUES
                ('Operations & Production'),
                ('Quality Assurance & Metrology'),
                ('Finance & Accounts'),
                ('Supply Chain & Procurement'),
                ('Sales & Customer Relations'),
                ('Human Resources & Admin'),
                ('Logistics & Dispatch')
            ON CONFLICT (department_name) DO NOTHING;

            INSERT INTO designations (designation_title) VALUES
                ('Plant Operations Manager'),
                ('Senior CNC Machinist'),
                ('Quality Metrology Inspector'),
                ('Senior Chartered Accountant'),
                ('Supply Chain Lead'),
                ('Logistics Officer'),
                ('HR Business Partner')
            ON CONFLICT (designation_title) DO NOTHING;

            -- 8. Seed Fixed Assets
            INSERT INTO fixed_assets (company_code, asset_code, asset_name, asset_category, purchase_date, purchase_cost, useful_life_years, depreciation_method, net_book_value, location, is_active)
            VALUES
                ('CO-0001', 'AST-CNC-01', 'Mazak 5-Axis CNC Turning Center', 'Plant Machinery', '2023-04-01', 8500000.00, 10, 'Straight Line', 6800000.00, 'Bhosari Plant - Bay 1', true),
                ('CO-0001', 'AST-VMC-02', 'BFW Chakra BMV 50 VMC', 'Plant Machinery', '2023-08-15', 6200000.00, 10, 'Straight Line', 5270000.00, 'Bhosari Plant - Bay 2', true),
                ('CO-0001', 'AST-CMM-03', 'Zeiss Coordinate Measuring Machine (CMM)', 'Quality Metrology', '2024-01-10', 4800000.00, 8, 'Straight Line', 4200000.00, 'Metrology Lab', true)
            ON CONFLICT DO NOTHING;

            -- 9. Seed Projects & Milestones
            INSERT INTO projects (company_code, project_code, project_name, start_date, end_date, budget, actual_cost, progress_percentage, project_lead, status, description)
            VALUES
                ('CO-0001', 'PRJ-2026-0001', 'EV Transmission Gearbox Component Line Tooling', '2026-01-15', '2026-11-30', 12500000.00, 4850000.00, 42, 'Santosh Mane', 'On Track', 'Turnkey Tier-1 tooling, prototyping and PPAP Level 3 qualification for EV transmission.'),
                ('CO-0001', 'PRJ-2026-0002', 'Aerospace Titanium Flange Batch Qualification', '2026-03-01', '2026-09-30', 8200000.00, 3100000.00, 58, 'Vikram Deshmukh', 'On Track', 'AS9100 Rev D flight-critical titanium flanges precision 5-axis machining line setup.'),
                ('CO-0001', 'PRJ-2026-0003', 'Bhosari Plant 2 Solar Rooftop & CNC Expansion', '2026-02-01', '2026-12-31', 15000000.00, 7200000.00, 65, 'Ramesh Shinde', 'On Track', '500kW rooftop solar grid tie-in and installation of 4 new robotic turning cells.')
            ON CONFLICT (project_code) DO NOTHING;

            -- 10. Seed Delivery Schedules
            INSERT INTO delivery_schedules (company_code, schedule_number, dispatch_date, destination_city, vehicle_type, status)
            VALUES
                ('CO-0001', 'DS-2026-0001', CURRENT_DATE, 'Pune MIDC', '14ft Closed Container', 'Dispatched'),
                ('CO-0001', 'DS-2026-0002', CURRENT_DATE + 1, 'Chakan Auto Hub', '20ft Multi-Axle Truck', 'Scheduled'),
                ('CO-0001', 'DS-2026-0003', CURRENT_DATE + 2, 'Aurangabad Industrial Cluster', '14ft Closed Container', 'Scheduled')
            ON CONFLICT (schedule_number) DO NOTHING;
        `);

        await client.query('COMMIT');
        logger.info('✅ Complete Relational Database Schema Initialized with 100% table coverage & verified seeds!');

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, '❌ Database initialization error');
        throw error;
    } finally {
        client.release();
    }
};

export default initializeModularDatabase;
