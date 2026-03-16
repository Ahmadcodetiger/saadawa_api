import path from 'path';
import winston from 'winston';
import fs from 'fs';

interface LoggerOptions {
  environment: 'development' | 'production' | 'test';
  logLevel?: string;
}

const createLogger = (options: LoggerOptions) => {
  const { environment, logLevel = 'info' } = options;
  const isVercel = process.env.VERCEL === '1';
  
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'api-service', environment },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          })
        ),
      }),
    ],
  });

  // Add file logging only in development and NOT on Vercel
  if (environment === 'development' && !isVercel) {
    try {
      const logsDir = 'logs';
      
      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
      }
      
      // Error log
      logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      
      // Combined log
      logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      
      // Debug log for development
      if (environment === 'development') {
        logger.add(new winston.transports.File({
          filename: path.join(logsDir, 'debug.log'),
          level: 'debug',
          maxsize: 5242880,
          maxFiles: 3,
        }));
      }
      
      logger.info('📝 File logging enabled');
    } catch (error) {
      logger.warn('Could not enable file logging:', error.message);
    }
  } else if (environment === 'production') {
    logger.info('☁️ Production mode - using console logging only');
  }

  return logger;
};

// Create logger instance
const logger = createLogger({
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  logLevel: process.env.LOG_LEVEL,
});

export default logger;
