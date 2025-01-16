import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Teams } from '@prisma/client';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeamsRespository {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger();

  async createTeam(params: {
    data: Prisma.TeamsUncheckedCreateInput;
  }): Promise<Teams> {
    try {
      const { data } = params;
      return await this.prisma.teams.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TEAM.CREATE_FAILED);
    }
  }

  async getAllTeams(params: {
    where?: Prisma.TeamsWhereInput;
    select?: Prisma.TeamsSelect;
    include?: Prisma.TeamsInclude;
    // orderBy?: Prisma.TeamsOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.TeamsOrderByWithRelationInput;
  }): Promise<Teams[]> {
    try {
      return await this.prisma.teams.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TEAM.FETCH_FAILED);
    }
  }

  async getTeamDetails(params: {
    where: Prisma.TeamsWhereUniqueInput;
    select?: Prisma.TeamsSelect;
    include?: Prisma.TeamsInclude;
  }): Promise<Teams> {
    try {
      return await this.prisma.teams.findUnique({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TEAM.FETCH_FAILED);
    }
  }

  async updateTeam(params: {
    where?: Prisma.TeamsWhereUniqueInput;
    data?: Prisma.TeamsUpdateInput;
  }): Promise<any> {
    try {
      const { where, data } = params;
      return await this.prisma.teams.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(error.code);
        if (error.code === 'P2025') {
          throw new Error(MESSAGES.ERROR.TEAM.ID_NOT_FOUND);
        }
        if (error.code === 'P2002') {
          throw new Error(MESSAGES.ERROR.TEAM.DUPLICATE_ENTRY);
        }
      }
      throw new Error(MESSAGES.ERROR.TEAM.UPDATE_FAILED);
    }
  }
}
