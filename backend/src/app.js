import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import { config } from './config/env.js';
import pool, { testConnection } from './config/database.js';
import { logger, createChildLogger } from './config/logger.js';
import { initializeModularDatabase } from './db/initModularDb.js';

import authRoutes from './routes/auth.Routes.js';
import companyRoutes from './routes/company.Routes.js';
import erpRoutes from './routes/erp.Routes.js';
import modularRoutes from './routes/modular.Routes.js';
import uploadRoutes from './routes/upload.Routes.js';

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  req.log = createChildLogger({
    requestId: reqId,
    companyCode: req.headers['x-company-id'] || req.companyCode,
  });
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
  })
);

const corsOptions = {
  origin: (origin, callback) => {
    
    if (!origin || config.cors.allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin '${origin}' not allowed by policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, 
};
app.use(cors(corsOptions));

app.use(compression());

app.use(cookieParser());

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/api/health',
    },
  })
);

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again later.',
    },
  },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/v1/auth/login', authLimiter);

app.get(['/health', '/api/health'], async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const dbLatencyMs = Date.now() - start;

    res.status(200).json({
      status: 'healthy',
      service: 'chandra-precision-erp-backend',
      environment: config.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      db: {
        status: 'connected',
        latencyMs: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'chandra-precision-erp-backend',
      db: {
        status: 'disconnected',
        error: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

const mountRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/companies`, companyRoutes);
  app.use(`${prefix}/erp`, erpRoutes);
  app.use(`${prefix}/modules`, modularRoutes);
  app.use(`${prefix}/uploads`, uploadRoutes);
};

mountRoutes('/api');
mountRoutes('/api/v1');

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    },
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = config.nodeEnv === 'production';

  (req.log || logger).error({ err, statusCode, url: req.originalUrl }, 'Unhandled application error');

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: isProd && statusCode === 500 ? 'An unexpected server error occurred.' : err.message || 'Error occurred',
      details: err.details || undefined,
    },
  });
});

let server;

const startServer = async () => {
  try {
    const dbConnected = await testConnection(5, 1500);
    if (!dbConnected) {
      logger.error('❌ Failed to establish PostgreSQL connection. Halting startup.');
      process.exit(1);
    }

    
    await initializeModularDatabase();

    server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 Chandra Precision ERP Backend listening on http://127.0.0.1:${config.port}`);
      logger.info(`📝 Environment: ${config.nodeEnv} | Logging: ${config.logLevel}`);
    });
  } catch (error) {
    logger.error({ err: error }, '❌ Fatal error during backend initialization');
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await pool.end();
        logger.info('PostgreSQL pool connection drained.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error closing database pool');
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();

export default app;
