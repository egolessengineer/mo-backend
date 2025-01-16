import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Projects } from '@prisma/client';
import { Observable, catchError, map, of } from 'rxjs';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
var JSONBig = require('json-bigint');

export interface ValidResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  error: string;
  errorCode: number;
  url: string;
  urlMethod: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ValidResponse<T> | ErrorResponse>
{
  constructor(private prisma: PrismaService) {}
  private logger = new Logger();

  private async projectData(projectId): Promise<Projects> {
    const response = await this.prisma.projects.findUnique({
      where: {
        id: projectId,
      },
    });
    return response;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<Observable<ValidResponse<T> | ErrorResponse>> {
    const request = context.switchToHttp().getRequest();

    // for pagination
    // const { pageNumber, pageSize } = request.query;
    // const page = pageNumber ? parseInt(pageNumber, 10) : 1;
    // const size = pageSize ? parseInt(pageSize, 10) : 10;

    if (request.url === '/project' && request.method === 'POST') {
      if (request.user) {
        request.body.role = request.user.role;
      }
      if (request.body.projectId) {
        const projectId = request.body.projectId;
        const projectData = await this.projectData(projectId);
        if (!projectData) {
          throw new ConflictException(
            MESSAGES.ERROR.PROJECT.MASTER_PROJECT.NO_PROJECT,
          );
        }
        request.body.projectState = projectData.state;
      }
    }

    return next.handle().pipe(
      map((data: any) => {
        const res = data;
        // const message = data.message;

        if (res === null || res === undefined || typeof res === undefined)
          throw new BadRequestException(MESSAGES.ERROR.SERVER_ERROR);

        // const result: any = res;

        // //for pagination
        // // if (Array.isArray(res))
        // //   result = {
        // //     data: res,
        // //     pagination: {
        // //       pageNumber: page,
        // //       pageSize: res.length,
        // //     },
        // //   };

        // const validResponse: ValidResponse<T> = {
        //   success: true,
        //   statusCode: context.switchToHttp().getResponse().statusCode,
        //   message: message || MESSAGES.SUCCESS.DEFAULT,
        //   data: result,
        // };

        const parsedForBigInt = JSONBig.parse(JSONBig.stringify(res));
        return parsedForBigInt;
      }),
      catchError((error: any) => {
        if (Array.isArray(error?.response?.message))
          error.response.message = error.response.message?.join(', ');

        context.switchToHttp().getResponse().statusCode =
          error.response?.statusCode ?? 500;

        //  Handled Exception
        if (error.response) {
          this.logger.error(
            error.response.message,
            `${request.method} ${request.originalUrl}`,
          );

          return of({
            success: false,
            message: error.response.message,
            errorCode: error.response.statusCode,
            error: error.response.error,
            url: request.url,
            urlMethod: request.method,
          });
        }

        //  Unhandled Exception
        this.logger.error(error, error.stack);
        const errorResponse: ErrorResponse = {
          success: false,
          message: error.message,
          errorCode: 500,
          error: MESSAGES.ERROR.SERVER_ERROR,
          url: request.url,
          urlMethod: request.method,
        };

        return of(errorResponse);
      }),
    );
  }
}
