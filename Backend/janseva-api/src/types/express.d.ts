import type { Request } from 'express';
import type { Role } from '@prisma/client';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  departmentId?: string | null;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  requestId: string;
};
