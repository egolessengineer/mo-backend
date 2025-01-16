import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthRepository } from 'src/auth/auth.repository';
import { ProjectRepository } from 'src/project/project.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminRepository } from './admin.repository';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationRepository } from 'src/notification/notification.repositiory';
import { MqttService } from 'src/mq/mq.service';
import { MqttModule } from 'src/mq/mq.module';

@Module({
  imports: [MqttModule.register({ name: 'notificationProxy' })],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuthRepository,
    ProjectRepository,
    PrismaService,
    AdminRepository,
    NotificationService,
    NotificationRepository,
    MqttService,
  ],
})
export class AdminModule {}
