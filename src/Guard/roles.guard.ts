import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Observable } from 'rxjs';
import { MESSAGES } from 'src/constants';

export class RoleGuard implements CanActivate {
  constructor(private readonly role?: Role) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<any> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user && user.role === this.role) {
      return true;
    } else {
      throw new ForbiddenException(MESSAGES.ERROR.UNAUTHORIZED_ACTION);
    }
  }
}
