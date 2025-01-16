import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from './config';
import { ProjectsModule } from './project/project.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptor';
import { HederaService } from './hedera/hedera.service';
import { StorageService } from './storage/storage.service';
import { DisputeModule } from './dispute/dispute.module';
import { ProjectRepository } from './project/project.repository';
import { NotificationModule } from './notification/notification.module';
import { MqttModule } from './mq/mq.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { AdminRepository } from './admin/admin.repository';
import { NotificationRepository } from './notification/notification.repositiory';
import { NotificationService } from './notification/notification.service';
import { MqttService } from './mq/mq.service';
import { AuthRepository } from './auth/auth.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: `.env.${process.env.NODE_ENV}`,
      // envFilePath: `.env`,
      // validate,
    }),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: await configService.get('JWT_SECRET'), // Replace with your actual secret key
        signOptions: { expiresIn: '24h' }, // Token expiration time
      }),
      inject: [ConfigService],
    }),
    MqttModule.register({ name: 'notificationProxy' }),
    ProjectsModule,
    NotificationModule,
    DisputeModule,
    TeamsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    HederaService,
    StorageService,
    ProjectRepository,
    AdminRepository,
    NotificationRepository,
    NotificationService,
    MqttService,
    AuthRepository,
  ],
})
export class AppModule {}
