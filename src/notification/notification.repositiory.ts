import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger();
  async findById(notificationId: string) {
    try {
      const notification = await this.prisma.notifications.findUnique({
        where: {
          id: notificationId,
        },
      });

      if (!notification) {
        return null;
      }
      return notification;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findManyByRecipientId(recipientId: string) {
    try {
      const notifications = await this.prisma.notifications.findMany({
        where: {
          recipientId,
        },
      });
      return notifications;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async totalCountByRecipientId(recipientId: string): Promise<number> {
    try {
      const count = await this.prisma.notifications.count({
        where: {
          recipientId,
        },
      });

      return count;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async unreadCountByRecipientId(recipientId: string): Promise<number> {
    try {
      const count = await this.prisma.notifications.count({
        where: {
          recipientId,
          readAt: {
            equals: null,
          },
        },
      });

      return count;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createNotification(params: {
    data: Prisma.NotificationsUncheckedCreateInput;
  }) {
    try {
      return await this.prisma.notifications.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
