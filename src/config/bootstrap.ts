// config/bootstrap.ts
import { loadEnv } from './loadEnv.js';

await loadEnv();
import { config } from './env.js';
import path from 'path';
import winston from 'winston';

const isVercel = process.env.VERCEL === '1';

// Simple format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Create logger with conditional transports
const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat })
  ]
});

// Only add file transports in development and not on Vercel
if (!isVercel && process.env.NODE_ENV !== 'production') {
  try {
    const fs = require('fs');
    const logsDir = 'logs';
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );
    
    logger.add(new winston.transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error',
      format: fileFormat 
    }));
    
    logger.add(new winston.transports.File({ 
      filename: path.join('logs', 'combined.log'),
      format: fileFormat 
    }));
    
    console.log('✅ File logging enabled');
  } catch (error) {
    console.log('ℹ️ File logging disabled:', error.message);
  }
} else if (isVercel) {
  console.log('☁️ Running on Vercel - console only');
}

export { logger, config };
