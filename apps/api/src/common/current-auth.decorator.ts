import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Session, User } from '../generated/prisma/client';

export type AuthContext = {
  user: User;
  session: Session;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
  clientIp?: string;
  requestId?: string;
};

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new Error('CurrentAuth utilisé sans SessionGuard');
    }
    return request.auth;
  },
);
