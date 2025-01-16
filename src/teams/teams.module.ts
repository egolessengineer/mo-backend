import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamsRespository } from './teams.respository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRespository, PrismaService],
})
export class TeamsModule {}
