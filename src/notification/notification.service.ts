import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repositiory';
import { ClientProxy } from '@nestjs/microservices';
import { MqttService } from 'src/mq/mq.service';
import { SendNotificationDto } from './dto';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import { AuthRepository } from 'src/auth/auth.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly mqttService: MqttService,
    private readonly authRepository: AuthRepository,
  ) {}
  private readonly logger = new Logger();

  async sendNotification(body: SendNotificationDto) {
    try {
      const { recipientId, content, category, pattern } = body;
      const userImage: any = await this.authRepository.getUser({
        where: { id: recipientId },
        include: { About: { select: { profilePictureLink: true } } },
      });
      content.senderProfileImage = userImage.About.profilePictureLink;
      const notify = await this.notificationRepository.createNotification({
        data: {
          recipientId,
          category,
          content: JSON.stringify(content),
        },
      });
      await this.mqttService.sentToClient(pattern, notify);
      return body;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllByRecipient(recipientId) {
    try {
      return await this.notificationRepository.findManyByRecipientId(
        recipientId,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async totalCountByRecipient(recipientId) {
    try {
      return await this.notificationRepository.totalCountByRecipientId(
        recipientId,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async unreadCountByRecipient(recipientId) {
    try {
      return await this.notificationRepository.unreadCountByRecipientId(
        recipientId,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async read(notificationId) {
    try {
      const notification = await this.notificationRepository.findById(
        notificationId,
      );

      return notification;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async unread(notificationId) {
    try {
      const notification = await this.notificationRepository.findById(
        notificationId,
      );

      return notification;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async cancel(notificationId) {
    try {
      const notification = await this.notificationRepository.findById(
        notificationId,
      );

      return notification;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
