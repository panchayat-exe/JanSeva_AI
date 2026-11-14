import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/appError';
import { prisma } from '../config/database';
import type { Role } from '@prisma/client';

/**
 * Verifies JWT access token in Authorization header.
 * Attaches decoded user to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Fetch fresh user from DB to ensure account is still active/valid
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        departmentId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Account not found or deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      departmentId: user.departmentId,
    };

    next();
  } catch (err) {
    if ((err as Error).name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
      return;
    }
    if ((err as Error).name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
      return;
    }
    next(err);
  }
}

/**
 * Optional authentication — attaches user if token present, does not fail if absent.
 * Used for routes that work for both guests and authenticated users.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  authenticate(req, _res, next);
}

/**
 * Requires email to be verified before accessing protected routes
 */
export function requireEmailVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.isEmailVerified) {
    next(
      new AuthorizationError(
        'Please verify your email address before accessing this feature',
      ),
    );
    return;
  }
  next();
}

/**
 * RBAC middleware factory — restrict access to specific roles
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new AuthorizationError(
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
      return;
    }
    next();
  };
}
