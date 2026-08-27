import { z } from 'zod';

export const createDeliveryScheduleSchema = z.object({
    schedule_number: z.string().optional(),
    dispatch_date: z.string().optional(),
    customer_id: z.coerce.number().optional().nullable(),
    invoice_id: z.coerce.number().optional().nullable(),
    destination_city: z.string().min(1).default('Pune'),
    vehicle_type: z.string().default('14ft Closed Container'),
    status: z.enum(['Scheduled', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled']).default('Scheduled'),
}).passthrough();

export const createFleetLogSchema = z.object({
    vehicle_number: z.string().min(2),
    driver_name: z.string().min(2),
    log_date: z.string().optional(),
    start_km: z.coerce.number().nonnegative(),
    end_km: z.coerce.number().nonnegative(),
    fuel_liters: z.coerce.number().nonnegative().optional(),
    fuel_cost: z.coerce.number().nonnegative().optional(),
    remarks: z.string().optional(),
}).passthrough();

export const createFreightBookingSchema = z.object({
    booking_number: z.string().optional(),
    transporter_id: z.coerce.number().positive(),
    from_location: z.string().default('Pune Plant'),
    to_location: z.string().min(2),
    weight_kg: z.coerce.number().positive(),
    freight_rate: z.coerce.number().positive().default(12.50),
    total_freight: z.coerce.number().nonnegative().optional(),
    payment_status: z.string().default('Approved'),
}).passthrough();
