import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { env } from '../config/env';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';

/**
 * Exige une adresse email confirmée pour accéder aux routes métier lorsque
 * REQUIRE_EMAIL_VERIFICATION=true (préproduction et production).
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!env.REQUIRE_EMAIL_VERIFICATION) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.auth?.user.emailVerifiedAt) return true;

    throw new ForbiddenException({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Confirmez votre adresse email pour accéder à cette fonctionnalité.',
    });
  }
}
