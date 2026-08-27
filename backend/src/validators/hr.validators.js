import { z } from 'zod';

export const createEmployeeSchema = z.object({
    employee_code: z.string().optional(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().max(100).optional().default(''),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    department_id: z.coerce.number().optional().nullable(),
    designation_id: z.coerce.number().optional().nullable(),
    basic_salary: z.coerce.number().nonnegative().default(30000),
    hra: z.coerce.number().nonnegative().default(12000),
    special_allowance: z.coerce.number().nonnegative().default(8000),
    date_of_joining: z.string().optional(),
    date_of_birth: z.string().optional(),
    pan_number: z.string().optional(),
    aadhaar_number: z.string().optional(),
    bank_account_no: z.string().optional(),
    bank_ifsc_code: z.string().optional(),
    is_active: z.boolean().default(true),
}).passthrough();

export const updateEmployeeSchema = z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    department_id: z.coerce.number().optional().nullable(),
    designation_id: z.coerce.number().optional().nullable(),
    basic_salary: z.coerce.number().nonnegative().optional(),
    hra: z.coerce.number().nonnegative().optional(),
    special_allowance: z.coerce.number().nonnegative().optional(),
    is_active: z.boolean().optional(),
}).passthrough();

export const createAttendanceLogSchema = z.object({
    employee_id: z.coerce.number().positive(),
    attendance_date: z.string().optional(),
    in_time: z.string().optional(),
    out_time: z.string().optional(),
    status: z.enum(['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday']).default('Present'),
    shift_code: z.string().default('S1'),
    overtime_hours: z.coerce.number().nonnegative().default(0),
}).passthrough();

export const createPayrollRunSchema = z.object({
    payroll_month: z.string().min(4),
    run_date: z.string().optional(),
    total_gross: z.coerce.number().nonnegative().default(0),
    total_deductions: z.coerce.number().nonnegative().default(0),
    total_net: z.coerce.number().nonnegative().default(0),
    status: z.string().default('Draft'),
}).passthrough();
