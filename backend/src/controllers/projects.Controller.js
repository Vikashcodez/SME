import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getProjects = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { search, status } = req.query;

        let query = `
            SELECT p.*, c.customer_name,
                   (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.project_id) as total_tasks,
                   (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.project_id AND pt.status = 'Completed') as completed_tasks
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            WHERE p.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND p.status = $${idx}`;
            params.push(status);
            idx++;
        }

        if (search) {
            query += ` AND (p.project_name ILIKE $${idx} OR p.project_code ILIKE $${idx} OR p.project_lead ILIKE $${idx} OR c.customer_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY p.created_at DESC, p.project_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error({ err: error }, 'getProjects error');
        res.status(500).json({ success: false, message: 'Failed to fetch projects' });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, c.customer_name
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.customer_id
            WHERE p.project_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const tasks = await pool.query(`SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY due_date ASC`, [id]);
        const milestones = await pool.query(`SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY target_date ASC`, [id]);

        res.status(200).json({
            success: true,
            data: {
                ...result.rows[0],
                tasks: tasks.rows,
                milestones: milestones.rows
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getProjectById error');
        res.status(500).json({ success: false, message: 'Failed to fetch project details' });
    }
};

export const createProject = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            project_code,
            project_name,
            customer_id,
            customer_name,
            start_date,
            end_date,
            budget = 5000000,
            actual_cost = 0,
            progress_percentage = 0,
            project_lead = 'Santosh Mane',
            status = 'On Track',
            description
        } = req.body;

        if (!project_name) {
            return res.status(400).json({ success: false, message: 'Project name is required' });
        }

        let pCode = project_code;
        if (!pCode) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM projects WHERE company_code = $1`, [companyCode]);
            pCode = `PRJ-2026-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        
        let resolvedCustomerId = customer_id || null;
        if (!resolvedCustomerId && customer_name) {
            const custRes = await pool.query(`SELECT customer_id FROM customers WHERE company_code = $1 AND customer_name ILIKE $2 LIMIT 1`, [companyCode, `%${customer_name}%`]);
            if (custRes.rows.length > 0) resolvedCustomerId = custRes.rows[0].customer_id;
        }

        const result = await pool.query(`
            INSERT INTO projects (
                company_code, project_code, project_name, customer_id, start_date, end_date,
                budget, actual_cost, progress_percentage, project_lead, status, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            companyCode, pCode, project_name, resolvedCustomerId,
            start_date || new Date().toISOString().slice(0, 10),
            end_date || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
            parseFloat(budget) || 0,
            parseFloat(actual_cost) || 0,
            parseInt(progress_percentage, 10) || 0,
            project_lead,
            status,
            description || ''
        ]);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'createProject error');
        res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            project_name, customer_id, start_date, end_date,
            budget, actual_cost, progress_percentage, project_lead, status, description
        } = req.body;

        const result = await pool.query(`
            UPDATE projects
            SET project_name = COALESCE($1, project_name),
                customer_id = COALESCE($2, customer_id),
                start_date = COALESCE($3, start_date),
                end_date = COALESCE($4, end_date),
                budget = COALESCE($5, budget),
                actual_cost = COALESCE($6, actual_cost),
                progress_percentage = COALESCE($7, progress_percentage),
                project_lead = COALESCE($8, project_lead),
                status = COALESCE($9, status),
                description = COALESCE($10, description),
                updated_at = NOW()
            WHERE project_id = $11
            RETURNING *
        `, [project_name, customer_id, start_date, end_date, budget, actual_cost, progress_percentage, project_lead, status, description, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'updateProject error');
        res.status(500).json({ success: false, message: 'Failed to update project' });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`DELETE FROM projects WHERE project_id = $1 RETURNING project_id`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        logger.error({ err: error }, 'deleteProject error');
        res.status(500).json({ success: false, message: 'Failed to delete project' });
    }
};

