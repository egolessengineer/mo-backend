import { Injectable, Logger } from '@nestjs/common';
import { TeamsRespository } from './teams.respository';
import { TeamAction, updateTeamDto } from './dto/teams.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRespository: TeamsRespository) {}
  private readonly logger = new Logger();

  async createTeam(user, body): Promise<any> {
    try {
      body.creator = user.sub;
      const members = body.members.map((member) => {
        return { userId: member };
      });
      delete body.members;

      return await this.teamsRespository.createTeam({
        data: {
          ...body,
          TeamMembers: {
            createMany: {
              data: members,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllTeams(user, sortBy): Promise<any> {
    try {
      return await this.teamsRespository.getAllTeams({
        where: {
          creator: user.sub,
        },
        include: {
          TeamMembers: {
            include: {
              User: {
                include: {
                  About: true,
                  Address: true,
                  Experiences: true,
                },
              },
            },
            orderBy: { createdAt: sortBy ?? Prisma.SortOrder.desc },
          },
        },
        orderBy: { createdAt: sortBy ?? Prisma.SortOrder.desc },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateTeam(user, body: updateTeamDto): Promise<any> {
    try {
      let query;
      if (body.action === TeamAction.ADD_MEMBER) {
        const data = body.usersId.map((user) => {
          return { userId: user };
        });

        query = {
          createMany: {
            data,
          },
        };
      } else if (body.action === TeamAction.REMOVE_MEMBER) {
        const deleteMany = body.usersId.map((user) => {
          return { userId: user };
        });

        query = {
          deleteMany,
        };
      } else {
        const updateMany = body.usersId.map((user) => {
          return {
            where: {
              userId: user,
            },
            data: {
              isBookmarked:
                body.action === TeamAction.BOOKMARKED ? true : false,
            },
          };
        });

        query = {
          updateMany,
        };
      }

      return await this.teamsRespository.updateTeam({
        where: {
          id: body.id,
        },
        data: {
          TeamMembers: query,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
