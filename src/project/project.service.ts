import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateNotesDto,
  DeleteProjectDto,
  DevliveralbesDto,
  GetAllProjectsDto,
  GetAllowedChatDto,
  GetCollabsDto,
  GetProviderDto,
  IdType,
  ProviderListAction,
  ProviderListActionDto,
  PurchaserInviteDto,
  RequestType,
  SearchProjectDto,
  SubMilestoneDto,
  ToogleIpViewDto,
  addIndividualProvider,
  createProjectDTO,
  getProjectDto,
  requestFundDto,
  updateMilestoneStatus,
  updatePermissionsDto,
  updateShortListProviderDto,
} from './dto/index';
import {
  FILTER_PROJECTS_BY,
  FUNCTION_NAMES,
  SAVE_TYPE,
  VALID_STATE_CHANGE_FUNCTION_NAME,
  contractMilestoneStatus,
} from 'src/constants/enums';
import { ProjectRepository } from './project.repository';
import {
  DraftType,
  Prisma,
  ProjectState,
  ProjectStatus,
  Projects,
  Role,
  ProjectUsers,
  MilestoneStatus,
  milestoneType,
  documentType,
  TransactionsType,
  ContractDeployStatus,
  EndPointType,
  AmountType,
  Error,
  AcceptedStatus,
} from '@prisma/client';
import { StorageService } from 'src/storage/storage.service';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import { MESSAGES } from 'src/constants';
import { ProjectDraftService } from './project.draft.service';
import { AuthRepository } from 'src/auth/auth.repository';
import { FundsRepository } from './funds.repository';
import { HederaService } from 'src/hedera/hedera.service';
import { NotificationService } from 'src/notification/notification.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class ProjectsPurchaserService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly storageService: StorageService,
    private readonly projectDraftService: ProjectDraftService,
    private readonly authRepository: AuthRepository,
    private readonly fundRepository: FundsRepository,
    private readonly hederaService: HederaService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
  ) {}
  private readonly logger = new Logger();

  async addProject(user: RequestUserDto, body: createProjectDTO): Promise<any> {
    try {
      // Creates a project if not already exists
      const projectData = await this.getOrCreateProject(user, body);

      // If the project id is invalid throws.
      if (!projectData) {
        throw new UnauthorizedException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.INVALID_PROJECT_ID,
        );
      }

      // Checking the right to edit the project
      body.projectId = projectData.id;
      if (user.sub !== projectData.currentEditor) {
        throw new UnauthorizedException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.WRONG_EDIT_ACCESS,
        );
      }

      // Saves the draft version of the project
      if (body.type === SAVE_TYPE.DRAFT) {
        await this.projectDraftService.saveDraft(body);
      } else if (body.type === SAVE_TYPE.COMPLETE) {
        // Save the persistent state of the project.
        await this.saveProject(body, projectData, user);
      }

      return { projectId: projectData.id };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async getOrCreateProject(user, body): Promise<Projects> {
    try {
      let projectData = undefined;
      const { assignedFundTo, fundTransferType } = body;

      // Creates project if not already created.
      if (!body.projectId) {
        if (!user.role || user.role !== Role.PURCHASER) {
          throw new ConflictException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_PURCHASER_PROJECT,
          );
        }
        // Creating the project in db.
        projectData = await this.projectRepository.createProject({
          data: {
            currentEditor: user.sub,
            assignedFundTo: assignedFundTo ? assignedFundTo : undefined,
            fundTransferType: fundTransferType ? fundTransferType : undefined,
            ProjectMembers: {
              create: [
                {
                  userId: user.sub,
                  projectUsers: ProjectUsers.PURCHASER,
                },
              ],
            },
            Permissions: {
              create: [{ userId: user.sub, SubMilestoneShowAll: false }],
            },
          },
        });
        body.projectId = projectData.id;
      } else {
        // If project already exists, return the project data from db.
        projectData = await this.projectRepository.getProject({
          where: { id: body.projectId },
        });

        // If projectId is invalid, throw an error
        if (!projectData) {
          throw new ConflictException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NO_PROJECT,
          );
        }

        // Restricts update project call for below project states.
        if (
          projectData.state === ProjectState.ADD_ESCROW ||
          projectData.state === ProjectState.CONTRACT_DEPLOYED ||
          projectData.state === ProjectState.COMPLETE
        ) {
          throw new ConflictException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.RESTRICT_ON_STATE,
          );
        }
      }
      return projectData;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async saveProject(body, projectData, user): Promise<any> {
    try {
      // Save the projects in main Table, while deleting the drafts
      if (projectData.state === ProjectState.INITILIZED) {
        delete body.milestones;

        // Assigning provider is necessary to save the project
        if (!body.provider) {
          throw new BadRequestException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NEED_PROVIDER,
          );
        }
      }
      //check if start date should be greater than end date
      const ids = await this.findCurrentEditor(projectData.id);
      body.currentEditor =
        projectData.currentEditor === ids.purchaserId
          ? ids.cpId
          : ids.purchaserId;

      const nextEditor =
        projectData.currentEditor === ids.purchaserId
          ? ids.purchaserId
          : ids.cpId;

      // To check wheather the CP is added or not.
      if (body.provider && ids.cpId) {
        throw new BadRequestException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.PROVIDER_ALREADY_EXIST,
        );
      }

      // Purchaser cannot assign an IP to the project.
      if (
        body?.individualProvider?.length > 0 &&
        body?.role !== Role.PROVIDER
      ) {
        throw new ForbiddenException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.IP_ADD,
        );
      }

      // Validates the milestone data.
      if (body.milestones && body.milestones.length) {
        this.validateMilestone(body.milestones);
      }
      //change it accoring to stage
      body.projectState = this.findProjectState(projectData.state);
      body.projectStatus = ProjectStatus.ASSIGNED;

      // Transaction to save changes in DB.
      await this.projectRepository.saveProjectTransaction(body, user);

      return projectData.id;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private validateMilestone(milestones) {
    // Validates the dates of the milestones.
    for (const milestone of milestones) {
      if (
        milestone.startDate &&
        milestone.startDate >= milestone.endDate &&
        milestone.endPointType !== EndPointType.DATE
      ) {
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MILSTONE.CONFLICT_TIME,
        );
      }

      if (milestone.endDate && milestone.endPointType === EndPointType.DATE) {
        const newEndDate = new Date(milestone.endDate * 1000);

        newEndDate.setUTCHours(23, 59, 59, 999);

        milestone.endDate = Math.floor(newEndDate.getTime() / 1000);
      }
    }
  }

  private async findCurrentEditor(projectId): Promise<any> {
    try {
      // Finds the current editor of the project.
      const projectData = await this.projectRepository.getProject({
        where: { id: projectId },
        include: {
          ProjectMembers: {
            where: {
              OR: [
                { projectUsers: ProjectUsers.CP },
                { projectUsers: ProjectUsers.PURCHASER },
              ],
            },
            select: {
              userId: true,
              projectUsers: true,
            },
          },
        },
      });
      const Ids = {};

      // Returns with the Ids of current CP and Purchaser
      if (
        projectData.ProjectMembers.length > 1 &&
        projectData.ProjectMembers[0].projectUsers === ProjectUsers.PURCHASER
      ) {
        Ids['purchaserId'] = projectData.ProjectMembers[0].userId;
        Ids['cpId'] = projectData.ProjectMembers[1].userId;
      } else {
        Ids['purchaserId'] = projectData.ProjectMembers[0].userId;
        Ids['cpId'] = undefined;
      }
      return Ids;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addToUsedUsers(user: RequestUserDto, body: PurchaserInviteDto) {
    try {
      let collaborator;
      try {
        collaborator = await this.projectRepository.updateCollaborator({
          where: { id: body.id },
          data: { accpetedStatus: body.status },
        });
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.EXPIRED);
      }

      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: collaborator.purchaserId,
        pattern: collaborator.purchaserId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `${user.username} has accepted the invite`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      return MESSAGES.SUCCESS.DEFAULT;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteProject(user: RequestUserDto, body: DeleteProjectDto) {
    try {
      // Get the project if its state is not CONTRACT_DEPLOYED or COMPLETED
      let project = await this.projectRepository.getProject({
        where: {
          id: body.projectId,
          NOT: [
            { OR: [{ state: 'CONTRACT_DEPLOYED' }, { state: 'COMPLETE' }] },
          ],
        },
      });

      if (!project) {
        throw new BadRequestException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.RESTRICT_ON_DELETE,
        );
      }

      // Cascade delete is enabled in schema by default for necessary tables.
      await this.projectRepository.deleteProject({
        where: { id: body.projectId },
      });
      return MESSAGES.SUCCESS.PROJECT.DELETE;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllProjects(user: RequestUserDto, query: GetAllProjectsDto) {
    try {
      // Step 1: Create Filter
      let filterBy = {};
      if (query.filterBy == FILTER_PROJECTS_BY.UNASSIGNED) {
        filterBy = { state: 'INITILIZED' };
      } else {
        filterBy = { NOT: { state: 'INITILIZED' } };
      }

      // Step 2: Get project with different select
      const response: any = await this.projectRepository.getProjectMembers({
        where: { userId: user.sub },
        orderBy: { createdAt: query.sortBy },
        include: {
          Project: {
            where: filterBy,
            select: {
              id: true,
              state: true,
              status: true,
              createdAt: true,
              hcsTopicId: true,
              ProjectDetails: {
                select: {
                  category: true,
                  title: true,
                  description: true,
                  totalProjectFund: true,
                  duration: true,
                  durationType: true,
                  scope: true,
                  currency: true,
                },
              },
              ProjectMembers: {
                include: { User: { select: { name: true, id: true } } },
              },
              Milestones: {
                where: { milestoneType: milestoneType.milestone },
                orderBy: {
                  sequenceNumber: Prisma.SortOrder.asc,
                },
              },
              DRAFTS: true,
              _count: {
                select: {
                  Milestones: {
                    where: {
                      milestoneType: milestoneType.milestone,
                      milestoneStatus: 'COMPLETED',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const output = [];
      let tasks = [];
      let projectStatusCount: any = {};
      for (const item of response) {
        //
        let upcomingMilestoneCal = null;
        if (item.Project) {
          upcomingMilestoneCal = this.getLatestMilestone(
            item.Project.status,
            item.Project.Milestones,
          );
        }
        let draft = false;
        let currentProject = item.Project;

        if (currentProject) {
          if (
            query.filterBy == FILTER_PROJECTS_BY.UNASSIGNED &&
            currentProject?.DRAFTS.length
          ) {
            draft = true;
            // Converts drafts table data > similar to persistent image of project
            currentProject = await this.flattenDrafts(
              item.Project,
              currentProject.ProjectMembers,
            );
          }

          // Upcomming milestones for the project
          currentProject['upcomingMilestone'] =
            upcomingMilestoneCal.nextMilestone;
          currentProject['burnRate'] = upcomingMilestoneCal.burnRate;
          // Makes the return object
          const {
            id,
            state,
            status,
            hcsTopicId,
            ProjectDetails,
            ProjectMembers,
            upcomingMilestone,
            _count,
            Milestones,
            burnRate,
          } = currentProject;

          projectStatusCount[status] = !isNaN(projectStatusCount[status])
            ? (projectStatusCount[status] += 1)
            : 1;

          if (upcomingMilestoneCal.nextMilestone?.startDate) {
            tasks.push({
              project: ProjectDetails?.title ?? null,
              next: upcomingMilestoneCal.nextMilestone.startDate,
            });
          }
          let role;
          let roleUser;
          if (draft) {
            roleUser = { User: { name: user.username } };
            role = 'Purchaser';
          } else if (ProjectMembers.length) {
            for (const member of ProjectMembers) {
              if (member.User.id == user.sub) {
                if (member.projectUsers == ProjectUsers.PURCHASER) {
                  role = 'Provider';
                  roleUser = ProjectMembers.find(
                    ({ projectUsers }) => projectUsers == ProjectUsers.CP,
                  );
                } else if (member.projectUsers == ProjectUsers.CP) {
                  role = 'Purchaser';
                  roleUser = ProjectMembers.find(
                    ({ projectUsers }) =>
                      projectUsers == ProjectUsers.PURCHASER,
                  );
                } else if (member.projectUsers == ProjectUsers.IP) {
                  role = 'Ip';
                  roleUser = ProjectMembers.find(
                    ({ projectUsers }) => projectUsers == ProjectUsers.CP,
                  );
                }
              }
            }
          }

          output.push({
            id,
            state,
            status,
            hcsTopicId,
            currency: ProjectDetails?.currency ?? null,
            title: ProjectDetails?.title ?? null,
            duration: `${ProjectDetails?.duration} ${ProjectDetails?.durationType}`,
            category: ProjectDetails?.category ?? null,
            description: ProjectDetails?.description ?? null,
            scope: ProjectDetails?.scope ?? null,
            role,
            roleUser: roleUser?.User?.name ?? null,
            funds: ProjectDetails?.totalProjectFund ?? null, // To updated when funds will be allocated to a milestone
            // milestones: `${_count?.Milestones}/${Milestones?.length}` ?? null,
            milestones: `${_count?.Milestones ?? 0}/${Milestones?.length ?? 0}`,
            upcomingMilestone,
            burnRate,
          });
        }
      }
      projectStatusCount = this.generateArrayFromObject(projectStatusCount);

      return { allProjects: output, projectStatusCount, tasks };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private findProjectState(currentState): ProjectState {
    if (currentState === ProjectState.INITILIZED) {
      //when purchaser send the project
      return ProjectState.NEW_PROJECT;
    } else if (currentState === ProjectState.NEW_PROJECT) {
      //when provider send the project
      return ProjectState.ADD_MILESTONES;
    } else if (currentState === ProjectState.ADD_MILESTONES) {
      //when both discussing
      return ProjectState.ADD_MILESTONES;
    }
  }

  private generateArrayFromObject(object) {
    return Object.entries(object).map(([name, value]) => ({
      name,
      value,
    }));
  }

  private getLatestMilestone(projectStatus, milestones) {
    // Returns the latest upcomming milesone
    let currentMilestone = null;
    let totalProjectTime = 0;
    let completedMilestoneTime = 0;
    let projectedMilestoneTime = 0;
    let nextMilestone = null;
    if (!milestones?.length) {
      return {
        nextMilestone,
        burnRate: {
          actualPercentage: '0',
          predictedPercentage: '0',
        },
      };
    }
    if (milestones.length == 1) {
      if (milestones[0].milestoneStatus == MilestoneStatus.INIT) {
        nextMilestone = milestones[0];
      }
      // Calculate the burnrate
      let thisMilestoneTime;
      if (
        projectStatus == ProjectStatus.IN_PROGRESS ||
        projectStatus == ProjectStatus.COMPLETE
      ) {
        thisMilestoneTime =
          new Date(milestones[0].endDate).getTime() -
          new Date(milestones[0].startDate).getTime();
        totalProjectTime += thisMilestoneTime;
      }

      if (milestones[0].milestoneStatus == MilestoneStatus.COMPLETED) {
        if (thisMilestoneTime) {
          projectedMilestoneTime += thisMilestoneTime;
          completedMilestoneTime +=
            new Date(
              milestones[0].actualEndDate ?? milestones[0].endDate,
            ).getTime() - new Date(milestones[0].startDate).getTime();
        }
      }
    } else {
      for (const milestone of milestones) {
        // Calculate the burnrate
        let thisMilestoneTime;
        if (
          projectStatus == ProjectStatus.IN_PROGRESS ||
          projectStatus == ProjectStatus.COMPLETE
        ) {
          thisMilestoneTime =
            new Date(milestone.endDate).getTime() -
            new Date(milestone.startDate).getTime();
          totalProjectTime += thisMilestoneTime;
        }

        if (milestone.milestoneStatus == MilestoneStatus.COMPLETED) {
          if (thisMilestoneTime) {
            projectedMilestoneTime += thisMilestoneTime;
            completedMilestoneTime +=
              new Date(milestone.actualEndDate ?? Date.now()).getTime() -
              new Date(milestone.startDate).getTime();
          }
        }
        if (
          milestone.milestoneStatus == MilestoneStatus.IN_PROGRESS &&
          !currentMilestone
        ) {
          currentMilestone = milestone;
        } else if (
          currentMilestone &&
          milestone.milestoneStatus == MilestoneStatus.IN_PROGRESS
        ) {
          nextMilestone = milestone;
          break;
        } else if (
          milestone.milestoneStatus === MilestoneStatus.INIT &&
          !nextMilestone
        ) {
          nextMilestone = milestone;
          continue;
        }
      }
    }

    let actualPercentage, predictedPercentage;
    if (
      projectStatus == ProjectStatus.IN_PROGRESS ||
      projectStatus == ProjectStatus.COMPLETE
    ) {
      // actualPercentage =
      //   (Math.abs(completedMilestoneTime) / totalProjectTime) * 100 ?? '0';
      actualPercentage =
        totalProjectTime > 0
          ? (Math.abs(completedMilestoneTime) / totalProjectTime) * 100
          : '0';

      // predictedPercentage =
      //   (Math.abs(projectedMilestoneTime) / totalProjectTime) * 100 ?? '0';
      predictedPercentage =
        totalProjectTime > 0
          ? (Math.abs(projectedMilestoneTime) / totalProjectTime) * 100
          : '0';
    }
    if (projectStatus == ProjectStatus.COMPLETE)
      return {
        burnRate: {
          actualPercentage: actualPercentage ?? '0',
          predictedPercentage: predictedPercentage ?? '0',
        },
      };

    if (!nextMilestone) nextMilestone = {};
    return {
      nextMilestone,
      burnRate: {
        actualPercentage: actualPercentage ?? '0',
        predictedPercentage: predictedPercentage ?? '0',
      },
    };
  }

  async getProject(user: RequestUserDto, projectId: string): Promise<any> {
    try {
      // Gets Permissions for the user for the project.
      const permissions = await this.projectRepository.getPermissions({
        where: { projectId, userId: user.sub },
      });

      // There should always be permissions for the user if the user has access to the project.
      if (!permissions) {
        throw new BadRequestException(MESSAGES.ERROR.BAD_REQUEST);
      }

      // Gets all the data for the project, but filters out the inaccessible items
      const project: any = await this.projectRepository.getProject({
        where: { id: projectId },
        include: {
          Permissions: {
            include: {
              User: {
                select: {
                  email: true,
                  name: true,
                  role: true,
                  walletAddress: true,
                  About: {
                    select: {
                      profilePictureLink: true,
                    },
                  },
                  ProjectMembers: {
                    where: {
                      projectId,
                    },
                    select: {
                      projectUsers: true,
                    },
                  },
                },
              },
            },
          },
          Documents: {
            select: {
              requirements: true, // Toogle
              documentLinks: true, // Toogle termsAndCnditions documents or all
              termsAndConditions: permissions.DocumentTermsAndConditions, //Toogle
              remark: true,
            },
          },
          ProjectDetails: permissions.EscrowProjectDetails
            ? {
                select: {
                  scope: true,
                  title: true,
                  category: true,
                  description: true,
                  currency: true,
                  deliverables: true,
                  duration: permissions.ProjectDetailsDuration, // Toogle
                  leftProjectFund: permissions.FundLeft,
                  royaltyType: true, // Toogle
                  deliverablesByCP: true,
                  durationType: permissions.ProjectDetailsDuration,
                  postKpiRoyalty: true,
                  totalProjectFund: permissions.ProjectTotalProjectFund, // Toogle
                  requirements: true,
                  fundTransfered: permissions.ProjectTotalProjectFund,
                },
              }
            : false,
          ProjectMembers: {
            // TODO: test and delete the where clause
            where: {
              OR: [
                { projectUsers: { in: [ProjectUsers.CP] } },
                { projectUsers: { in: [ProjectUsers.PURCHASER] } },
                { projectUsers: { in: [ProjectUsers.IP] } }, // Optimize it later
              ],
            },
            select: {
              userId: true,
              projectUsers: true,
              createdAt: true,
              User: {
                select: {
                  About: true,
                  Address: true,
                  email: true,
                  Experiences: true,
                  id: true,
                  name: true,
                  walletAddress: true,
                },
              },
            },
          },
          Milestones: {
            orderBy: { sequenceNumber: Prisma.SortOrder.asc },
            select: {
              id: true,
              title: true,
              description: true,
              requirements: true,
              endPoint: true,
              endPointType: true,
              startDate: true,
              endDate: true,
              fundAllocation: permissions.MilestoneFundAllocation,
              revisions: true,
              revisionsCounter: permissions.MilestoneRevisionsCounter,
              acceptanceCriteria: true,
              isPenaltyExcluded: true,
              milestoneStatus: true,
              fundTransfer: true,
              dateAssigned: true,
              AssignedTo: true,
              milestoneType: true,
              royaltyType: permissions.EscrowRoyalty,
              royaltyAmount: permissions.EscrowRoyalty,
              milestoneId: true,
              projectId: true,
              deliverablesLink: true,
              reworkDocs: true,
              reworkComment: true,
              createdAt: true,
              updatedAt: true,
              Funds: true,
              PenalityBreach: permissions.EscrowPenalty,
              lastTransactionDate: true,
              isDeployedOnContract: true,
              IsDeployedOnContract: {
                select: { status: true },
              },
              Milestones: {
                orderBy: { sequenceNumber: Prisma.SortOrder.asc },
                include: {
                  Funds: true,
                  PenalityBreach: permissions.EscrowPenalty,
                  User: {
                    select: {
                      id: true,
                      email: true,
                      Experiences: true,
                      Address: true,
                      name: true,
                      About: true,
                    },
                  },
                },
              },
              User: {
                select: {
                  id: true,
                  email: true,
                  Experiences: true,
                  Address: true,
                  name: true,
                  About: true,
                },
              },
            }, // Show all or show just one milestone, Fund allocation, revision count toogle
          },
          Escrow: true,
          DRAFTS: { where: { deleted: { not: null } } },
        },
      });
      const userPermissionIndex = project.Permissions.findIndex(
        (p) => p.userId === user.sub,
      );
      const userPermission = [project.Permissions[userPermissionIndex]];
      project.Permissions.splice(userPermissionIndex, 1);
      const ipPermissions = project.Permissions.filter(
        (permission) =>
          permission.User.ProjectMembers[0].projectUsers === ProjectUsers.IP,
      );
      project.Permissions = userPermission;
      project['ipPermissions'] = ipPermissions;
      const projectRole = project.ProjectMembers.find(
        (member) => member.userId === user.sub,
      ).projectUsers;
      if (project) {
        if (project.currentEditor == user.sub && project.DRAFTS.length) {
          const responseDraft = await this.flattenDrafts(
            project,
            project.ProjectMembers,
          );
          responseDraft.projectType = SAVE_TYPE.DRAFT;
          responseDraft.projectRole = projectRole ?? null;
          delete responseDraft.DRAFTS;
          // delete responseDraft.Permissions;
          return responseDraft;
        }
        if (project.Documents?.documentLinks.length) {
          const DocumentLinks =
            await this.projectRepository.getManyDocumentLinks({
              where: {
                id: {
                  in: project.Documents.documentLinks,
                },
                type: project?.Permissions[0].DocumentTermsAndConditions
                  ? undefined
                  : documentType.RESEARCH,
              },
            });
          project.Documents.documentLinks = DocumentLinks;
        }

        for (const milestone of project.Milestones) {
          if (milestone.deliverablesLink?.length) {
            const uploadDeliverables =
              await this.projectRepository.getManyDocumentLinks({
                where: {
                  id: {
                    in: milestone.deliverablesLink,
                  },
                },
              });
            milestone['uploadDeliverables'] = uploadDeliverables;
            delete milestone.deliverablesLink;
          }

          if (milestone.reworkDocs?.length) {
            const reworkDocsObject =
              await this.projectRepository.getManyDocumentLinks({
                where: {
                  id: {
                    in: milestone.reworkDocs,
                  },
                },
              });
            milestone.reworkDocs = reworkDocsObject;
          }

          if (milestone.Milestones.length) {
            for (const submilestone of milestone.Milestones) {
              if (submilestone.deliverablesLink?.length) {
                const uploadDeliverables =
                  await this.projectRepository.getManyDocumentLinks({
                    where: {
                      id: {
                        in: submilestone.deliverablesLink,
                      },
                    },
                  });
                submilestone['uploadDeliverables'] = uploadDeliverables;
                delete submilestone.deliverablesLink;
              }

              if (submilestone.reworkDocs?.length) {
                const reworkDocsObject =
                  await this.projectRepository.getManyDocumentLinks({
                    where: {
                      id: {
                        in: submilestone.reworkDocs,
                      },
                    },
                  });
                submilestone.reworkDocs = reworkDocsObject;
              }
            }
          }
        }

        // Filter the Values according the user settings
        const filteredProjectMetadata = await this.filterProjectMetadata(
          project,
          user,
        );

        delete filteredProjectMetadata.DRAFTS;
        filteredProjectMetadata.type = SAVE_TYPE.COMPLETE;
        filteredProjectMetadata.projectRole = projectRole ?? null;
        return filteredProjectMetadata;
      } else {
        throw new NotFoundException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.INVALID_PROJECT_ID,
        );
      }

      // get project from main project table
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async filterProjectMetadata(project, user: RequestUserDto) {
    try {
      const {
        Members,
        MilestonesShowAll,
        SubMilestoneShowAll,
        FundsTab,
        EscrowpartiesInvolved,
      } = project.Permissions[0];
      const Funds: any = { walletToEscorw: {}, escorwToCp: {}, milestones: [] };
      const members: any = { IP: [], CP: {}, PURCHASER: {} };
      // Filter Project members
      if (project.ProjectMembers.length) {
        project.ProjectMembers.forEach((item) => {
          if (
            // Donot show the purchaser his own data:
            item.projectUsers == ProjectUsers.PURCHASER &&
            user.role == Role.PURCHASER
          ) {
            members.PURCHASER = item;
          } else if (
            item.projectUsers == ProjectUsers.IP &&
            user.role == Role.PURCHASER &&
            !project.isIndividualProvidersVisible
          ) {
            // Donot show the purchaser IP details on toogle: // Do now: test
          } else if (
            !Members &&
            user.role == Role.PROVIDER &&
            item.projectUsers == ProjectUsers.IP &&
            item.userId != user.sub
          ) {
            // Donot show the IP details of others:
          } else {
            if (item.projectUsers == ProjectUsers.IP) {
              members.IP.push(item);
            } else if (item.projectUsers == ProjectUsers.CP) {
              members.CP = item;
            } else {
              members.PURCHASER = item;
            }
          }
        });
      }
      if (!EscrowpartiesInvolved) {
        members.PURCHASER = undefined;
      }
      project.ProjectMembers = members;

      // Calculate Funds Tab details
      if (user.role == Role.PURCHASER) {
        // Wallet to escrow calculations
        Funds.walletToEscorw = {
          fundAssignedTo: project.assignedFundTo,
          fundTransferType: project.fundTransferType,
          projectFundAllocated: project.ProjectDetails?.totalProjectFund,
          totalFundTransfered:
            parseInt(project.ProjectDetails?.totalProjectFund) -
            parseInt(project.ProjectDetails?.leftProjectFund),
          lastTransactionDate: project?.lastTransactionDate ?? 'NA', // Calculate the last  transactionDate from transaction table record
          fundRemaining: project.ProjectDetails?.leftProjectFund,
          fundTransfered: project.ProjectDetails?.fundTransfered ?? false,
          freeBalanceReleased: project.freeBalanceReleased ?? false, // Button enable disabled
          enableRemainingFundRelease: project.enableFreeFundRelease ?? false, // Button hide show
        };
      }

      // Escorw to wallet calculation
      Funds.escorwToCp = {
        fundAssignedTo: project.assignedFundTo,
        fundTransferType: project.fundTransferType,
        projectFundAllocated: project.ProjectDetails?.totalProjectFund,
        totalFundTransfered:
          parseInt(project.ProjectDetails?.totalProjectFund) -
          parseInt(project.ProjectDetails?.leftProjectFund),
        lastTransactionDate: project?.lastTransactionDate ?? 'NA', // Calculate the last  transactionDate from transaction table record
        fundRemaining: project.ProjectDetails?.leftProjectFund,
        payoutStatus: true,
        enablePayout: true,
      };

      const createFunds = async (milestone) => {
        let burnRate;
        if (!milestone.milestoneId) {
          if (milestone.Milestones.length) {
            let totalProjectTime = 0;
            let completedMilestoneTime = 0;
            let projectedMilestoneTime = 0;
            for (const data of milestone.Milestones) {
              let thisMilestoneTime =
                new Date(data.endDate).getTime() -
                new Date(data.startDate).getTime();
              totalProjectTime += thisMilestoneTime;
              projectedMilestoneTime += thisMilestoneTime;
              completedMilestoneTime +=
                new Date(data.actualEndDate ?? Date.now()).getTime() -
                new Date(data.startDate).getTime();
            }
            // let actualPercentage =
            //   (Math.abs(completedMilestoneTime) / totalProjectTime) * 100 ??
            //   '0';
            let actualPercentage =
              totalProjectTime > 0
                ? (Math.abs(completedMilestoneTime) / totalProjectTime) * 100
                : '0';

            // let predictedPercentage =
            //   (Math.abs(projectedMilestoneTime) / totalProjectTime) * 100 ??
            //   '0';
            let predictedPercentage =
              totalProjectTime > 0
                ? (Math.abs(projectedMilestoneTime) / totalProjectTime) * 100
                : '0';

            burnRate = {
              actualPercentage: actualPercentage ?? '0',
              predictedPercentage: predictedPercentage ?? '0',
            };
            milestone['burnRate'] = burnRate;
          } else {
            if (
              milestone.MilestoneStatus != MilestoneStatus.INIT &&
              milestone.MilestoneStatus != MilestoneStatus.COMPLETED &&
              milestone.MilestoneStatus != MilestoneStatus.HOLD &&
              milestone.MilestoneStatus != MilestoneStatus.FORCE_CLOSED &&
              milestone.MilestoneStatus != MilestoneStatus.STOP
            ) {
              let completedMilestoneTime =
                (new Date(milestone.actualEndDate ?? Date.now()).getTime() -
                  new Date(milestone.startDate).getTime()) /
                1000;

              let projectedMilestoneTime =
                (new Date(milestone.endDate).getTime() -
                  new Date(milestone.startDate).getTime()) /
                1000;
              milestone['burnRate'] = {
                actualPercentage:
                  Math.abs(
                    ((completedMilestoneTime - projectedMilestoneTime) /
                      projectedMilestoneTime) *
                      100,
                  ) ?? '0',
                predictedPercentage:
                  Math.abs(
                    ((completedMilestoneTime - projectedMilestoneTime) /
                      projectedMilestoneTime) *
                      100,
                  ) ?? '0',
              };
            } else if (milestone.MilestoneStatus == MilestoneStatus.INIT) {
              milestone['burnRate'] = {
                actualPercentage: '0',
                predictedPercentage: '0',
              };
            } else if (milestone.MilestoneStatus == MilestoneStatus.COMPLETED) {
              milestone['burnRate'] = {
                actualPercentage: '100',
                predictedPercentage: '100',
              };
            }
          }
        }

        if (Funds.walletToEscorw.fundTransfered) {
          if (!milestone.Funds?.fundTranscationIdToEscrow) {
            Funds.walletToEscorw.fundTransfered = false;
          }
        }

        if (Funds.escorwToCp.enablePayout) {
          if (
            milestone.milestoneStatus != MilestoneStatus.COMPLETED &&
            milestone.milestoneStatus != MilestoneStatus.STOP
          ) {
            Funds.escorwToCp.enablePayout = false;
          }
        }

        if (Funds.escorwToCp.payoutStatus) {
          if (!milestone.Funds?.fundTransferred) {
            Funds.escorwToCp.payoutStatus = false;
          }
        }

        let penaltyAmount = 0;
        if (milestone.isPenaltyExcluded) {
          milestone.PenalityBreach.forEach((penalty) => {
            penaltyAmount += penalty.penality;
          });
        }

        let receipt;

        if (!milestone.AssignedTo) {
          receipt = members.CP.User;
        } else {
          receipt = milestone.User;
        }

        delete milestone.User;

        const output = {
          // TODO: Last transaction date,
          transactionDate: milestone.lastTransactionDate ?? 'NA',
          receipt,
          title: milestone.title,
          fundAllocation: milestone.fundAllocation,
          penalty: penaltyAmount ? penaltyAmount : undefined,
          valueIn: milestone.PenalityBreach?.length
            ? milestone.PenalityBreach[0].valueIn
            : undefined,
          royaltyType: milestone.royaltyType,
          royaltyValue: milestone.royaltyAmount ?? undefined,
          releaseEscrowFund: milestone.Funds?.enableFundTransfer ?? false,
          releaseRoyalty: milestone.Funds?.enableRoyalityTrasnfer ?? false,
          fundTransfered: milestone.Funds?.fundTransferred
            ? parseInt(milestone.fundAllocation)
            : 0, // TODO: Calculate transafere funds from fundAllocation + Royalty - Penalty
          milestoneId: milestone.id,
          milestoneFundsStatus: milestone.Funds ?? null,
        };
        Funds.milestones.push(output);
        return output;
      };

      const milestoneFilters = [];
      for (const milestone of project.Milestones) {
        // Filter Milestones (Show All or own)
        if (!MilestonesShowAll && SubMilestoneShowAll) {
          // This is Ip with show all sub milestones
          if (milestone?.AssignedTo) {
            await createFunds(milestone);
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else if (MilestonesShowAll && !SubMilestoneShowAll) {
          // This is purchaser
          if (milestone?.milestoneType == milestoneType.submilestone) {
          } else {
            await createFunds(milestone);
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else if (!MilestonesShowAll && !SubMilestoneShowAll) {
          if (milestone?.AssignedTo == user.sub) {
            // This is Ip with show only own sub milestones
            await createFunds(milestone);
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else {
          // This is CP
          if (milestone?.AssignedTo == null) {
            await createFunds(milestone);
            milestoneFilters.push(milestone);
          }
        }
      }

      if (Funds.escorwToCp.payoutStatus) {
        if (user.role == Role.PURCHASER) {
          Funds.walletToEscorw.freeBalanceReleased = true;
        }
      }

      if (Funds.escorwToCp.enablePayout) {
        if (user.role == Role.PURCHASER) {
          Funds.walletToEscorw.fundTransfered = true;
        }
      }
      project['Milestones'] = milestoneFilters;
      project['Funds'] = FundsTab ? Funds : undefined;
      return project;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async flattenDrafts(project, savedMembers = undefined) {
    try {
      const responseDraft = project;
      const members = { IP: [], CP: {}, PURCHASER: {} };

      for (const draft of project.DRAFTS) {
        switch (draft.draftType) {
          case DraftType.PROJECT_DETAILS:
            responseDraft.ProjectDetails = draft.value;
            break;
          case DraftType.DOCUMENT:
            responseDraft.Documents = draft.value;
            break;
          case DraftType.MILESTONES:
            responseDraft.Milestones = draft.value;
            break;
          case DraftType.ADD_PROVIDER:
            members.CP = await this.authRepository.getUser({
              where: { id: draft.value },
              select: {
                About: true,
                Address: true,
                email: true,
                Experiences: true,
                id: true,
                name: true,
              },
            });
            responseDraft.ProjectMembers = members;
            break;
          case DraftType.ADD_IP:
            members.IP = await this.authRepository.getUsers({
              where: {
                id: {
                  in: draft.value,
                },
              },
              select: {
                About: true,
                Address: true,
                email: true,
                Experiences: true,
                id: true,
                name: true,
              },
            });
            responseDraft.ProjectMembers = members;
            break;
          default:
            throw new NotFoundException(
              MESSAGES.ERROR.PROJECT.MASTER_PROJECT.INVALID_PROJECT_ID,
            );
          // break;
        }

        if (DraftType.ADD_IP && savedMembers) {
          const PurchaserDetails = savedMembers.find(
            (member) => member.projectUsers === ProjectUsers.PURCHASER,
          );
          members.PURCHASER = PurchaserDetails;
        }
      }

      return responseDraft;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async uploadFile(user: RequestUserDto, file: Express.Multer.File) {
    try {
      return await this.storageService.uploadFileToS3(
        file,
        `${user.sub}/doc/${file.originalname.replace(/\s/g, '')}`,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFile(user: RequestUserDto, url: string) {
    try {
      const key = url.split('/').slice(3).join('/');
      return await this.storageService.deleteFileFromS3(key);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getCollabs(user: RequestUserDto, query: GetCollabsDto) {
    try {
      const { sortBy, pageNo, pageSize } = query;
      const parsedPageNo = parseInt(pageNo);
      const parsedPageSize = parseInt(pageSize);

      const take = parsedPageSize > 0 ? parsedPageSize : 10;
      const skip =
        ((!parsedPageNo || parsedPageNo < 0 ? 1 : parsedPageNo) - 1) * take;

      const response = await this.projectRepository.getCollaborators({
        where: { collaboratorEmail: user.email },
        include: {
          Purchaser: {
            select: {
              id: true,
              name: true,
              About: { select: { profilePictureLink: true } },
              Address: true,
              Experiences: true,
            },
          },
        },
        orderBy: { createdAt: sortBy },
        skip,
        take,
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getProviders(user: RequestUserDto, query: GetProviderDto) {
    try {
      const { search, sortBy, pageNo, pageSize, filterBy } = query;
      const parsedPageNo = parseInt(pageNo);
      const parsedPageSize = parseInt(pageSize);

      const take = parsedPageSize > 0 ? parsedPageSize : 10;
      const skip =
        ((!parsedPageNo || parsedPageNo < 0 ? 1 : parsedPageNo) - 1) * take;

      // eslint-disable-next-line prefer-const

      const response = await this.authRepository.getUsers({
        where: {
          role: Role.PROVIDER,
          walletAddress: { not: null },
          Collaborators: {
            some: {
              purchaserId: user.sub,
              accpetedStatus: AcceptedStatus.ACCEPTED,
            },
          },
          id: {
            not: {
              equals: user.sub,
            },
          },
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
            {
              Experiences: {
                some: { position: { contains: search, mode: 'insensitive' } },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          Experiences: { select: { position: true } },
          About: { select: { profilePictureLink: true } },
          ProviderListMember: {
            where: {
              creatorId: user.sub,
              deleted: false,
            },
            select: {
              id: true,
              note: true,
            },
          },
        },
        orderBy: { name: sortBy },
        skip,
        take,
      });

      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async searchProjects(user: RequestUserDto, query: SearchProjectDto) {
    try {
      // Pagination logic here
      const { search, sortBy, pageNo, pageSize, filterBy } = query;
      const parsedPageNo = parseInt(pageNo);
      const parsedPageSize = parseInt(pageSize);

      const take = parsedPageSize > 0 ? parsedPageSize : 10;
      const skip =
        ((!parsedPageNo || parsedPageNo < 0 ? 1 : parsedPageNo) - 1) * take;

      const response = await this.projectRepository.getProjectMembers({
        where: {
          userId: user.sub,
          Project: {
            ProjectDetails: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
        select: {
          Project: {
            select: {
              id: true,
              ProjectDetails: {
                select: {
                  title: true,
                  description: true,
                  category: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { Project: { ProjectDetails: { title: sortBy } } },
        skip,
        take,
      });

      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async toogleIpInfo(user: RequestUserDto, body: ToogleIpViewDto) {
    try {
      const { ipViewState, projectId } = body;
      await this.projectRepository.updateProject({
        where: { id: projectId },
        data: { isIndividualProvidersVisible: ipViewState },
      });
      return body;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async acceptProject(user: RequestUserDto, projectId: string): Promise<any> {
    try {
      const project: any = await this.projectRepository.updateProject({
        where: {
          id: projectId,
          currentEditor: user.sub,
          state: ProjectState.ADD_MILESTONES,
        },
        data: { state: ProjectState.ADD_ESCROW },
      });

      if (!project) {
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NO_PROJECT,
        );
      }
      if (project) {
        //adding fund if project is at ESCROW
        const allMilestones = await this.projectRepository.getAllMilestones({
          where: {
            projectId,
            milestoneId: {
              equals: null,
            },
          },
          select: {
            id: true,
          },
        });
        const fundPayload: any = [];
        for (const milestone of allMilestones) {
          fundPayload.push({
            fundType: milestoneType.milestone,
            fundTypeId: milestone.id,
          });
        }
        await this.fundRepository.createManyFunds({
          data: fundPayload,
        });

        await this.projectRepository.addEscrow({
          data: {
            projectId,
          },
        });

        // Delete drafts
        await this.projectDraftService.deleteDraft(projectId);
      }
      const purchaser: any = await this.projectRepository.getProjectMembers({
        where: { projectId, projectUsers: ProjectUsers.PURCHASER },
        select: {
          Project: { select: { ProjectDetails: { select: { title: true } } } },
          User: { select: { id: true } },
        },
      });
      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: user.sub,
        pattern: user.sub,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `${purchaser[0].Project.ProjectDetails.title} accepted`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: purchaser[0].User.id,
        pattern: purchaser[0].User.id,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `${purchaser[0].Project.ProjectDetails.title} ${MESSAGES.SUCCESS.NOTIFICATIONS.ACCEPTED} ${user.username}`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      return project;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addSubMilestone(
    user: RequestUserDto,
    body: SubMilestoneDto,
  ): Promise<any> {
    try {
      const fundPayload: any = [];
      let subMilestonesData: any = [];
      const projectMembers: any =
        await this.projectRepository.getProjectMembers({
          where: {
            projectId: body.projectId,
          },
          select: {
            userId: true,
            User: { select: { walletAddress: true } },
            Project: {
              select: {
                ProjectDetails: {
                  select: {
                    currency: true,
                  },
                },
              },
            },
          },
        });

      const membersUserIds = projectMembers.map((member) => member.userId);
      // return membersUserIds;
      if (body.subMilestones && body.subMilestones.length) {
        this.validateMilestone(body.subMilestones);
      }

      for (let index = 0; index < body.subMilestones.length; index++) {
        let subMilestone = body.subMilestones[index];
        const milestone: any = await this.projectRepository.getMilestone({
          where: {
            id: subMilestone.milestoneId,
            projectId: body.projectId,
            milestoneStatus: MilestoneStatus.INIT,
          },
          include: {
            Project: { select: { state: true } },
            Milestones: {
              orderBy: { sequenceNumber: Prisma.SortOrder.asc },
              where: { IsDeployedOnContract: null },
              include: {
                User: { select: { walletAddress: true } },
                PenalityBreach: true,
              },
            },
          },
        });

        const milestoneCount = await this.projectRepository.getMilestoneCount({
          where: {
            milestoneId: subMilestone.milestoneId,
          },
        });

        if (!milestone) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.ACTION_NOT_ALLOWED,
          );
        }

        if (milestone.Project.state != ProjectState.CONTRACT_DEPLOYED) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.ACTION_NOT_ALLOWED,
          );
        }

        if (!membersUserIds.includes(subMilestone.AssignedTo)) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_MEMBER,
          );
        }

        if (subMilestone.milestoneType !== milestoneType.submilestone) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.CONFLICT_TYPE,
          );
        }

        const subMilestoneCreated =
          await this.projectRepository.addSubMilestone({
            data: {
              ...subMilestone,
              projectId: body.projectId,
              sequenceNumber: milestoneCount + 1,
            },
            projectDetails: projectMembers[0].Project.ProjectDetails,
          });
        if (!subMilestone.id) {
          fundPayload.push({
            fundType: milestoneType.submilestone,
            fundTypeId: subMilestoneCreated.id,
          });
        }

        if (index == body.subMilestones.length - 1) {
          const user = await this.authRepository.getUser({
            where: { id: subMilestoneCreated.AssignedTo },
            select: { walletAddress: true },
          });
          subMilestoneCreated['User'] = user;
          milestone.Milestones.push(subMilestoneCreated);
          subMilestonesData = milestone.Milestones;
        }

        // Send notification to the other party
        await this.notificationService.sendNotification({
          recipientId: user.sub,
          pattern: user.sub,
          category: MESSAGES.SUCCESS.NOTIFICATION,
          content: {
            message: `${MESSAGES.SUCCESS.SUB_MILESTONE.ADD}`,
            timestamp: Math.floor(new Date().getTime() / 1000),
            metadata: { method: 'GET', URL: '/project/:id' },
            senderProfileImage: 'icon.png',
          },
        });
      }

      if (!body.subMilestones.length && body.milestoneId) {
        const milestone: any = await this.projectRepository.getMilestone({
          where: {
            id: body.milestoneId,
            projectId: body.projectId,
            milestoneStatus: MilestoneStatus.INIT,
          },
          include: {
            Project: { select: { state: true } },
            Milestones: {
              where: { IsDeployedOnContract: null },
              include: {
                User: { select: { walletAddress: true } },
                PenalityBreach: true,
              },
            },
          },
        });
        subMilestonesData = milestone.Milestones;
      }
      await this.fundRepository.createManyFunds({
        data: fundPayload,
      });
      return subMilestonesData;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateMilestoneStatus(
    user: RequestUserDto,
    body: updateMilestoneStatus | any,
  ) {
    try {
      if (!user.role) {
        throw new ConflictException(MESSAGES.ERROR.NO_ROLE);
      }

      const [findMember]: any = await this.projectRepository.getProjectMembers({
        where: {
          projectId: body.projectId,
          userId: user.sub,
        },
        select: {
          projectUsers: true,
          userId: true,
          Project: {
            select: {
              state: true,
            },
          },
        },
      });

      const enableStatusUpdate = [
        ProjectState.COMPLETE,
        ProjectState.CONTRACT_DEPLOYED,
      ];
      if (!findMember) {
        throw new UnauthorizedException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NON_MEMBER,
        );
      }

      if (!enableStatusUpdate.includes(findMember.Project.state)) {
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MILSTONE.PROJECT_NOT_STARTED,
        );
      }

      const subMilestone: any = await this.projectRepository.getMilestone({
        where: { id: body.milestoneId },
        select: {
          title: true,
          milestoneStatus: true,
          revisionsCounter: true,
          revisions: true,
          milestoneId: true,
          reworkDocs: true,
          reworkComment: true,
          Project: { select: { ProjectMembers: true } },
        },
      });

      if (
        subMilestone.milestoneStatus === MilestoneStatus.FORCE_CLOSED ||
        subMilestone.milestoneStatus === MilestoneStatus.COMPLETED
      )
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MILSTONE.END_STATUS_RESTRICT,
        );

      // Confirm and change if necessary the logic.
      if (subMilestone.milestoneId) {
        const providerStatus = ['IN_PROGRESS', 'IN_REVIEW'];
        const cpStatus = [
          'INIT',
          'IN_PROGRESS',
          'COMPLETED',
          'STOP',
          'REWORK',
          'FORCE_CLOSED',
        ];
        if (
          (findMember.projectUsers === ProjectUsers.IP &&
            !providerStatus.includes(body.milestoneStatus)) ||
          (findMember.projectUsers === ProjectUsers.CP &&
            !cpStatus.includes(body.milestoneStatus))
        ) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MILSTONE.STATUS_PERMISSIONS_FAILED,
          );
        }
      } else {
        const cpStatus = ['IN_PROGRESS', 'IN_REVIEW'];
        const purchaserStatus = [
          'INIT',
          'COMPLETED',
          'REWORK',
          'STOP',
          'FORCE_CLOSED',
        ];
        if (
          (findMember.projectUsers === ProjectUsers.CP &&
            !cpStatus.includes(body.milestoneStatus)) ||
          (findMember.projectUsers === ProjectUsers.PURCHASER &&
            !purchaserStatus.includes(body.milestoneStatus))
        ) {
          throw new ForbiddenException(
            MESSAGES.ERROR.PROJECT.MILSTONE.STATUS_PERMISSIONS_FAILED,
          );
        }
      }
      // Validations for next state change
      const authorizeStateChange = this.validateStateChange(
        body.milestoneStatus,
        subMilestone.milestoneStatus,
        VALID_STATE_CHANGE_FUNCTION_NAME.CHECK,
      );
      if (!authorizeStateChange) {
        throw new ForbiddenException(
          MESSAGES.ERROR.PROJECT.MILSTONE.STATUS_PERMISSIONS_FAILED,
        );
      }

      const data: Prisma.MilestonesUncheckedUpdateInput = {
        milestoneStatus: body.milestoneStatus,
        actualEndDate: new Date().toISOString(),
      };

      if (body.milestoneStatus == MilestoneStatus.COMPLETED) {
        data.Milestones = {
          updateMany: {
            where: { milestoneId: body.milestoneId },
            data: {
              milestoneStatus: body.milestoneStatus,
              actualEndDate: new Date().toISOString(),
            },
          },
        };
      }

      const reworkDocArray = [];
      const reworkDocDetailsArray = [];

      if (
        subMilestone.milestoneStatus === MilestoneStatus.IN_REVIEW && //old status
        body.milestoneStatus === MilestoneStatus.REWORK //new status
      ) {
        if (subMilestone.revisions <= subMilestone.revisionsCounter) {
          throw new ConflictException(
            MESSAGES.ERROR.PROJECT.MILSTONE.EXCEED_REVISION,
          );
        }

        //to upload reowrk details
        if (subMilestone.reworkDocs.length) {
          await this.projectRepository.deleteManyDocumentLinks({
            where: {
              id: {
                in: subMilestone.deliverablesLink,
              },
            },
          });
        }

        for (const doc of body.reworkDocs) {
          const documentLinksData =
            await this.projectRepository.createDocumentLinks({
              data: {
                type: documentType.REWORK_DOC,
                fileName: doc.fileName,
                mimeType: doc.mimeType,
                url: doc.url,
              },
            });
          reworkDocDetailsArray.push(documentLinksData);
          reworkDocArray.push(documentLinksData.id);
        }

        data.reworkDocs = reworkDocArray;
        data.reworkComment = body.reworkComment;
        data.revisionsCounter = subMilestone.revisionsCounter + 1;
      }

      const updatedMilestone: any =
        await this.projectRepository.updateMilestone({
          where: {
            id: body.milestoneId,
          },
          data,
        });
      updatedMilestone.reworkDocs = reworkDocDetailsArray;
      const notCompleteCount = await this.projectRepository.getMilestoneCount({
        where: {
          projectId: body.projectId,
          milestoneType: milestoneType.milestone,
          milestoneStatus: {
            not: {
              in: [MilestoneStatus.COMPLETED, MilestoneStatus.FORCE_CLOSED],
            },
          },
        },
      });

      const milestoneIsInprogess =
        await this.projectRepository.getMilestoneCount({
          where: {
            projectId: body.projectId,
            milestoneStatus: MilestoneStatus.IN_PROGRESS,
            milestoneType: milestoneType.milestone,
          },
        });

      const projectUpdate: any = {};
      if (milestoneIsInprogess) {
        projectUpdate.status = ProjectStatus.IN_PROGRESS;
      } else if (!notCompleteCount) {
        projectUpdate.status = ProjectStatus.COMPLETE;
      }

      if (Object.keys(projectUpdate).length) {
        await this.projectRepository.updateProject({
          where: { id: body.projectId },
          data: projectUpdate,
        });
      }

      for (const member of subMilestone.Project.ProjectMembers) {
        if (subMilestone.milestoneType == milestoneType.submilestone) {
          if (member.projectUsers != ProjectUsers.PURCHASER) {
            if (
              member.projectUsers == ProjectUsers.CP ||
              member.userId == subMilestone.AssignedTo
            ) {
              // Send notification to the other party
              await this.notificationService.sendNotification({
                recipientId: member.userId,
                pattern: member.userId,
                category: MESSAGES.SUCCESS.NOTIFICATION,
                content: {
                  message: `Status of milestone ${
                    subMilestone.title
                  } changed from ${
                    subMilestone.milestoneStatus == MilestoneStatus.INIT
                      ? 'Ready'
                      : subMilestone.milestoneStatus == MilestoneStatus.HOLD
                      ? 'Hold'
                      : subMilestone.milestoneStatus ==
                        MilestoneStatus.IN_PROGRESS
                      ? 'In Progress'
                      : subMilestone.milestoneStatus ==
                        MilestoneStatus.IN_REVIEW
                      ? 'In Review'
                      : subMilestone.milestoneStatus == MilestoneStatus.REWORK
                      ? 'Rework'
                      : subMilestone.milestoneStatus == MilestoneStatus.STOP
                      ? 'Stop'
                      : ''
                  } to ${
                    body.milestoneStatus == MilestoneStatus.INIT
                      ? 'Ready'
                      : body.milestoneStatus == MilestoneStatus.HOLD
                      ? 'Hold'
                      : body.milestoneStatus == MilestoneStatus.IN_PROGRESS
                      ? 'In Progress'
                      : body.milestoneStatus == MilestoneStatus.IN_REVIEW
                      ? 'In Review'
                      : body.milestoneStatus == MilestoneStatus.REWORK
                      ? 'Rework'
                      : body.milestoneStatus == MilestoneStatus.STOP
                      ? 'Stop'
                      : body.milestoneStatus == MilestoneStatus.COMPLETED
                      ? 'Completed'
                      : ''
                  }`,
                  timestamp: Math.floor(new Date().getTime() / 1000),
                  metadata: { method: 'GET', URL: '/project/:id' },
                  senderProfileImage: 'icon.png',
                },
              });
            }
          }
        } else if (member.projecUsers != ProjectUsers.IP) {
          // Send notification to the other party
          await this.notificationService.sendNotification({
            recipientId: member.userId,
            pattern: member.userId,
            category: MESSAGES.SUCCESS.NOTIFICATION,
            content: {
              message: `Status of milestone ${
                subMilestone.title
              } changed from ${
                subMilestone.milestoneStatus == MilestoneStatus.INIT
                  ? 'Ready'
                  : subMilestone.milestoneStatus == MilestoneStatus.HOLD
                  ? 'Hold'
                  : subMilestone.milestoneStatus == MilestoneStatus.IN_PROGRESS
                  ? 'In Progress'
                  : subMilestone.milestoneStatus == MilestoneStatus.IN_REVIEW
                  ? 'In Review'
                  : subMilestone.milestoneStatus == MilestoneStatus.REWORK
                  ? 'Rework'
                  : subMilestone.milestoneStatus == MilestoneStatus.STOP
                  ? 'Stop'
                  : ''
              } to ${
                body.milestoneStatus == MilestoneStatus.INIT
                  ? 'Ready'
                  : body.milestoneStatus == MilestoneStatus.HOLD
                  ? 'Hold'
                  : body.milestoneStatus == MilestoneStatus.IN_PROGRESS
                  ? 'In Progress'
                  : body.milestoneStatus == MilestoneStatus.IN_REVIEW
                  ? 'In Review'
                  : body.milestoneStatus == MilestoneStatus.REWORK
                  ? 'Rework'
                  : body.milestoneStatus == MilestoneStatus.STOP
                  ? 'Stop'
                  : body.milestoneStatus == MilestoneStatus.COMPLETED
                  ? 'Completed'
                  : ''
              }`,
              timestamp: Math.floor(new Date().getTime() / 1000),
              metadata: { method: 'GET', URL: '/project/:id' },
              senderProfileImage: 'icon.png',
            },
          });
        }
      }
      return updatedMilestone;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  validateStateChange(
    nextState: MilestoneStatus,
    currentState: MilestoneStatus,
    functionName: VALID_STATE_CHANGE_FUNCTION_NAME,
  ) {
    try {
      let output = false;
      const conditions = {
        [MilestoneStatus.INIT]: {
          check: (nextState) => {
            if (
              nextState == MilestoneStatus.IN_PROGRESS ||
              nextState == MilestoneStatus.COMPLETED ||
              nextState == MilestoneStatus.STOP ||
              nextState == MilestoneStatus.FORCE_CLOSED
            ) {
              return true;
            } else false;
          },
        },
        [MilestoneStatus.IN_PROGRESS]: {
          check: (nextState) => {
            if (
              nextState == MilestoneStatus.IN_REVIEW ||
              nextState == MilestoneStatus.COMPLETED ||
              nextState == MilestoneStatus.FORCE_CLOSED
            ) {
              return true;
            } else false;
          },
        },
        [MilestoneStatus.IN_REVIEW]: {
          check: (nextState) => {
            if (
              nextState == MilestoneStatus.REWORK ||
              nextState == MilestoneStatus.COMPLETED ||
              nextState == MilestoneStatus.FORCE_CLOSED
            ) {
              return true;
            } else false;
          },
        },
        [MilestoneStatus.REWORK]: {
          check: (nextState) => {
            if (
              nextState == MilestoneStatus.IN_PROGRESS ||
              nextState == MilestoneStatus.COMPLETED ||
              nextState == MilestoneStatus.FORCE_CLOSED
            ) {
              return true;
            } else false;
          },
        },
        [MilestoneStatus.STOP]: {
          check: (nextState) => {
            if (nextState == MilestoneStatus.INIT) {
              return true;
            } else false;
          },
        },
      };

      const condition = conditions[currentState][functionName];
      if (condition(nextState)) {
        output = true;
      }
      return output;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addIP(user: RequestUserDto, data: addIndividualProvider) {
    try {
      const projectData = await this.projectRepository.getProject({
        where: { id: data.projectId },
        select: {
          status: true,
        },
        include: {
          ProjectMembers: {
            select: {
              userId: true,
              projectUsers: true,
            },
          },
        },
      });

      const findCp = projectData.ProjectMembers.find(
        (obj) => obj.userId === user.sub,
      );
      if (!findCp) {
        throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
      }

      if (
        projectData.status === ProjectStatus.IN_PROGRESS ||
        projectData.status === ProjectStatus.COMPLETE
      ) {
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.CANT_ADD_IP,
        );
      }

      // TODO: Update the hcs topic permission with this users wallet address
      //check if project is in progress
      return await this.projectRepository.createProjectProvider({ data });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async modifyIp(user: RequestUserDto, data: addIndividualProvider) {
    try {
      const projectData = await this.projectRepository.getProject({
        where: { id: data.projectId },
        select: {
          status: true,
        },
        include: {
          ProjectMembers: {
            select: {
              userId: true,
              projectUsers: true,
            },
          },
        },
      });

      const findCp = projectData.ProjectMembers.find(
        (obj) => obj.userId === user.sub,
      );
      if (!findCp || findCp.projectUsers !== ProjectUsers.CP) {
        throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
      }

      if (
        projectData.status === ProjectStatus.IN_PROGRESS ||
        projectData.status === ProjectStatus.COMPLETE
      ) {
        throw new ConflictException(
          MESSAGES.ERROR.PROJECT.MASTER_PROJECT.CANT_REMOVE_IP,
        );
      }

      const addIP = [];
      const removeIP = [];
      const notIp = [ProjectUsers.PURCHASER, ProjectUsers.CP];

      for (const element of data.providerIds) {
        if (!projectData.ProjectMembers.find((obj) => obj.userId === element)) {
          addIP.push(element);
        }
      }

      for (const element of projectData.ProjectMembers) {
        if (
          !data.providerIds.includes(element.userId) &&
          !notIp.includes(element.projectUsers)
        ) {
          removeIP.push(element.userId);
        }
      }

      if (addIP.length) {
        await this.projectRepository.createProjectProvider({
          data: {
            providerIds: addIP,
            projectId: data.projectId,
          },
        });
      }
      if (removeIP.length) {
        await this.projectRepository.deleteProjectProvider({
          data: {
            providerIds: removeIP,
            projectId: data.projectId,
          },
        });
      }

      return MESSAGES.SUCCESS.PROJECT.IP_MODIFY;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getTransactions(
    user: RequestUserDto,
    transactionId: string,
    event: TransactionsType,
    functionName: string,
    reworkDocs = undefined,
    reworkComment = undefined,
  ) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
      const milestoneStatus = [
        'INIT',
        'FUNDED',
        'IN_PROGRESS',
        'IN_REVIEW',
        'REWORK',
        'COMPLETED',
        'STOP',
        'FORCE_CLOSED',
      ];
      const output = await this.hederaService.getEventsFromTransactionHash(
        user,
        transactionId,
        event,
        functionName,
      );
      if (output.error && output.cause == 'axios') {
        let requestBody = { transactionId, event, functionName };
        await this.projectRepository.addError({
          data: {
            type: Error.HEDERA,
            body: JSON.stringify(requestBody),
            message: output.message,
            metadata: '/project/transaction',
          },
        });
        throw new BadRequestException(
          MESSAGES.ERROR.HEDERA_DATABASE_UPDATE_FAILED,
        );
      }

      const transactionDate = Math.floor(Date.now() / 1000).toString();
      const from = `0.0.${parseInt(output.from, 16)}`;
      const to = `0.0.${parseInt(output.to, 16)}`;
      for (const eventLog of output.events) {
        // save the transaction details in db
        const validEvents: any = [
          TransactionsType.MilestonePayout,
          TransactionsType.MilestoneFunded,
          TransactionsType.MilestoneForceClosed,
          TransactionsType.MilestoneStateChanged,
          TransactionsType.RoyaltyPaid,
          TransactionsType.SubMilestoneAdded,
          TransactionsType.SubMilestoneStateChanged,
        ];

        let milestone;
        let transaction;
        const milestoneIds = [];
        if (validEvents.includes(event)) {
          milestone = await this.projectRepository.getMilestone({
            where: { id: eventLog[0] }, // This will break if milestone is invalid
            include: {
              Project: {
                include: { ProjectDetails: true, ProjectMembers: true },
              },
              Milestones: { select: { id: true } },
            },
          });
          milestoneIds.push(milestone.id);
          transaction = await this.fundRepository.createTransaction({
            data: {
              txHash: output.hash,
              from,
              to,
              amount: output.amount,
              status:
                output.status == '0x1'
                  ? ContractDeployStatus.SUCCESS
                  : ContractDeployStatus.FAILED,
              type: event,
              value: eventLog[0],
              projectId: milestone.Project.id,
              userId: user.sub,
            },
          });
        }

        function calculateRoyalty(amount: number, percentage: number) {
          return (percentage / 100) * amount;
        }

        const data: any = {};
        // Optimize this
        if (event == TransactionsType.MilestoneFunded) {
          let milestoneFund = parseFloat(milestone.fundAllocation);
          let projectFund = parseFloat(
            milestone.Project.ProjectDetails.leftProjectFund,
          );

          if (milestone.royaltyAmount) {
            if (milestone.royaltyValueIn == AmountType.PERCENT) {
              let royalty = calculateRoyalty(
                milestoneFund,
                parseFloat(milestone.royaltyAmount),
              );
              milestoneFund += royalty;
            } else {
              milestoneFund += parseFloat(milestone.royaltyAmount);
            }
          }

          let leftProjectFund = (projectFund - milestoneFund).toString();

          if (
            functionName == FUNCTION_NAMES.FUND_PROJECT ||
            functionName == FUNCTION_NAMES.FUND_PROJECT_USDC
          ) {
            await this.projectRepository.updateProject({
              where: { id: milestone.projectId },
              data: {
                ProjectDetails: {
                  update: { fundTransfered: true, leftProjectFund: '0' },
                },
              },
            });
          } else {
            // Updated left project fund i.e leftFund - milestonefund
            await this.projectRepository.updateProject({
              where: { id: milestone.projectId },
              data: {
                ProjectDetails: {
                  update: {
                    fundTransfered: leftProjectFund <= '0' ? true : false,
                    leftProjectFund,
                  },
                },
              },
            });
          }
          // Send notification to the other party
          for (const member of milestone.Project.ProjectMembers) {
            if (member.projectUsers != ProjectUsers.IP) {
              await this.notificationService.sendNotification({
                recipientId: member.userId,
                pattern: member.userId,
                category: MESSAGES.SUCCESS.NOTIFICATION,
                content: {
                  message: `Fund transferred to Escrow for milestone ${milestone.title} in project ${milestone.Project.ProjectDetails.title} `,
                  timestamp: Math.floor(new Date().getTime() / 1000),
                  metadata: { method: 'GET', URL: '/project/:id' },
                  senderProfileImage: 'icon.png',
                },
              });
            }
          }

          data.fundTranscationIdToEscrow = transaction.id;
        } else if (event == TransactionsType.MilestoneForceClosed) {
          data.enableFundTransfer = false;
          data.enableRoyalityTransfer = false;
          //call updateMilestone
          await this.updateMilestoneStatus(user, {
            projectId: milestone.Project.id,
            milestoneId: milestone.id,
            milestoneStatus: milestoneStatus[eventLog[1]],
          });
        } else if (event == TransactionsType.MilestonePayout) {
          data.enableFundTransfer = false;
          data.fundTransferred = true;
          data.fundTranscationIdFromEscrow = transaction.id;
          data.enableRoyalityTransfer = true;
          milestone.Milestones.map((data) => milestoneIds.push(data.id));
          // Send notification to the other party
          for (const member of milestone.Project.ProjectMembers) {
            if (
              (milestone.AssignedTo && member.userId == milestone.AssignedTo) ||
              member.projectUsers == ProjectUsers.CP ||
              member.projectUsers == ProjectUsers.PURCHASER
            ) {
              // Send notification to purchaser
              await this.notificationService.sendNotification({
                recipientId: member.userId,
                pattern: member.userId,
                category: MESSAGES.SUCCESS.NOTIFICATION,
                content: {
                  message: `${milestone.title} is paid`,
                  timestamp: Math.floor(new Date().getTime() / 1000),
                  metadata: { method: 'GET', URL: '/project/:id' },
                  senderProfileImage: 'icon.png',
                },
              });
            }
          }
        } else if (
          event == TransactionsType.MilestoneStateChanged ||
          event == TransactionsType.SubMilestoneStateChanged
        ) {
          if (
            event == TransactionsType.MilestoneStateChanged &&
            eventLog[1] == contractMilestoneStatus.COMPLETED
          ) {
            data.enableFundTransfer = true;
          }
          if (eventLog[1] == contractMilestoneStatus.REWORK) {
            if (!reworkComment || !reworkDocs) {
              throw new ConflictException(
                MESSAGES.ERROR.PROJECT.MILSTONE.REWORK_MISSING,
              );
            }
            await this.updateMilestoneStatus(user, {
              projectId: milestone.Project.id,
              milestoneId: milestone.id,
              milestoneStatus: milestoneStatus[eventLog[1]],
              reworkDocs,
              reworkComment,
            });
          } else if (eventLog[1] == contractMilestoneStatus.FUNDED) {
            await this.updateMilestoneStatus(user, {
              projectId: milestone.Project.id,
              milestoneId: milestone.id,
              milestoneStatus: milestoneStatus[0],
              reworkDocs,
              reworkComment,
            });
          } else {
            await this.updateMilestoneStatus(user, {
              projectId: milestone.Project.id,
              milestoneId: milestone.id,
              milestoneStatus: milestoneStatus[eventLog[1]],
            });
          }
        } else if (event == TransactionsType.RoyaltyPaid) {
          data.enableRoyalityTransfer = false;
          data.royalityTransferred = true;
          data.royalityTranscationId = transaction.id;
        } else if (event == TransactionsType.SubMilestoneAdded) {
          await this.projectRepository.updateMilestone({
            where: { id: milestone.id },
            data: { isDeployedOnContract: transaction.id },
          });
        } else if (event == TransactionsType.FreeBalanceReleased) {
          // Toogle project level fund release  boolean
          await this.projectRepository.updateProject({
            where: { id: eventLog[0] },
            data: {
              freeBalanceReleased: true,
              enableFreeFundRelease: transactionId,
              lastTransactionDate: transactionDate,
            },
          });
        } else {
          throw new BadRequestException(MESSAGES.ERROR.INVALID_EVENT);
        }

        // Update only if the data variable has any keys to update
        if (Object.keys(data).length) {
          await this.fundRepository.updateManyFunds({
            where: { fundTypeId: { in: milestoneIds } },
            data,
          });
          await this.projectRepository.updateMilestone({
            where: { id: milestone.id },
            data: { lastTransactionDate: transactionDate },
          });
          await this.projectRepository.updateProject({
            where: { id: milestone.Project.id },
            data: { lastTransactionDate: transactionDate },
          });
        }

        // State change to complete: enableFundTransfer true, royalty true
      }

      return output;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addEscrow(user: RequestUserDto, data: getProjectDto) {
    try {
      const projectData = await this.projectRepository.getProject({
        where: { id: data.projectId, state: ProjectState.ADD_ESCROW },
        include: {
          ProjectMembers: {
            include: {
              User: { select: { id: true, role: true, walletAddress: true } },
            },
          },
          ProjectDetails: true,
          Milestones: {
            where: {
              milestoneType: milestoneType.milestone,
            },
            include: {
              PenalityBreach: true,
            },
          },
        },
      });
      if (!projectData) {
        throw new BadRequestException(MESSAGES.ERROR.BAD_REQUEST);
      }

      for (const projectMembers of projectData.ProjectMembers) {
        const user = projectMembers.User;
        const walletAddress = user.walletAddress;

        switch (projectMembers.projectUsers) {
          case ProjectUsers.PURCHASER:
            if (walletAddress) {
              projectData.purchaserWalletAddress = walletAddress;
              projectData.purchaserId = user.id;
            } else {
              throw new BadRequestException(
                MESSAGES.ERROR.PURCHASER.WALLET_ADDRESS_FETCH_FAILED,
              );
            }
            break;

          case ProjectUsers.CP:
            if (walletAddress) {
              projectData.providerWalletAddress = walletAddress;
              projectData.providerId = user.id;
            } else {
              throw new BadRequestException(
                MESSAGES.ERROR.PROVIDER.WALLET_ADDRESS_FETCH_FAILED,
              );
            }
            break;
        }
      }

      const EscrowData = await this.hederaService.addEscrow(projectData);
      const escrow = await this.projectRepository.updateEscrow({
        where: {
          projectId: projectData.id,
        },
        data: EscrowData,
      });

      // Create a topic on hedera hcs
      if (EscrowData.transferOwnershipStatus == ContractDeployStatus.SUCCESS) {
        const topic = await this.hederaService.createTopic({
          topicMemo: data.projectId,
        });

        // save the topic and update in the database
        await this.projectRepository.updateProject({
          where: { id: data.projectId },
          data: {
            hcsTopicId: topic.topicId,
            state: ProjectState.CONTRACT_DEPLOYED,
          },
        });

        // Send notification to CP
        await this.notificationService.sendNotification({
          recipientId: projectData.providerId,
          pattern: projectData.providerId,
          category: MESSAGES.SUCCESS.NOTIFICATION,
          content: {
            message: `Escrow created for ${projectData.ProjectDetails.title}`,
            timestamp: Math.floor(new Date().getTime() / 1000),
            metadata: { method: 'GET', URL: '/project/:id' },
            senderProfileImage: 'icon.png',
          },
        });

        // Send notification to Purchaser
        await this.notificationService.sendNotification({
          recipientId: user.sub,
          pattern: user.sub,
          category: MESSAGES.SUCCESS.NOTIFICATION,
          content: {
            message: `Escrow created for ${projectData.ProjectDetails.title}`,
            timestamp: Math.floor(new Date().getTime() / 1000),
            metadata: { method: 'GET', URL: '/project/:id' },
            senderProfileImage: 'icon.png',
          },
        });
      }
      return escrow;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async uploadDeliverables(user: RequestUserDto, data: DevliveralbesDto) {
    try {
      const { milestoneId, deliverables } = data;
      const deliverablesLink = [];
      const milestoneData = await this.projectRepository.getMilestone({
        where: {
          id: milestoneId,
          OR: [
            { milestoneStatus: MilestoneStatus.IN_PROGRESS },
            { milestoneStatus: MilestoneStatus.REWORK },
          ],
        },
      });

      if (!milestoneData) {
        throw new NotFoundException(
          MESSAGES.ERROR.PROJECT.MILSTONE.NOT_IN_PROGRESS,
        );
      }

      if (
        milestoneData.milestoneStatus == MilestoneStatus.IN_PROGRESS &&
        user.role != Role.PROVIDER
      ) {
        throw new UnauthorizedException(MESSAGES.ERROR.ACCESS_DENIED);
      }

      if (
        milestoneData.milestoneStatus == MilestoneStatus.REWORK &&
        user.role != Role.PURCHASER
      ) {
        throw new UnauthorizedException(MESSAGES.ERROR.ACCESS_DENIED);
      }

      if (milestoneData.deliverablesLink.length > 0) {
        await this.projectRepository.deleteManyDocumentLinks({
          where: {
            id: {
              in: milestoneData.deliverablesLink,
            },
          },
        });
      }

      for (const deliverable of deliverables) {
        const documentLinksData =
          await this.projectRepository.createDocumentLinks({
            data: {
              type: documentType.Deliverables,
              fileName: deliverable.fileName,
              mimeType: deliverable.mimeType,
              url: deliverable.url,
            },
          });
        deliverablesLink.push(documentLinksData.id);
      }

      return await this.projectRepository.updateMilestone({
        where: {
          id: milestoneId,
        },
        data: {
          deliverablesLink,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async uploadWeb3Storage(user: RequestUserDto, body) {
    try {
      const { projectId } = body;
      const project = await this.projectRepository.getProject({
        where: { id: projectId },
        include: { ProjectDetails: { select: { title: true } } },
      });
      const milestones = await this.projectRepository.getAllMilestones({
        where: {
          projectId,
          milestoneType: milestoneType.milestone,
          milestoneStatus: MilestoneStatus.COMPLETED,
          Project: { status: ProjectState.COMPLETE },
        },
      });

      if (!milestones.length) {
        throw new BadRequestException(MESSAGES.ERROR.ACCESS_DENIED);
      }

      // Get the urls of all the milestones
      const urls = [];
      for (const milestone of milestones) {
        if (milestone.deliverablesLink.length) {
          for (const deliverables of milestone.deliverablesLink) {
            const doc = await this.projectRepository.getDocumentLinks({
              where: { id: deliverables },
            });
            urls.push(doc.url);
          }
        }
      }

      if (!urls.length) {
        throw new BadRequestException(MESSAGES.ERROR.DELIVERABLES);
      }
      // Upload to web3
      console.log(project);

      const response = await this.storageService.uploadToWeb3Storage(urls, {
        title: project.ProjectDetails.title,
        creator: user.walletAddress,
        projectId: projectId,
      });

      // Update the database
      await this.projectRepository.updateProject({
        where: { id: projectId },
        data: { web3Deliverables: response },
      });
      return { cid: response };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async toggleShortListProviders(
    user: RequestUserDto,
    body: ProviderListActionDto,
  ) {
    try {
      if (body.action === ProviderListAction.BOOKMARKED) {
        const provider = await this.authRepository.getUser({
          where: {
            id: body.providerId,
            role: Role.PROVIDER,
          },
          select: {
            id: true,
          },
        });

        if (!provider || body.providerId === user.sub) {
          throw new ConflictException(
            MESSAGES.ERROR.PROVIDER_LIST.INVALID_ADD_PROVIDER,
          );
        }

        return await this.projectRepository.upsertShortListProvider({
          where: {
            creatorId_memberId: {
              creatorId: user.sub,
              memberId: body.providerId,
            },
          },
          create: {
            creatorId: user.sub,
            memberId: body.providerId,
          },
          update: {
            deleted: false,
          },
        });
      } else if (body.action === ProviderListAction.REMOVE_BOOKMARKED) {
        return await this.projectRepository.updateShortListProvider({
          where: {
            creatorId_memberId: {
              creatorId: user.sub,
              memberId: body.providerId,
            },
          },
          data: {
            deleted: true,
          },
        });
      }
      return MESSAGES.ERROR.PROVIDER_LIST.NO_ACTION;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateShortlistProvider(
    user: RequestUserDto,
    body: updateShortListProviderDto,
  ) {
    try {
      const provider = await this.authRepository.getUser({
        where: {
          id: body.providerId,
          role: Role.PROVIDER,
        },
        select: {
          id: true,
        },
      });

      if (!provider || body.providerId === user.sub) {
        throw new ConflictException(
          MESSAGES.ERROR.PROVIDER_LIST.INVALID_ADD_PROVIDER,
        );
      }
      return await this.projectRepository.upsertShortListProvider({
        where: {
          creatorId_memberId: {
            creatorId: user.sub,
            memberId: body.providerId,
          },
        },
        create: {
          creatorId: user.sub,
          memberId: body.providerId,
          note: body.note,
          deleted: true,
        },
        update: {
          note: body.note,
          deleted: false,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getShortListedProviders(user: RequestUserDto, sortBy) {
    try {
      return await this.projectRepository.getManyShortListProviders({
        where: {
          creatorId: user.sub,
          deleted: false,
        },
        select: {
          id: true,
          memberId: true,
          creatorId: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          Creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              Experiences: true,
              About: true,
              Address: true,
            },
          },
          Member: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              Experiences: true,
              About: true,
              Address: true,
            },
          },
        },
        orderBy: { createdAt: sortBy },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createNotes(user: RequestUserDto, body: CreateNotesDto) {
    try {
      const {
        projectId,
        milestoneId,
        message,
        to,
        hcsTopicId,
        noteId,
        sequenceNumber,
      } = body;
      await this.projectRepository.addNote({
        data: {
          milestoneId,
          hcsTopicId,
          sequenceNumber,
          projectId,
          message,
          from: user.sub,
          to,
          noteId,
        },
      });
      return body;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getNotes(user: RequestUserDto, projectId) {
    try {
      // Get notes group by milestones
      const notes = await this.projectRepository.getNotes({
        where: {
          AND: [
            { projectId: { equals: projectId } },
            {
              OR: [{ from: user.sub }, { to: user.sub }],
            },
            { noteId: { equals: null } },
          ],
        },
        include: {
          Milestone: { select: { title: true, id: true } },
          To: {
            select: {
              name: true,
              id: true,
              About: { select: { profilePictureLink: true } },
            },
          },
          From: {
            select: {
              name: true,
              id: true,
              About: { select: { profilePictureLink: true } },
            },
          },
          Notes: {
            include: {
              Milestone: { select: { title: true, id: true } },
              To: {
                select: {
                  name: true,
                  id: true,
                  About: { select: { profilePictureLink: true } },
                },
              },
              From: {
                select: {
                  name: true,
                  id: true,
                  About: { select: { profilePictureLink: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: Prisma.SortOrder.asc },
      });

      const projectMembers: any =
        await this.projectRepository.getProjectMembers({
          where: { projectId, NOT: { userId: user.sub } },
          select: {
            userId: true,
            projectUsers: true,
            User: {
              select: {
                name: true,
                id: true,
                email: true,
                Permissions: {
                  where: { projectId },
                  select: { Members: true },
                },
              },
            },
            Project: {
              select: {
                isIndividualProvidersVisible: true,
                Permissions: {
                  where: { userId: user.sub },
                  select: { Members: true },
                },
              },
            },
          },
        });
      let userIsIp = projectMembers.some(
        (member) => member.projectUsers == ProjectUsers.CP,
      );
      const dict = {};
      const members = [];
      if (projectMembers.length) {
        projectMembers.forEach((item) => {
          if (
            item.projectUsers == ProjectUsers.PURCHASER &&
            user.role == Role.PURCHASER
          ) {
            // Donot show the purchaser his own data:
          } else if (
            user.role == Role.PURCHASER &&
            item.projectUsers == ProjectUsers.IP &&
            item.Project.isIndividualProvidersVisible
          ) {
            // Show the purchaser IP details on toogle:
            members.push(item);
          } else if (
            user.role == Role.PURCHASER &&
            item.projectUsers == ProjectUsers.CP
          ) {
            // show the CP details to purchaser:
            members.push(item);
          } else if (
            user.role == Role.PROVIDER &&
            userIsIp &&
            item.Project.Permissions[0].Members &&
            item.projectUsers != ProjectUsers.PURCHASER
          ) {
            members.push(item);
          } else if (
            user.role == Role.PROVIDER &&
            userIsIp &&
            !item.Project.Permissions[0].Members &&
            item.projectUsers != ProjectUsers.PURCHASER &&
            item.projectUsers != ProjectUsers.IP
          ) {
            members.push(item);
          } else if (
            user.role == Role.PROVIDER &&
            userIsIp &&
            item.projectUsers == ProjectUsers.CP
          ) {
            members.push(item);
          } else if (user.role == Role.PROVIDER && !userIsIp) {
            members.push(item);
          }
        });
      }

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (!dict[note.Milestone.title]) {
          dict[note.Milestone.title] = [];
        }
        dict[note.Milestone.title].push(note);
      }
      return { members, notes: dict };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllowedChat(user: RequestUserDto, query: GetAllowedChatDto) {
    try {
      const { projectId, userId } = query;

      // Get Project from projectId
      const project = await this.projectRepository.getProject({
        where: { id: projectId },
        include: {
          Permissions: {
            where: { userId },
            select: { MilestonesShowAll: true, SubMilestoneShowAll: true },
          },
          Milestones: {
            select: {
              id: true,
              title: true,
              AssignedTo: true,
              milestoneType: true,
            },
          },
          ProjectMembers: { where: { userId: user.sub } },
        },
      });

      if (!project?.ProjectMembers.length) {
        throw new NotFoundException(MESSAGES.ERROR.NOT_FOUND);
      }

      const { MilestonesShowAll, SubMilestoneShowAll } = project.Permissions[0];

      // Filter Milestones (Show All or own)
      const milestoneFilters = [];
      for (const milestone of project.Milestones) {
        // Filter Milestones (Show All or own)
        if (!MilestonesShowAll && SubMilestoneShowAll) {
          // This is Ip with show all sub milestones
          if (milestone?.AssignedTo) {
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else if (MilestonesShowAll && !SubMilestoneShowAll) {
          // This is purchaser
          if (milestone?.milestoneType == milestoneType.milestone) {
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else if (!MilestonesShowAll && !SubMilestoneShowAll) {
          if (milestone?.AssignedTo == userId) {
            // This is Ip with show only own sub milestones
            delete milestone.Milestones;
            milestoneFilters.push(milestone);
          }
        } else {
          // This is CP
          if (milestone?.AssignedTo == null) {
            milestoneFilters.push(milestone);
          }
        }
      }

      project['Milestones'] = milestoneFilters;
      return project;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updatePermissions(user: RequestUserDto, body: updatePermissionsDto) {
    try {
      const projectData = await this.projectRepository.getProject({
        where: { id: body.projectId },
        select: {
          status: true,
        },
        include: {
          ProjectMembers: {
            select: {
              userId: true,
              projectUsers: true,
            },
          },
        },
      });

      const findCp = projectData.ProjectMembers.find(
        (obj) => obj.userId === user.sub,
      );
      if (!findCp || findCp.projectUsers !== ProjectUsers.CP) {
        throw new ConflictException(MESSAGES.ERROR.DISPUTE.NO_PERMISSION);
      }

      await this.projectRepository.updatePermissions(
        body.projectId,
        body.permissions,
      );

      return MESSAGES.SUCCESS.PERMISSIONS.UPDATE;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async requestFund(user: RequestUserDto, body: requestFundDto) {
    try {
      let fundRequestData, status, member;
      if (body.idType == IdType.PROJECT) {
        fundRequestData = await this.projectRepository.getProject({
          where: { id: body.id },
          include: {
            ProjectMembers: true,
            ProjectDetails: { select: { title: true } },
          },
        });
        if (!fundRequestData) {
          throw new NotFoundException(MESSAGES.ERROR.NO_RECORD_FOUND);
        }
        status =
          fundRequestData.status === ProjectStatus.COMPLETE ? true : false;
        member = this.getFilterProjectMembers(fundRequestData.ProjectMembers);
      } else {
        fundRequestData = await this.projectRepository.getMilestone({
          where: {
            id: body.id,
          },
          select: {
            milestoneStatus: true,
            title: true,
            Project: {
              select: {
                ProjectMembers: true,
              },
            },
          },
        });
        if (!fundRequestData) {
          throw new NotFoundException(MESSAGES.ERROR.NO_RECORD_FOUND);
        }
        status =
          fundRequestData.milestoneStatus === MilestoneStatus.COMPLETED
            ? true
            : false;
        member = this.getFilterProjectMembers(
          fundRequestData.Project.ProjectMembers,
        );
      }
      if (!status || member.CP.userId !== user.sub) {
        throw new ConflictException(MESSAGES.ERROR.REQUEST_FUND);
      }
      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: member.PURCHASER.userId,
        pattern: member.PURCHASER.userId,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `${user.username} requested for ${
            body.idType == IdType.PROJECT
              ? `project ${fundRequestData.ProjectDetails.title}`
              : `milestone ${fundRequestData.title}`
          } ${
            body.requestType == RequestType.FUND
              ? `allocated fund`
              : 'allocated royalty'
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      // Send notification to the other party
      await this.notificationService.sendNotification({
        recipientId: user.sub,
        pattern: user.sub,
        category: MESSAGES.SUCCESS.NOTIFICATION,
        content: {
          message: `You requested for ${
            body.idType == IdType.PROJECT
              ? `project ${fundRequestData.ProjectDetails.title}`
              : `milestone ${fundRequestData.title}`
          } ${
            body.requestType == RequestType.FUND
              ? `allocated fund`
              : 'allocated royalty'
          }`,
          timestamp: Math.floor(new Date().getTime() / 1000),
          metadata: { method: 'GET', URL: '/project/:id' },
          senderProfileImage: 'icon.png',
        },
      });

      if (body.requestType == RequestType.FUND)
        return MESSAGES.SUCCESS.FUND_REQUESTED;
      else return MESSAGES.SUCCESS.SUCCESS_BONUS_REQUESTED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private getFilterProjectMembers(members) {
    return members.reduce((result, obj) => {
      const key = obj.projectUsers;
      result[key] = obj;
      return result;
    }, {});
  }
}
