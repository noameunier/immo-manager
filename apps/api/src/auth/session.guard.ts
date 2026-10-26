import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { env } from '../config/env';
import { hashToken } from '../common/crypto';
import { parseCookies } from '../common/cookies';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';

/** Extrait le jeton de session : Bearer (mobile/API) ou cookie httpOnly (web). */
export function extractSessionToken(request: AuthenticatedRequest): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token.length > 0) return token;
  }

  const cookies = parseCookies(request.headers.cookie);
  return cookies[env.SESSION_COOKIE_NAME] ?? null;
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Guard global : toute route est privée par défaut.
 * Seules les routes marquées @Public() sont accessibles sans session.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractSessionToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentification requise.',
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      session.user.archivedAt !== null
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Session expirée ou invalide.',
      });
    }

    if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session
        .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    request.auth = { user: session.user, session };
    return true;
  }
}
