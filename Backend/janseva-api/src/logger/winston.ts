import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from '../config/environment';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Human-readable format for development console
const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

// Production: structured JSON logs for log aggregators
const productionFormat = combine(
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  errors({ stack: true }),
  json(),
);

// Development: colorized human-readable logs
const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  devFormat,
);

const logDir = path.resolve(process.cwd(), env.LOG_DIR);

// Rotating file transport for all logs
const allLogsTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: productionFormat,
});

// Separate rotating file transport for errors only
const errorLogsTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '90d',
  format: productionFormat,
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'janseva-api' },
  transports: [
    allLogsTransport,
    errorLogsTransport,
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: productionFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: productionFormat,
    }),
  ],
});

// HTTP request logger (used by Morgan)
export const httpLogger = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
