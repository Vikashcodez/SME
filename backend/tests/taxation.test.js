import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EInvoiceService } from '../src/services/einvoiceService.js';

describe('GST Statutory E-Invoicing & E-Way Bill Engine Suite', () => {

    it('computes valid 64-character SHA-256 IRN hash according to GSTN standard formula', () => {
        const supplierGstin = '27AAACC4128F1Z8';
        const finYear = '2026-27';
        const docType = 'INV';
        const docNumber = 'INV-2026-0042';

        const irn = EInvoiceService.generateIRN(supplierGstin, finYear, docType, docNumber);

        assert.equal(typeof irn, 'string');
        assert.equal(irn.length, 64);
        
        const irn2 = EInvoiceService.generateIRN(supplierGstin, finYear, docType, docNumber);
        assert.equal(irn, irn2);
    });

    it('computes correct financial year (April-March boundary)', () => {
        const aprilDate = new Date('2026-04-15');
        const febDate = new Date('2026-02-10');

        assert.equal(EInvoiceService.getFinancialYear(aprilDate), '2026-27');
        assert.equal(EInvoiceService.getFinancialYear(febDate), '2025-26');
    });

    it('builds full GSTN INV-01 compliant payload with Signed QR code and ValDtls', () => {
        const company = {
            gst_no: '27AAACC4128F1Z8',
            company_name: 'Chandra Precision Engineering Pvt Ltd',
            full_address: 'Plot 42 Bhosari MIDC',
            city: 'Pune',
            state_code: '27'
        };
        const customer = {
            gstin: '27AAACG0850D1ZW',
            customer_name: 'Tata Motors Limited',
            billing_address: 'Pimpri Plant',
            billing_city: 'Pune',
            billing_pincode: '411018',
            billing_state_code: '27'
        };
        const invoice = {
            invoice_number: 'INV-2026-0088',
            invoice_date: '2026-08-25',
            total_taxable: 100000.00,
            total_cgst: 9000.00,
            total_sgst: 9000.00,
            total_igst: 0.00,
            grand_total: 118000.00
        };
        const items = [
            { hsn_code: '8483', item_name: 'Helical Gear Shaft', quantity: 100, unit_price: 1000 }
        ];

        const payload = EInvoiceService.buildEInvoicePayload(invoice, company, customer, items);

        assert.equal(payload.status, 'ACT');
        assert.ok(payload.irn && payload.irn.length === 64);
        assert.ok(payload.signedQrCode && payload.signedQrCode.length > 20);
        assert.equal(payload.details.SellerDtls.Gstin, '27AAACC4128F1Z8');
        assert.equal(payload.details.BuyerDtls.Gstin, '27AAACG0850D1ZW');
        assert.equal(payload.details.ValDtls.TotInvVal, 118000.00);
    });

    it('generates valid E-Way Bill payload with calculated validity window', () => {
        const invoice = { invoice_number: 'INV-2026-0088' };
        const transporter = { gstin: '29AAACV5482F1Z8', name: 'VRL Logistics Ltd' };
        const vehicleNo = 'MH-12-RN-8812';

        const ewb = EInvoiceService.generateEWayBill(invoice, transporter, vehicleNo, 150);

        assert.equal(ewb.status, 'ACTIVE');
        assert.equal(ewb.vehicleNo, 'MH-12-RN-8812');
        assert.equal(ewb.distance, 150);
        assert.ok(ewb.ewayBillNo && ewb.ewayBillNo.length === 12);
        assert.ok(ewb.validUpto);
    });
});
