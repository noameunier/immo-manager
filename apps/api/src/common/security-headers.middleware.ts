import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { isProduction } from '../config/env';
import type { AuthenticatedRequest } from './current-auth.decorator';

/**
 * En-têtes de sécurité appliqués directement par l'API (indépendamment de Caddy).
 */
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-store');
    if (isProduction) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  }
}
