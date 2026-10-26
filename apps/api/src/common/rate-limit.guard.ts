import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';

export type RateLimitOptions = {
  /** Nombre maximum de requêtes autorisées sur la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
  /** Champs du corps à inclure dans la clé (ex. email pour le login). */
  bodyFields?: string[];
};

export const RATE_LIMIT_METADATA = 'immo:rate-limit';

export const RateLimit = (options: RateLimitOptions): MethodDecorator =>
  SetMetadata(RATE_LIMIT_METADATA, options);

type Bucket = { count: number; resetAt: number };

/**
 * Limitation de débit en mémoire, suffisante pour une instance unique.
 * En cas de montée en charge multi-instances, remplacer par un stockage
 * partagé (Redis) sans changer les décorateurs.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { ip?: string }>();
    const response = http.getResponse<Response>();

    const keyParts: string[] = [
      context.getClass().name,
      context.getHandler().name,
      request.ip ?? 'unknown',
    ];

    for (const field of options.bodyFields ?? []) {
      const body = request.body as Record<string, unknown> | undefined;
      const value = body?.[field];
      if (typeof value === 'string') keyParts.push(value.toLowerCase());
    }

    const key = createHash('sha256').update(keyParts.join('|')).digest('hex');
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      this.pruneIfNeeded(now);
      return true;
    }

    if (bucket.count >= options.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Trop de tentatives. Merci de réessayer dans un instant.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private pruneIfNeeded(now: number): void {
    if (this.buckets.size < 5000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
