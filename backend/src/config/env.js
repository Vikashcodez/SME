import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    db: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
    },
    
    jwt: {
        secret: process.env.JWT_SECRET,
        expire: process.env.JWT_EXPIRE || '7d'
    },
    
    superAdmin: {
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: process.env.SUPER_ADMIN_ROLE || 'super_admin'
    }
};

if (!config.jwt.secret || !config.superAdmin.email || !config.superAdmin.password) {
    throw new Error('JWT_SECRET, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD must be configured.');
}