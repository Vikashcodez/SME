import { z } from 'zod';

export const createFixedAssetSchema = z.object({
    asset_code: z.string().optional(),
    asset_name: z.string().min(2).max(255),
    asset_category: z.string().default('Machinery'),
    purchase_date: z.string().optional(),
    purchase_cost: z.coerce.number().positive(),
    salvage_value: z.coerce.number().nonnegative().default(0),
    useful_life_years: z.coerce.number().positive().default(10),
    depreciation_method: z.enum(['Straight Line', 'Written Down Value']).default('Straight Line'),
    location: z.string().optional(),
}).passthrough();

export const updateFixedAssetSchema = z.object({
    asset_name: z.string().min(2).max(255).optional(),
    asset_category: z.string().optional(),
    location: z.string().optional(),
    salvage_value: z.coerce.number().nonnegative().optional(),
    useful_life_years: z.coerce.number().positive().optional(),
    depreciation_method: z.enum(['Straight Line', 'Written Down Value']).optional(),
    is_active: z.boolean().optional(),
}).passthrough();
