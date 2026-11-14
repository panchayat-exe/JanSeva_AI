import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(authenticate);

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: z.enum(['complaints', 'all']).default('all'),
});

/**
 * @swagger
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Global search across complaints
 */
router.get('/', validate(searchSchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, page, limit, type } = req.query as { q: string; page: string; limit: string; type: string };
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const isAdmin = ['DEPT_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    const citizenFilter = req.user!.role === 'CITIZEN' ? { citizenId: req.user!.id } : {};

    const searchFilter = {
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { complaintNumber: { contains: q, mode: 'insensitive' as const } },
        { locality: { contains: q, mode: 'insensitive' as const } },
        { city: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const where = { ...citizenFilter, ...searchFilter };

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          complaintNumber: true,
          title: true,
          status: true,
          category: true,
          priority: true,
          locality: true,
          city: true,
          createdAt: true,
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    sendSuccess(
      res,
      { complaints, total, query: q },
      'Search results',
      200,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
      req.requestId,
    );
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     tags: [Search]
 *     summary: Get search suggestions
 */
router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q: string };
    if (!q || q.length < 2) {
      sendSuccess(res, { suggestions: [] }, 'No suggestions');
      return;
    }

    const citizenFilter = req.user!.role === 'CITIZEN' ? { citizenId: req.user!.id } : {};

    const results = await prisma.complaint.findMany({
      where: {
        ...citizenFilter,
        title: { contains: q, mode: 'insensitive' },
      },
      select: { title: true, category: true },
      take: 5,
      distinct: ['title'],
    });

    sendSuccess(
      res,
      { suggestions: results.map((r) => r.title) },
      'Suggestions',
    );
  } catch (err) { next(err); }
});

export default router;
