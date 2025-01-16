import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repositiory';
import { PrismaService } from 'src/prisma/prisma.service';
import { MqttModule } from 'src/mq/mq.module';
import { MqttService } from 'src/mq/mq.service';
import { AuthRepository } from 'src/auth/auth.repository';

@Module({
  imports: [MqttModule.register({ name: 'notificationProxy' })],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    PrismaService,
    MqttService,
    AuthRepository,
  ],
})
export class NotificationModule {}
