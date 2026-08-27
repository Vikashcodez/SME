import pino from 'pino';
import { config } from './env.js';

const isProduction = config.nodeEnv === 'production';

export const logger = pino({
  level: config.logLevel || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'current_password',
      'new_password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'credit_card',
      'cvv',
      'pan',
      'aadhaar',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export const createChildLogger = ({ requestId, companyCode, userId } = {}) => {
  return logger.child({
    requestId: requestId || undefined,
    companyCode: companyCode || undefined,
    userId: userId || undefined,
  });
};

export default logger;
