import { z } from 'zod';

export const createProjectSchema = z.object({
    project_code: z.string().optional(),
    project_name: z.string().min(2).max(255),
    customer_id: z.coerce.number().optional().nullable(),
    customer_name: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    budget: z.coerce.number().nonnegative().default(5000000),
    actual_cost: z.coerce.number().nonnegative().default(0),
    progress_percentage: z.coerce.number().min(0).max(100).default(0),
    project_lead: z.string().default('Project Manager'),
    status: z.enum(['On Track', 'Delayed', 'At Risk', 'Completed', 'On Hold']).default('On Track'),
    description: z.string().optional(),
}).passthrough();

export const updateProjectSchema = z.object({
    project_name: z.string().min(2).max(255).optional(),
    customer_id: z.coerce.number().optional().nullable(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    budget: z.coerce.number().nonnegative().optional(),
    actual_cost: z.coerce.number().nonnegative().optional(),
    progress_percentage: z.coerce.number().min(0).max(100).optional(),
    project_lead: z.string().optional(),
    status: z.enum(['On Track', 'Delayed', 'At Risk', 'Completed', 'On Hold']).optional(),
    description: z.string().optional(),
}).passthrough();

export const createProjectTaskSchema = z.object({
    project_id: z.coerce.number().positive(),
    task_name: z.string().min(2).max(255),
    assignee: z.string().optional(),
    due_date: z.string().optional(),
    hours_estimated: z.coerce.number().nonnegative().default(0),
    status: z.enum(['To Do', 'In Progress', 'Completed', 'Blocked']).default('To Do'),
}).passthrough();
