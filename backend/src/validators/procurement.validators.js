import { z } from 'zod';

export const createVendorSchema = z.object({
    vendor_code: z.string().optional(),
    vendor_name: z.string().min(2).max(255),
    contact_person: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal('')).nullable(),
    phone: z.string().max(30).optional().nullable(),
    mobile: z.string().max(30).optional().nullable(),
    gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')).nullable(),
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().or(z.literal('')).nullable(),
    currency: z.string().optional(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state_name: z.string().optional().nullable(),
    state_code: z.string().optional().nullable(),
    pincode: z.string().optional().nullable(),
    payment_terms: z.string().optional().nullable(),
    bank_account_no: z.string().optional().nullable(),
    ifsc_code: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
}).passthrough();

export const createPurchaseOrderSchema = z.object({
    vendor_id: z.number().int().positive(),
    po_number: z.string().optional(),
    po_date: z.string().or(z.date()).optional(),
    delivery_date: z.string().or(z.date()).optional().nullable(),
    pr_id: z.number().optional().nullable(),
    payment_terms: z.string().optional(),
    remarks: z.string().optional().nullable(),
    status: z.string().optional(),
    items: z.array(z.object({
        product_id: z.number().optional().nullable(),
        item_name: z.string().min(1),
        hsn_code: z.string().optional().nullable(),
        quantity: z.number().positive(),
        uom: z.string().optional(),
        unit_price: z.number().nonnegative(),
        gst_rate: z.number().min(0).max(100),
    })).min(1),
}).passthrough();
