import { z } from 'zod';

export const createLedgerSchema = z.object({
    ledger_name: z.string().min(2).max(255),
    group_id: z.number().int().positive(),
    opening_balance: z.number().optional(),
    dr_cr: z.enum(['Dr', 'Cr']).optional(),
    mailing_name: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    state_name: z.string().optional().nullable(),
    gst_state_code: z.string().optional().nullable(),
    pan_it_no: z.string().optional().nullable(),
    gstin_uin: z.string().optional().nullable(),
    gst_registration_type: z.string().optional().nullable(),
    bank_account_no: z.string().optional().nullable(),
    ifsc_code: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    branch_name: z.string().optional().nullable(),
    credit_period_days: z.number().int().optional(),
    credit_limit: z.number().optional(),
}).passthrough();

export const createVoucherSchema = z.object({
    voucher_type: z.string().min(1),
    voucher_number: z.string().optional(),
    voucher_date: z.string().or(z.date()).optional(),
    reference_no: z.string().optional().nullable(),
    reference_date: z.string().or(z.date()).optional().nullable(),
    party_ledger_id: z.number().optional().nullable(),
    narration: z.string().optional().nullable(),
    items: z.array(z.object({
        ledger_id: z.number().int().positive(),
        entry_type: z.enum(['Dr', 'Cr', 'By', 'To']),
        amount: z.number().positive(),
        item_narration: z.string().optional().nullable(),
    })).min(1),
    bill_allocations: z.array(z.any()).optional(),
}).passthrough();
