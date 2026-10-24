const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require("dotenv");
dotenv.config();

const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const authRoutes = require('./routes/auth.route');
const applicationRoutes = require('./routes/applications.route');
const featuresRoutes = require('./routes/features.route');

const app = express();

// 1. Helmet Security Headers (disables frontend CSP on this pure API backend)
app.use(helmet({ contentSecurityPolicy: false }));

// 2. Explicit Credential-Aware CORS
const rawOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : [];
const allowedOrigins = rawOrigins.length > 0
    ? rawOrigins
    : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile clients, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Body Parsers: Narrowly scoped 16MB parser for base64 resume upload; 1MB for all general traffic
app.use('/api/features/resume/upload', express.json({ limit: '16mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. Global API Rate Limiter
app.use('/api', globalLimiter);

// 5. Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/features", featuresRoutes);

// 6. Global Centralized Error Handler
app.use((err, req, res, next) => {
    if (err.message === 'CORS origin not allowed') {
        return res.status(403).json({ success: false, message: 'Not allowed by CORS' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request payload exceeds allowable size limit' });
    }
    console.error('[Global App Error]:', err.message);
    res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
});

module.exports = app;

