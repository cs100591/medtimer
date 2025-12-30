import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production' ? jsonFormat : logFormat,
  transports: [
    new winston.transports.Console({
      format: config.nodeEnv === 'production' 
        ? jsonFormat 
        : winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});

// Stream for Morgan HTTP logging
export const loggerStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
