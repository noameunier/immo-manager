import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { logger } from '../config/logger';

export type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
};

/**
 * Journal d'audit : ne contient jamais de mot de passe, jeton ou contenu métier sensible.
 * Un échec d'écriture d'audit ne doit jamais faire échouer la requête utilisateur.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: entry.actorUserId ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ipHash: entry.ipHash ?? null,
        },
      });
    } catch (error) {
      logger.warn({ err: error, action: entry.action }, "Échec d'écriture du journal d'audit");
    }
  }
}
