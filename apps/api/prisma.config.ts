import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuration Prisma 7.
 * Depuis Prisma 7, l'URL de connexion n'est plus dans schema.prisma :
 * elle est fournie ici pour les commandes CLI (migrate, studio, seed).
 * Le client applicatif utilise un driver adapter (@prisma/adapter-pg).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
