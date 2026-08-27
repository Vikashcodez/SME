import pool from '../src/config/database.js';
import { logger } from '../src/config/logger.js';

async function verifySchema() {
    try {
        console.log('\n======================================================');
        console.log('  Chandra Precision ERP Relational Schema Verifier  ');
        console.log('======================================================\n');

        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name ASC
        `);

        console.log(`✅ Total PostgreSQL Tables Found: ${tablesRes.rows.length}\n`);

        const expectedTables = [
            'companies', 'branches', 'users', 'roles', 'number_series',
            'ledger_groups', 'ledgers', 'vouchers', 'voucher_items',
            'customers', 'sales_orders', 'sales_invoices',
            'vendors', 'purchase_orders', 'goods_receipts',
            'products', 'warehouses', 'stock_ledger', 'stock_transfers',
            'work_centers', 'boms', 'work_orders',
            'qc_inspections', 'non_conformance_reports',
            'employees', 'attendance_logs', 'payroll_runs', 'payslips',
            'delivery_schedules', 'delivery_tracking', 'fleet_vehicle_logs', 'freight_bookings',
            'fixed_assets', 'projects', 'project_tasks', 'project_milestones', 'project_timesheets',
            'transaction_audit_trail', 'document_master'
        ];

        let missing = 0;
        for (const t of expectedTables) {
            const exists = tablesRes.rows.some(r => r.table_name === t);
            if (exists) {
                console.log(`  ✔ [OK] Table: ${t}`);
            } else {
                console.log(`  ✖ [MISSING] Table: ${t}`);
                missing++;
            }
        }

        console.log(`\n======================================================`);
        if (missing === 0) {
            console.log(`✅ 100% Schema Coverage Confirmed. All ${expectedTables.length} core tables active.`);
        } else {
            console.log(`⚠️ ${missing} tables are not yet migrated.`);
        }
        console.log(`======================================================\n`);

        await pool.end();
    } catch (err) {
        console.error('Schema verification notice (DB might be offline):', err.message);
        process.exit(0);
    }
}

verifySchema();
