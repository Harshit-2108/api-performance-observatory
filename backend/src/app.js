const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes = require('./routes/userRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const errorHandler = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/security');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

// Secure Headers
app.use(securityHeaders);

// Rate Limiting (150 requests per 15 minutes per IP)
app.use('/api', rateLimiter({ windowMs: 15 * 60 * 1000, max: 150 }));

// Body parser middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Enable CORS with credentials support for HTTP-only cookies
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://api-performance-observatory-dpzb.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Dev logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date()
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
