import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const getDeliverySchedules = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status, search } = req.query;

        let query = `
            SELECT ds.*, c.customer_name, si.invoice_number
            FROM delivery_schedules ds
            LEFT JOIN customers c ON ds.customer_id = c.customer_id
            LEFT JOIN sales_invoices si ON ds.invoice_id = si.invoice_id
            WHERE ds.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND ds.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (search) {
            query += ` AND (ds.schedule_number ILIKE $${idx} OR c.customer_name ILIKE $${idx} OR ds.destination_city ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY ds.dispatch_date DESC, ds.schedule_id DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDeliverySchedules error');
        res.status(500).json({ success: false, message: 'Failed to fetch delivery schedules' });
    }
};

export const createDeliverySchedule = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            schedule_number, dispatch_date, customer_id, invoice_id,
            destination_city, vehicle_type = '14ft Closed Container', status = 'Scheduled'
        } = req.body;

        let sNum = schedule_number;
        if (!sNum) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM delivery_schedules WHERE company_code = $1`, [companyCode]);
            sNum = `DS-2026-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;
        }

        const result = await pool.query(`
            INSERT INTO delivery_schedules (company_code, schedule_number, dispatch_date, customer_id, invoice_id, destination_city, vehicle_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [companyCode, sNum, dispatch_date || new Date().toISOString().slice(0, 10), customer_id || null, invoice_id || null, destination_city || 'Pune', vehicle_type, status]);

        res.status(201).json({ success: true, message: 'Delivery schedule created successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createDeliverySchedule error');
        res.status(500).json({ success: false, message: 'Failed to create delivery schedule', error: error.message });
    }
};

export const updateDeliverySchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { dispatch_date, destination_city, vehicle_type, status } = req.body;

        const result = await pool.query(`
            UPDATE delivery_schedules
            SET dispatch_date = COALESCE($1, dispatch_date),
                destination_city = COALESCE($2, destination_city),
                vehicle_type = COALESCE($3, vehicle_type),
                status = COALESCE($4, status)
            WHERE schedule_id = $5
            RETURNING *
        `, [dispatch_date, destination_city, vehicle_type, status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Delivery schedule not found' });
        }

        res.status(200).json({ success: true, message: 'Delivery schedule updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateDeliverySchedule error');
        res.status(500).json({ success: false, message: 'Failed to update delivery schedule' });
    }
};

export const getDeliveryTracking = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { status } = req.query;

        let query = `
            SELECT dt.*, t.transporter_name, dc.challan_number
            FROM delivery_tracking dt
            LEFT JOIN transporter_master t ON dt.transporter_id = t.transporter_id
            LEFT JOIN delivery_challans dc ON dt.challan_id = dc.challan_id
            WHERE dt.company_code = $1
        `;
        const params = [companyCode];
        let idx = 2;

        if (status) {
            query += ` AND dt.status = $${idx}`;
            params.push(status);
            idx++;
        }

        query += ` ORDER BY dt.dispatch_time DESC`;
        const result = await pool.query(query, params);

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDeliveryTracking error');
        res.status(500).json({ success: false, message: 'Failed to fetch delivery tracking' });
    }
};

export const createDeliveryTracking = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            challan_id, transporter_id, tracking_number, dispatch_time,
            expected_delivery, status = 'In Transit'
        } = req.body;

        const trackNum = tracking_number || `TRK-${Date.now().toString().slice(-8)}`;

        const result = await pool.query(`
            INSERT INTO delivery_tracking (company_code, challan_id, transporter_id, tracking_number, dispatch_time, expected_delivery, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [companyCode, challan_id || null, transporter_id || null, trackNum, dispatch_time || new Date().toISOString(), expected_delivery || null, status]);

        res.status(201).json({ success: true, message: 'Tracking entry created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createDeliveryTracking error');
        res.status(500).json({ success: false, message: 'Failed to create tracking entry', error: error.message });
    }
};

export const updateDeliveryTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, actual_delivery, pod_url } = req.body;

        const result = await pool.query(`
            UPDATE delivery_tracking
            SET status = COALESCE($1, status),
                actual_delivery = COALESCE($2, actual_delivery),
                pod_url = COALESCE($3, pod_url)
            WHERE tracking_id = $4
            RETURNING *
        `, [status, actual_delivery, pod_url, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tracking record not found' });
        }

        res.status(200).json({ success: true, message: 'Tracking updated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateDeliveryTracking error');
        res.status(500).json({ success: false, message: 'Failed to update tracking' });
    }
};

