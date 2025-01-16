import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
    });
  }
  async onModuleInit() {
    await this.$connect();
    /***********************************/
    /* SOFT DELETE MIDDLEWARE */
    /***********************************/
    const tables = [];
    this.$use(async (params, next) => {
      if (tables.includes(params.model)) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Change to findFirst - you cannot filter
          // by anything except ID / unique with findUnique
          params.action = 'findFirst';
          // Add 'deleted' filter
          // ID filter maintained
          params.args.where['deleted'] = false;
        }
        if (params.action === 'findMany') {
          // Find many queries
          if (params.args.where) {
            if (params.args.where.deleted == undefined) {
              // Exclude deleted records if they have not been explicitly requested
              params.args.where['deleted'] = false;
            }
          } else {
            params.args['where'] = { deleted: false };
          }
        }
      }
      return next(params);
    });

    this.$use(async (params, next) => {
      if (tables.includes(params.model)) {
        if (params.action == 'update') {
          // Change to updateMany - you cannot filter
          // by anything except ID / unique with findUnique
          params.action = 'updateMany';
          // Add 'deleted' filter
          // ID filter maintained
          params.args.where['deleted'] = false;
        }
        if (params.action == 'updateMany') {
          if (params.args.where != undefined) {
            params.args.where['deleted'] = false;
          } else {
            params.args['where'] = { deleted: false };
          }
        }
      }
      return next(params);
    });

    this.$use(async (params, next) => {
      // Check incoming query type
      if (tables.includes(params.model)) {
        if (params.action == 'delete') {
          // Delete queries
          // Change action to an update
          params.action = 'update';
          params.args['data'] = { deleted: true };
        }
        if (params.action == 'deleteMany') {
          // Delete many queries
          params.action = 'updateMany';
          if (params.args.data != undefined) {
            params.args.data['deleted'] = true;
          } else {
            params.args['data'] = { deleted: true };
          }
        }
      }
      return next(params);
    });

    // Does not give correct typings
    this.$use(async (params, next) => {
      const result = await next(params);
      if (typeof result === 'object' && result !== null) {
        for (const [key, value] of Object.entries(result)) {
          if (value instanceof Date) {
            result[key as keyof typeof result] = Math.floor(
              Date.parse(value.toString()) / 1000,
            );
          }
        }
        return result;
      } else {
        return result;
      }
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
