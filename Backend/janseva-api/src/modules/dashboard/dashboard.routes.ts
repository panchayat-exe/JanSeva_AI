import { Router } from 'express';
import { authenticate, requireEmailVerified } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { getComplaintStats, getAdminStats } from '../complaint/complaint.repository';
import { notificationService } from '../notification/notification.service';
import type { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate, requireEmailVerified);

/**
 * @swagger
 * /dashboard/citizen:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get citizen dashboard — complaint stats + recent activity
 */
router.get('/citizen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [stats, recentComplaints, notifications] = await Promise.all([
      getComplaintStats(userId),
      prisma.complaint.findMany({
        where: { citizenId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          complaintNumber: true,
          title: true,
          status: true,
          category: true,
          updatedAt: true,
          createdAt: true,
          locality: true,
          city: true,
        },
      }),
      notificationService.getUserNotifications(userId, { limit: 5 }),
    ]);

    // Enrich with progress
    const { CONSTANTS } = await import('../../config/constants');
    const enrichedComplaints = recentComplaints.map((c) => ({
      ...c,
      progress: CONSTANTS.STATUS_PROGRESS[c.status as keyof typeof CONSTANTS.STATUS_PROGRESS] ?? 0,
      statusLabel: CONSTANTS.STATUS_LABELS[c.status as keyof typeof CONSTANTS.STATUS_LABELS],
    }));

    sendSuccess(
      res,
      { stats, recentComplaints: enrichedComplaints, notifications: notifications.items },
      'Dashboard loaded',
      200,
      undefined,
      req.requestId,
    );
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /dashboard/officer:
 *   get:
 *     tags: [Dashboard]
 *     summary: Officer dashboard — assigned complaints stats
 */
router.get('/officer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!['OFFICER', 'DEPT_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const officerId = req.user!.id;

    const [total, inProgress, resolved, pending] = await Promise.all([
      prisma.complaint.count({ where: { officerId } }),
      prisma.complaint.count({ where: { officerId, status: 'IN_PROGRESS' } }),
      prisma.complaint.count({ where: { officerId, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.complaint.count({ where: { officerId, status: 'ASSIGNED' } }),
    ]);

    const recentComplaints = await prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, complaintNumber: true, title: true, status: true,
        priority: true, category: true, createdAt: true, city: true, state: true,
        citizen: { select: { firstName: true, lastName: true } },
      },
    });

    sendSuccess(
      res,
      { stats: { total, inProgress, resolved, pending }, recentComplaints },
      'Officer dashboard loaded',
      200,
      undefined,
      req.requestId,
    );
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     tags: [Dashboard]
 *     summary: Admin dashboard — system-wide stats + recent activity
 */
router.get('/admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!['DEPT_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const deptAdminId = req.user!.role === 'DEPT_ADMIN' ? req.user!.departmentId : undefined;
    const baseWhere = deptAdminId ? { OR: [{ departmentId: deptAdminId }, { departmentId: null }] } : {};

    const [complaintStats, totalUsers, recentComplaints, categoryBreakdown] = await Promise.all([
      getAdminStats(deptAdminId),
      prisma.user.count({ where: { isActive: true } }),
      prisma.complaint.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, complaintNumber: true, title: true, status: true,
          priority: true, category: true, createdAt: true, city: true, state: true,
          citizen: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.complaint.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    sendSuccess(
      res,
      {
        complaintStats: { ...complaintStats, totalUsers },
        recentComplaints,
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c.category,
          count: c._count.id,
        })),
      },
      'Admin dashboard loaded',
      200,
      undefined,
      req.requestId,
    );
  } catch (err) { next(err); }
});

export default router;
