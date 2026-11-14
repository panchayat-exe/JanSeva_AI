import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import type { AuditAction, Prisma } from '@prisma/client';
import { logger } from '../logger/winston';

/**
 * Creates an audit log entry in the database.
 * Records every significant action with actor, resource, and context.
 */
export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        description: params.description,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    // Audit log failures must never break the main request flow
    logger.error('Failed to create audit log', { error, params });
  }
}

/**
 * Middleware factory that automatically logs route access to audit trail
 */
export function auditLog(action: AuditAction, resource: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await createAuditLog({
      userId: req.user?.id,
      action,
      resource,
      description: `${req.method} ${req.path}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { requestId: req.requestId },
    });
    next();
  };
}
