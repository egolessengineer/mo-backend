import { Injectable, Logger } from '@nestjs/common';
import { Dispute, FAQS, Prisma } from '@prisma/client';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DisputeRepository {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger();

  async createOrUpdateDispute(params: {
    where: Prisma.DisputeWhereUniqueInput;
    create: Prisma.DisputeUncheckedCreateInput;
    update: Prisma.DisputeUncheckedUpdateInput;
  }) {
    try {
      const { where, create, update } = params;
      return await this.prisma.dispute.upsert({ where, create, update });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.DISPUTE.UPDATE_FAILED);
    }
  }

  async createDispute(params: {
    data: Prisma.DisputeUncheckedCreateInput;
  }): Promise<Dispute> {
    try {
      const { data } = params;
      return await this.prisma.dispute.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new Error(MESSAGES.ERROR.INVALID_UUID);
        }
      }
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.DISPUTE.CREATE_FAILED);
    }
  }

  async updateDispute(params: {
    where?: Prisma.DisputeWhereUniqueInput;
    data?: Prisma.DisputeUpdateInput;
  }): Promise<Dispute> {
    try {
      const { where, data } = params;
      return await this.prisma.dispute.update({ where, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error(MESSAGES.ERROR.DISPUTE.ID_NOT_FOUND);
        }
      }
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.DISPUTE.UPDATE_FAILED);
    }
  }

  async getDispute(params: {
    where: Prisma.DisputeWhereUniqueInput;
    select?: Prisma.DisputeSelect;
    include?: Prisma.DisputeInclude;
  }): Promise<Dispute> {
    try {
      return await this.prisma.dispute.findUnique({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async getAllDisputes(params: {
    where?: Prisma.DisputeWhereInput;
    select?: Prisma.DisputeSelect;
    include?: Prisma.DisputeInclude;
    // orderBy?: Prisma.DisputeOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.DisputeOrderByWithRelationInput;
  }): Promise<Dispute[]> {
    try {
      return await this.prisma.dispute.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        MESSAGES.ERROR.PROJECT.MILSTONE.SUB_MILESTONE.FETCH_FAILED,
      );
    }
  }

  async createFAQS(params: { data: Prisma.FAQSCreateManyInput[] }) {
    try {
      const { data } = params;
      return await this.prisma.fAQS.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.FAQ.CREATE_FAILED);
    }
  }

  async getFAQS(params: {
    where?: Prisma.FAQSWhereUniqueInput;
    select?: Prisma.FAQSSelect;
  }): Promise<FAQS[]> {
    try {
      return await this.prisma.fAQS.findMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.FAQ.FETCH_FAILED);
    }
  }
}
