// config/db.ts
import mongoose from 'mongoose';
import { config, logger } from './bootstrap.js';

// Cache the database connection
let cachedConnection: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;
let connectionAttempts = 0;

export const connectDB = async (): Promise<typeof mongoose> => {
  connectionAttempts++;
  const attemptId = connectionAttempts;

  // If we have a cached connection, use it
  if (cachedConnection) {
    try {
      // Quick check if connection is alive
      if (mongoose.connection.readyState === 1) {
        logger.debug(`📊 Using cached database connection (attempt #${attemptId})`);
        return cachedConnection;
      }
    } catch (error) {
      logger.warn(`📊 Cached connection is dead, reconnecting...`);
      cachedConnection = null;
    }
  }

  // If a connection attempt is in progress, wait for it
  if (connectionPromise) {
    logger.debug(`📊 Waiting for existing connection (attempt #${attemptId})`);
    return connectionPromise;
  }

  logger.info(`📊 Creating new database connection (attempt #${attemptId})...`);

  // Log connection string (safe version)
  const safeUri = config.mongoUri?.replace(
    /(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/,
    '$1***HIDDEN***$3'
  ) || 'NOT SET';
  logger.info(`📊 Connecting to: ${safeUri}`);

  // Serverless-optimized connection options
  const options = {
    serverSelectionTimeoutMS: 5000, // Shorter timeout for faster failure
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    maxPoolSize: 5, // Smaller pool for serverless
    minPoolSize: 0,
    family: 4,
    retryWrites: true,
    retryReads: true,
    bufferCommands: false, // Don't buffer commands
    bufferMaxEntries: 0,
    autoCreate: true,
    autoIndex: true,
  };

  // Create connection promise
  connectionPromise = mongoose.connect(config.mongoUri, options)
    .then((mongoose) => {
      logger.info(`✅ MongoDB connected successfully (attempt #${attemptId})`);
      
      // Log connection details
      const host = mongoose.connection.host || 'unknown';
      const name = mongoose.connection.name || 'unknown';
      logger.info(`📊 Connected to: ${host}/${name}`);
      
      cachedConnection = mongoose;
      connectionPromise = null;
      return mongoose;
    })
    .catch((error) => {
      logger.error(`❌ MongoDB connection error (attempt #${attemptId}):`, {
        name: error.name,
        message: error.message,
        code: error.code,
      });

      connectionPromise = null;

      // Provide helpful error messages based on error type
      if (error.name === 'MongoServerSelectionError') {
        logger.error('❌ Cannot reach MongoDB server. Check:');
        logger.error('   1. MongoDB Atlas IP whitelist - add Vercel IPs or set 0.0.0.0/0');
        logger.error('   2. Network connectivity to MongoDB Atlas');
        logger.error('   3. Username and password are correct');
      } else if (error.code === 18 || error.message.includes('auth')) {
        logger.error('❌ Authentication failed. Check username and password');
      } else if (error.message.includes('getaddrinfo')) {
        logger.error('❌ DNS resolution failed. Check cluster hostname');
      }

      throw error;
    });

  return connectionPromise;
};

// Get connection status
export const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  
  return {
    isConnected: readyState === 1,
    state: states[readyState] || 'unknown',
    readyState,
    hasCachedConnection: !!cachedConnection,
    connectionAttempts,
    host: mongoose.connection.host || 'unknown',
    name: mongoose.connection.name || 'unknown',
  };
};

// Add connection event listeners
mongoose.connection.on('connected', () => {
  logger.info('🔌 MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🔌 MongoDB disconnected');
  cachedConnection = null;
});

mongoose.connection.on('error', (err) => {
  logger.error('🔌 MongoDB connection error:', err);
});

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
    cachedConnection = null;
    connectionPromise = null;
  }
};
