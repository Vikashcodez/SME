/**
 * PRODUCTION-GRADE ACCOUNTING, BILLING & COMMERCIAL SUBSYSTEM SCHEMA
 * Provisions all 37 relational tables, triggers, constraints, indexes, 
 * and seeds standard Chart of Accounts groups & voucher types.
 */
export const initAccountingSchema = async (dbPool) => {
    if (!dbPool) {
        throw new Error('A database pool is required to initialize the accounting schema.');
    }
    const client = await dbPool.connect();
    try {
        console.log('🔄 Initializing Accounting, Billing & Commercial relational schema...');
        await client.query('BEGIN');

        // =========================================================================
        // 1. ACCOUNT GROUPS (Hierarchical Tree)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS account_groups (
                group_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                parent_group_id BIGINT REFERENCES account_groups(group_id) ON DELETE RESTRICT,
                group_name VARCHAR(150) NOT NULL,
                group_code VARCHAR(50) NOT NULL,
                nature VARCHAR(20) NOT NULL CHECK (nature IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
                affects_gross_profit BOOLEAN NOT NULL DEFAULT FALSE,
                is_sub_ledger BOOLEAN NOT NULL DEFAULT FALSE,
                is_system_group BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_group_code UNIQUE (company_id, group_code),
                CONSTRAINT uq_company_group_name UNIQUE (company_id, group_name)
            );
            CREATE INDEX IF NOT EXISTS idx_account_groups_parent ON account_groups(parent_group_id);
            CREATE INDEX IF NOT EXISTS idx_account_groups_nature ON account_groups(company_id, nature);
        `);

        // =========================================================================
        // 2. LEDGERS (Unified Chart of Accounts)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS ledgers (
                ledger_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                group_id BIGINT NOT NULL REFERENCES account_groups(group_id) ON DELETE RESTRICT,
                ledger_name VARCHAR(200) NOT NULL,
                ledger_code VARCHAR(50) NOT NULL,
                currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
                opening_balance NUMERIC(16, 4) NOT NULL DEFAULT 0.0000,
                opening_balance_type VARCHAR(2) NOT NULL DEFAULT 'DR' CHECK (opening_balance_type IN ('DR', 'CR')),
                current_balance NUMERIC(16, 4) NOT NULL DEFAULT 0.0000,
                current_balance_type VARCHAR(2) NOT NULL DEFAULT 'DR' CHECK (current_balance_type IN ('DR', 'CR')),
                maintain_bill_by_bill BOOLEAN NOT NULL DEFAULT FALSE,
                default_credit_period_days INTEGER NOT NULL DEFAULT 0 CHECK (default_credit_period_days >= 0),
                credit_limit NUMERIC(16, 2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0.00),
                is_cost_centres_applicable BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_reconciliation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                tax_type VARCHAR(20) CHECK (tax_type IN ('CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS', 'GST', 'NONE')),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_ledger_code UNIQUE (company_id, ledger_code),
                CONSTRAINT uq_company_ledger_name UNIQUE (company_id, ledger_name)
            );
            CREATE INDEX IF NOT EXISTS idx_ledgers_group ON ledgers(group_id);
            CREATE INDEX IF NOT EXISTS idx_ledgers_company_active ON ledgers(company_id, is_active);
        `);

        // =========================================================================
        // 3. CUSTOMER PROFILES (Commercial Entity linked 1:1 to Ledger)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_profiles (
                customer_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL UNIQUE REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                customer_code VARCHAR(50) NOT NULL,
                trade_name VARCHAR(200) NOT NULL,
                legal_name VARCHAR(200) NOT NULL,
                gstin VARCHAR(30),
                gst_registration_type VARCHAR(30) NOT NULL DEFAULT 'UNREGISTERED' CHECK (gst_registration_type IN ('REGULAR', 'COMPOSITION', 'UNREGISTERED', 'CONSUMER', 'OVERSEAS', 'SEZ')),
                pan VARCHAR(30),
                primary_contact_name VARCHAR(100),
                email VARCHAR(150),
                phone VARCHAR(25),
                billing_address_line1 TEXT NOT NULL,
                billing_address_line2 TEXT,
                billing_city VARCHAR(100) NOT NULL,
                billing_state_code VARCHAR(50) NOT NULL,
                billing_postal_code VARCHAR(30) NOT NULL,
                billing_country VARCHAR(50) NOT NULL DEFAULT 'India',
                shipping_address_line1 TEXT NOT NULL,
                shipping_address_line2 TEXT,
                shipping_city VARCHAR(100) NOT NULL,
                shipping_state_code VARCHAR(50) NOT NULL,
                shipping_postal_code VARCHAR(30) NOT NULL,
                shipping_country VARCHAR(50) NOT NULL DEFAULT 'India',
                is_composition BOOLEAN NOT NULL DEFAULT FALSE,
                is_tds_applicable BOOLEAN NOT NULL DEFAULT FALSE,
                is_tcs_applicable BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_customer_code UNIQUE (company_id, customer_code)
            );
            CREATE INDEX IF NOT EXISTS idx_customer_profiles_gstin ON customer_profiles(gstin);
            CREATE INDEX IF NOT EXISTS idx_customer_profiles_state ON customer_profiles(billing_state_code);
        `);

        // =========================================================================
        // 4. VENDOR PROFILES (Commercial Entity linked 1:1 to Ledger)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS vendor_profiles (
                vendor_profile_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL UNIQUE REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                existing_vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
                vendor_code VARCHAR(50) NOT NULL,
                vendor_trade_name VARCHAR(200) NOT NULL,
                vendor_legal_name VARCHAR(200) NOT NULL,
                gstin VARCHAR(30),
                gst_registration_type VARCHAR(30) NOT NULL DEFAULT 'UNREGISTERED' CHECK (gst_registration_type IN ('REGULAR', 'COMPOSITION', 'UNREGISTERED', 'OVERSEAS', 'SEZ')),
                pan VARCHAR(30),
                msme_registration_no VARCHAR(50),
                is_msme BOOLEAN NOT NULL DEFAULT FALSE,
                address_line1 TEXT NOT NULL,
                address_line2 TEXT,
                city VARCHAR(100) NOT NULL,
                state_code VARCHAR(50) NOT NULL,
                postal_code VARCHAR(30) NOT NULL,
                country VARCHAR(50) NOT NULL DEFAULT 'India',
                is_reverse_charge_applicable BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_vendor_code UNIQUE (company_id, vendor_code)
            );
            CREATE INDEX IF NOT EXISTS idx_vendor_profiles_gstin ON vendor_profiles(gstin);
        `);

        // =========================================================================
        // 5. FINANCIAL YEARS & ACCOUNTING PERIODS
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS financial_years (
                financial_year_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                year_label VARCHAR(20) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_closed BOOLEAN NOT NULL DEFAULT FALSE,
                closed_at TIMESTAMP WITH TIME ZONE,
                closed_by BIGINT REFERENCES employees(employee_id),
                CONSTRAINT ck_fy_dates CHECK (end_date > start_date),
                CONSTRAINT uq_company_fy_dates UNIQUE (company_id, start_date, end_date),
                CONSTRAINT uq_company_fy_label UNIQUE (company_id, year_label)
            );
            CREATE INDEX IF NOT EXISTS idx_fy_company_dates ON financial_years(company_id, start_date, end_date);

            CREATE TABLE IF NOT EXISTS accounting_periods (
                period_id BIGSERIAL PRIMARY KEY,
                financial_year_id BIGINT NOT NULL REFERENCES financial_years(financial_year_id) ON DELETE CASCADE,
                period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 12),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_locked BOOLEAN NOT NULL DEFAULT FALSE,
                locked_at TIMESTAMP WITH TIME ZONE,
                locked_by BIGINT REFERENCES employees(employee_id),
                CONSTRAINT ck_period_dates CHECK (end_date >= start_date),
                CONSTRAINT uq_fy_period_num UNIQUE (financial_year_id, period_number)
            );
        `);

        // =========================================================================
        // 6. VOUCHER TYPES & NUMBERING SEQUENCES
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS voucher_types (
                voucher_type_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                voucher_type_code VARCHAR(30) NOT NULL,
                voucher_type_name VARCHAR(100) NOT NULL,
                base_category VARCHAR(30) NOT NULL CHECK (base_category IN ('SALES', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL', 'CREDIT_NOTE', 'DEBIT_NOTE')),
                affects_inventory BOOLEAN NOT NULL DEFAULT FALSE,
                is_system_defined BOOLEAN NOT NULL DEFAULT FALSE,
                numbering_method VARCHAR(20) NOT NULL DEFAULT 'AUTO' CHECK (numbering_method IN ('AUTO', 'MANUAL')),
                CONSTRAINT uq_company_voucher_code UNIQUE (company_id, voucher_type_code)
            );

            CREATE TABLE IF NOT EXISTS document_number_sequences (
                sequence_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE CASCADE,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE SET NULL,
                document_type VARCHAR(30) NOT NULL,
                prefix VARCHAR(20) NOT NULL DEFAULT '',
                suffix VARCHAR(20) NOT NULL DEFAULT '',
                current_sequence_number BIGINT NOT NULL DEFAULT 0,
                zero_pad_width SMALLINT NOT NULL DEFAULT 4,
                restart_frequency VARCHAR(10) NOT NULL DEFAULT 'YEARLY' CHECK (restart_frequency IN ('NEVER', 'YEARLY', 'MONTHLY')),
                CONSTRAINT uq_seq_scope UNIQUE (branch_id, financial_year_id, document_type, prefix)
            );
        `);

        // =========================================================================
        // 7. DOUBLE-ENTRY VOUCHERS & LINES
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS vouchers (
                voucher_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                voucher_type_id BIGINT NOT NULL REFERENCES voucher_types(voucher_type_id) ON DELETE RESTRICT,
                voucher_number VARCHAR(100) NOT NULL,
                voucher_date DATE NOT NULL,
                narration TEXT,
                reference_number VARCHAR(100),
                reference_date DATE,
                source_module VARCHAR(30) CHECK (source_module IN ('MANUAL', 'SALES_INVOICE', 'PURCHASE_INVOICE', 'RECEIPT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'INVENTORY_CLEARING', 'PAYROLL', 'FIXED_ASSETS')),
                source_document_id BIGINT,
                is_posted BOOLEAN NOT NULL DEFAULT FALSE,
                is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
                reversed_by_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                posted_by BIGINT REFERENCES employees(employee_id),
                posted_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT uq_branch_voucher_number UNIQUE (branch_id, voucher_type_id, voucher_number)
            );
            CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(branch_id, voucher_date);
            CREATE INDEX IF NOT EXISTS idx_vouchers_source ON vouchers(source_module, source_document_id);

            CREATE TABLE IF NOT EXISTS voucher_lines (
                line_id BIGSERIAL PRIMARY KEY,
                voucher_id BIGINT NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                debit_amount NUMERIC(16, 4) NOT NULL DEFAULT 0.0000 CHECK (debit_amount >= 0.0000),
                credit_amount NUMERIC(16, 4) NOT NULL DEFAULT 0.0000 CHECK (credit_amount >= 0.0000),
                narration TEXT,
                CONSTRAINT ck_debit_or_credit CHECK (
                    (debit_amount > 0 AND credit_amount = 0) OR
                    (credit_amount > 0 AND debit_amount = 0)
                ),
                CONSTRAINT uq_voucher_line_num UNIQUE (voucher_id, line_number)
            );
            CREATE INDEX IF NOT EXISTS idx_voucher_lines_ledger ON voucher_lines(ledger_id, voucher_id);

            CREATE OR REPLACE FUNCTION validate_posted_voucher_balance()
            RETURNS TRIGGER AS $body$
            DECLARE
                voucher_posted BOOLEAN;
                debit_total NUMERIC(20, 4);
                credit_total NUMERIC(20, 4);
            BEGIN
                SELECT is_posted INTO voucher_posted FROM vouchers WHERE voucher_id = COALESCE(NEW.voucher_id, OLD.voucher_id);
                IF COALESCE(voucher_posted, FALSE) THEN
                    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
                    INTO debit_total, credit_total
                    FROM voucher_lines
                    WHERE voucher_id = COALESCE(NEW.voucher_id, OLD.voucher_id);

                    IF debit_total <= 0 OR debit_total <> credit_total THEN
                        RAISE EXCEPTION 'Posted voucher % is not balanced: debit %, credit %',
                            COALESCE(NEW.voucher_id, OLD.voucher_id), debit_total, credit_total;
                    END IF;
                END IF;
                RETURN NULL;
            END;
            $body$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_validate_posted_voucher_balance ON voucher_lines;
            CREATE CONSTRAINT TRIGGER trg_validate_posted_voucher_balance
            AFTER INSERT OR UPDATE OR DELETE ON voucher_lines
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION validate_posted_voucher_balance();

            CREATE TABLE IF NOT EXISTS bill_allocations (
                allocation_id BIGSERIAL PRIMARY KEY,
                voucher_line_id BIGINT NOT NULL REFERENCES voucher_lines(line_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                reference_type VARCHAR(20) NOT NULL CHECK (reference_type IN ('NEW_REF', 'AGST_REF', 'ADVANCE', 'ON_ACCOUNT')),
                bill_reference_no VARCHAR(100) NOT NULL,
                amount NUMERIC(16, 4) NOT NULL CHECK (amount > 0.0000),
                dr_cr VARCHAR(2) NOT NULL CHECK (dr_cr IN ('DR', 'CR')),
                due_date DATE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_bill_alloc_ref ON bill_allocations(ledger_id, bill_reference_no);
            CREATE INDEX IF NOT EXISTS idx_bill_alloc_line ON bill_allocations(voucher_line_id);
        `);

        // =========================================================================
        // 8. COMMERCIAL SALES STREAM (Quotations, Orders, Deliveries, Invoices, Credit Notes)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS quotations (
                quotation_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                customer_id BIGINT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE RESTRICT,
                quotation_number VARCHAR(100) NOT NULL,
                revision_number INTEGER NOT NULL DEFAULT 0,
                quotation_date DATE NOT NULL,
                valid_until DATE NOT NULL CHECK (valid_until >= quotation_date),
                currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
                exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_tax_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
                net_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED')),
                terms_and_conditions TEXT,
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_quotation_revision UNIQUE (branch_id, quotation_number, revision_number)
            );

            CREATE TABLE IF NOT EXISTS quotation_items (
                quotation_item_id BIGSERIAL PRIMARY KEY,
                quotation_id BIGINT NOT NULL REFERENCES quotations(quotation_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0.0000),
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                quoted_rate NUMERIC(16, 4) NOT NULL CHECK (quoted_rate >= 0.0000),
                discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                taxable_amount NUMERIC(16, 2) NOT NULL,
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_quotation_item_line UNIQUE (quotation_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS sales_orders (
                sales_order_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                customer_id BIGINT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE RESTRICT,
                quotation_id BIGINT REFERENCES quotations(quotation_id) ON DELETE SET NULL,
                order_number VARCHAR(100) NOT NULL,
                order_date DATE NOT NULL,
                delivery_due_date DATE CHECK (delivery_due_date >= order_date),
                customer_po_reference VARCHAR(100),
                currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_tax_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
                net_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CLOSED', 'CANCELLED')),
                billing_status VARCHAR(30) NOT NULL DEFAULT 'UNBILLED' CHECK (billing_status IN ('UNBILLED', 'PARTIALLY_BILLED', 'FULLY_BILLED')),
                terms_and_conditions TEXT,
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_sales_order_num UNIQUE (branch_id, order_number)
            );

            CREATE TABLE IF NOT EXISTS sales_order_items (
                sales_order_item_id BIGSERIAL PRIMARY KEY,
                sales_order_id BIGINT NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0.0000),
                delivered_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                invoiced_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                cancelled_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                unit_rate NUMERIC(16, 4) NOT NULL CHECK (unit_rate >= 0.0000),
                discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                taxable_amount NUMERIC(16, 2) NOT NULL,
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_so_item_line UNIQUE (sales_order_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS delivery_notes (
                delivery_note_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                customer_id BIGINT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE RESTRICT,
                sales_order_id BIGINT REFERENCES sales_orders(sales_order_id) ON DELETE SET NULL,
                delivery_note_number VARCHAR(100) NOT NULL,
                delivery_date DATE NOT NULL,
                transporter_name VARCHAR(150),
                vehicle_number VARCHAR(50),
                lr_rr_number VARCHAR(100),
                eway_bill_number VARCHAR(50),
                status VARCHAR(30) NOT NULL DEFAULT 'DISPATCHED' CHECK (status IN ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_delivery_note_num UNIQUE (branch_id, delivery_note_number)
            );

            CREATE TABLE IF NOT EXISTS delivery_note_items (
                delivery_note_item_id BIGSERIAL PRIMARY KEY,
                delivery_note_id BIGINT NOT NULL REFERENCES delivery_notes(delivery_note_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                sales_order_item_id BIGINT REFERENCES sales_order_items(sales_order_item_id) ON DELETE RESTRICT,
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
                batch_number VARCHAR(100),
                dispatched_quantity NUMERIC(14, 4) NOT NULL CHECK (dispatched_quantity > 0.0000),
                invoiced_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                warehouse_location VARCHAR(100) DEFAULT 'Finished Goods Warehouse',
                CONSTRAINT uq_dn_item_line UNIQUE (delivery_note_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS sales_invoices (
                sales_invoice_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                customer_id BIGINT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE RESTRICT,
                sales_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                invoice_number VARCHAR(100) NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NOT NULL CHECK (due_date >= invoice_date),
                sales_order_id BIGINT REFERENCES sales_orders(sales_order_id) ON DELETE SET NULL,
                delivery_note_id BIGINT REFERENCES delivery_notes(delivery_note_id) ON DELETE SET NULL,
                invoice_type VARCHAR(30) NOT NULL DEFAULT 'TAX_INVOICE' CHECK (invoice_type IN ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'EXPORT_INVOICE', 'SEZ_INVOICE', 'PROFORMA')),
                place_of_supply_state_code VARCHAR(2) NOT NULL,
                is_reverse_charge BOOLEAN NOT NULL DEFAULT FALSE,
                currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_discount_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                freight_charges NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                other_charges NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
                net_total_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                paid_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                outstanding_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
                status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED')),
                accounting_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_sales_invoice_num UNIQUE (branch_id, invoice_number)
            );
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_cust ON sales_invoices(customer_id);
            CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);

            CREATE TABLE IF NOT EXISTS sales_invoice_items (
                sales_invoice_item_id BIGSERIAL PRIMARY KEY,
                sales_invoice_id BIGINT NOT NULL REFERENCES sales_invoices(sales_invoice_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                delivery_note_item_id BIGINT REFERENCES delivery_note_items(delivery_note_item_id) ON DELETE RESTRICT,
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0.0000),
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                unit_rate NUMERIC(16, 4) NOT NULL CHECK (unit_rate >= 0.0000),
                discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                taxable_amount NUMERIC(16, 2) NOT NULL,
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_inv_item_line UNIQUE (sales_invoice_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS credit_notes (
                credit_note_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                customer_id BIGINT NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE RESTRICT,
                original_sales_invoice_id BIGINT REFERENCES sales_invoices(sales_invoice_id) ON DELETE RESTRICT,
                credit_note_number VARCHAR(100) NOT NULL,
                credit_note_date DATE NOT NULL,
                reason_code VARCHAR(30) NOT NULL CHECK (reason_code IN ('SALES_RETURN', 'POST_SALE_DISCOUNT', 'DEFICIENT_SERVICE', 'CORRECTION', 'OTHER')),
                affects_physical_stock BOOLEAN NOT NULL DEFAULT FALSE,
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_tax_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
                net_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
                accounting_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_credit_note_num UNIQUE (branch_id, credit_note_number)
            );

            CREATE TABLE IF NOT EXISTS credit_note_items (
                credit_note_item_id BIGSERIAL PRIMARY KEY,
                credit_note_id BIGINT NOT NULL REFERENCES credit_notes(credit_note_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                unit_rate NUMERIC(16, 4) NOT NULL,
                taxable_amount NUMERIC(16, 2) NOT NULL,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_cn_item_line UNIQUE (credit_note_id, line_number)
            );
        `);

        // =========================================================================
        // 9. COMMERCIAL PURCHASE STREAM (Purchase Orders, Invoices, Debit Notes)
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                purchase_order_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                vendor_id BIGINT NOT NULL REFERENCES vendor_profiles(vendor_profile_id) ON DELETE RESTRICT,
                po_number VARCHAR(100) NOT NULL,
                po_date DATE NOT NULL,
                expected_delivery_date DATE CHECK (expected_delivery_date >= po_date),
                currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_tax_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                net_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED')),
                billing_status VARCHAR(30) NOT NULL DEFAULT 'UNBILLED' CHECK (billing_status IN ('UNBILLED', 'PARTIALLY_BILLED', 'FULLY_BILLED')),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_po_num UNIQUE (branch_id, po_number)
            );

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                purchase_order_item_id BIGSERIAL PRIMARY KEY,
                purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT,
                product_id BIGINT REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0.0000),
                received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                billed_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                cancelled_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                unit_rate NUMERIC(16, 4) NOT NULL CHECK (unit_rate >= 0.0000),
                taxable_amount NUMERIC(16, 2) NOT NULL,
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_po_item_line UNIQUE (purchase_order_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS purchase_invoices (
                purchase_invoice_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                vendor_id BIGINT NOT NULL REFERENCES vendor_profiles(vendor_profile_id) ON DELETE RESTRICT,
                purchase_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                purchase_order_id BIGINT REFERENCES purchase_orders(purchase_order_id) ON DELETE SET NULL,
                internal_entry_number VARCHAR(100) NOT NULL,
                supplier_invoice_number VARCHAR(100) NOT NULL,
                supplier_invoice_date DATE NOT NULL,
                posting_date DATE NOT NULL,
                due_date DATE NOT NULL CHECK (due_date >= supplier_invoice_date),
                place_of_supply_state_code VARCHAR(2) NOT NULL,
                is_reverse_charge BOOLEAN NOT NULL DEFAULT FALSE,
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                other_charges NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
                net_total_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                paid_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                outstanding_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
                status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
                accounting_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_vendor_invoice_num UNIQUE (branch_id, vendor_id, supplier_invoice_number)
            );

            CREATE TABLE IF NOT EXISTS purchase_invoice_items (
                purchase_invoice_item_id BIGSERIAL PRIMARY KEY,
                purchase_invoice_id BIGINT NOT NULL REFERENCES purchase_invoices(purchase_invoice_id) ON DELETE CASCADE,
                line_number INTEGER NOT NULL,
                grn_id BIGINT REFERENCES grns(id) ON DELETE RESTRICT,
                raw_material_id BIGINT REFERENCES raw_materials(material_id) ON DELETE RESTRICT,
                product_id BIGINT REFERENCES products(product_id) ON DELETE RESTRICT,
                hsn_sac_code VARCHAR(10) NOT NULL,
                billed_quantity NUMERIC(14, 4) NOT NULL CHECK (billed_quantity > 0.0000),
                unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
                unit_rate NUMERIC(16, 4) NOT NULL CHECK (unit_rate >= 0.0000),
                taxable_amount NUMERIC(16, 2) NOT NULL,
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                cgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                sgst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                igst_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(16, 2) NOT NULL,
                CONSTRAINT uq_pi_item_line UNIQUE (purchase_invoice_id, line_number)
            );

            CREATE TABLE IF NOT EXISTS debit_notes (
                debit_note_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                financial_year_id BIGINT REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                vendor_id BIGINT NOT NULL REFERENCES vendor_profiles(vendor_profile_id) ON DELETE RESTRICT,
                original_purchase_invoice_id BIGINT REFERENCES purchase_invoices(purchase_invoice_id) ON DELETE RESTRICT,
                debit_note_number VARCHAR(100) NOT NULL,
                debit_note_date DATE NOT NULL,
                reason_code VARCHAR(30) NOT NULL CHECK (reason_code IN ('PURCHASE_RETURN', 'RATE_DIFFERENCE', 'SHORTAGE', 'DEFECTIVE_GOODS', 'OTHER')),
                affects_physical_stock BOOLEAN NOT NULL DEFAULT FALSE,
                total_taxable_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                total_tax_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                net_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
                accounting_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_debit_note_num UNIQUE (branch_id, debit_note_number)
            );
        `);

        // =========================================================================
        // 10. SETTLEMENT & BANKING RECONCILIATION
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS settlement_vouchers (
                settlement_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE RESTRICT,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                settlement_type VARCHAR(10) NOT NULL CHECK (settlement_type IN ('RECEIPT', 'PAYMENT')),
                voucher_number VARCHAR(100) NOT NULL,
                settlement_date DATE NOT NULL,
                party_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                payment_mode_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                amount NUMERIC(16, 2) NOT NULL CHECK (amount > 0.00),
                unallocated_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00 CHECK (unallocated_amount >= 0.00),
                payment_instrument_type VARCHAR(20) NOT NULL CHECK (payment_instrument_type IN ('CASH', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'CARD')),
                instrument_reference_number VARCHAR(100),
                instrument_date DATE,
                accounting_voucher_id BIGINT UNIQUE REFERENCES vouchers(voucher_id),
                status VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
                created_by BIGINT REFERENCES employees(employee_id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_branch_settlement_num UNIQUE (branch_id, settlement_type, voucher_number)
            );

            CREATE TABLE IF NOT EXISTS bank_accounts (
                bank_account_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                ledger_id BIGINT NOT NULL UNIQUE REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                bank_name VARCHAR(150) NOT NULL,
                account_number VARCHAR(50) NOT NULL,
                ifsc_code VARCHAR(11) NOT NULL,
                branch_name VARCHAR(100),
                account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('CURRENT', 'SAVINGS', 'OVERDRAFT', 'CASH_CREDIT')),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                CONSTRAINT uq_company_account_number UNIQUE (company_id, account_number)
            );

            CREATE TABLE IF NOT EXISTS bank_reconciliation_records (
                reconciliation_id BIGSERIAL PRIMARY KEY,
                voucher_line_id BIGINT NOT NULL UNIQUE REFERENCES voucher_lines(line_id) ON DELETE CASCADE,
                bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(bank_account_id) ON DELETE RESTRICT,
                clearing_date DATE,
                instrument_number VARCHAR(50),
                reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'UNCLEARED' CHECK (reconciliation_status IN ('UNCLEARED', 'CLEARED', 'BOUNCED', 'CANCELLED')),
                bank_statement_reference VARCHAR(100),
                reconciled_by BIGINT REFERENCES employees(employee_id),
                reconciled_at TIMESTAMP WITH TIME ZONE
            );
        `);

        // =========================================================================
        // 11. COST CENTRES & BUDGETS
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS cost_categories (
                cost_category_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                category_name VARCHAR(100) NOT NULL,
                allocate_revenue BOOLEAN NOT NULL DEFAULT TRUE,
                allocate_non_revenue BOOLEAN NOT NULL DEFAULT FALSE,
                CONSTRAINT uq_company_cost_cat UNIQUE (company_id, category_name)
            );

            CREATE TABLE IF NOT EXISTS cost_centres (
                cost_centre_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                cost_category_id BIGINT NOT NULL REFERENCES cost_categories(cost_category_id) ON DELETE RESTRICT,
                parent_cost_centre_id BIGINT REFERENCES cost_centres(cost_centre_id) ON DELETE RESTRICT,
                cost_centre_name VARCHAR(100) NOT NULL,
                cost_centre_code VARCHAR(50) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                CONSTRAINT uq_company_cc_code UNIQUE (company_id, cost_centre_code)
            );

            CREATE TABLE IF NOT EXISTS voucher_line_cost_allocations (
                allocation_id BIGSERIAL PRIMARY KEY,
                voucher_line_id BIGINT NOT NULL REFERENCES voucher_lines(line_id) ON DELETE CASCADE,
                cost_centre_id BIGINT NOT NULL REFERENCES cost_centres(cost_centre_id) ON DELETE RESTRICT,
                allocated_amount NUMERIC(16, 4) NOT NULL CHECK (allocated_amount > 0.0000),
                CONSTRAINT uq_voucher_line_cc UNIQUE (voucher_line_id, cost_centre_id)
            );

            CREATE TABLE IF NOT EXISTS budgets (
                budget_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                financial_year_id BIGINT NOT NULL REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                budget_name VARCHAR(100) NOT NULL,
                ledger_id BIGINT REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
                group_id BIGINT REFERENCES account_groups(group_id) ON DELETE CASCADE,
                cost_centre_id BIGINT REFERENCES cost_centres(cost_centre_id) ON DELETE CASCADE,
                allocated_amount NUMERIC(16, 2) NOT NULL CHECK (allocated_amount >= 0.00),
                CONSTRAINT uq_budget_def UNIQUE (financial_year_id, budget_name, ledger_id, group_id, cost_centre_id)
            );
        `);

        // =========================================================================
        // 12. FIXED ASSETS, AUDIT LOGS & WORKFLOW
        // =========================================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS fixed_asset_cards (
                asset_card_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                branch_id BIGINT REFERENCES branches(branch_id) ON DELETE RESTRICT,
                asset_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                accumulated_depr_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                depr_expense_ledger_id BIGINT NOT NULL REFERENCES ledgers(ledger_id) ON DELETE RESTRICT,
                asset_name VARCHAR(150) NOT NULL,
                asset_tag_number VARCHAR(100) NOT NULL,
                capitalization_date DATE NOT NULL,
                original_cost NUMERIC(16, 2) NOT NULL CHECK (original_cost > 0.00),
                salvage_value NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
                depreciation_method VARCHAR(20) NOT NULL CHECK (depreciation_method IN ('STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE')),
                depreciation_rate_percentage NUMERIC(5, 2) NOT NULL CHECK (depreciation_rate_percentage BETWEEN 0.00 AND 100.00),
                useful_life_months INTEGER NOT NULL CHECK (useful_life_months > 0),
                current_book_value NUMERIC(16, 2) NOT NULL,
                is_disposed BOOLEAN NOT NULL DEFAULT FALSE,
                disposal_date DATE,
                CONSTRAINT uq_company_asset_tag UNIQUE (company_id, asset_tag_number)
            );

            CREATE TABLE IF NOT EXISTS asset_depreciation_schedules (
                schedule_id BIGSERIAL PRIMARY KEY,
                asset_card_id BIGINT NOT NULL REFERENCES fixed_asset_cards(asset_card_id) ON DELETE CASCADE,
                financial_year_id BIGINT NOT NULL REFERENCES financial_years(financial_year_id) ON DELETE RESTRICT,
                schedule_date DATE NOT NULL,
                depreciation_amount NUMERIC(16, 2) NOT NULL CHECK (depreciation_amount >= 0.00),
                written_down_value NUMERIC(16, 2) NOT NULL,
                accounting_voucher_id BIGINT REFERENCES vouchers(voucher_id),
                is_posted BOOLEAN NOT NULL DEFAULT FALSE,
                CONSTRAINT uq_asset_schedule_date UNIQUE (asset_card_id, schedule_date)
            );

            CREATE TABLE IF NOT EXISTS workflow_approvals (
                approval_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                document_type VARCHAR(30) NOT NULL,
                document_id BIGINT NOT NULL,
                approval_level SMALLINT NOT NULL DEFAULT 1,
                assigned_user_id BIGINT NOT NULL REFERENCES employees(employee_id),
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                rejection_reason TEXT,
                action_taken_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT uq_doc_approval_step UNIQUE (document_type, document_id, approval_level)
            );

            CREATE TABLE IF NOT EXISTS accounting_audit_logs (
                audit_id BIGSERIAL PRIMARY KEY,
                company_id BIGINT REFERENCES companies(company_id) ON DELETE CASCADE,
                entity_name VARCHAR(100) NOT NULL,
                entity_id BIGINT NOT NULL,
                action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'POST', 'CANCEL', 'REVERSE', 'LOCK', 'UNLOCK')),
                pre_state JSONB,
                post_state JSONB,
                performed_by BIGINT REFERENCES employees(employee_id),
                client_ip_address VARCHAR(45),
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_entity ON accounting_audit_logs(entity_name, entity_id);
        `);

        // =========================================================================
        // 13. SEEDING STANDARD CHART OF ACCOUNTS & SYSTEM VOUCHER TYPES
        // =========================================================================
        await seedStandardAccountingMasters(client);

        await client.query('COMMIT');
        console.log('✅ Accounting, Billing & Commercial relational schema successfully verified & initialized.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to initialize accounting schema:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Seeds standard system account groups & voucher types for each company
 */
export const seedStandardAccountingMasters = async (client) => {
    // 1. Fetch all companies
    const companiesRes = await client.query('SELECT company_id FROM companies');
    const companies = companiesRes.rows;

    for (const comp of companies) {
        const cId = comp.company_id;

        // Check if standard groups already exist for this company
        const existingGroupsRes = await client.query('SELECT COUNT(*) FROM account_groups WHERE company_id = $1', [cId]);
        if (parseInt(existingGroupsRes.rows[0].count, 10) === 0) {
            console.log(`🌱 Seeding standard Chart of Accounts for company ID: ${cId}`);

            // Primary Root Groups
            const rootGroups = [
                { name: 'Assets', code: 'GRP-ASSET', nature: 'ASSET', gp: false },
                { name: 'Liabilities', code: 'GRP-LIAB', nature: 'LIABILITY', gp: false },
                { name: 'Equity & Capital', code: 'GRP-EQUITY', nature: 'EQUITY', gp: false },
                { name: 'Income / Revenue', code: 'GRP-INCOME', nature: 'INCOME', gp: true },
                { name: 'Expenses', code: 'GRP-EXPENSE', nature: 'EXPENSE', gp: true }
            ];

            const createdRoots = {};
            for (const g of rootGroups) {
                const res = await client.query(`
                    INSERT INTO account_groups (company_id, parent_group_id, group_name, group_code, nature, affects_gross_profit, is_system_group)
                    VALUES ($1, NULL, $2, $3, $4, $5, TRUE)
                    RETURNING group_id, group_code
                `, [cId, g.name, g.code, g.nature, g.gp]);
                createdRoots[g.code] = res.rows[0].group_id;
            }

            // Standard Sub-Groups
            const subGroups = [
                // Assets Subgroups
                { parent: 'GRP-ASSET', name: 'Current Assets', code: 'GRP-CA', nature: 'ASSET', gp: false },
                { parent: 'GRP-ASSET', name: 'Fixed Assets', code: 'GRP-FA', nature: 'ASSET', gp: false },
                { parent: 'GRP-ASSET', name: 'Investments', code: 'GRP-INV', nature: 'ASSET', gp: false },
                // Liabilities Subgroups
                { parent: 'GRP-LIAB', name: 'Current Liabilities', code: 'GRP-CL', nature: 'LIABILITY', gp: false },
                { parent: 'GRP-LIAB', name: 'Loans & Borrowings', code: 'GRP-LOAN', nature: 'LIABILITY', gp: false },
                // Income Subgroups
                { parent: 'GRP-INCOME', name: 'Direct Incomes', code: 'GRP-DIR-INC', nature: 'INCOME', gp: true },
                { parent: 'GRP-INCOME', name: 'Indirect Incomes', code: 'GRP-INDIR-INC', nature: 'INCOME', gp: false },
                // Expense Subgroups
                { parent: 'GRP-EXPENSE', name: 'Direct Expenses', code: 'GRP-DIR-EXP', nature: 'EXPENSE', gp: true },
                { parent: 'GRP-EXPENSE', name: 'Indirect Expenses', code: 'GRP-INDIR-EXP', nature: 'EXPENSE', gp: false }
            ];

            const createdSubs = {};
            for (const sg of subGroups) {
                const res = await client.query(`
                    INSERT INTO account_groups (company_id, parent_group_id, group_name, group_code, nature, affects_gross_profit, is_system_group)
                    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                    RETURNING group_id, group_code
                `, [cId, createdRoots[sg.parent], sg.name, sg.code, sg.nature, sg.gp]);
                createdSubs[sg.code] = res.rows[0].group_id;
            }

            // Level-3 Essential Control Groups
            const controlGroups = [
                { parent: 'GRP-CA', name: 'Sundry Debtors (Customers)', code: 'GRP-DEBTORS', nature: 'ASSET', gp: false },
                { parent: 'GRP-CA', name: 'Cash-in-Hand', code: 'GRP-CASH', nature: 'ASSET', gp: false },
                { parent: 'GRP-CA', name: 'Bank Accounts', code: 'GRP-BANK', nature: 'ASSET', gp: false },
                { parent: 'GRP-CA', name: 'Stock-in-Hand', code: 'GRP-STOCK', nature: 'ASSET', gp: false },
                { parent: 'GRP-CL', name: 'Sundry Creditors (Suppliers)', code: 'GRP-CREDITORS', nature: 'LIABILITY', gp: false },
                { parent: 'GRP-CL', name: 'Duties & Taxes (GST/TDS)', code: 'GRP-TAXES', nature: 'LIABILITY', gp: false },
                { parent: 'GRP-DIR-INC', name: 'Sales Accounts', code: 'GRP-SALES', nature: 'INCOME', gp: true },
                { parent: 'GRP-DIR-EXP', name: 'Purchase Accounts', code: 'GRP-PURCHASE', nature: 'EXPENSE', gp: true }
            ];

            for (const cg of controlGroups) {
                const parentId = createdSubs[cg.parent];
                await client.query(`
                    INSERT INTO account_groups (company_id, parent_group_id, group_name, group_code, nature, affects_gross_profit, is_system_group)
                    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                `, [cId, parentId, cg.name, cg.code, cg.nature, cg.gp]);
            }

            // Seed Essential Default Ledgers (Cash, Default Sales, Default Purchase, GST ledgers, Round Off)
            const salesGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-SALES'", [cId]);
            const purchGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-PURCHASE'", [cId]);
            const taxGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-TAXES'", [cId]);
            const cashGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-CASH'", [cId]);
            const bankGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-BANK'", [cId]);
            const indirExpGroupRes = await client.query("SELECT group_id FROM account_groups WHERE company_id = $1 AND group_code = 'GRP-INDIR-EXP'", [cId]);

            const defaultLedgers = [
                { name: 'General Sales Account', code: 'LED-SALES-GEN', groupId: salesGroupRes.rows[0]?.group_id, taxType: 'NONE' },
                { name: 'General Purchase Account', code: 'LED-PURCH-GEN', groupId: purchGroupRes.rows[0]?.group_id, taxType: 'NONE' },
                { name: 'Cash Account', code: 'LED-CASH-MAIN', groupId: cashGroupRes.rows[0]?.group_id, taxType: 'NONE' },
                { name: 'Main Bank Account', code: 'LED-BANK-MAIN', groupId: bankGroupRes.rows[0]?.group_id, taxType: 'NONE' },
                { name: 'General Expense Account', code: 'LED-EXP-GEN', groupId: indirExpGroupRes.rows[0]?.group_id, taxType: 'NONE' },
                { name: 'Output CGST', code: 'LED-TAX-OUT-CGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'CGST' },
                { name: 'Output SGST', code: 'LED-TAX-OUT-SGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'SGST' },
                { name: 'Output IGST', code: 'LED-TAX-OUT-IGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'IGST' },
                { name: 'Input CGST', code: 'LED-TAX-IN-CGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'CGST' },
                { name: 'Input SGST', code: 'LED-TAX-IN-SGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'SGST' },
                { name: 'Input IGST', code: 'LED-TAX-IN-IGST', groupId: taxGroupRes.rows[0]?.group_id, taxType: 'IGST' },
                { name: 'Round Off Account', code: 'LED-ROUND-OFF', groupId: indirExpGroupRes.rows[0]?.group_id, taxType: 'NONE' }
            ];

            for (const dl of defaultLedgers) {
                if (dl.groupId) {
                    await client.query(`
                        INSERT INTO
                         ledgers (company_id, group_id, ledger_name, ledger_code, tax_type, is_active)
                        VALUES ($1, $2, $3, $4, $5, TRUE)
                        ON CONFLICT (company_id, ledger_code) DO NOTHING
                    `, [cId, dl.groupId, dl.name, dl.code, dl.taxType]);
                }
            }
        }

        // Check if standard voucher types exist
        const existingVouchersRes = await client.query('SELECT COUNT(*) FROM voucher_types WHERE company_id = $1', [cId]);
        if (parseInt(existingVouchersRes.rows[0].count, 10) === 0) {
            console.log(`🌱 Seeding standard Voucher Types for company ID: ${cId}`);
            const standardVouchers = [
                { code: 'VCH-SALES', name: 'Sales Invoice', category: 'SALES', inventory: true },
                { code: 'VCH-PURCHASE', name: 'Purchase Invoice', category: 'PURCHASE', inventory: true },
                { code: 'VCH-RECEIPT', name: 'Receipt Voucher', category: 'RECEIPT', inventory: false },
                { code: 'VCH-PAYMENT', name: 'Payment Voucher', category: 'PAYMENT', inventory: false },
                { code: 'VCH-CONTRA', name: 'Contra Voucher', category: 'CONTRA', inventory: false },
                { code: 'VCH-JOURNAL', name: 'Journal Voucher', category: 'JOURNAL', inventory: false },
                { code: 'VCH-CRNOTE', name: 'Credit Note', category: 'CREDIT_NOTE', inventory: true },
                { code: 'VCH-DRNOTE', name: 'Debit Note', category: 'DEBIT_NOTE', inventory: true }
            ];

            for (const sv of standardVouchers) {
                await client.query(`
                    INSERT INTO voucher_types (company_id, voucher_type_code, voucher_type_name, base_category, affects_inventory, is_system_defined)
                    VALUES ($1, $2, $3, $4, $5, TRUE)
                    ON CONFLICT (company_id, voucher_type_code) DO NOTHING
                `, [cId, sv.code, sv.name, sv.category, sv.inventory]);
            }
        }

        // Seed default current Financial Year if none exists
        const fyRes = await client.query('SELECT COUNT(*) FROM financial_years WHERE company_id = $1', [cId]);
        if (parseInt(fyRes.rows[0].count, 10) === 0) {
            const currentYear = new Date().getFullYear();
            const startYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
            const endYear = startYear + 1;
            await client.query(`
                INSERT INTO financial_years (company_id, year_label, start_date, end_date)
                VALUES ($1, $2, $3, $4)
            `, [cId, `FY ${startYear}-${endYear}`, `${startYear}-04-01`, `${endYear}-03-31`]);
        }
    }
};

export default initAccountingSchema;
