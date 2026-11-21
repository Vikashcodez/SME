import { test } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import {
    resolveVendorId,
    resolveCustomerId,
    resolveDepartmentId,
    resolveRoleId,
    resolveBranchId,
    resolveEmployeeId,
    resolveProductId,
    resolveAccountGroupId,
    resolveRawMaterialId
} from '../src/services/ForeignKeyResolver.js';
import { bulkImportGrns, generateGrnNumber } from '../src/controllers/Grn.Controller.js';

test('Smart Foreign Key Resolvers: Vendor lookups by PAN, GSTIN, Code, Name', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Vendor 2 in test DB: Name: 'Supplier Custo', Code: 'PTY-1-61786589', GSTIN: '27AAACH7409R1Z1', PAN: 'AAACH7409R'
        const byPan = await resolveVendorId(client, companyId, 'AAACH7409R');
        assert.equal(String(byPan), '2', 'resolveVendorId should resolve vendor by PAN number');

        const byGstin = await resolveVendorId(client, companyId, '27AAACH7409R1Z1');
        assert.equal(String(byGstin), '2', 'resolveVendorId should resolve vendor by GSTIN');

        const byCode = await resolveVendorId(client, companyId, 'PTY-1-61786589');
        assert.equal(String(byCode), '2', 'resolveVendorId should resolve vendor by vendor code');

        const byName = await resolveVendorId(client, companyId, 'Supplier Custo');
        assert.equal(String(byName), '2', 'resolveVendorId should resolve vendor by company/vendor name');

        const byId = await resolveVendorId(client, companyId, '2');
        assert.equal(String(byId), '2', 'resolveVendorId should resolve vendor by direct primary key ID');

        const invalid = await resolveVendorId(client, companyId, 'NON_EXISTENT_VENDOR_XYZ');
        assert.equal(invalid, null, 'resolveVendorId should return null for non-existent vendor');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Customer lookups by PAN, GSTIN, Code, Name', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Customer 2 in test DB: Trade Name: 'Supplier Custo', Code: 'PTY-1-61786589', GSTIN: '27AAACH7409R1Z1', PAN: 'AAACH7409R'
        const byPan = await resolveCustomerId(client, companyId, 'AAACH7409R');
        assert.equal(String(byPan), '2', 'resolveCustomerId should resolve customer by PAN');

        const byGstin = await resolveCustomerId(client, companyId, '27AAACH7409R1Z1');
        assert.equal(String(byGstin), '2', 'resolveCustomerId should resolve customer by GSTIN');

        const byCode = await resolveCustomerId(client, companyId, 'PTY-1-61786589');
        assert.equal(String(byCode), '2', 'resolveCustomerId should resolve customer by customer code');

        const byName = await resolveCustomerId(client, companyId, 'Supplier Custo');
        assert.equal(String(byName), '2', 'resolveCustomerId should resolve customer by trade/legal name');

        const byId = await resolveCustomerId(client, companyId, '2');
        assert.equal(String(byId), '2', 'resolveCustomerId should resolve customer by direct ID');

        const invalid = await resolveCustomerId(client, companyId, 'NON_EXISTENT_CUST');
        assert.equal(invalid, null, 'resolveCustomerId should return null for non-existent customer');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Raw Material lookups by Code, Name, ID', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Raw Material 1 in test DB: Name: 'Copper', Code: 'RM-1-8622'
        const byCode = await resolveRawMaterialId(client, companyId, 'RM-1-8622');
        assert.equal(String(byCode), '1', 'resolveRawMaterialId should resolve by material code');

        const byName = await resolveRawMaterialId(client, companyId, 'Copper');
        assert.equal(String(byName), '1', 'resolveRawMaterialId should resolve by material name');

        const byId = await resolveRawMaterialId(client, companyId, '1');
        assert.equal(String(byId), '1', 'resolveRawMaterialId should resolve by direct material ID');

        const invalid = await resolveRawMaterialId(client, companyId, 'NON_EXISTENT_RM');
        assert.equal(invalid, null, 'resolveRawMaterialId should return null for non-existent raw material');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Product lookups by Code, Name, ID', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Product 2: Name: 'copper  plate', Code: 'PRD-2835'
        const byCode = await resolveProductId(client, companyId, 'PRD-2835');
        assert.equal(String(byCode), '2', 'resolveProductId should resolve by product code');

        const byName = await resolveProductId(client, companyId, 'copper  plate');
        assert.equal(String(byName), '2', 'resolveProductId should resolve by product name');

        const byId = await resolveProductId(client, companyId, '2');
        assert.equal(String(byId), '2', 'resolveProductId should resolve by direct ID');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Branch lookups by Code, Name, ID', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Branch 1: Name: 'HYD BRANCH', Code: 'VKZHYD'
        const byCode = await resolveBranchId(client, companyId, 'VKZHYD');
        assert.equal(String(byCode), '1', 'resolveBranchId should resolve by branch code');

        const byName = await resolveBranchId(client, companyId, 'HYD BRANCH');
        assert.equal(String(byName), '1', 'resolveBranchId should resolve by branch name');

        const byId = await resolveBranchId(client, companyId, '1');
        assert.equal(String(byId), '1', 'resolveBranchId should resolve by direct ID');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Employee lookups by Code, Email, Name', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        // Employee 1: Code: 'ADMIN-VKZZ', Email: 'admin@vikash.com', First Name: 'Vikash Groups'
        const byCode = await resolveEmployeeId(client, companyId, 'ADMIN-VKZZ');
        assert.equal(String(byCode), '1', 'resolveEmployeeId should resolve by employee code');

        const byEmail = await resolveEmployeeId(client, companyId, 'admin@vikash.com');
        assert.equal(String(byEmail), '1', 'resolveEmployeeId should resolve by email address');

        const byName = await resolveEmployeeId(client, companyId, 'Vikash Groups');
        assert.equal(String(byName), '1', 'resolveEmployeeId should resolve by employee name');
    } finally {
        client.release();
    }
});