export const getFleetVehicleLogs = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT * FROM fleet_vehicle_logs WHERE company_code = $1 ORDER BY log_date DESC LIMIT 100
        `, [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getFleetVehicleLogs error');
        res.status(500).json({ success: false, message: 'Failed to fetch fleet logs' });
    }
};

export const createFleetVehicleLog = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { vehicle_number, driver_name, log_date, start_km, end_km, fuel_liters = 0, fuel_cost = 0, remarks } = req.body;

        if (!vehicle_number || !driver_name) {
            return res.status(400).json({ success: false, message: 'Vehicle number and driver name are required' });
        }

        const totalKm = (parseFloat(end_km) || 0) - (parseFloat(start_km) || 0);

        const result = await pool.query(`
            INSERT INTO fleet_vehicle_logs (company_code, vehicle_number, driver_name, log_date, start_km, end_km, total_km, fuel_liters, fuel_cost, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [companyCode, vehicle_number, driver_name, log_date || new Date().toISOString().slice(0, 10), start_km || 0, end_km || 0, totalKm, fuel_liters, fuel_cost, remarks]);

        res.status(201).json({ success: true, message: 'Fleet log created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createFleetVehicleLog error');
        res.status(500).json({ success: false, message: 'Failed to create fleet log', error: error.message });
    }
};

export const getFreightBookings = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT fb.*, t.transporter_name
            FROM freight_bookings fb
            JOIN transporter_master t ON fb.transporter_id = t.transporter_id
            WHERE fb.company_code = $1
            ORDER BY fb.created_at DESC
        `, [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getFreightBookings error');
        res.status(500).json({ success: false, message: 'Failed to fetch freight bookings' });
    }
};

export const createFreightBooking = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const {
            booking_number, transporter_id, from_location = 'Pune Plant',
            to_location, weight_kg, freight_rate, total_freight, payment_status = 'Approved'
        } = req.body;

        if (!transporter_id || !to_location) {
            return res.status(400).json({ success: false, message: 'Transporter and destination are required' });
        }

        const bNum = booking_number || `FB-${Date.now().toString().slice(-6)}`;
        const calcTotal = total_freight || (parseFloat(weight_kg || 0) * parseFloat(freight_rate || 12.50));

        const result = await pool.query(`
            INSERT INTO freight_bookings (company_code, booking_number, transporter_id, from_location, to_location, weight_kg, freight_rate, total_freight, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [companyCode, bNum, transporter_id, from_location, to_location, weight_kg || 0, freight_rate || 12.50, calcTotal, payment_status]);

        res.status(201).json({ success: true, message: 'Freight booking created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createFreightBooking error');
        res.status(500).json({ success: false, message: 'Failed to create freight booking', error: error.message });
    }
};

export const getTransporters = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(
            `SELECT * FROM transporter_master WHERE company_code = $1 AND is_active = true ORDER BY transporter_name ASC`,
            [companyCode]
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getTransporters error');
        res.status(500).json({ success: false, message: 'Failed to fetch transporters' });
    }
};

export const createTransporter = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { transporter_code, transporter_name, gstin, phone, contact_person, address } = req.body;

        if (!transporter_name) {
            return res.status(400).json({ success: false, message: 'Transporter name is required' });
        }

        const tCode = transporter_code || `TR-${Date.now().toString().slice(-4)}`;

        const result = await pool.query(`
            INSERT INTO transporter_master (company_code, transporter_code, transporter_name, gstin, phone, contact_person, address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [companyCode, tCode, transporter_name, gstin, phone, contact_person, address]);

        res.status(201).json({ success: true, message: 'Transporter created', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createTransporter error');
        res.status(500).json({ success: false, message: 'Failed to create transporter', error: error.message });
    }
};

export const getDeliveryRoutes = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(
            `SELECT * FROM delivery_routes WHERE company_code = $1 AND is_active = true ORDER BY route_name ASC`,
            [companyCode]
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDeliveryRoutes error');
        res.status(500).json({ success: false, message: 'Failed to fetch delivery routes' });
    }
};

export const getEwayBills = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(`
            SELECT eb.*, si.invoice_number, c.customer_name
            FROM eway_bills eb
            LEFT JOIN sales_invoices si ON eb.invoice_id = si.invoice_id
            LEFT JOIN customers c ON si.customer_id = c.customer_id
            WHERE eb.company_code = $1
            ORDER BY eb.created_at DESC
        `, [companyCode]);
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getEwayBills error');
        res.status(500).json({ success: false, message: 'Failed to fetch e-way bills' });
    }
};

export const createEwayBill = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const { invoice_id, eway_bill_number, vehicle_number, transporter_gstin, from_city, to_city, distance_km, doc_date } = req.body;

        const ewbNum = eway_bill_number || `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

        const result = await pool.query(`
            INSERT INTO eway_bills (company_code, invoice_id, eway_bill_number, vehicle_number, transporter_gstin, from_city, to_city, distance_km, doc_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
            RETURNING *
        `, [companyCode, invoice_id || null, ewbNum, vehicle_number, transporter_gstin, from_city || 'Pune', to_city, distance_km || 0, doc_date || new Date().toISOString().slice(0, 10)]);

        res.status(201).json({ success: true, message: 'E-Way Bill generated', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'createEwayBill error');
        res.status(500).json({ success: false, message: 'Failed to generate e-way bill', error: error.message });
    }
};
