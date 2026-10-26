import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { hashIp } from './crypto';
import type { AuthenticatedRequest } from './current-auth.decorator';

/**
 * Journalisation minimale : méthode, chemin, statut, durée, identifiant de requête.
 * Aucun corps, aucun en-tête d'authentification, aucune donnée personnelle.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    request.requestId = randomUUID();
    request.clientIp = request.ip;
    response.setHeader('X-Request-Id', request.requestId);

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Math.round(durationMs),
          ipHash: hashIp(request.ip),
        },
        'requête traitée',
      );
    });

    next();
  }
}