export const getProjectMilestones = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { projectId } = req.query;

        let query = `
            SELECT pm.*, p.project_name, p.project_code
            FROM project_milestones pm
            JOIN projects p ON pm.project_id = p.project_id
            WHERE p.company_code = $1
        `;
        const params = [companyCode];

        if (projectId) {
            query += ` AND pm.project_id = $2`;
            params.push(projectId);
        }

        query += ` ORDER BY pm.target_date ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getProjectMilestones error');
        res.status(500).json({ success: false, message: 'Failed to fetch milestones' });
    }
};

export const createProjectMilestone = async (req, res) => {
    try {
        const { project_id, milestone_name, target_date, deliverable, status = 'Pending' } = req.body;

        if (!project_id || !milestone_name) {
            return res.status(400).json({ success: false, message: 'Project ID and milestone name are required' });
        }

        const result = await pool.query(`
            INSERT INTO project_milestones (project_id, milestone_name, target_date, deliverable, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [project_id, milestone_name, target_date || new Date().toISOString().slice(0, 10), deliverable || '', status]);

        res.status(201).json({ success: true, message: 'Milestone created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createProjectMilestone error');
        res.status(500).json({ success: false, message: 'Failed to create milestone' });
    }
};

export const getProjectTasks = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { projectId, status } = req.query;

        let query = `
            SELECT pt.*, p.project_name, p.project_code
            FROM project_tasks pt
            JOIN projects p ON pt.project_id = p.project_id
            WHERE p.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (projectId) {
            query += ` AND pt.project_id = $${idx}`;
            params.push(projectId);
            idx++;
        }

        if (status) {
            query += ` AND pt.status = $${idx}`;
            params.push(status);
            idx++;
        }

        query += ` ORDER BY pt.due_date ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getProjectTasks error');
        res.status(500).json({ success: false, message: 'Failed to fetch project tasks' });
    }
};

export const createProjectTask = async (req, res) => {
    try {
        const { project_id, task_name, assignee, due_date, hours_estimated = 0, status = 'To Do' } = req.body;

        if (!project_id || !task_name) {
            return res.status(400).json({ success: false, message: 'Project ID and task name are required' });
        }

        const result = await pool.query(`
            INSERT INTO project_tasks (project_id, task_name, assignee, due_date, hours_estimated, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [project_id, task_name, assignee || 'Unassigned', due_date || new Date().toISOString().slice(0, 10), hours_estimated, status]);

        res.status(201).json({ success: true, message: 'Project task created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createProjectTask error');
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
};

export const getProjectTimesheets = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { projectId } = req.query;

        let query = `
            SELECT ts.*, p.project_name, pt.task_name, e.first_name, e.last_name
            FROM project_timesheets ts
            JOIN projects p ON ts.project_id = p.project_id
            LEFT JOIN project_tasks pt ON ts.task_id = pt.task_id
            LEFT JOIN employees e ON ts.employee_id = e.employee_id
            WHERE p.company_code = $1
        `;
        const params = [companyCode];

        if (projectId) {
            query += ` AND ts.project_id = $2`;
            params.push(projectId);
        }

        query += ` ORDER BY ts.work_date DESC LIMIT 100`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getProjectTimesheets error');
        res.status(500).json({ success: false, message: 'Failed to fetch timesheets' });
    }
};

export const createProjectTimesheet = async (req, res) => {
    try {
        const { project_id, task_id, employee_id, work_date, hours_worked, description } = req.body;

        if (!project_id || !hours_worked) {
            return res.status(400).json({ success: false, message: 'Project ID and hours worked are required' });
        }

        const result = await pool.query(`
            INSERT INTO project_timesheets (project_id, task_id, employee_id, work_date, hours_worked, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [project_id, task_id || null, employee_id || null, work_date || new Date().toISOString().slice(0, 10), parseFloat(hours_worked) || 0, description || '']);

        res.status(201).json({ success: true, message: 'Timesheet recorded', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createProjectTimesheet error');
        res.status(500).json({ success: false, message: 'Failed to log timesheet' });
    }
};
