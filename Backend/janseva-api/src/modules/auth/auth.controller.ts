import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { CONSTANTS } from '../../config/constants';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.registerUser(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    sendCreated(res, null, result.message, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyEmail(req.body);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.loginUser(req.body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Set refresh token as HttpOnly cookie
    res.cookie(CONSTANTS.TOKEN_COOKIE_NAME, result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CONSTANTS.COOKIE_MAX_AGE_7D,
      path: '/api/v1/auth',
    });

    sendSuccess(res, result, 'Login successful', 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Accept from body OR cookie
    const token =
      req.body?.refreshToken ||
      (req.cookies as Record<string, string>)?.[CONSTANTS.TOKEN_COOKIE_NAME];

    if (!token) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    const tokens = await authService.refreshTokens(token, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Rotate cookie
    res.cookie(CONSTANTS.TOKEN_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CONSTANTS.COOKIE_MAX_AGE_7D,
      path: '/api/v1/auth',
    });

    sendSuccess(res, tokens, 'Token refreshed', 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken =
      req.body?.refreshToken ||
      (req.cookies as Record<string, string>)?.[CONSTANTS.TOKEN_COOKIE_NAME];

    await authService.logoutUser(req.user!.id, refreshToken);

    // Clear cookie
    res.clearCookie(CONSTANTS.TOKEN_COOKIE_NAME, { path: '/api/v1/auth' });

    sendSuccess(res, null, 'Logged out successfully', 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.forgotPassword(req.body);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.changePassword(req.user!.id, req.body);
    // Revoke cookie on password change
    res.clearCookie(CONSTANTS.TOKEN_COOKIE_NAME, { path: '/api/v1/auth' });
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resendVerificationEmail(req.body.email);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, req.user, 'Current user', 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}
export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.sendOtp(req.user!.id, req.body);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyOtp(req.user!.id, req.body);
    sendSuccess(res, null, result.message, 200, undefined, req.requestId);
  } catch (err) {
    next(err);
  }
}
