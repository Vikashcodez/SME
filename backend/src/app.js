import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.js';
import { testConnection, createTables } from './config/database.js';
import authRoutes from './routes/auth.Routes.js';
import companyRoutes from './routes/company.Routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Create tables
        await createTables();

        const PORT = config.port;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📝 Environment: ${config.nodeEnv}`);
            
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;