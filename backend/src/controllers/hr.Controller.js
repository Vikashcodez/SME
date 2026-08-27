import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getEmployees = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { departmentId, search } = req.query;

        let query = `
            SELECT 
                e.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                e.department_id,
                e.designation_id,
                e.date_of_joining,
                e.basic_salary,
                e.hra,
                e.special_allowance,
                e.is_active,
                d.department_name,
                des.designation_title
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations des ON e.designation_id = des.designation_id
            WHERE e.company_code = $1 AND e.is_active = true
        `;
        const params = [companyCode];
        let idx = 2;

        if (departmentId) {
            query += ` AND e.department_id = $${idx}`;
            params.push(departmentId);
            idx++;
        }

        if (search) {
            query += ` AND (e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.employee_code ILIKE $${idx} OR e.email ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY e.first_name ASC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getEmployees error');
        res.status(500).json({ success: false, message: 'Failed to fetch employees' });
    }
};

export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT e.*, d.department_name, des.designation_title
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations des ON e.designation_id = des.designation_id
            WHERE e.employee_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'getEmployeeById error');
        res.status(500).json({ success: false, message: 'Failed to fetch employee' });
    }
};

export const createEmployee = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            employee_code, first_name, last_name, email, phone,
            department_id, designation_id, basic_salary = 30000,
            hra = 12000, special_allowance = 8000, date_of_joining
        } = req.body;

        if (!first_name) {
            return res.status(400).json({ success: false, message: 'First name is required' });
        }

        let eCode = employee_code;
        if (!eCode) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM employees WHERE company_code = $1`, [companyCode]);
            eCode = `EMP-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO employees (
                company_code, employee_code, first_name, last_name, email, phone,
                department_id, designation_id, basic_salary, hra, special_allowance,
                date_of_joining, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
            RETURNING *
        `, [
            companyCode, eCode, first_name, last_name || '',
            email || `${eCode.toLowerCase()}@chandraprecision.com`,
            phone || '', department_id || null, designation_id || null,
            parseFloat(basic_salary) || 30000,
            parseFloat(hra) || 12000,
            parseFloat(special_allowance) || 8000,
            date_of_joining || new Date().toISOString().slice(0, 10)
        ]);

        res.status(201).json({ success: true, message: 'Employee created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createEmployee error');
        res.status(500).json({ success: false, message: 'Failed to create employee', error: error.message });
    }
};

export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, last_name, email, phone, department_id,
            designation_id, basic_salary, hra, special_allowance, is_active
        } = req.body;

        const result = await pool.query(`
            UPDATE employees
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                department_id = COALESCE($5, department_id),
                designation_id = COALESCE($6, designation_id),
                basic_salary = COALESCE($7, basic_salary),
                hra = COALESCE($8, hra),
                special_allowance = COALESCE($9, special_allowance),
                is_active = COALESCE($10, is_active),
                updated_at = NOW()
            WHERE employee_id = $11
            RETURNING *
        `, [
            first_name, last_name, email, phone, department_id,
            designation_id, basic_salary, hra, special_allowance, is_active, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, message: 'Employee updated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateEmployee error');
        res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`UPDATE employees SET is_active = false, updated_at = NOW() WHERE employee_id = $1 RETURNING employee_id`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        res.status(200).json({ success: true, message: 'Employee deactivated' });
    } catch (error) {
        logger.error({ err: error }, 'deleteEmployee error');
        res.status(500).json({ success: false, message: 'Failed to deactivate employee' });
    }
};

export const getAttendanceLogs = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { date, employeeId } = req.query;

        let query = `
            SELECT a.*, e.first_name, e.last_name, e.employee_code, d.department_name
            FROM attendance_logs a
            JOIN employees e ON a.employee_id = e.employee_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE e.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (date) {
            query += ` AND a.attendance_date = $${idx}`;
            params.push(date);
            idx++;
        }
        if (employeeId) {
            query += ` AND a.employee_id = $${idx}`;
            params.push(employeeId);
            idx++;
        }

        query += ` ORDER BY a.attendance_date DESC LIMIT 100`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getAttendanceLogs error');
        res.status(500).json({ success: false, message: 'Failed to fetch attendance logs' });
    }
};

export const createAttendanceLog = async (req, res) => {
    try {
        const { employee_id, attendance_date, in_time, out_time, status = 'Present', shift_code = 'S1', overtime_hours = 0 } = req.body;

        if (!employee_id) {
            return res.status(400).json({ success: false, message: 'Employee ID is required' });
        }

        const result = await pool.query(`
            INSERT INTO attendance_logs (employee_id, attendance_date, in_time, out_time, status, shift_code, overtime_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            employee_id,
            attendance_date || new Date().toISOString().slice(0, 10),
            in_time || '08:00:00',
            out_time || '16:30:00',
            status,
            shift_code,
            parseFloat(overtime_hours) || 0
        ]);

        res.status(201).json({ success: true, message: 'Attendance logged successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createAttendanceLog error');
        res.status(500).json({ success: false, message: 'Failed to log attendance', error: error.message });
    }
};

