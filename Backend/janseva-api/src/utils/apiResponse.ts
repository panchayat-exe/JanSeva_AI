import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types/common.types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta,
  requestId?: string,
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created successfully',
  requestId?: string,
): Response {
  return sendSuccess(res, data, message, 201, undefined, requestId);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}
