import path from 'path';
import winston from 'winston';

// Log environment info immediately
console.log('🔧 Logger initializing...');
console.log('📋 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  IS_VERCEL: process.env.VERCEL === '1',
  PWD: process.cwd(),
});

// Check if we can write to filesystem
const canWriteToFS = () => {
  try {
    const fs = require('fs');
    const testFile = '/tmp/test-write.txt';
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
};

const isVercel = process.env.VERCEL === '1';
const canWrite = canWriteToFS();

console.log('📝 Filesystem write access:', canWrite ? 'Yes' : 'No');

// Create base logger with only console transport
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// ONLY try file transports if we're not on Vercel AND we can write
if (!isVercel && canWrite) {
  try {
    const fs = require('fs');
    const logsDir = 'logs';
    
    console.log('📁 Attempting to create logs directory...');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('✅ Logs directory created');
    }
    
    // Add file transports
    logger.add(new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }));
    
    logger.add(new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }));
    
    console.log('✅ File logging enabled');
  } catch (error) {
    console.log('❌ File logging failed:', error.message);
    // Don't crash - just use console logging
  }
} else {
  console.log('☁️ Using console-only logging (Vercel serverless mode)');
}

export default logger;
