// config/bootstrap.ts
import { loadEnv } from './loadEnv.js';

// 1. Load .env
await loadEnv();

// 2. Import config
import { config } from './env.js';

// 3. Create logger based on environment
import path from 'path';
import winston from 'winston';

const isVercel = process.env.VERCEL === '1';

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger based on environment
const createLogger = () => {
  // Base logger with console transport
  const loggerTransports = [
    new winston.transports.Console({ format: consoleFormat })
  ];

  // On Vercel, only use console
  if (isVercel) {
    console.log('☁️ Creating Vercel-optimized logger');
    return winston.createLogger({
      level: config.logLevel,
      format: winston.format.json(),
      transports: loggerTransports,
    });
  }

  // On non-Vercel environments, add file transports
  try {
    const fs = require('fs');
    const logsDir = 'logs';
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Add all file transports
    loggerTransports.push(
      new winston.transports.File({ filename: path.join('logs', 'error.log'), level: 'error', format: fileFormat }),
      new winston.transports.File({ filename: path.join('logs', 'combined.log'), format: fileFormat })
    );
    
    console.log('📝 Full logging enabled');
  } catch (error) {
    console.log('⚠️ File logging unavailable:', error.message);
  }

  return winston.createLogger({
    level: config.logLevel,
    format: winston.format.json(),
    transports: loggerTransports,
  });
};

export const logger = createLogger();
export { config };
