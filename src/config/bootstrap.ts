// config/bootstrap.ts
// Loads .env, then creates config and logger, avoiding circular dependency.
import { loadEnv } from './loadEnv.js';

// 1. Load .env (no logger yet, so use console)
await loadEnv();

// 2. Now import config (process.env is ready)
import { config } from './env.js';

// 3. Now import and create logger (config is ready)
import path from 'path';
import winston from 'winston';

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;

// Simple format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger with console transport (always available)
const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat })
  ]
});

// Only add file transports when NOT on Vercel and NOT in production
if (!isVercel && process.env.NODE_ENV !== 'production') {
  try {
    const fs = await import('fs');
    const logsDir = 'logs';

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

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
  } catch (error: any) {
    console.log('ℹ️ File logging disabled:', error.message);
  }
} else if (isVercel) {
  console.log('☁️ Running on Vercel - console only');
}

export { logger, config };