test('Smart Foreign Key Resolvers: Account Group lookups by Code, Name', async () => {
    const client = await pool.connect();
    try {
        const companyId = 1;
        const byCode = await resolveAccountGroupId(client, companyId, 'GRP-DEBTORS');
        assert.equal(String(byCode), '15', 'resolveAccountGroupId should resolve by group code');

        const byName = await resolveAccountGroupId(client, companyId, 'Sundry Debtors (Customers)');
        assert.equal(String(byName), '15', 'resolveAccountGroupId should resolve by group name');

        const byCash = await resolveAccountGroupId(client, companyId, 'GRP-CASH');
        assert.equal(String(byCash), '16', 'resolveAccountGroupId should resolve GRP-CASH');
    } finally {
        client.release();
    }
});

test('End-to-End GRN Import with Foreign Key linking (Rolled Back - Zero Dummy Data)', async () => {
    const client = await pool.connect();
    try {
        // Record row counts prior to test
        const countBeforeGrns = await client.query('SELECT COUNT(*)::INT AS count FROM grns');
        const countBeforeItems = await client.query('SELECT COUNT(*)::INT AS count FROM grn_items');
        const countBeforeInv = await client.query('SELECT COUNT(*)::INT AS count FROM raw_material_inventory');
        const countBeforeMovements = await client.query('SELECT COUNT(*)::INT AS count FROM raw_material_stock_movements');

        // Start isolated transaction
        await client.query('BEGIN');

        const companyId = 1;
        const row = {
            vendor: 'AAACH7409R', // Vendor PAN instead of ID
            raw_material: 'RM-1-8622', // Raw Material Code instead of ID
            branch: 'VKZHYD', // Branch Code instead of ID
            received_quantity: 45,
            unit_cost: 350,
            free_quantity: 2,
            batch_number: 'TEST-BATCH-VERIFY-001',
            invoice_number: 'TEST-INV-999',
            remarks: 'Integration verification batch'
        };

        // 1. Resolve foreign keys
        const resolvedBranchId = await resolveBranchId(client, companyId, row.branch);
        assert.equal(String(resolvedBranchId), '1', 'Branch resolved to primary key 1');

        const resolvedVendorId = await resolveVendorId(client, companyId, row.vendor);
        assert.equal(String(resolvedVendorId), '2', 'Vendor resolved to primary key 2 via PAN');

        const resolvedRawMaterialId = await resolveRawMaterialId(client, companyId, row.raw_material);
        assert.equal(String(resolvedRawMaterialId), '1', 'Raw Material resolved to primary key 1 via Code');

        // 2. Insert GRN header
        const grnNumber = await generateGrnNumber(client);
        const grnRes = await client.query(`
            INSERT INTO grns (
                company_id, branch_id, grn_number, vendor_id,
                invoice_number, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [companyId, resolvedBranchId, grnNumber, resolvedVendorId, row.invoice_number, row.remarks]);

        const grn = grnRes.rows[0];
        assert.ok(grn.id, 'GRN header inserted in transaction');
        assert.equal(String(grn.vendor_id), '2', 'GRN header links to resolved vendor_id 2');
        assert.equal(String(grn.branch_id), '1', 'GRN header links to resolved branch_id 1');

        // 3. Insert GRN item
        const itemRes = await client.query(`
            INSERT INTO grn_items (
                grn_id, raw_material_id, batch_number,
                received_quantity, free_quantity, unit_cost, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [grn.id, resolvedRawMaterialId, row.batch_number, row.received_quantity, row.free_quantity, row.unit_cost, row.remarks]);

        const item = itemRes.rows[0];
        assert.ok(item.id, 'GRN item inserted in transaction');
        assert.equal(String(item.raw_material_id), '1', 'GRN item links to resolved raw_material_id 1');

        // 4. Insert raw_material_inventory
        const totalBatchQty = row.received_quantity + row.free_quantity;
        const invRes = await client.query(`
            INSERT INTO raw_material_inventory (
                company_id, branch_id, raw_material_id, material_id,
                grn_item_id, batch_number, received_quantity,
                available_quantity, current_stock, available_stock,
                unit_cost, total_value, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'AVAILABLE')
            RETURNING *
        `, [companyId, resolvedBranchId, resolvedRawMaterialId, resolvedRawMaterialId, item.id, row.batch_number, totalBatchQty, totalBatchQty, totalBatchQty, totalBatchQty, row.unit_cost, totalBatchQty * row.unit_cost]);

        const inv = invRes.rows[0];
        assert.ok(inv.inventory_id, 'Inventory batch created in transaction');
        assert.equal(String(inv.grn_item_id), String(item.id), 'Inventory batch links to grn_item_id');
        assert.equal(String(inv.raw_material_id), '1', 'Inventory batch links to raw_material_id 1');

        // 5. Insert stock movement audit
        const movRes = await client.query(`
            INSERT INTO raw_material_stock_movements (
                company_id, branch_id, material_id, vendor_id,
                movement_type, item_type, quantity, unit_cost, total_cost,
                reference_no, batch_no
            ) VALUES ($1, $2, $3, $4, 'GRN Inward (Excel Import)', 'Raw Material', $5, $6, $7, $8, $9)
            RETURNING *
        `, [companyId, resolvedBranchId, resolvedRawMaterialId, resolvedVendorId, totalBatchQty, row.unit_cost, totalBatchQty * row.unit_cost, grnNumber, row.batch_number]);

        const mov = movRes.rows[0];
        assert.ok(mov.movement_id, 'Stock movement audit inserted');
        assert.equal(String(mov.vendor_id), '2', 'Stock movement audit links to resolved vendor_id 2');
        assert.equal(String(mov.material_id), '1', 'Stock movement audit links to resolved material_id 1');

        // 6. Rollback transaction to ensure ZERO dummy data persists
        await client.query('ROLLBACK');

        // 7. Verify database row counts are 100% identical to before the test
        const countAfterGrns = await client.query('SELECT COUNT(*)::INT AS count FROM grns');
        const countAfterItems = await client.query('SELECT COUNT(*)::INT AS count FROM grn_items');
        const countAfterInv = await client.query('SELECT COUNT(*)::INT AS count FROM raw_material_inventory');
        const countAfterMovements = await client.query('SELECT COUNT(*)::INT AS count FROM raw_material_stock_movements');

        assert.equal(countAfterGrns.rows[0].count, countBeforeGrns.rows[0].count, 'GRN count unchanged (Zero dummy data)');
        assert.equal(countAfterItems.rows[0].count, countBeforeItems.rows[0].count, 'GRN items count unchanged (Zero dummy data)');
        assert.equal(countAfterInv.rows[0].count, countBeforeInv.rows[0].count, 'Inventory count unchanged (Zero dummy data)');
        assert.equal(countAfterMovements.rows[0].count, countBeforeMovements.rows[0].count, 'Movements count unchanged (Zero dummy data)');
    } finally {
        client.release();
    }
});

test('End-to-End GRN Controller bulkImportGrns (Mocked COMMIT -> ROLLBACK - Zero Dummy Data)', async () => {
    // Intercept client query to convert COMMIT to ROLLBACK
    const originalConnect = pool.connect.bind(pool);
    pool.connect = async () => {
        const client = await originalConnect();
        const originalQuery = client.query.bind(client);
        client.query = async (text, params) => {
            if (typeof text === 'string' && text.trim().toUpperCase() === 'COMMIT') {
                return originalQuery('ROLLBACK');
            }
            return originalQuery(text, params);
        };
        return client;
    };

    try {
        const req = {
            user: { company_id: 1, branch_id: 1, employee_id: 1 },
            body: {
                company_id: 1,
                branch_id: 1,
                items: [
                    {
                        vendor: '27AAACH7409R1Z1', // By GSTIN
                        raw_material: 'Copper', // By Name
                        branch: 'HYD BRANCH', // By Name
                        received_quantity: 25,
                        unit_cost: 410,
                        free_quantity: 1,
                        batch_number: 'TEST-CONTROLLER-BATCH-001',
                        invoice_number: 'INV-CTRL-101',
                        remarks: 'Controller import test'
                    }
                ]
            }
        };

        let responseStatusCode = null;
        let responseJson = null;

        const res = {
            status: (code) => {
                responseStatusCode = code;
                return res;
            },
            json: (data) => {
                responseJson = data;
                return res;
            }
        };

        await bulkImportGrns(req, res);

        assert.ok(responseStatusCode === 200 || responseStatusCode === 201, `bulkImportGrns should return HTTP 200 or 201, got ${responseStatusCode}`);
        assert.equal(responseJson.success, true, 'bulkImportGrns should report success: true');
        assert.equal(responseJson.count, 1, 'bulkImportGrns should report 1 imported GRN');
        assert.equal(responseJson.errors, undefined, 'bulkImportGrns should have no errors');
    } finally {
        // Restore original connect
        pool.connect = originalConnect;
    }
});

test('Zero Dummy Data Guarantee: verify no TEST records exist in database', async () => {
    const client = await pool.connect();
    try {
        const testBatches = await client.query("SELECT COUNT(*)::INT AS count FROM grn_items WHERE batch_number LIKE 'TEST%'");
        const testInvoices = await client.query("SELECT COUNT(*)::INT AS count FROM grns WHERE invoice_number LIKE 'TEST%' OR invoice_number LIKE 'INV-CTRL%'");
        assert.equal(testBatches.rows[0].count, 0, 'No test batches should remain in grn_items');
        assert.equal(testInvoices.rows[0].count, 0, 'No test invoices should remain in grns');
    } finally {
        client.release();
    }
});

test('Teardown database pool connection', async () => {
    await pool.end();
});
