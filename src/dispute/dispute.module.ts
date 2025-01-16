import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { DisputeRepository } from './dispute.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectRepository } from 'src/project/project.repository';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationRepository } from 'src/notification/notification.repositiory';
import { MqttService } from 'src/mq/mq.service';
import { MqttModule } from 'src/mq/mq.module';
import { AuthRepository } from 'src/auth/auth.repository';

@Module({
  imports: [MqttModule.register({ name: 'notificationProxy' })],
  controllers: [DisputeController],
  providers: [
    DisputeService,
    DisputeRepository,
    PrismaService,
    ProjectRepository,
    NotificationService,
    NotificationRepository,
    MqttService,
    AuthRepository,
  ],
})
export class DisputeModule {}
