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

  // If we have a cached connection, verify it's alive
  if (cachedConnection) {
    try {
      // Check if connection is actually alive
      await mongoose.connection.db.admin().ping();
      logger.debug(`📊 Using cached database connection (attempt #${attemptId})`);
      return cachedConnection;
    } catch (error) {
      logger.warn(`📊 Cached connection is dead, reconnecting... (attempt #${attemptId})`);
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
  const safeUri = config.mongoUri.replace(
    /(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/,
    '$1***HIDDEN***$3'
  );
  logger.info(`📊 Connecting to: ${safeUri}`);

  // Serverless-optimized connection options
  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    family: 4,
    retryWrites: true,
    retryReads: true,
    bufferCommands: false,
    bufferMaxEntries: 0,
  };

  // Create connection promise
  connectionPromise = mongoose.connect(config.mongoUri, options)
    .then((mongoose) => {
      logger.info(`✅ MongoDB connected successfully (attempt #${attemptId})`);
      logger.info(`📊 Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
      
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
      throw error;
    });

  return connectionPromise;
};

// Get connection status with all properties
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
  cachedConnection = null;
});

mongoose.connection.on('reconnected', () => {
  logger.info('🔌 MongoDB reconnected');
});

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
    cachedConnection = null;
    connectionPromise = null;
  }
};
