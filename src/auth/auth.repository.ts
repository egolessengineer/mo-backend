import { Injectable, Logger } from '@nestjs/common';
import {
  About,
  Address,
  Experiences,
  Prisma,
  User,
  VerficationToken,
} from '@prisma/client';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger();
  async createUser(params: {
    data: Prisma.UserCreateManyInput;
  }): Promise<User> {
    try {
      const { data } = params;
      return await this.prisma.user.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.CREATE_FAILED);
    }
  }

  async createAbout(params: {
    where: Prisma.AboutWhereUniqueInput;
    update: Prisma.AboutUncheckedUpdateInput;
    create: Prisma.AboutUncheckedCreateInput;
  }): Promise<About> {
    try {
      const { update, where, create } = params;
      return await this.prisma.about.upsert({ where, update, create });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ABOUT.CREATE_FAILED);
    }
  }

  async createAddress(params: {
    where: Prisma.AddressWhereUniqueInput;
    update: Prisma.AddressUncheckedUpdateInput;
    create: Prisma.AddressUncheckedCreateInput;
  }): Promise<Address> {
    try {
      const { update, where, create } = params;
      return await this.prisma.address.upsert({ update, where, create });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADDRESS.CREATE_FAILED);
    }
  }

  async createExperience(params: {
    data: Prisma.ExperiencesUncheckedCreateInput;
  }): Promise<Experiences> {
    try {
      const { data } = params;
      return await this.prisma.experiences.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.EXPERIENCE.CREATE_FAILED);
    }
  }

  async getUser(params: {
    where: Prisma.UserWhereUniqueInput;
    select?: Prisma.UserSelect;
    include?: Prisma.UserInclude;
  }): Promise<User> {
    try {
      return await this.prisma.user.findUnique({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.FETCH_FAILED);
    }
  }

  async getUsers(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    select?: Prisma.UserSelect;
    // orderBy?: Prisma.UserOrderByWithRelationAndSearchRelevanceInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    try {
      const { skip, take, where, orderBy, select } = params;
      return await this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        select,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.FETCH_FAILED);
    }
  }

  async getAddress(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AddressWhereInput;
  }): Promise<Address> {
    try {
      const { skip, take, where } = params;
      return await this.prisma.address.findFirst({
        skip,
        take,
        where,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.FETCH_FAILED);
    }
  }

  async getExperience(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ExperiencesWhereInput;
  }): Promise<Experiences> {
    try {
      const { skip, take, where } = params;
      return await this.prisma.experiences.findFirst({
        skip,
        take,
        where,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.FETCH_FAILED);
    }
  }

  async getAbout(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AboutWhereInput;
  }): Promise<About> {
    try {
      const { skip, take, where } = params;
      return await this.prisma.about.findFirst({
        skip,
        take,
        where,
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.FETCH_FAILED);
    }
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUncheckedUpdateInput;
  }): Promise<User> {
    try {
      const { where, data } = params;
      return this.prisma.user.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.UPDATE_FAILED);
    }
  }

  async deleteUser(params: {
    where: Prisma.UserWhereUniqueInput;
  }): Promise<User> {
    try {
      const { where } = params;
      return await this.prisma.user.delete({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.USERS.DELETE_FAILED);
    }
  }

  async addToken(params: {
    data?: Prisma.VerficationTokenUncheckedCreateInput;
  }): Promise<VerficationToken> {
    try {
      const { data } = params;
      return await this.prisma.verficationToken.create({ data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TOKEN.CREATE_FAILED);
    }
  }

  async updateToken(params: {
    where?: Prisma.VerficationTokenWhereUniqueInput;
    data: Prisma.VerficationTokenUncheckedUpdateInput;
  }): Promise<VerficationToken> {
    try {
      const { where, data } = params;
      return await this.prisma.verficationToken.update({ where, data });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TOKEN.UPDATE_FAILED);
    }
  }

  async getToken(params: {
    where?: Prisma.VerficationTokenWhereInput;
  }): Promise<VerficationToken> {
    try {
      const { where } = params;
      return await this.prisma.verficationToken.findFirst({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TOKEN.FETCH_FAILED);
    }
  }

  async deleteToken(params: {
    where?: Prisma.VerficationTokenWhereUniqueInput;
  }): Promise<VerficationToken> {
    try {
      const { where } = params;
      return await this.prisma.verficationToken.delete({ where });
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.TOKEN.DELETE_FAILED);
    }
  }
}
