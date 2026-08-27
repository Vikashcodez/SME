import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('sme_erp'),
  DB_SSL: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),

  
  JWT_ACCESS_SECRET: z.string().min(16).default('jwt_super_secret_access_key_chandra_2026_enterprise_256bit'),
  JWT_REFRESH_SECRET: z.string().min(16).default('jwt_super_secret_refresh_key_chandra_2026_enterprise_256bit'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:3000,http://localhost:80'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),

  
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@chandraprecision.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('Admin@2026#Secure'),
  SUPER_ADMIN_ROLE: z.string().default('super_admin'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formattedErrors = parsed.error.format();
  console.error('❌ Critical: Invalid environment configuration:', JSON.stringify(formattedErrors, null, 2));
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration in production. Exiting process.');
  }
}

const env = parsed.success ? parsed.data : envSchema.parse({});

if (env.NODE_ENV === 'production') {
  if (
    env.JWT_ACCESS_SECRET.includes('default') ||
    env.JWT_ACCESS_SECRET === 'jwt_super_secret_access_key_chandra_2026_enterprise_256bit'
  ) {
    throw new Error('JWT_ACCESS_SECRET must be set to a secure, unique 256-bit string in production.');
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct secrets.');
  }
}

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,

  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL || (env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'),
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
    
    secret: env.JWT_ACCESS_SECRET,
    expire: env.JWT_ACCESS_TTL,
  },

  cors: {
    allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  superAdmin: {
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD,
    role: env.SUPER_ADMIN_ROLE,
  },
};

export default config;
