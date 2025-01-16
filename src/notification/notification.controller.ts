import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notification')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async sendNotification(@Req() req, @Body() body: SendNotificationDto) {
    try {
      const notification = await this.notificationService.sendNotification(
        body,
      );
      return notification;
    } catch (error) {
      throw error;
    }
  }

  @Get('from/:recipientId')
  async getAllByRecipient(@Param('recipientId') recipientId: string) {
    try {
      const notifications = await this.notificationService.getAllByRecipient(
        recipientId,
      );
      return notifications;
    } catch (error) {
      throw error;
    }
  }

  @Get('totalCount/from/:recipientId')
  async totalCountByRecipient(@Param('recipientId') recipientId: string) {
    try {
      return {
        totalCount: await this.notificationService.totalCountByRecipient(
          recipientId,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('unreadCount/from/:recipientId')
  async unreadCountByRecipient(@Param('recipientId') recipientId: string) {
    try {
      return {
        unreadCount: await this.notificationService.unreadCountByRecipient(
          recipientId,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/read')
  async read(@Param('id') id: string) {
    try {
      const notification = await this.notificationService.read(id);
      return notification;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/unread')
  async unread(@Param('id') id: string) {
    try {
      const notification = await this.notificationService.unread(id);
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // @Patch(':id/cancel')
  // async cancel(@Param('id') id: string) {
  //   const notification = await this.notificationService.cancel(id);
  //   return notification;
  // }
}
