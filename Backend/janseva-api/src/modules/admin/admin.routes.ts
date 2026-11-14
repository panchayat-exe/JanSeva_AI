import { Router } from 'express';
import { authenticate, authorize, requireEmailVerified } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../../utils/appError';

const router = Router();

/**
 * @swagger
 * /admin/reports/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Get full analytics report (RBAC aware)
 */
router.get('/reports/analytics', authenticate, requireEmailVerified, authorize('OFFICER', 'DEPT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
    const { role, id, departmentId } = req.user!;

    const baseFilter: any = {};
    
    if (dateFrom || dateTo) {
      baseFilter.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    if (role === 'DEPT_ADMIN' && departmentId) {
      baseFilter.departmentId = departmentId;
    } else if (role === 'OFFICER') {
      baseFilter.officerId = id;
    }

    const [
      totalComplaints,
      byStatus,
      byCategory,
      byPriority,
      avgRating,
      totalUsers,
      depts,
      recentComplaints,
      resolvedComplaints
    ] = await Promise.all([
      prisma.complaint.count({ where: baseFilter }),
      prisma.complaint.groupBy({ by: ['status'], _count: { id: true }, where: baseFilter }),
      prisma.complaint.groupBy({ by: ['category'], _count: { id: true }, where: baseFilter, orderBy: { _count: { id: 'desc' } } }),
      prisma.complaint.groupBy({ by: ['priority'], _count: { id: true }, where: baseFilter }),
      prisma.complaint.aggregate({ _avg: { rating: true }, where: { ...baseFilter, rating: { not: null } } }),
      prisma.user.count({ where: { role: 'CITIZEN', isActive: true } }),
      role === 'OFFICER' ? Promise.resolve([]) : prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.complaint.findMany({ where: baseFilter, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
      prisma.complaint.findMany({ where: { ...baseFilter, status: 'RESOLVED', resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } })
    ]);

    const trendMap: Record<string, number> = {};
    recentComplaints.forEach(c => {
      const dateStr = c.createdAt.toISOString().split('T')[0];
      trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
    });
    const trend = Object.keys(trendMap).length > 0 
      ? Object.entries(trendMap).map(([date, count]) => ({ date, count }))
      : [];

    let byDepartment: any[] = [];
    if (role !== 'OFFICER') {
      const deptStats = await prisma.complaint.groupBy({ by: ['departmentId', 'status'], _count: { id: true }, where: baseFilter });
      byDepartment = depts.map(d => {
        const stats = deptStats.filter(s => s.departmentId === d.id);
        const total = stats.reduce((sum, s) => sum + s._count.id, 0);
        const resolved = stats.filter(s => s.status === 'RESOLVED' || s.status === 'CLOSED').reduce((sum, s) => sum + s._count.id, 0);
        const pending = total - resolved;
        return { name: d.name, total, resolved, pending };
      }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
    }

    let avgResolutionDays = null;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((sum, c) => sum + (c.resolvedAt!.getTime() - c.createdAt.getTime()), 0);
      const avgMs = totalMs / resolvedComplaints.length;
      avgResolutionDays = Number((avgMs / (1000 * 60 * 60 * 24)).toFixed(1));
    }

    sendSuccess(res, {
      totalComplaints,
      totalUsers,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      averageRating: avgRating._avg.rating?.toFixed(2) ?? null,
      trend,
      byDepartment,
      resolutionPerformance: avgResolutionDays
    }, 'Analytics report', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

// ── Shared Endpoints (Accessible to Officers and Admins) ──
/**
 * @swagger
 * /admin/departments:
 *   get:
 *     tags: [Admin]
 *     summary: List all departments
 */
router.get('/departments', authenticate, requireEmailVerified, authorize('DEPT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { complaints: true, users: true } } },
    });
    sendSuccess(res, departments, 'Departments retrieved', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/officers:
 *   get:
 *     tags: [Admin]
 *     summary: List officers with workload info
 */
router.get('/officers', authenticate, requireEmailVerified, authorize('DEPT_ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, departmentId } = req.query as Record<string, string>;
    const where = {
      role: 'OFFICER' as const,
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const officers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        isActive: true, createdAt: true, lastLoginAt: true,
        department: { select: { id: true, name: true } },
        _count: { select: { assignedComplaints: true } },
      },
    });
    sendSuccess(res, officers, 'Officers list', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

// ── Admin-Only Middleware ─────────────────────────────────
router.use(authenticate, requireEmailVerified, authorize('DEPT_ADMIN', 'SUPER_ADMIN'));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (Admin only)
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', role, search } = req.query as Record<string, string>;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(role && { role: role as never }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { citizenId: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isEmailVerified: true, isActive: true,
          citizenId: true, createdAt: true, lastLoginAt: true,
          department: { select: { name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, 'Users retrieved', 200, {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    }, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update user role or active status
 */
router.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, isActive, departmentId } = req.body as { role?: string; isActive?: boolean; departmentId?: string };

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: {
        ...(role && { role: role as never }),
        ...(isActive !== undefined && { isActive }),
        ...(departmentId !== undefined && { departmentId }),
      },
      select: { id: true, email: true, role: true, isActive: true },
    });

    sendSuccess(res, updated, 'User updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});



/**
 * @swagger
 * /admin/departments:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new department
 */
router.post('/departments', validate(z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20).toUpperCase(),
  description: z.string().optional(),
  headEmail: z.string().email().optional(),
  phone: z.string().optional(),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    sendSuccess(res, dept, 'Department created', 201, undefined, req.requestId);
  } catch (err) { next(err); }
});



/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: View audit logs (Super Admin only)
 */
router.get('/audit-logs', authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.auditLog.count(),
    ]);

    sendSuccess(res, logs, 'Audit logs', 200, {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    }, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/departments/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get single department detail with officers and recent complaints
 */
router.get('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: { select: { complaints: true, users: true } },
        users: { where: { role: 'OFFICER' }, select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
        complaints: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, complaintNumber: true, title: true, status: true, priority: true, createdAt: true } },
      },
    });
    if (!dept) { next(new NotFoundError('Department not found')); return; }
    sendSuccess(res, dept, 'Department detail', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/departments/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a department
 */
router.put('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, headEmail, phone, isActive } = req.body;
    const updated = await prisma.department.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(headEmail !== undefined && { headEmail }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    sendSuccess(res, updated, 'Department updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});



/**
 * @swagger
 * /admin/escalations:
 *   get:
 *     tags: [Admin]
 *     summary: List high-priority unresolved complaints (escalations)
 */
router.get('/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const where = {
      priority: { in: ['CRITICAL', 'HIGH'] as any[] },
      status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED', 'DRAFT'] as any[] },
    };
    const [escalations, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true, complaintNumber: true, title: true, status: true, priority: true,
          category: true, city: true, state: true, createdAt: true, updatedAt: true,
          citizen: { select: { firstName: true, lastName: true, email: true } },
          officer: { select: { firstName: true, lastName: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);
    sendSuccess(res, escalations, 'Escalated complaints', 200, {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    }, req.requestId);
  } catch (err) { next(err); }
});

// In-memory settings store (no SystemSettings model in DB schema)
let _settings = {
  siteName: 'JanSeva AI',
  defaultSlaHours: 72,
  escalationThresholdHours: 48,
  maxReopenCount: 3,
  autoAssignEnabled: false,
  maintenanceMode: false,
};

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     tags: [Admin]
 *     summary: Get system settings (Super Admin only)
 */
router.get('/settings', authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, _settings, 'Settings', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/settings:
 *   put:
 *     tags: [Admin]
 *     summary: Update system settings (Super Admin only)
 */
router.put('/settings', authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    _settings = { ..._settings, ...req.body };
    sendSuccess(res, _settings, 'Settings updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});


// ── Department detail ─────────────────────────────────────────────────────────
router.get('/departments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: String(req.params.id) },
      include: {
        _count: { select: { complaints: true, users: true } },
        users: {
          where: { role: 'OFFICER' as never },
          select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, complaintNumber: true, title: true, status: true, priority: true, createdAt: true },
        },
      },
    });
    if (!dept) { next(new NotFoundError('Department not found')); return; }
    sendSuccess(res, dept, 'Department detail', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});

// ── Update department ─────────────────────────────────────────────────────────
router.put('/departments/:id', authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, headEmail, phone, isActive } = req.body as Record<string, any>;
    const updated = await prisma.department.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(headEmail !== undefined && { headEmail }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    sendSuccess(res, updated, 'Department updated', 200, undefined, req.requestId);
  } catch (err) { next(err); }
});



// ── Escalations (high-priority unresolved) ────────────────────────────────────
router.get('/escalations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const where: Record<string, any> = {
      priority: { in: ['CRITICAL', 'HIGH'] },
      status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED', 'DRAFT'] },
    };
    const [escalations, total] = await Promise.all([
      prisma.complaint.findMany({
        where: where as never,
        orderBy: { createdAt: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true, complaintNumber: true, title: true, status: true, priority: true,
          category: true, city: true, state: true, createdAt: true, updatedAt: true,
          citizen: { select: { firstName: true, lastName: true, email: true } },
          officer: { select: { firstName: true, lastName: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.complaint.count({ where: where as never }),
    ]);
    sendSuccess(res, escalations, 'Escalated complaints', 200, {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    }, req.requestId);
  } catch (err) { next(err); }
});

export default router;
