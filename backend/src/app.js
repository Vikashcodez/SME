import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.js';
import { testConnection, createTables } from './config/database.js';
import authRoutes from './routes/auth.Routes.js';
import companyRoutes from './routes/company.Routes.js';
import BranchRouter from './routes/Branch.Routes.js';
import RolesRouter from './routes/Roles.Routes.js';
import departmentRouter from './routes/Department.Routes.js';
import employeesRouter from './routes/employees.Routes.js';
import vendorRouter from './routes/Vendor.Routes.js';
import rawMaterialRouter from './routes/RawMaterial.Routes.js';
import rawMaterialInventoryRouter from './routes/RawMaterialInventory.Routes.js';
import assetRouter from './routes/Asset.Routes.js';
import productRouter from './routes/Product.Routes.js';
import productionRouter from './routes/Production.Routes.js';
import categoryRouter from './routes/Category.Routes.js';
import grnRouter from './routes/Grn.Routes.js';
import productionMasterRouter from './routes/ProductionMaster.Routes.js';
import productionOrderRouter from './routes/ProductionOrder.Routes.js';
import qualityCheckRouter from './routes/QualityCheck.Routes.js';
import productInventoryRouter from './routes/ProductInventory.Routes.js';
import customerRouter from './routes/Customer.Routes.js';
import accountingRouter from './routes/Accounting.Routes.js';
import salesRouter from './routes/Sales.Routes.js';
import purchaseRouter from './routes/Purchase.Routes.js';
import manufacturingAccountingRouter from './routes/ManufacturingAccounting.Routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/branches', BranchRouter); 
app.use('/api/roles', RolesRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/raw-materials', rawMaterialRouter);
app.use('/api/raw-material-inventory', rawMaterialInventoryRouter);
app.use('/api/assets', assetRouter);
app.use('/api/products', productRouter);
app.use('/api/production', productionRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/grn', grnRouter);
app.use('/api/production-masters', productionMasterRouter);
app.use('/api/production-orders', productionOrderRouter);
app.use('/api/quality-checks', qualityCheckRouter);
app.use('/api/product-inventory', productInventoryRouter);
app.use('/api/customers', customerRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchases', purchaseRouter);
app.use('/api/manufacturing-accounting', manufacturingAccountingRouter);
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