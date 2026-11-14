import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { notificationService } from './notification.service';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import type { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, unreadOnly } = req.query as { page?: string; limit?: string; unreadOnly?: string };
    const result = await notificationService.getUserNotifications(req.user!.id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      unreadOnly: unreadOnly === 'true',
    });
    sendSuccess(res, result, 'Notifications retrieved');
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count }, 'Unread count');
  } catch (err) { next(err); }
});

router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAsRead(String(req.params.id), req.user!.id);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
});

router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.deleteNotification(String(req.params.id), req.user!.id);
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
