import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authRoutes } from './routes/auth.js';
import verifyRoutes from './routes/verify.js';
import walletRoutes from './routes/wallet.js';
import configRoutes from './routes/config.js';
import { initDatabase, closeDatabase } from './database/index.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Debug: Log if env vars are loaded
console.log('[Server] Environment check:');
console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  BACKEND_URL:', process.env.BACKEND_URL || 'Using default: http://localhost:3001');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS: Allow frontend origin (production or development)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Parse JSON bodies - must be before routes
app.use(express.json({ limit: '10mb' }));

// Debug middleware to log request body
app.use((req, res, next) => {
  if (req.path === '/verify/wallet') {
    console.log('[Server] Request to /verify/wallet:', {
      method: req.method,
      contentType: req.headers['content-type'],
      hasBody: !!req.body,
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database connection
initDatabase().catch(err => {
  console.error('[Server] Database initialization failed:', err);
});

// Routes
app.use('/auth', authRoutes);        // OAuth callbacks: /auth/:provider/start, /auth/:provider/callback
app.use('/verify', verifyRoutes);    // Unified verification: /verify, /verify/:userId, /verify/:userId/:provider
app.use('/wallet', walletRoutes);    // EVM wallet: /wallet/connect, /wallet/verify, /wallet/status/:sessionId
app.use('/config', configRoutes);    // Configuration: /config/status

// Dynamic import for user routes to avoid circular dependency
import('./routes/user.js').then(userModule => {
  app.use('/user', userModule.default); // User scores: /user/:id/score
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Listen on all interfaces (0.0.0.0) for production deployment
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[Server] 🚀 Running on http://${HOST}:${PORT}`);
  console.log(`[Server] Backend URL: ${process.env.BACKEND_URL || `http://${HOST}:${PORT}`}`);
  console.log(`[Server] Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Health check: ${process.env.BACKEND_URL || `http://${HOST}:${PORT}`}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing database...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, closing database...');
  await closeDatabase();
  process.exit(0);
});

