import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../logger/winston';
import { env } from '../config/environment';
import type { ApiErrorResponse } from '../types/common.types';

/**
 * Global centralized error handler — the last middleware in the chain.
 * Converts all errors (operational and unexpected) into consistent JSON responses.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  // Log the error
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      requestId,
    });
  } else {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId,
    });
  }

  // Handle known operational errors (AppError subclasses)
  if (err instanceof AppError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      code: err.code,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle Prisma-specific errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = (err as unknown) as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      // Unique constraint violation
      const field = prismaErr.meta?.target?.[0] ?? 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
        code: 'CONFLICT_ERROR',
        statusCode: 409,
        timestamp: new Date().toISOString(),
        requestId,
      } satisfies ApiErrorResponse);
      return;
    }
    if (prismaErr.code === 'P2025') {
      // Record not found
      res.status(404).json({
        success: false,
        message: 'The requested record was not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        requestId,
      } satisfies ApiErrorResponse);
      return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      timestamp: new Date().toISOString(),
      requestId,
    } satisfies ApiErrorResponse);
    return;
  }

  // Handle Multer (file upload) errors
  if (err.constructor.name === 'MulterError') {
    const multerErr = (err as unknown) as { code: string };
    res.status(400).json({
      success: false,
      message:
        multerErr.code === 'LIMIT_FILE_SIZE'
          ? 'File size exceeds the maximum allowed limit'
          : 'File upload error',
      code: 'FILE_UPLOAD_ERROR',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      requestId,
    } satisfies ApiErrorResponse);
    return;
  }

  // Unknown / unexpected errors — never expose internals in production
  const statusCode = 500;
  res.status(statusCode).json({
    success: false,
    message:
      env.NODE_ENV === 'production'
        ? 'An internal server error occurred. Please try again later.'
        : err.message,
    code: 'INTERNAL_ERROR',
    statusCode,
    timestamp: new Date().toISOString(),
    requestId,
  } satisfies ApiErrorResponse);
}

/**
 * 404 handler — catches any request that didn't match any route
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    statusCode: 404,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  } satisfies ApiErrorResponse);
}
