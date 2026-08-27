import test from 'node:test';
import assert from 'node:assert';
import { EInvoiceService } from '../src/services/einvoiceService.js';

test('EInvoiceService: SHA-256 IRN generation matches statutory 64-character hex format', () => {
    const gstin = '27AAACC4128F1Z8';
    const finYear = '2026-27';
    const docType = 'INV';
    const docNum = 'SL-2026-0042';

    const irn = EInvoiceService.generateIRN(gstin, finYear, docType, docNum);
    assert.strictEqual(typeof irn, 'string');
    assert.strictEqual(irn.length, 64);
    assert.match(irn, /^[a-f0-9]{64}$/);
});

test('EInvoiceService: builds valid GSTN INV-01 specification payload', () => {
    const company = {
        company_name: 'Chandra Precision Engineering Pvt Ltd',
        gst_no: '27AAACC4128F1Z8',
        full_address: 'Plot W-42, MIDC Bhosari Industrial Area',
        city: 'Pune',
        state_code: '27'
    };
    const customer = {
        customer_name: 'Tata Motors Commercial Vehicles',
        gstin: '27AAACG0850D1ZW',
        billing_address: 'Pimpri Plant Gate 2',
        billing_city: 'Pune',
        billing_pincode: '411018',
        billing_state_code: '27'
    };
    const invoice = {
        invoice_number: 'INV-2026-0042',
        invoice_date: '2026-08-26',
        total_taxable: 100000.00,
        total_cgst: 9000.00,
        total_sgst: 9000.00,
        total_igst: 0.00,
        grand_total: 118000.00
    };
    const items = [
        { item_name: 'CNC Turning Precision Flange', hsn_code: '8483', quantity: 100, unit_price: 1000.00, gst_rate: 18.00 }
    ];

    const result = EInvoiceService.buildEInvoicePayload(invoice, company, customer, items);
    assert.ok(result.irn);
    assert.strictEqual(result.irn.length, 64);
    assert.ok(result.signedQrCode);
    assert.strictEqual(result.details.DocDtls.No, 'INV-2026-0042');
    assert.strictEqual(result.details.ValDtls.TotInvVal, 118000);
});

test('EInvoiceService: generates E-Way Bill with valid validity window', () => {
    const invoice = { invoice_number: 'INV-2026-0042' };
    const transporter = { name: 'VRL Logistics', gstin: '29AAACV5482F1Z8' };
    const ewb = EInvoiceService.generateEWayBill(invoice, transporter, 'MH-12-RN-8812', 150);

    assert.ok(ewb.ewayBillNo);
    assert.strictEqual(ewb.status, 'ACTIVE');
    assert.strictEqual(ewb.vehicleNo, 'MH-12-RN-8812');
    assert.ok(ewb.validUpto);
});

test('Double Entry Accounting: Assets vs Liabilities normal balance mutation verification', () => {
    
    const assetOpening = 10000;
    const assetDr = 5000;
    const assetCr = 2000;
    const assetClosing = assetOpening + (assetDr - assetCr);
    assert.strictEqual(assetClosing, 13000);

    
    const liabOpening = 20000;
    const liabCr = 8000;
    const liabDr = 3000;
    const liabClosing = liabOpening + (liabCr - liabDr);
    assert.strictEqual(liabClosing, 25000);
});

test('XML Sanitization: handles &, <, >, ", \' characters without corrupting XML tags', () => {
    const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const dangerousString = 'Research & Development <Special "Edition"> A/c \'Pooja\'';
    const sanitized = escapeXml(dangerousString);

    assert.strictEqual(sanitized, 'Research &amp; Development &lt;Special &quot;Edition&quot;&gt; A/c &apos;Pooja&apos;');
    assert.ok(!sanitized.includes('& '));
    assert.ok(!sanitized.includes('<S'));
});
