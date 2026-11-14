import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter, sensitiveRateLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  changePasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from './auth.validator';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new citizen account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               preferredLanguage: { type: string, enum: [en, hi, ta, te, mr, bn, gu, kn, pa, ml] }
 *     responses:
 *       201: { description: Registration successful, verification email sent }
 *       409: { description: Email already exists }
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email address using token from email
 *     security: []
 */
router.post(
  '/verify-email',
  sensitiveRateLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification link
 *     security: []
 */
router.post(
  '/resend-verification',
  sensitiveRateLimiter,
  validate(z.object({ email: z.string().email() })),
  authController.resendVerification,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     security: []
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken,
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 */
router.post(
  '/logout',
  authenticate,
  authController.logout,
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     security: []
 */
router.post(
  '/forgot-password',
  sensitiveRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     security: []
 */
router.post(
  '/reset-password',
  sensitiveRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (requires current password)
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for email or phone verification
 *     security: []
 */
router.post(
  '/send-otp',
  authenticate,
  sensitiveRateLimiter,
  validate(sendOtpSchema),
  authController.sendOtp,
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP code
 *     security: []
 */
router.post(
  '/verify-otp',
  authenticate,
  sensitiveRateLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp,
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user info
 */
router.get(
  '/me',
  authenticate,
  authController.getMe,
);

export default router;
