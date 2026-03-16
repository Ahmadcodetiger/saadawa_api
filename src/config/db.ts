// config/db.ts
import mongoose from 'mongoose';
import { config, logger } from './bootstrap.js';

// Cache the database connection to prevent multiple connections
// This is crucial for serverless environments
let cachedConnection: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  // If we already have a connection, use it
  if (cachedConnection) {
    logger.debug('📊 Using cached database connection');
    return cachedConnection;
  }

  // If a connection is already in progress, wait for it
  if (connectionPromise) {
    logger.debug('📊 Waiting for existing connection attempt...');
    return connectionPromise;
  }

  logger.info('📊 Creating new database connection...');

  // Set up connection options optimized for serverless
  const options = {
    // How long to wait for a connection
    serverSelectionTimeoutMS: 5000,
    // How long to wait for a socket
    socketTimeoutMS: 45000,
    // Maximum number of connections in the pool
    maxPoolSize: 10,
    // Minimum number of connections in the pool
    minPoolSize: 1,
    // Keep trying to connect
    family: 4, // Force IPv4
    // Buffer commands when disconnected
    bufferCommands: true,
    // Don't buffer commands when disconnected
    bufferMaxEntries: 0,
    // Auto reconnect
    autoCreate: true,
    autoIndex: true,
  };

  // Create the connection promise
  connectionPromise = mongoose.connect(config.mongoUri, options)
    .then((mongoose) => {
      logger.info('✅ MongoDB connected successfully');
      cachedConnection = mongoose;
      connectionPromise = null;
      return mongoose;
    })
    .catch((error) => {
      logger.error('❌ MongoDB connection error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      connectionPromise = null;
      throw error;
    });

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

  return connectionPromise;
};

// Helper function to check connection status
export const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  
  return {
    isConnected: readyState === 1,
    state: states[readyState] || 'unknown',
    readyState,
    hasCachedConnection: !!cachedConnection,
  };
};

// Graceful shutdown (not typically used in serverless, but good for development)
export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
    cachedConnection = null;
    connectionPromise = null;
  }
};
