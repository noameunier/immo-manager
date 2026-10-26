import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { env } from '../config/env';
import type { AuthenticatedRequest } from './current-auth.decorator';
import { parseCookies } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const allowedOrigins = new Set(
  [env.WEB_ORIGIN, env.MOBILE_ORIGIN]
    .flatMap((origin) => origin.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean),
);

/**
 * Protection CSRF pour l'authentification par cookie.
 * Les mutations authentifiées par cookie exigent une origine de confiance.
 * Les clients mobiles (jeton Bearer) ne sont pas concernés.
 *
 * Middleware Express brut : répond directement en 403 (le filtre d'exceptions
 * Nest ne s'applique pas aux middlewares enregistrés via app.use).
 */
export class CsrfMiddleware implements NestMiddleware {
  use(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    const cookies = parseCookies(request.headers.cookie);
    const hasSessionCookie = Boolean(cookies[env.SESSION_COOKIE_NAME]);
    const hasBearer = Boolean(request.headers.authorization?.startsWith('Bearer '));

    if (!hasSessionCookie || hasBearer) {
      next();
      return;
    }

    const origin = request.headers.origin;
    const referer = request.headers.referer;

    const isTrusted =
      (typeof origin === 'string' && allowedOrigins.has(origin)) ||
      (origin === undefined &&
        typeof referer === 'string' &&
        [...allowedOrigins].some((allowed) => referer.startsWith(allowed)));

    if (!isTrusted) {
      response.status(403).json({
        error: {
          code: 'CSRF_REJECTED',
          message: "Origine de la requête non autorisée.",
        },
      });
      return;
    }

    next();
  }
}
