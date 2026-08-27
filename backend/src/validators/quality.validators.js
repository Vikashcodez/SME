import { z } from 'zod';

export const createQcInspectionSchema = z.object({
    inspection_number: z.string().optional(),
    inspection_type: z.enum(['Inward Raw Material', 'In-Process Machining', 'Final Quality Gate', 'PDI Pre-Dispatch']).default('Final Quality Gate'),
    product_id: z.coerce.number().optional().nullable(),
    product_name: z.string().optional(),
    batch_number: z.string().optional(),
    sample_size: z.coerce.number().positive().default(5),
    accepted_qty: z.coerce.number().nonnegative().default(5),
    rejected_qty: z.coerce.number().nonnegative().default(0),
    status: z.enum(['Pass', 'Fail', 'Conditional Accept', 'Pending Review']).default('Pass'),
    inspector_name: z.string().default('QC Inspector'),
    inspection_date: z.string().optional(),
    observations: z.string().optional(),
}).passthrough();

export const createNcrReportSchema = z.object({
    ncr_number: z.string().optional(),
    ncr_date: z.string().optional(),
    product_id: z.coerce.number().optional().nullable(),
    product_name: z.string().optional(),
    defect_type: z.string().min(2),
    defect_description: z.string().min(3),
    severity: z.enum(['Minor', 'Major', 'Critical']).default('Minor'),
    disposition: z.enum(['Rework', 'Scrap', 'Return to Vendor', 'Accept on Deviation']).default('Rework'),
    root_cause: z.string().optional(),
    capa_required: z.boolean().default(false),
    status: z.enum(['Open', 'Investigation', 'CAPA Pending', 'Closed']).default('Open'),
}).passthrough();
