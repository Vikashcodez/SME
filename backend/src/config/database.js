import pkg from 'pg';
const { Pool } = pkg;
import { config } from './env.js';
import { logger } from './logger.js';

const pool = new Pool({
  user: config.db.user,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  max: 25, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.db.ssl
    ? {
        rejectUnauthorized: config.nodeEnv === 'production',
      }
    : false,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error on idle client');
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn({ duration, query: text.substring(0, 100) }, 'Slow query detected');
    }
    return res;
  } catch (error) {
    logger.error({ err: error, query: text.substring(0, 100) }, 'Database query error');
    throw error;
  }
};

export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Transaction rolled back due to error');
    throw error;
  } finally {
    client.release();
  }
};

export const testConnection = async (maxRetries = 5, initialDelay = 1000) => {
  let attempt = 1;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      const client = await pool.connect();
      logger.info('✅ PostgreSQL database connected successfully');
      client.release();
      return true;
    } catch (error) {
      logger.warn(
        { attempt, maxRetries, delay, err: error.message },
        `Database connection attempt failed. Retrying in ${delay}ms...`
      );
      if (attempt === maxRetries) {
        logger.error({ err: error }, '❌ Exhausted all database connection retry attempts.');
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; 
      attempt++;
    }
  }
  return false;
};

export default pool;
