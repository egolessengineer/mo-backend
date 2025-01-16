import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  DRAFTS,
  DocumentsLink,
  Projects,
  PenalityBreach,
  Milestones,
  ProjectMembers,
  ProjectUsers,
  Permissions,
  Funds,
  Escrow,
  milestoneType,
  MilestoneStatus,
  Notes,
} from '@prisma/client';
import { CONSTANT, MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { bool } from 'aws-sdk/clients/signer';
import { updateUserPermissionDto } from './dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class ProjectRepository {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}
  private readonly logger = new Logger();

  async createProject(params: {
    data: Prisma.ProjectsUncheckedCreateInput;
  }): Promise<Projects> {
    try {
      const { data } = params;
      return await this.prisma.projects.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.CREATE_FAILED);
    }
  }

  async deleteProject(params: { where: Prisma.ProjectsWhereUniqueInput }) {
    try {
      return await this.prisma.projects.delete({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.CREATE_FAILED);
    }
  }

  async getProject(params: {
    where?: Prisma.ProjectsWhereUniqueInput;
    include?: Prisma.ProjectsInclude;
    select?: Prisma.ProjectsSelect;
  }): Promise<any> {
    try {
      const { where, include } = params;
      return await this.prisma.projects.findUnique({ where, include });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.FETCH_FAILED);
    }
  }

  async getPermissions(params: {
    where?: Prisma.PermissionsWhereInput;
    select?: Prisma.PermissionsSelect;
    include?: Prisma.PermissionsInclude;
  }): Promise<Permissions> {
    try {
      const { where, include } = params;
      return await this.prisma.permissions.findFirst({ where, include });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.PERMISSIONS.FETCH_FAILED);
    }
  }

  async updatePermissions(
    projectId,
    updatePermissions: updateUserPermissionDto[],
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Code running in a transaction...
          for (const updateData of updatePermissions) {
            const { userId } = updateData;
            delete updateData.userId;

            await tx.permissions.update({
              where: {
                permissionIdentifier: {
                  userId,
                  projectId,
                },
              },
              data: updateData,
            });
          }
        },
        {
          maxWait: 5000, // default: 2000
          timeout: 10000, // default: 5000
          // isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.PERMISSIONS.UPDATE_FAILED);
    }
  }

  async getProjectMembers(params: {
    where?: Prisma.ProjectMembersWhereInput;
    select?: Prisma.ProjectMembersSelect;
    include?: Prisma.ProjectMembersInclude;
    // orderBy?: Prisma.ProjectMembersOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.ProjectMembersOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<ProjectMembers[]> {
    try {
      return await this.prisma.projectMembers.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.FETCH_FAILED);
    }
  }

  async getProjects(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProjectsWhereInput;
    include?: Prisma.ProjectsInclude;
    select?: Prisma.ProjectsSelect;
    // orderBy?: Prisma.ProjectsOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.ProjectsOrderByWithRelationInput;
  }): Promise<Projects[]> {
    try {
      return await this.prisma.projects.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.FETCH_FAILED);
    }
  }

  async saveProjectTransaction(projectData: any, user): Promise<any> {
    try {
      const projectId = projectData.projectId;
      return await this.prisma.$transaction(
        async (tx) => {
          const returnArray: any = {};
          if (projectData.projectDetails) {
            const projectDetails = await tx.projectDetails.upsert({
              where: {
                projectId,
              },
              update: {
                ...projectData.projectDetails,
                leftProjectFund: projectData.projectDetails.totalProjectFund,
              },
              create: {
                projectId,
                ...projectData.projectDetails,
                leftProjectFund: projectData.projectDetails.totalProjectFund,
              },
            });
            returnArray['projectDetails'] = projectDetails;
          }
          if (projectData.documents.documentLinks) {
            const { documentLinks, requirements, termsAndConditions } =
              projectData.documents;
            // eslint-disable-next-line prefer-const
            let doc_links = [];
            for (const docs of documentLinks) {
              for (const url of docs.url) {
                const document = await tx.documentsLink.create({
                  data: {
                    type: docs.type,
                    url: url,
                  },
                });
                doc_links.push(document.id);
              }
            }
            const documents = await tx.documents.upsert({
              where: { projectId },
              update: {
                requirements: requirements,
                documentLinks: doc_links,
                termsAndConditions: termsAndConditions,
              },
              create: {
                projectId: projectId,
                requirements: requirements,
                documentLinks: doc_links,
                termsAndConditions: termsAndConditions,
              },
            });
            returnArray['documents'] = documents;
          }
          if (projectData.documents.remark) {
            const documents = await tx.documents.update({
              where: { projectId },
              data: {
                remark: projectData.documents.remark,
              },
            });
            returnArray['documents'] = documents;
          }
          if (
            projectData.provider ||
            (projectData?.individualProvider?.length ?? 0) > 0
          ) {
            if (projectData.provider) {
              const provider = await tx.projectMembers.create({
                data: {
                  projectId: projectId,
                  projectUsers: ProjectUsers.CP,
                  userId: projectData.provider,
                },
              });
              await tx.permissions.create({
                data: {
                  userId: projectData.provider,
                  projectId,
                },
              });

              // for the 1st flow when cp is yet to assigned
              await tx.projects.update({
                where: { id: projectId },
                data: {
                  currentEditor: provider.userId,
                  state: projectData.projectState,
                  status: projectData.projectStatus,
                  providerAssignedDate: new Date().toISOString(),
                  assignedFundTo: projectData.assignedFundTo,
                  fundTransferType: projectData.fundTransferType,
                },
              });
              // Send notification
              await this.notificationService.sendNotification({
                recipientId: provider.userId,
                pattern: provider.userId,
                category: MESSAGES.SUCCESS.NOTIFICATION,
                content: {
                  message: `${projectData.projectDetails.title} ${MESSAGES.SUCCESS.NOTIFICATIONS.ASSINGED} `,
                  timestamp: Math.floor(new Date().getTime() / 1000),
                  metadata: { method: 'GET', URL: '/project/:id' },
                  senderProfileImage: 'someicon.png',
                },
              });

              // Send notification
              await this.notificationService.sendNotification({
                recipientId: user.sub,
                pattern: user.sub,
                category: MESSAGES.SUCCESS.NOTIFICATION,
                content: {
                  message: `${projectData.projectDetails.title} successfully created`,
                  timestamp: Math.floor(new Date().getTime() / 1000),
                  metadata: { method: 'GET', URL: '/project/:id' },
                  senderProfileImage: 'someicon.png',
                },
              });

              returnArray['provider'] = provider;
            } else if ((projectData?.individualProvider?.length ?? 0) > 0) {
              //write save ip logic here
              for (const user of projectData.individualProvider) {
                await tx.projectMembers.create({
                  data: {
                    projectId,
                    projectUsers: ProjectUsers.IP,
                    userId: user,
                  },
                });
                // Always create a permission record for project memebers with default all access true
                await tx.permissions.create({
                  data: {
                    userId: user,
                    projectId,
                    MilestonesShowAll: false,
                    SubMilestoneShowAll: false,
                  },
                });
              }
            }
          }

          // adding milestones here
          if (projectData.milestones && projectData.milestones.length > 0) {
            const milestonesData = [];
            const penalityBreachesData = {};
            let milestoneCount = await this.getMilestoneCount({
              where: {
                projectId,
                milestoneId: {
                  equals: null,
                },
              },
            });

            for (const milestone of projectData.milestones) {
              const penalityBreach = milestone?.penalityBreach;
              delete milestone?.penalityBreach;
              delete milestone.AssignedTo;
              delete milestone.dateAssigned;
              if (milestone.startDate || milestone.endDate) {
                milestone.startDate = new Date(
                  milestone.startDate * 1000,
                ).toISOString();
                milestone.endDate = new Date(
                  milestone.endDate * 1000,
                ).toISOString();
              }
              if (!milestone.dateAssigned) milestone.AssignedTo = undefined;
              else
                milestone.dateAssigned = new Date(
                  milestone.dateAssigned * 1000,
                ).toISOString();

              milestone.projectId = projectId;
              milestone.milestoneType = milestoneType.milestone;
              milestone.fundTransfer = projectData.fundTransferType;
              milestone.milestoneStatus = MilestoneStatus.INIT;

              //for saving and update milestones data
              if (!milestone?.id) {
                const savedMilestone = await tx.milestones.create({
                  data: { ...milestone, sequenceNumber: (milestoneCount += 1) },
                });
                if (!milestone.isPenaltyExcluded)
                  penalityBreachesData[savedMilestone.id] = penalityBreach;
                milestonesData.push(savedMilestone);
              } else {
                const milestoneId = milestone?.id;
                delete milestone?.id;
                const updatedMilestone = await tx.milestones.update({
                  where: {
                    id: milestoneId,
                  },
                  data: milestone,
                });
                if (!milestone.isPenaltyExcluded)
                  penalityBreachesData[updatedMilestone.id] = penalityBreach;
                milestonesData.push(updatedMilestone);
              }
            }
            //for saving and update penality breach
            const milestonesIds = Object.keys(penalityBreachesData);

            for (const milestoneId of milestonesIds) {
              const penalityBreach = penalityBreachesData[milestoneId];

              if (penalityBreach && penalityBreach.length > 0) {
                for (const penalty of penalityBreach) {
                  if (penalty?.id) {
                    await tx.penalityBreach.update({
                      where: {
                        id: penalty.id,
                      },
                      data: {
                        pentality: penalty.pentality,
                        timeperiod: penalty.timeperiod,
                        pentalityDuration: penalty.pentalityDuration,
                        penalityType: penalty.penalityType,
                        valueIn: penalty.valueIn,
                      },
                    });
                  } else {
                    await tx.penalityBreach.create({
                      data: {
                        milestoneId: milestoneId,
                        pentality: penalty.pentality,
                        timeperiod: penalty.timeperiod,
                        pentalityDuration: penalty.pentalityDuration,
                        penalityType: penalty.penalityType,
                        valueIn: penalty.valueIn,
                      },
                    });
                  }
                }
              }
            }
            returnArray['milestonesData'] = milestonesData;
          }

          //update project metadata
          if (!returnArray.provider) {
            // for the flow when cp is already assigned
            await tx.projects.update({
              where: { id: projectId },
              data: {
                currentEditor: projectData.currentEditor,
                state: projectData.projectState,
                status: projectData.projectStatus,
                assignedFundTo: projectData.assignedFundTo,
                fundTransferType: projectData.fundTransferType,
              },
            });

            // Send notification
            await this.notificationService.sendNotification({
              recipientId: projectData.currentEditor,
              pattern: projectData.currentEditor,
              category: MESSAGES.SUCCESS.NOTIFICATION,
              content: {
                message: `${projectData.projectDetails.title} updated by ${user.username}`,
                timestamp: Math.floor(new Date().getTime() / 1000),
                metadata: { method: 'GET', URL: '/project/:id' },
                senderProfileImage: 'someicon.png',
              },
            });

            // Send notification
            await this.notificationService.sendNotification({
              recipientId: user.sub,
              pattern: user.sub,
              category: MESSAGES.SUCCESS.NOTIFICATION,
              content: {
                message: `${projectData.projectDetails.title} updated successfully`,
                timestamp: Math.floor(new Date().getTime() / 1000),
                metadata: { method: 'GET', URL: '/project/:id' },
                senderProfileImage: 'someicon.png',
              },
            });
          }

          //to delete all drafts
          await tx.dRAFTS.updateMany({
            where: {
              projectId,
              deleted: {
                not: null,
              },
            },
            data: { deleted: null },
          });

          //last return
          return returnArray;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
          maxWait: 5000, // default: 2000
          timeout: 10000, // default: 5000
        },
      );
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new Error(MESSAGES.ERROR.INVALID_UUID);
        }

        if (error.code === 'P2002') {
          throw new Error(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.DUPLICATE_ENTRY,
          );
        }
      }
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.CREATE_FAILED);
    }
  }

  async addDraft(params: { data }): Promise<DRAFTS> {
    try {
      const { data } = params;
      const where = {
        projectId: data.projectId,
        draftType: data.draftType,
        deleted: '0',
      };
      return await this.prisma.dRAFTS.upsert({
        where: {
          draftType_projectId_deleted: where,
        },
        update: {
          value: data.value,
        },
        create: {
          projectId: data.projectId,
          draftType: data.draftType,
          value: data.value,
          deleted: '0',
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DRAFT.UPDATE_FAILED);
    }
  }

  async getDraft(params: { where: Prisma.DRAFTSWhereInput }): Promise<DRAFTS> {
    try {
      const { where } = params;
      return await this.prisma.dRAFTS.findFirst({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DRAFT.FETCH_FAILED);
    }
  }

  async getAllDraft(params: {
    where: Prisma.DRAFTSWhereInput;
    select: Prisma.DRAFTSSelect;
  }): Promise<DRAFTS[]> {
    try {
      const { where, select } = params;
      return await this.prisma.dRAFTS.findMany({
        where,
        select,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DRAFT.FETCH_FAILED);
    }
  }

  async deleteDraft(params: {
    where: Prisma.DRAFTSWhereInput;
  }): Promise<Prisma.BatchPayload> {
    try {
      const { where } = params;
      return this.prisma.dRAFTS.updateMany({ where, data: { deleted: null } });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DRAFT.UPDATE_FAILED);
    }
  }

  async createDocumentLinks(params: {
    data: Prisma.DocumentsLinkUncheckedCreateInput;
  }): Promise<DocumentsLink> {
    try {
      const { data } = params;
      return await this.prisma.documentsLink.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DOCUMENT.CREATE_LINK_FAILED);
    }
  }

  async getDocumentLinks(params: {
    where: Prisma.DocumentsLinkWhereUniqueInput;
  }): Promise<DocumentsLink> {
    try {
      const { where } = params;
      return await this.prisma.documentsLink.findUnique({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DOCUMENT.FETCH_FAILED);
    }
  }

  async getManyDocumentLinks(params: { where }): Promise<DocumentsLink[]> {
    try {
      const { where } = params;
      return await this.prisma.documentsLink.findMany({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DOCUMENT.FETCH_FAILED);
    }
  }

  async createDocument(params: {
    where: Prisma.DocumentsWhereUniqueInput;
    create: Prisma.DocumentsUncheckedCreateInput;
    update: Prisma.DocumentsUncheckedUpdateInput;
  }) {
    try {
      const { where, create, update } = params;
      return await this.prisma.documents.upsert({ where, create, update });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DOCUMENT.CREATE_FAILED);
    }
  }

  async createProjectProvider(params: { data }) {
    try {
      const { data } = params;
      const createMembers = [];
      const createPermissions = [];

      //create object array for createMany
      for (const providerId of data.providerIds) {
        createMembers.push({
          projectId: data.projectId,
          projectUsers: ProjectUsers.IP,
          userId: providerId,
        });
        createPermissions.push({
          userId: providerId,
          projectId: data.projectId,
          MilestonesShowAll: false,
          SubMilestoneShowAll: false,
        });
      }
      return await this.prisma.$transaction(
        [
          this.prisma.projectMembers.createMany({ data: createMembers }),
          this.prisma.permissions.createMany({ data: createPermissions }),
        ],
        {
          // isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (error.code === 'P2002') {
          throw new Error(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.DUPLICATE_ENTRY,
          );
        }
      }
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.IP_ADD_FAILED);
    }
  }

  async deleteProjectProvider(params: { data }) {
    try {
      const { data } = params;

      return await this.prisma.$transaction(
        [
          this.prisma.projectMembers.deleteMany({
            where: {
              projectId: data.projectId,
              userId: {
                in: data.providerIds,
              },
            },
          }),
          this.prisma.permissions.deleteMany({
            where: {
              projectId: data.projectId,
              userId: {
                in: data.providerIds,
              },
            },
          }),
        ],
        {
          // isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.IP_REMOVE_FAILED);
    }
  }

  async updateProject(params: {
    where?: Prisma.ProjectsWhereUniqueInput;
    data?: Prisma.ProjectsUpdateInput;
  }): Promise<any> {
    try {
      const { where, data } = params;
      return await this.prisma.projects.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ConflictException(MESSAGES.ERROR.NO_RECORD_FOUND);
        }
      }
      throw new Error(MESSAGES.ERROR.PROJECT.MASTER_PROJECT.UPDATE_FAILED);
    }
  }

  async getMilestone(params: {
    where: Prisma.MilestonesWhereUniqueInput;
    select?: Prisma.MilestonesSelect;
    include?: Prisma.MilestonesInclude;
  }): Promise<Milestones> {
    try {
      return await this.prisma.milestones.findUnique({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async getAllMilestones(params: {
    where: Prisma.MilestonesWhereInput;
    select?: Prisma.MilestonesSelect;
    include?: Prisma.MilestonesInclude;
  }): Promise<Milestones[]> {
    try {
      return await this.prisma.milestones.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async getMilestoneCount(params: { where: Prisma.MilestonesWhereInput }) {
    try {
      return await this.prisma.milestones.count({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async addSubMilestone(params): Promise<any> {
    try {
      let upsertMilestone;
      await this.prisma.$transaction(async (tx) => {
        const { data, projectDetails } = params;

        const penalityBreachesData = {};
        const penalityBreach = data?.penalityBreach;
        delete data?.penalityBreach;

        data.startDate = new Date(data.startDate * 1000).toISOString();
        data.endDate = new Date(data.endDate * 1000).toISOString();
        data.dateAssigned = new Date(data.dateAssigned * 1000).toISOString();

        //for saving and update milestones data
        if (!data?.id) {
          const savedMilestone = await tx.milestones.create({
            data: data,
          });
          upsertMilestone = savedMilestone;
          if (!data.isPenaltyExcluded)
            penalityBreachesData[savedMilestone.id] = penalityBreach;
        } else {
          const milestoneId = data?.id;
          delete data?.id;
          const updatedMilestone = await tx.milestones.update({
            where: {
              id: milestoneId,
            },
            data: data,
          });
          upsertMilestone = updatedMilestone;
          if (!data.isPenaltyExcluded)
            penalityBreachesData[updatedMilestone.id] = penalityBreach;
        }

        //for saving and update penality breach
        const milestonesIds = Object.keys(penalityBreachesData);
        const penaltyArray = [];
        for (const milestoneId of milestonesIds) {
          const penalityBreach = penalityBreachesData[milestoneId];
          let penaltyData;
          if (penalityBreach && penalityBreach.length > 0) {
            for (const penalty of penalityBreach) {
              if (penalty?.id) {
                penaltyData = await tx.penalityBreach.update({
                  where: {
                    id: penalty.id,
                  },
                  data: {
                    pentality: penalty.pentality,
                    timeperiod: penalty.timeperiod,
                    pentalityDuration: penalty.pentalityDuration,
                    penalityType: penalty.penalityType,
                    valueIn: penalty.valueIn,
                  },
                });
              } else {
                penaltyData = await tx.penalityBreach.create({
                  data: {
                    milestoneId: milestoneId,
                    pentality: penalty.pentality,
                    timeperiod: penalty.timeperiod,
                    pentalityDuration: penalty.pentalityDuration,
                    penalityType: penalty.penalityType,
                    valueIn: penalty.valueIn,
                  },
                });
              }
              penaltyArray.push(penaltyData);
            }
          }
        }
        upsertMilestone['PenalityBreach'] = penaltyArray;
      });
      return upsertMilestone;
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.CREATE_FAILED,
      );
    }
  }

  async updateMilestone(params: {
    where?: Prisma.MilestonesWhereUniqueInput;
    data?: Prisma.MilestonesUncheckedUpdateInput;
  }): Promise<Milestones> {
    try {
      const { where, data } = params;
      return await this.prisma.milestones.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MILSTONE.UPDATE_FAILED);
    }
  }

  async addEscrow(params: {
    data: Prisma.EscrowUncheckedCreateInput;
  }): Promise<Escrow> {
    try {
      const { data } = params;
      return await this.prisma.escrow.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error();
    }
  }

  async updateEscrow(params: {
    where?: Prisma.EscrowWhereUniqueInput;
    data?: Prisma.EscrowUncheckedUpdateInput;
  }): Promise<Escrow> {
    try {
      const { where, data } = params;
      return await this.prisma.escrow.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.MILSTONE.UPDATE_FAILED);
    }
  }

  async getEscrow(params: {
    where: Prisma.EscrowWhereUniqueInput;
    select?: Prisma.EscrowSelect;
    include?: Prisma.EscrowInclude;
  }): Promise<Escrow> {
    try {
      return await this.prisma.escrow.findUnique({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async deleteManyDocumentLinks(params) {
    try {
      const { where } = params;
      return await this.prisma.documentsLink.deleteMany({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.DOCUMENT.DELETE_FAILED);
    }
  }

  async addManyShortListProviders(params: {
    data: Prisma.ProviderListCreateManyInput[];
  }) {
    try {
      return await this.prisma.providerList.createMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (error.code === 'P2002') {
          throw new Error(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.DUPLICATE_ENTRY,
          );
        }
      }
      throw new Error(MESSAGES.ERROR.PROVIDER_LIST.CREATE_FAILED);
    }
  }

  async updateManyShortListProviders(params: {
    where: Prisma.ProviderListWhereInput;
    data: Prisma.ProviderListUncheckedUpdateManyInput;
  }) {
    try {
      return await this.prisma.providerList.updateMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROVIDER_LIST.DELETE_FAILED);
    }
  }

  async getManyShortListProviders(params: {
    where: Prisma.ProviderListWhereInput;
    select?: Prisma.ProviderListSelect;
    // orderBy?: Prisma.ProviderListOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.ProviderListOrderByWithRelationInput;
  }) {
    try {
      return await this.prisma.providerList.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROVIDER_LIST.DELETE_FAILED);
    }
  }

  async updateShortListProvider(params: {
    where: Prisma.ProviderListWhereUniqueInput;
    data: Prisma.ProviderListUncheckedUpdateInput;
  }) {
    try {
      return await this.prisma.providerList.update({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROVIDER_LIST.DELETE_FAILED);
    }
  }

  async upsertShortListProvider(params: {
    where: Prisma.ProviderListWhereUniqueInput;
    create: Prisma.ProviderListUncheckedCreateInput;
    update: Prisma.ProviderListUncheckedUpdateInput;
  }) {
    try {
      return await this.prisma.providerList.upsert({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROVIDER_LIST.DELETE_FAILED);
    }
  }

  async addNote(params: {
    data: Prisma.NotesUncheckedCreateInput;
  }): Promise<Notes> {
    try {
      return await this.prisma.notes.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.NOTES.ADD_FAILED);
    }
  }

  async getNotes(params: {
    where?: Prisma.NotesWhereInput;
    include: Prisma.NotesInclude;
    // orderBy?: Prisma.NotesOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.NotesOrderByWithRelationInput;
  }) {
    try {
      return await this.prisma.notes.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addError(params: { data: Prisma.ErrorsCreateInput }) {
    try {
      return await this.prisma.errors.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addCollaborators(params: {
    data: Prisma.CollaboratorsUncheckedCreateInput;
  }) {
    try {
      return await this.prisma.collaborators.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateCollaborator(params: {
    where: Prisma.CollaboratorsWhereUniqueInput;
    data: Prisma.CollaboratorsUncheckedUpdateInput;
  }) {
    try {
      return await this.prisma.collaborators.update({ ...params });
    } catch (error) {
      throw error;
    }
  }

  async getCollaborators(params: {
    where: Prisma.CollaboratorsWhereInput;
    // orderBy?: Prisma.CollaboratorsOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.CollaboratorsOrderByWithRelationInput;
    include?: Prisma.CollaboratorsInclude;
    skip?: number;
    take?: number;
  }) {
    try {
      return await this.prisma.collaborators.findMany({ ...params });
    } catch (error) {
      throw error;
    }
  }
}
