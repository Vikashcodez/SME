import { z } from 'zod';

export const createBomSchema = z.object({
    bom_code: z.string().optional(),
    product_id: z.coerce.number().positive(),
    bom_name: z.string().min(2).max(255).optional(),
    output_qty: z.coerce.number().positive().default(1.00),
    uom_code: z.string().default('PCS'),
    is_active: z.boolean().default(true),
    items: z.array(z.object({
        product_id: z.coerce.number().positive(),
        quantity: z.coerce.number().positive(),
        scrap_percentage: z.coerce.number().min(0).max(100).default(0),
        unit_cost: z.coerce.number().nonnegative().default(0),
    })).optional(),
}).passthrough();

export const createWorkOrderSchema = z.object({
    work_order_number: z.string().optional(),
    product_id: z.coerce.number().optional().nullable(),
    product_name: z.string().optional(),
    bom_id: z.coerce.number().optional().nullable(),
    sales_order_id: z.coerce.number().optional().nullable(),
    planned_qty: z.coerce.number().positive().default(100),
    order_date: z.string().optional(),
    target_date: z.string().optional(),
    due_date: z.string().optional(),
    status: z.string().default('Planned'),
}).passthrough();

export const updateWorkOrderStatusSchema = z.object({
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Cancelled', 'On Hold']),
    completed_qty: z.coerce.number().nonnegative().optional(),
    rejected_qty: z.coerce.number().nonnegative().optional(),
    scrap_qty: z.coerce.number().nonnegative().optional(),
    notes: z.string().optional(),
}).passthrough();
