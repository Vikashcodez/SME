import { z } from 'zod';

export const createProductSchema = z.object({
    product_code: z.string().optional(),
    product_name: z.string().min(2).max(255),
    item_type: z.string().default('Finished Goods'),
    category_id: z.coerce.number().optional().nullable(),
    uom_code: z.string().default('PCS'),
    hsn_code: z.string().default('8483'),
    gst_rate: z.coerce.number().min(0).max(100).default(18.00),
    cost_price: z.coerce.number().nonnegative().default(0),
    selling_price: z.coerce.number().nonnegative().default(0),
    reorder_level: z.coerce.number().nonnegative().default(50),
    reorder_quantity: z.coerce.number().nonnegative().default(100),
    current_stock: z.coerce.number().default(0),
}).passthrough();

export const updateProductSchema = z.object({
    product_name: z.string().min(2).max(255).optional(),
    item_type: z.string().optional(),
    category_id: z.coerce.number().optional().nullable(),
    uom_code: z.string().optional(),
    hsn_code: z.string().optional(),
    gst_rate: z.coerce.number().min(0).max(100).optional(),
    cost_price: z.coerce.number().nonnegative().optional(),
    selling_price: z.coerce.number().nonnegative().optional(),
    reorder_level: z.coerce.number().nonnegative().optional(),
    reorder_quantity: z.coerce.number().nonnegative().optional(),
    current_stock: z.coerce.number().optional(),
    is_active: z.boolean().optional(),
}).passthrough();

export const createWarehouseSchema = z.object({
    warehouse_code: z.string().optional(),
    warehouse_name: z.string().min(2).max(255),
    location: z.string().optional(),
    is_primary: z.boolean().default(false),
}).passthrough();

export const createStockTransferSchema = z.object({
    from_warehouse_id: z.coerce.number().positive(),
    to_warehouse_id: z.coerce.number().positive(),
    product_id: z.coerce.number().positive(),
    quantity: z.coerce.number().positive(),
    transfer_date: z.string().optional(),
    notes: z.string().optional(),
}).passthrough();
