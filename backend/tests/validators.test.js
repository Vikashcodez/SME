import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createCustomerSchema, createSalesOrderSchema } from '../src/validators/sales.validators.js';
import { createVendorSchema, createPurchaseOrderSchema } from '../src/validators/procurement.validators.js';
import { createProductSchema, createStockTransferSchema } from '../src/validators/inventory.validators.js';
import { createBomSchema, createWorkOrderSchema } from '../src/validators/manufacturing.validators.js';
import { createEmployeeSchema, createPayrollRunSchema } from '../src/validators/hr.validators.js';
import { createQcInspectionSchema, createNcrReportSchema } from '../src/validators/quality.validators.js';
import { createDeliveryScheduleSchema, createFleetLogSchema } from '../src/validators/logistics.validators.js';
import { createFixedAssetSchema } from '../src/validators/assets.validators.js';
import { createProjectSchema, createProjectTaskSchema } from '../src/validators/projects.validators.js';

describe('Universal Enterprise Validator Suite', () => {

    describe('Sales Validators', () => {
        it('validates a valid customer payload', () => {
            const result = createCustomerSchema.safeParse({
                customer_name: 'Tata Motors Precision Division',
                gstin: '27AAACT0502J1Z2',
                pan: 'AAACT0502J',
                billing_city: 'Pune',
                credit_limit: 1000000
            });
            assert.equal(result.success, true);
        });

        it('rejects customer with empty name', () => {
            const result = createCustomerSchema.safeParse({ customer_name: '' });
            assert.equal(result.success, false);
        });

        it('validates a valid sales order with line items', () => {
            const result = createSalesOrderSchema.safeParse({
                customer_id: 1,
                order_number: 'SO-2026-0001',
                items: [
                    { item_name: 'Machined Gear Pinion', quantity: 500, unit_price: 450, gst_rate: 18 }
                ]
            });
            assert.equal(result.success, true);
        });
    });

    describe('Inventory Validators', () => {
        it('validates product creation schema', () => {
            const result = createProductSchema.safeParse({
                product_name: 'Titanium Aerospace Flange 50mm',
                item_type: 'Finished Goods',
                cost_price: 1200,
                selling_price: 1850,
                hsn_code: '8483'
            });
            assert.equal(result.success, true);
        });

        it('validates stock transfer schema', () => {
            const result = createStockTransferSchema.safeParse({
                from_warehouse_id: 1,
                to_warehouse_id: 2,
                product_id: 5,
                quantity: 100
            });
            assert.equal(result.success, true);
        });
    });

    describe('Manufacturing Validators', () => {
        it('validates BOM schema with sub-items', () => {
            const result = createBomSchema.safeParse({
                product_id: 10,
                output_qty: 1,
                items: [
                    { product_id: 1, quantity: 2.5, unit_cost: 300 },
                    { product_id: 2, quantity: 1, unit_cost: 150 }
                ]
            });
            assert.equal(result.success, true);
        });

        it('validates work order schema', () => {
            const result = createWorkOrderSchema.safeParse({
                product_id: 10,
                planned_qty: 250,
                status: 'Planned'
            });
            assert.equal(result.success, true);
        });
    });

    describe('Quality & NCR Validators', () => {
        it('validates QC inspection schema', () => {
            const result = createQcInspectionSchema.safeParse({
                product_id: 1,
                inspection_type: 'Final Quality Gate',
                sample_size: 10,
                accepted_qty: 10,
                rejected_qty: 0,
                status: 'Pass'
            });
            assert.equal(result.success, true);
        });

        it('validates NCR report schema', () => {
            const result = createNcrReportSchema.safeParse({
                defect_type: 'Dimensional Tolerance Out of Spec (+0.05mm)',
                defect_description: 'Shaft diameter exceeded drawing tolerance',
                severity: 'Major',
                disposition: 'Rework'
            });
            assert.equal(result.success, true);
        });
    });

    describe('HR & Payroll Validators', () => {
        it('validates employee creation schema', () => {
            const result = createEmployeeSchema.safeParse({
                first_name: 'Rahul',
                last_name: 'Kulkarni',
                email: 'rahul.k@chandraprecision.com',
                basic_salary: 45000
            });
            assert.equal(result.success, true);
        });

        it('validates payroll run schema', () => {
            const result = createPayrollRunSchema.safeParse({
                payroll_month: 'August 2026',
                total_gross: 450000,
                total_net: 410000
            });
            assert.equal(result.success, true);
        });
    });

    describe('Logistics, Assets & Projects Validators', () => {
        it('validates delivery schedule schema', () => {
            const result = createDeliveryScheduleSchema.safeParse({
                destination_city: 'Pune Bhosari',
                status: 'Scheduled'
            });
            assert.equal(result.success, true);
        });

        it('validates fixed asset registration schema', () => {
            const result = createFixedAssetSchema.safeParse({
                asset_name: 'Mazak 5-Axis CNC Center',
                purchase_cost: 8500000,
                useful_life_years: 10,
                depreciation_method: 'Straight Line'
            });
            assert.equal(result.success, true);
        });

        it('validates project creation schema', () => {
            const result = createProjectSchema.safeParse({
                project_name: 'EV Gearbox Assembly Line',
                budget: 12000000,
                status: 'On Track'
            });
            assert.equal(result.success, true);
        });
    });
});
