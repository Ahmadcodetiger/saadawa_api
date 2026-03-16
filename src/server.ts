// server.ts
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// Configure __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import config after dotenv is configured
const { config } = await import('./config/env.js');

// Import the app and database connection
import app from './app.js';
import { connectDB, getConnectionStatus } from './config/db.js';
import { logger } from './config/bootstrap.js';

// Add error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ============================================
// DATABASE CONNECTION MIDDLEWARE
// ============================================
// Add database connection check middleware to app
app.use(async (req, res, next) => {
  try {
    const status = getConnectionStatus();
    if (!status.isConnected) {
      logger.info('📊 Connecting to database on first request...');
      await connectDB();
    }
    next();
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: 'Database connection failed'
    });
  }
});

// ============================================
// ADDITIONAL HEALTH ENDPOINTS
// ============================================
// Database health check
app.get('/api/health/db', async (req, res) => {
  const status = getConnectionStatus();
  
  if (status.isConnected) {
    res.json({
      success: true,
      message: 'Database connected',
      status: {
        isConnected: status.isConnected,
        state: status.state,
        host: status.host,
        name: status.name,
        connectionAttempts: status.connectionAttempts
      }
    });
  } else {
    try {
      await connectDB();
      const newStatus = getConnectionStatus();
      res.json({
        success: true,
        message: 'Database reconnected',
        status: newStatus
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        status
      });
    }
  }
});

// Debug environment variables (safe version)
app.get('/api/debug/env', (req, res) => {
  const mongoUri = process.env.MONGODB_URI || '';
  
  res.json({
    nodeEnv: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    mongoUri: mongoUri ? {
      exists: true,
      length: mongoUri.length,
      format: mongoUri.startsWith('mongodb+srv://') ? 'Atlas SRV' : 
              mongoUri.startsWith('mongodb://') ? 'Standard' : 'Unknown',
      // Show first 10 and last 10 characters (masked)
      preview: mongoUri.substring(0, 10) + '...' + mongoUri.substring(mongoUri.length - 10),
      hasUsername: mongoUri.includes('@'),
      hasPassword: mongoUri.includes(':') && mongoUri.includes('@'),
    } : 'NOT SET',
    otherEnv: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL,
    }
  });
});

// ============================================
// START SERVER (only for local development)
// ============================================
async function startServer() {
  try {
    const PORT = config.port || 5000;
    
    // Connect to database on startup for local development
    if (!process.env.VERCEL) {
      logger.info('🔌 Connecting to database on startup...');
      await connectDB();
      logger.info('✅ MongoDB connected successfully');
    }
    
    // Only listen if not on Vercel
    if (!process.env.VERCEL) {
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🔧 Environment: ${config.nodeEnv}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
      });

      // Handle server errors
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') throw error;
        
        switch (error.code) {
          case 'EACCES':
            console.error(`Port ${PORT} requires elevated privileges`);
            process.exit(1);
          case 'EADDRINUSE':
            console.error(`Port ${PORT} is already in use`);
            process.exit(1);
          default:
            throw error;
        }
      });
    } else {
      logger.info('☁️ Running on Vercel - serverless mode');
    }
  } catch (error: any) {
    console.error("❌ Server startup failed:", error.message);
    console.error("Error details:", error);
    if (error.code) console.error("Error code:", error.code);
    if (error.stack) console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Start server only if not on Vercel
if (!process.env.VERCEL) {
  startServer();
}

// Export app for Vercel
export default app;
