import winston from 'winston';
import { CONFIG } from '../config';

const logger = winston.createLogger({
  level: CONFIG.IS_PRODUCTION ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'telegram-wallet' },
  transports: [
    // Always log to console so we can see output in docker logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Use absolute paths for log files
    new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/app/logs/combined.log' }),
  ],
});

export default logger;