export const getPayrollRuns = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT * FROM payroll_runs WHERE company_code = $1 ORDER BY run_date DESC
        `, [companyCode]);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getPayrollRuns error');
        res.status(500).json({ success: false, message: 'Failed to fetch payroll runs' });
    }
};

export const createPayrollRun = async (req, res) => {
    const client = await pool.connect();
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { payroll_month, run_date } = req.body;

        if (!payroll_month) {
            return res.status(400).json({ success: false, message: 'Payroll month is required' });
        }

        await client.query('BEGIN');

        const empRes = await client.query(`
            SELECT employee_id, basic_salary, hra, special_allowance
            FROM employees
            WHERE company_code = $1 AND is_active = true
        `, [companyCode]);

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        const payslipRows = empRes.rows.map(emp => {
            const basic = parseFloat(emp.basic_salary) || 30000;
            const hraVal = parseFloat(emp.hra) || 12000;
            const allowance = parseFloat(emp.special_allowance) || 8000;
            const gross = basic + hraVal + allowance;

            const pf = Math.min(basic * 0.12, 1800);
            const pt = 200;
            const tds = gross > 50000 ? gross * 0.05 : 0;
            const ded = pf + pt + tds;
            const net = gross - ded;

            totalGross += gross;
            totalDeductions += ded;
            totalNet += net;

            return {
                employee_id: emp.employee_id,
                basic_salary: basic,
                hra: hraVal,
                special_allowance: allowance,
                gross_earnings: gross,
                pf_deduction: pf,
                pt_deduction: pt,
                tds_deduction: tds,
                total_deductions: ded,
                net_payable: net
            };
        });

        const runRes = await client.query(`
            INSERT INTO payroll_runs (company_code, payroll_month, run_date, total_gross, total_deductions, total_net, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Processed')
            RETURNING *
        `, [
            companyCode,
            payroll_month,
            run_date || new Date().toISOString().slice(0, 10),
            totalGross,
            totalDeductions,
            totalNet
        ]);

        const payrollRun = runRes.rows[0];

        for (const ps of payslipRows) {
            await client.query(`
                INSERT INTO payslips (
                    run_id, employee_id, basic_salary, hra, special_allowance,
                    gross_earnings, pf_deduction, pt_deduction, tds_deduction,
                    total_deductions, net_payable
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                payrollRun.run_id, ps.employee_id, ps.basic_salary, ps.hra, ps.special_allowance,
                ps.gross_earnings, ps.pf_deduction, ps.pt_deduction, ps.tds_deduction,
                ps.total_deductions, ps.net_payable
            ]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Payroll for ${payroll_month} processed successfully (${payslipRows.length} employees)`,
            data: payrollRun
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error }, 'createPayrollRun error');
        res.status(500).json({ success: false, message: 'Failed to process payroll run', error: error.message });
    } finally {
        client.release();
    }
};

export const getPayslips = async (req, res) => {
    try {
        const { runId, employeeId } = req.query;

        let query = `
            SELECT ps.*, e.first_name, e.last_name, e.employee_code, d.department_name, des.designation_title, pr.payroll_month
            FROM payslips ps
            JOIN employees e ON ps.employee_id = e.employee_id
            JOIN payroll_runs pr ON ps.run_id = pr.run_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN designations des ON e.designation_id = des.designation_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (runId) {
            query += ` AND ps.run_id = $${idx}`;
            params.push(runId);
            idx++;
        }
        if (employeeId) {
            query += ` AND ps.employee_id = $${idx}`;
            params.push(employeeId);
            idx++;
        }

        query += ` ORDER BY ps.payslip_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getPayslips error');
        res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
    }
};
