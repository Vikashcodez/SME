import crypto from 'crypto';
import { logger } from '../config/logger.js';

export class EInvoiceService {
    
    static generateIRN(supplierGstin, finYear, docType, docNumber) {
        if (!supplierGstin || !finYear || !docType || !docNumber) {
            throw new Error('Supplier GSTIN, Financial Year, Doc Type, and Doc Number are required to compute IRN');
        }
        const rawString = `${supplierGstin.trim().toUpperCase()}${finYear.trim()}${docType.trim().toUpperCase()}${docNumber.trim().toUpperCase()}`;
        return crypto.createHash('sha256').update(rawString, 'utf8').digest('hex');
    }

    
    static buildEInvoicePayload(invoice, company, customer, items = []) {
        const docDate = new Date(invoice.invoice_date || new Date()).toISOString().slice(0, 10).split('-').reverse().join('/');
        const finYear = this.getFinancialYear(new Date(invoice.invoice_date || new Date()));
        const irn = this.generateIRN(company.gst_no || '27AAACC4128F1Z8', finYear, 'INV', invoice.invoice_number);

        
        const qrPayload = {
            sellerGstin: company.gst_no || '27AAACC4128F1Z8',
            buyerGstin: customer.gstin || '27AAACG0850D1ZW',
            docNo: invoice.invoice_number,
            docTyp: 'INV',
            docDt: docDate,
            totInvVal: parseFloat(invoice.grand_total || 0).toFixed(2),
            itemCnt: items.length || 1,
            mainHsnCode: items[0]?.hsn_code || '8483',
            irn: irn,
            irnDt: new Date().toISOString()
        };

        const signedQrCode = Buffer.from(JSON.stringify(qrPayload)).toString('base64');
        const ackNo = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();

        return {
            irn,
            ackNo,
            ackDate: new Date().toISOString(),
            signedQrCode,
            status: 'ACT',
            signedInvoice: JSON.stringify(qrPayload),
            details: {
                Version: '1.1',
                TranDtls: {
                    TaxSch: 'GST',
                    SupTyp: 'B2B',
                    RegRev: 'N',
                    EcmGstin: null,
                    IgstOnIntra: 'N'
                },
                DocDtls: {
                    Typ: 'INV',
                    No: invoice.invoice_number,
                    Dt: docDate
                },
                SellerDtls: {
                    Gstin: company.gst_no || '27AAACC4128F1Z8',
                    LglNm: company.company_name,
                    TrdNm: company.company_name,
                    Addr1: company.full_address || 'MIDC Bhosari Industrial Area',
                    Loc: company.city || 'Pune',
                    Pin: 411026,
                    Stcd: company.state_code || '27'
                },
                BuyerDtls: {
                    Gstin: customer.gstin || '27AAACG0850D1ZW',
                    LglNm: customer.customer_name,
                    TrdNm: customer.customer_name,
                    Pos: customer.state_code || '27',
                    Addr1: customer.billing_address || 'Customer Plant Dock',
                    Loc: customer.billing_city || 'Pune',
                    Pin: customer.billing_pincode ? parseInt(customer.billing_pincode, 10) : 411018,
                    Stcd: customer.billing_state_code || '27'
                },
                ValDtls: {
                    AssVal: parseFloat(invoice.total_taxable || 0),
                    CgstVal: parseFloat(invoice.total_cgst || 0),
                    SgstVal: parseFloat(invoice.total_sgst || 0),
                    IgstVal: parseFloat(invoice.total_igst || 0),
                    TotInvVal: parseFloat(invoice.grand_total || 0)
                }
            }
        };
    }

    
    static getFinancialYear(date) {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        if (month >= 4) {
            return `${year}-${String(year + 1).slice(-2)}`;
        } else {
            return `${year - 1}-${String(year).slice(-2)}`;
        }
    }

    
    static generateEWayBill(invoice, transporter, vehicleNo, distanceKm = 45) {
        const ewbNumber = Math.floor(200000000000 + Math.random() * 800000000000).toString();
        const validUpto = new Date(Date.now() + Math.ceil(distanceKm / 200) * 24 * 3600 * 1000).toISOString();

        return {
            ewayBillNo: ewbNumber,
            ewayBillDate: new Date().toISOString(),
            validUpto: validUpto,
            transporterId: transporter?.gstin || '29AAACV5482F1Z8',
            transporterName: transporter?.name || 'VRL Logistics Ltd',
            vehicleNo: vehicleNo || 'MH-12-RN-8812',
            distance: distanceKm,
            status: 'ACTIVE'
        };
    }
}

export default EInvoiceService;
