import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DisputeRepository } from './dispute.repository';
import {
  DisputeStatus,
  Prisma,
  ProjectUsers,
  ResolutionType,
  Role,
  documentType,
} from '@prisma/client';
import { MESSAGES } from 'src/constants';
import { ProjectRepository } from 'src/project/project.repository';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import {
  GetDisputesDto,
  GetDisputeDto,
  createFAQS,
  PostDisputeDto,
} from './dto/dispute.dto';
import { DISPUTE_STATUS } from 'src/constants/enums';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class DisputeService {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly notificationService: NotificationService,
  ) {}
  private readonly logger = new Logger();

  async createDispute(user, body): Promise<any> {
    try {
      body.status = DisputeStatus.INREVIEW;
      if (body?.evidenceDocLink?.length) {
        const docIds = [];
        for await (const docObject of body?.evidenceDocLink) {
          const data = {
            type: documentType.DISPUTE_EVIDENCE,
            fileName: docObject.fileName,
            mimeType: docObject.mimeType,
            url: docObject.url,
          };
          const createdDoc = await this.projectRepository.createDocumentLinks({
            data,
          });
          docIds.push(createdDoc.id);
        }
        body.evidenceDocLink = docIds;
      }
      const updatedDispute: any = await this.disputeRepository.createDispute({
        data: {
          ...body,
        },
      });

      if (updatedDispute.evidenceDocLink?.length) {
        updatedDispute.evidenceDocLink = await this.getManyDocumentLinks(
          updatedDispute.evidenceDocLink,
        );
      }

      if (updatedDispute.resolutionDocLink?.length) {
        updatedDispute.resolutionDocLink = await this.getManyDocumentLinks(
          updatedDispute.resolutionDocLink,
        );
      }
      let project = null;
      let milestone = null;
      if (body.projectId) {
        project = await this.projectRepository.getProject({
          where: { id: body.projectId },
          include: { ProjectDetails: { select: { title: true } } },
        });
      } else if (body.milestoneId) {
        milestone = await this.projectRepository.getMilestone({
          where: { id: body.milestoneId },
          select: { title: true },
        });
      }

      const raisedBy = await this.projectRepository.getProjectMembers({
        where: { id: body.raisedBy },
      });

      const raisedTo = await this.projectRepository.getProjectMembers({
        where: { id: body.raisedTo },
      });

      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: raisedTo[0].userId,
        pattern: raisedBy[0].userId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `Dispute raised for ${
            project
              ? `project ${project.ProjectDetails.title}`
              : `milestone ${milestone?.title}`
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: raisedBy[0].userId,
        pattern: raisedBy[0].userId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `Dispute raised for ${
            project
              ? `project ${project.ProjectDetails.title}`
              : `milestone ${milestone?.title}`
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });
      return updatedDispute;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateDispute(user, body): Promise<any> {
    try {
      const dispute = await this.getDisputeMembers(body.id);

      if (!dispute) {
        throw new ConflictException(MESSAGES.ERROR.DISPUTE.END_STATE);
      }

      if (
        dispute &&
        (dispute.status === DisputeStatus.CLOSED ||
          dispute.status === DisputeStatus.RESOLVED)
      ) {
        throw new ConflictException(MESSAGES.ERROR.DISPUTE.END_STATE);
      }
      const projectMemebers = [];
      projectMemebers.push(dispute.RaisedBy.userId);
      projectMemebers.push(dispute.RaisedTo.userId);

      if (user.role !== Role.ADMIN && !projectMemebers.includes(user.sub)) {
        throw new NotFoundException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_MEMBER,
        );
      }

      if (body.resolutionType) {
        if (
          (dispute.resolutionType &&
            dispute.status !== DisputeStatus.LEGALWAY) ||
          user.role !== Role.ADMIN
        ) {
          throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
        }

        //adding resolution
        if (body.resolutionType === ResolutionType.FAQ) {
          body = {
            id: body.id,
            resolutionType: body.resolutionType,
            status: DisputeStatus.RESOLVED,
          };
        } else {
          if (
            body.inFavourOf !== dispute.RaisedBy.id &&
            body.inFavourOf !== dispute.RaisedTo.id
          ) {
            throw new NotFoundException(
              MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_MEMBER,
            );
          }

          if (body.resolutionDocLink?.length) {
            const docIds = [];
            for await (const docObject of body?.resolutionDocLink) {
              const data = {
                type: documentType.DISPUTE_RESOLUTION,
                fileName: docObject.fileName,
                mimeType: docObject.mimeType,
                url: docObject.url,
              };
              const createdDoc =
                await this.projectRepository.createDocumentLinks({
                  data,
                });
              docIds.push(createdDoc.id);
            }
            body.resolutionDocLink = docIds;
          }
          body = {
            id: body.id,
            resolutionType: body.resolutionType,
            inFavourOf: body.inFavourOf,
            resolutionDescription: body.resolutionDescription,
            resolutionDocLink: body.resolutionDocLink,
            resolutionComment: body.resolutionComment,
          };
          if (dispute.status === DisputeStatus.LEGALWAY) {
            body.isRaisedByAgree = null;
            body.isRaisedToAgree = null;
          }
          body.status = DisputeStatus.INREVIEW;
        }
        body.isMoAgree = true;
      } else if (body.isAgree) {
        if (!dispute.isMoAgree || user.role === Role.ADMIN) {
          throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
        }

        const isAgree = body.isAgree;
        body = {
          id: body.id,
        };
        body[
          dispute.RaisedBy.userId === user.sub
            ? 'isRaisedByAgree'
            : 'isRaisedToAgree'
        ] = isAgree === 'true' ? true : false;

        if (
          (body.isRaisedByAgree !== undefined &&
            dispute.isRaisedToAgree !== null) ||
          (dispute.isRaisedByAgree !== null &&
            body.isRaisedToAgree !== undefined)
        ) {
          body.status = DisputeStatus.RESOLVED;
        }

        if (
          (dispute.isRaisedByAgree !== null &&
            body.isRaisedByAgree !== undefined) ||
          (dispute.isRaisedToAgree !== null &&
            body.isRaisedToAgree !== undefined)
        ) {
          throw new ConflictException(MESSAGES.ERROR.DISPUTE.ANSWER_ALREADY);
        }
      } else if (body.closed) {
        if (user.sub !== dispute.RaisedBy.userId) {
          throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
        }

        body = {
          id: body.id,
          closedBy: user.sub,
          disputeComment: body.closedComment,
          status: DisputeStatus.CLOSED,
        };
      } else if (body.legalWay) {
        if (dispute.isMoAgree === null || user.role === Role.ADMIN) {
          throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
        }

        body = {
          id: body.id,
          isMoAgree: null,
          isRaisedByAgree: null,
          isRaisedToAgree: null,
          status: DisputeStatus.LEGALWAY,
        };
      }

      const updatedDispute: any = await this.disputeRepository.updateDispute({
        where: {
          id: body.id,
        },
        data: {
          ...body,
        },
      });

      if (updatedDispute.evidenceDocLink?.length) {
        updatedDispute.evidenceDocLink = await this.getManyDocumentLinks(
          updatedDispute.evidenceDocLink,
        );
      }

      if (updatedDispute.resolutionDocLink?.length) {
        updatedDispute.resolutionDocLink = await this.getManyDocumentLinks(
          updatedDispute.resolutionDocLink,
        );
      }
      let project = null;
      let milestone = null;
      if (updatedDispute.projectId) {
        project = await this.projectRepository.getProject({
          where: { id: updatedDispute.projectId },
          include: { ProjectDetails: { select: { title: true } } },
        });
      } else if (updatedDispute.milestoneId) {
        milestone = await this.projectRepository.getMilestone({
          where: { id: updatedDispute.milestoneId },
          select: { title: true },
        });
      }
      const raisedBy = await this.projectRepository.getProjectMembers({
        where: { id: updatedDispute.raisedBy },
      });

      const raisedTo = await this.projectRepository.getProjectMembers({
        where: { id: updatedDispute.raisedTo },
      });
      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: raisedTo[0].userId,
        pattern: raisedTo[0].userId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `Dispute for ${
            project
              ? `project ${project.ProjectDetails.title}`
              : `milestone ${milestone?.title}`
          } is ${
            updatedDispute.status == DisputeStatus.CLOSED
              ? `closed`
              : updatedDispute.status == DisputeStatus.RESOLVED
              ? `resolved`
              : updatedDispute.status == DisputeStatus.INREVIEW
              ? `in review`
              : ''
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });
      await this.notificationService.sendNotification({
        recipientId: raisedBy[0].userId,
        pattern: raisedBy[0].userId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `Dispute for ${
            project
              ? `project ${project.ProjectDetails.title}`
              : `milestone ${milestone?.title}`
          } is ${
            updatedDispute.status == DisputeStatus.CLOSED
              ? `closed`
              : updatedDispute.status == DisputeStatus.RESOLVED
              ? `resolved`
              : updatedDispute.status == DisputeStatus.INREVIEW
              ? `in review`
              : ''
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });
      if (user.role == Role.ADMIN) {
        await this.notificationService.sendNotification({
          recipientId: user.sub,
          pattern: user.sub,
          category: MESSAGES.SUCCESS.NOTIFICATION,
          content: {
            message: `Resolution provided for dispute regarding ${
              project
                ? `project ${project.ProjectDetails.title}`
                : `milestone ${milestone?.title}`
            }`,
            timestamp: Math.floor(new Date().getTime() / 1000),
            metadata: { method: 'GET', URL: '/project/:id' },
            senderProfileImage: 'icon.png',
          },
        });
      }

      return updatedDispute;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async getDisputeMembers(id): Promise<any> {
    try {
      return await this.disputeRepository.getDispute({
        where: {
          id,
        },
        include: {
          Milestones: {
            select: {
              Project: {
                select: {
                  ProjectMembers: true,
                },
              },
            },
          },
          Project: {
            select: {
              ProjectMembers: true,
            },
          },
          RaisedBy: true,
          RaisedTo: true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getProjectMembers(user, id): Promise<any> {
    try {
      const [projectMember] = await this.projectRepository.getProjectMembers({
        where: {
          projectId: id,
          userId: user.sub,
        },
        include: {
          User: {
            select: {
              name: true,
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!projectMember) {
        throw new NotFoundException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_MEMBER,
        );
      }

      const projectList = await this.projectRepository.getProjectMembers({
        where: {
          projectId: id,
          projectUsers:
            projectMember.projectUsers === ProjectUsers.CP
              ? undefined
              : ProjectUsers.CP,
          NOT: {
            id: projectMember.id,
          },
        },
        include: {
          User: {
            select: {
              name: true,
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
      projectList.push(projectMember);
      return projectList;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllDisputes(user: RequestUserDto, query: GetDisputesDto) {
    try {
      let { status }: { status: any } = query;
      const { sortBy = Prisma.SortOrder.desc } = query;
      let disputes;
      if (user.role == Role.ADMIN) {
        disputes = await this.disputeRepository.getAllDisputes({
          include: {
            Project: {
              select: {
                ProjectDetails: {
                  select: {
                    title: true,
                    duration: true,
                    totalProjectFund: true,
                    description: true,
                    durationType: true,
                  },
                },
              },
            },
            RaisedBy: {
              select: {
                projectUsers: true,
                User: {
                  select: { id: true, name: true },
                },
              },
            },
            RaisedTo: {
              select: {
                projectUsers: true,
                User: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: sortBy },
        });

        for (const [index, disputeObject] of disputes.entries()) {
          if (disputeObject.evidenceDocLink?.length) {
            disputes[index].evidenceDocLink = await this.getManyDocumentLinks(
              disputeObject.evidenceDocLink,
            );
          }
        }

        let filteredDisputes = disputes;
        if (query.status) {
          if (query.status === DisputeStatus.INREVIEW) {
            filteredDisputes = disputes.filter(
              (dispute) =>
                dispute.status === DisputeStatus.INREVIEW ||
                dispute.status === DisputeStatus.LEGALWAY,
            );
          } else {
            filteredDisputes = disputes.filter(
              (dispute) =>
                dispute.status === DisputeStatus.RESOLVED ||
                dispute.status === DisputeStatus.CLOSED,
            );
          }
        }

        // Count all disputes
        const totalCount = disputes.length;

        // Count pending disputes
        const pendingCount = disputes.filter(
          (dispute) =>
            dispute.status === DisputeStatus.INREVIEW ||
            dispute.status === DisputeStatus.LEGALWAY,
        ).length;

        // Count resolved disputes
        const resolvedCount = disputes.filter(
          (dispute) =>
            dispute.status === DisputeStatus.RESOLVED ||
            dispute.status === DisputeStatus.CLOSED,
        ).length;

        const disputeCounts = {
          totalCount,
          pendingCount,
          resolvedCount,
        };

        return {
          disputes: filteredDisputes,
          disputeCounts,
        };
      } else if (user.role == Role.PURCHASER || user.role == Role.PROVIDER) {
        const projectMembers = await this.projectRepository.getProjectMembers({
          where: {
            userId: user.sub,
          },
        });

        const memberIds = projectMembers.map(
          (projectMember) => projectMember.id,
        );
        if (status === DISPUTE_STATUS.INREVIEW) {
          status = [
            {
              status: DisputeStatus.LEGALWAY,
            },
            {
              status: DisputeStatus.INREVIEW,
            },
          ];
        } else if (status === DISPUTE_STATUS.RESOLVED) {
          status = [
            {
              status: DisputeStatus.RESOLVED,
            },
            {
              status: DisputeStatus.CLOSED,
            },
          ];
        }
        disputes = await this.disputeRepository.getAllDisputes({
          where: {
            OR: [
              {
                raisedBy: {
                  in: memberIds,
                },
                OR: status,
              },
              {
                raisedTo: {
                  in: memberIds,
                },
                OR: status,
              },
            ],
          },
          include: {
            Project: {
              select: {
                ProjectDetails: {
                  select: {
                    title: true,
                    duration: true,
                    totalProjectFund: true,
                    description: true,
                    durationType: true,
                  },
                },
              },
            },
            RaisedBy: {
              select: {
                projectUsers: true,
                User: {
                  select: { id: true, name: true },
                },
              },
            },
            RaisedTo: {
              select: {
                projectUsers: true,
                User: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: sortBy },
        });

        for (const [index, disputeObject] of disputes.entries()) {
          if (disputeObject.evidenceDocLink?.length) {
            disputes[index].evidenceDocLink = await this.getManyDocumentLinks(
              disputeObject.evidenceDocLink,
            );
          }
        }

        return disputes;
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getDispute(user: RequestUserDto, param: GetDisputeDto) {
    try {
      const { id } = param;

      let project;

      const projectMembers = {
        purchaser: null,
        collectiveProvider: null,
        individualProviders: [],
      };

      const dispute: any = await this.disputeRepository.getDispute({
        where: {
          id,
        },
        include: {
          RaisedBy: {
            select: {
              projectUsers: true,
              User: {
                select: { id: true, name: true },
              },
            },
          },
          RaisedTo: {
            select: {
              projectUsers: true,
              User: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (dispute.evidenceDocLink?.length) {
        dispute.evidenceDocLink = await this.getManyDocumentLinks(
          dispute.evidenceDocLink,
        );
      }

      if (dispute.resolutionDocLink?.length) {
        dispute.resolutionDocLink = await this.getManyDocumentLinks(
          dispute.resolutionDocLink,
        );
      }

      if (dispute.projectId) {
        project = await this.projectRepository.getProject({
          where: {
            id: dispute.projectId,
          },
          include: {
            ProjectDetails: {
              select: {
                title: true,
                duration: true,
                totalProjectFund: true,
                durationType: true,
              },
            },
            ProjectMembers: {
              include: {
                User: {
                  select: { name: true },
                },
              },
            },
          },
        });
        if (project) {
          dispute.projectName = project.ProjectDetails?.title;
          dispute.projectFund = project.ProjectDetails?.totalProjectFund;
          dispute.projectDuration = `${project.ProjectDetails?.duration} ${project.ProjectDetails?.durationType}`;
        }
      }

      if (user.role == Role.PURCHASER) {
        if (dispute.projectId) {
          for (const projectMember of project.ProjectMembers) {
            if (projectMember.projectUsers == ProjectUsers.PURCHASER) {
              projectMembers.purchaser = projectMember.User.name;
            } else if (projectMember.projectUsers == ProjectUsers.CP) {
              projectMembers.collectiveProvider = projectMember.User.name;
            } else if (
              projectMember.projectUsers == ProjectUsers.IP &&
              project.isIndividualProvidersVisible == true
            ) {
              projectMembers.individualProviders.push(projectMember.User.name);
            }
          }
        }
      } else if (user.role == Role.ADMIN) {
        if (dispute.projectId) {
          for (const projectMember of project.ProjectMembers) {
            if (projectMember.projectUsers == ProjectUsers.PURCHASER) {
              projectMembers.purchaser = projectMember.User.name;
            } else if (projectMember.projectUsers == ProjectUsers.CP) {
              projectMembers.collectiveProvider = projectMember.User.name;
            } else if (projectMember.projectUsers == ProjectUsers.IP) {
              projectMembers.individualProviders.push(projectMember.User.name);
            }
          }
        }
      } else if (user.role == Role.PROVIDER) {
        if (
          (dispute.RaisedBy.projectUsers == ProjectUsers.CP &&
            dispute.RaisedBy.User.id == user.sub) ||
          (dispute.RaisedTo.projectUsers == ProjectUsers.CP &&
            dispute.RaisedTo.User.id == user.sub)
        ) {
          if (dispute.projectId) {
            for (const projectMember of project.ProjectMembers) {
              if (projectMember.projectUsers == ProjectUsers.PURCHASER) {
                projectMembers.purchaser = projectMember.User.name;
              } else if (projectMember.projectUsers == ProjectUsers.CP) {
                projectMembers.collectiveProvider = projectMember.User.name;
              } else if (projectMember.projectUsers == ProjectUsers.IP) {
                projectMembers.individualProviders.push(
                  projectMember.User.name,
                );
              }
            }
          }
        } else if (
          (dispute.RaisedBy.projectUsers == ProjectUsers.IP &&
            dispute.RaisedBy.User.id == user.sub) ||
          (dispute.RaisedTo.projectUsers == ProjectUsers.IP &&
            dispute.RaisedTo.User.id == user.sub)
        ) {
          if (dispute.projectId) {
            for (const projectMember of project.ProjectMembers) {
              if (projectMember.projectUsers == ProjectUsers.CP) {
                projectMembers.collectiveProvider = projectMember.User.name;
              }
            }
          }
        }
      }

      return {
        ...dispute,
        ...projectMembers,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getFAQS() {
    try {
      return await this.disputeRepository.getFAQS({});
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addFAQS(body: createFAQS[]): Promise<any> {
    try {
      return await this.disputeRepository.createFAQS({ data: body });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async getManyDocumentLinks(uuidArray: string[]) {
    try {
      return await this.projectRepository.getManyDocumentLinks({
        where: {
          id: {
            in: uuidArray,
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
