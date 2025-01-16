import { Injectable, Logger } from '@nestjs/common';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { Funds, Prisma, Transactions } from '@prisma/client';

@Injectable()
export class FundsRepository {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger();

  async createOrUpdateFund(params: {
    where: Prisma.FundsWhereUniqueInput;
    create: Prisma.FundsUncheckedCreateInput;
    update: Prisma.FundsUncheckedUpdateInput;
  }) {
    try {
      const { where, create, update } = params;
      return await this.prisma.funds.upsert({ where, create, update });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.UPDATE_FAILED);
    }
  }

  async updateFunds(params: {
    where: Prisma.FundsWhereUniqueInput;
    data: Prisma.FundsUncheckedUpdateInput;
  }) {
    try {
      return await this.prisma.funds.update({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.UPDATE_FAILED);
    }
  }

  async updateManyFunds(params: {
    where: Prisma.FundsWhereInput;
    data: Prisma.FundsUncheckedUpdateInput;
  }) {
    try {
      return await this.prisma.funds.updateMany({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.UPDATE_FAILED);
    }
  }

  async createManyFunds(params: { data: Prisma.FundsCreateManyInput }) {
    try {
      return await this.prisma.funds.createMany({ data: params.data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.CREATE_FAILED);
    }
  }

  async getFunds(params: {
    where?: Prisma.FundsWhereInput;
    select?: Prisma.FundsSelect;
    include?: Prisma.FundsInclude;
  }): Promise<Funds> {
    try {
      return await this.prisma.funds.findFirst({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.FETCH_FAILED);
    }
  }

  async createTransaction(params: {
    data: Prisma.TransactionsUncheckedCreateInput;
  }): Promise<Transactions> {
    try {
      return await this.prisma.transactions.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.PROJECT.FUNDS.CREATE_FAILED);
    }
  }
}
