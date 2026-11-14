import { prisma } from '../../config/database';
import type { NotificationType, Prisma } from '@prisma/client';
import { logger } from '../../logger/winston';

class NotificationService {
  async createNotification(data: {
    userId: string;
    complaintId?: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          ...data,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      logger.error('Failed to create notification', { error, data });
    }
  }

  async getUserNotifications(
    userId: string,
    { page = 1, limit = 20, unreadOnly = false }: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const skip = (page - 1) * limit;
    const where = { userId, ...(unreadOnly && { isRead: false }) };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          complaint: { select: { id: true, complaintNumber: true, title: true, status: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, unreadCount, page, limit };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({ where: { id, userId } });
  }
}

export const notificationService = new NotificationService();
