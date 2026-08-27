import pool from '../config/database.js';
import { logger } from '../config/logger.js';

export const auditTrailMiddleware = (tableName, getRecordId) => {
    return async (req, res, next) => {
        
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }

        const originalSend = res.send;
        let preChangeState = null;
        const companyCode = req.companyId || req.companyCode || 'CO-0001';
        const changedBy = req.user?.username || req.user?.email || 'System';
        const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

        
        if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && req.params.id) {
            try {
                const preRes = await pool.query(
                    `SELECT * FROM ${tableName} WHERE id = $1 OR ${tableName.slice(0, -1)}_id = $1 LIMIT 1`,
                    [req.params.id]
                ).catch(() => null);
                if (preRes && preRes.rows && preRes.rows.length > 0) {
                    preChangeState = preRes.rows[0];
                }
            } catch {
                
            }
        }

        res.send = function (data) {
            res.send = originalSend;

            
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setImmediate(async () => {
                    try {
                        let parsedData = null;
                        try {
                            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                        } catch {
                            parsedData = data;
                        }

                        let recordId = 'N/A';
                        if (getRecordId && typeof getRecordId === 'function') {
                            recordId = getRecordId(req, parsedData);
                        } else if (req.params.id) {
                            recordId = String(req.params.id);
                        } else if (parsedData?.data?.id || parsedData?.data?.[`${tableName.slice(0, -1)}_id`]) {
                            recordId = String(parsedData.data.id || parsedData.data[`${tableName.slice(0, -1)}_id`]);
                        }

                        const action = req.method === 'POST' ? 'INSERT' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';
                        const postChangeState = req.method === 'DELETE' ? null : (parsedData?.data || req.body);

                        await pool.query(`
                            INSERT INTO transaction_audit_trail (
                                company_code, table_name, record_id, action,
                                pre_change_state, post_change_state, changed_by, ip_address
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `, [
                            companyCode,
                            tableName,
                            recordId,
                            action,
                            preChangeState ? JSON.stringify(preChangeState) : null,
                            postChangeState ? JSON.stringify(postChangeState) : null,
                            changedBy,
                            ipAddress
                        ]);
                    } catch (auditErr) {
                        logger.warn({ err: auditErr.message, table: tableName }, 'MCA audit trail logging notice');
                    }
                });
            }

            return res.send(data);
        };

        next();
    };
};

export default auditTrailMiddleware;
