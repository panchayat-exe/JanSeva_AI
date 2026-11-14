import morgan from 'morgan';
import type { Request, Response } from 'express';
import { httpLogger } from '../logger/winston';
import { v4 as uuidv4 } from 'uuid';
import type { NextFunction } from 'express';

// Attach a unique requestId to every incoming request
export function requestId(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = uuidv4();
  next();
}

// Morgan HTTP request logger — logs method, url, status, response time
export const httpRequestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: httpLogger,
    skip: (_req, res) => {
      // Skip health check logs to reduce noise
      const req = _req as Request;
      return res.statusCode === 200 && req.path === '/health';
    },
  },
);
