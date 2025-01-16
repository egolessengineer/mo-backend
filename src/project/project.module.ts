import { Module } from '@nestjs/common';
import { ProjectsController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { ProjectDraftService } from './project.draft.service';
import { AuthRepository } from 'src/auth/auth.repository';
import { ProjectsPurchaserService } from './project.service';
import { FundsRepository } from './funds.repository';
import { HederaService } from 'src/hedera/hedera.service';
import { NotificationService } from 'src/notification/notification.service';
import { MqttService } from 'src/mq/mq.service';
import { NotificationRepository } from 'src/notification/notification.repositiory';
import { MqttModule } from 'src/mq/mq.module';
import { AdminService } from 'src/admin/admin.service';
import { AdminRepository } from 'src/admin/admin.repository';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email-service/email-service.service';

@Module({
  imports: [MqttModule.register({ name: 'notificationProxy' })],
  controllers: [ProjectsController],
  providers: [
    PrismaService,
    ProjectsPurchaserService,
    ProjectRepository,
    StorageService,
    ProjectDraftService,
    AuthRepository,
    FundsRepository,
    HederaService,
    NotificationService,
    NotificationRepository,
    AdminRepository,
    MqttService,
    AuthService,
    JwtService,
    EmailService,
  ],
})
export class ProjectsModule {}
