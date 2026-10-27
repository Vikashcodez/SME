import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = 'uploads/companies';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const invoiceUploadDir = 'uploads/invoices';
if (!fs.existsSync(invoiceUploadDir)) {
    fs.mkdirSync(invoiceUploadDir, { recursive: true });
}

const productUploadDir = 'uploads/products';
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}

// Configure storage for logos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for product images (2-3 photos)
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prd-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for invoices & documents
const invoiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, invoiceUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'inv-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for logos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, png, jpg, gif, webp, svg)'), false);
    }
};

// File filter for invoices (allows PDF, images)
const invoiceFileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files (jpg, png, webp, pdf) are allowed for invoices'), false);
    }
};

// Create multer upload instance
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

export const uploadInvoiceMiddleware = multer({
    storage: invoiceStorage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit for invoices
    },
    fileFilter: invoiceFileFilter
});

export const uploadProductMiddleware = multer({
    storage: productStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per photo
    },
    fileFilter: fileFilter
});

// Configure storage for service images
const serviceUploadDir = 'uploads/services';
if (!fs.existsSync(serviceUploadDir)) {
    fs.mkdirSync(serviceUploadDir, { recursive: true });
}

const serviceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, serviceUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'srv-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadServiceMiddleware = multer({
    storage: serviceStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per photo
    },
    fileFilter: fileFilter
});

// Single & Multiple file upload middlewares
export const uploadLogo = upload.single('logo');
export const uploadInvoice = uploadInvoiceMiddleware.single('invoice_file');
export const uploadProductImages = uploadProductMiddleware.fields([
    { name: 'photo_1', maxCount: 1 },
    { name: 'photo_2', maxCount: 1 },
    { name: 'photo_3', maxCount: 1 },
    { name: 'photos', maxCount: 5 }
]);
export const uploadServiceImages = uploadServiceMiddleware.fields([
    { name: 'photo_1', maxCount: 1 },
    { name: 'photo_2', maxCount: 1 },
    { name: 'photo_3', maxCount: 1 },
    { name: 'photos', maxCount: 5 }
]);