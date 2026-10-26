import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';
import { logger } from '../config/logger';

/**
 * Accès PostgreSQL via le driver adapter officiel (Prisma 7).
 * Une seule instance par processus ; fermeture propre à l'arrêt.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    logger.debug('Connexion PostgreSQL établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
