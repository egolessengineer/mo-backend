import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleStrategy } from 'src/auth/strategy/google.strategy';
import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';
import { EmailService } from 'src/email-service/email-service.service';
import { AuthRepository } from './auth.repository';
import { ProjectRepository } from 'src/project/project.repository';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationRepository } from 'src/notification/notification.repositiory';
import { MqttModule } from 'src/mq/mq.module';
import { MqttService } from 'src/mq/mq.service';

@Module({
  imports: [MqttModule.register({ name: 'notificationProxy' })],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtService,
    GoogleStrategy,
    JwtStrategy,
    EmailService,
    AuthRepository,
    ProjectRepository,
    NotificationService,
    NotificationRepository,
    MqttService,
  ],
})
export class AuthModule {}
