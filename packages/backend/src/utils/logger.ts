/**
 * Winston logger on the standard npm levels, so LOG_LEVEL behaves the way
 * people expect. Console output is human-readable; production additionally
 * writes structured JSON to disk.
 */

import winston from 'winston';
import { env } from '../config/env.js';

const consoleFormat = winston.format.combine(
  winston.format.colorize({ level: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${message}${extra}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL === 'http' ? 'debug' : env.LOG_LEVEL,
  format: fileFormat,
  transports: [new winston.transports.Console({ format: consoleFormat })],
});

if (env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}
