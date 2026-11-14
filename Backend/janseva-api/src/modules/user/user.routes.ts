import { Router } from 'express';
import { authenticate, requireEmailVerified } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { env } from '../../config/environment';
import { getComplaintStats } from '../complaint/complaint.repository';
import { notificationService } from '../notification/notification.service';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError, NotFoundError } from '../../utils/appError';
import { uploadSingle } from '../../middleware/upload';
import path from 'path';

const router = Router();
router.use(authenticate, requireEmailVerified);

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().nullable(),
  preferredLanguage: z.enum(['en', 'hi', 'ta', 'te', 'mr', 'bn', 'gu', 'kn', 'pa', 'ml']).optional(),
});

const updateSettingsSchema = z.object({
  notifEmail: z.boolean().optional(),
  notifPush: z.boolean().optional(),
  preferredLanguage: z.enum(['en', 'hi', 'ta', 'te', 'mr', 'bn', 'gu', 'kn', 'pa', 'ml']).optional(),
});

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile with complaint stats
 */
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        citizenId: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        profileImageUrl: true,
        preferredLanguage: true,
        notifEmail: true,
        notifPush: true,
        lastLoginAt: true,
        createdAt: true,
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!user) throw new NotFoundError('User');

    const stats = await getComplaintStats(req.user!.id);
    const unreadNotifications = await notificationService.getUnreadCount(req.user!.id);

    sendSuccess(
      res,
      { ...user, stats, unreadNotifications },
      'Profile retrieved',
      200,
      undefined,
      req.requestId,
    );
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 */
router.put('/profile', validate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, citizenId: true, preferredLanguage: true,
        isEmailVerified: true, isPhoneVerified: true,
      },
    });
    sendSuccess(res, updated, 'Profile updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /users/profile/image:
 *   post:
 *     tags: [Users]
 *     summary: Upload profile image
 */
router.post('/profile/image', uploadSingle, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError('No image uploaded');

    const imageUrl = `/uploads/${req.file.filename}`;
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { profileImageUrl: imageUrl },
    });

    sendSuccess(res, { profileImageUrl: imageUrl }, 'Profile image updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /users/settings:
 *   get:
 *     tags: [Users]
 *     summary: Get user settings
 */
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { preferredLanguage: true, notifEmail: true, notifPush: true },
    });
    sendSuccess(res, settings, 'Settings retrieved', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /users/settings:
 *   put:
 *     tags: [Users]
 *     summary: Update user settings (language, notifications)
 */
router.put('/settings', validate(updateSettingsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { preferredLanguage: true, notifEmail: true, notifPush: true },
    });
    sendSuccess(res, updated, 'Settings updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /users/account:
 *   delete:
 *     tags: [Users]
 *     summary: Delete own account (soft delete via deactivation)
 */
router.delete('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body as { password: string };
    if (!password) throw new BadRequestError('Password confirmation required');

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new NotFoundError('User');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new BadRequestError('Incorrect password');

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { isActive: false },
    });

    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
