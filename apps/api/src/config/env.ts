import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase()),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  API_HOST: z.string().default('127.0.0.1'),

  WEB_ORIGIN: z.string().default('http://localhost:3100'),
  MOBILE_ORIGIN: z.string().default('http://localhost:8100'),

  APP_SECRET: z.string().min(32, 'APP_SECRET doit contenir au moins 32 caractères'),

  MAIL_TRANSPORT: z.enum(['mailpit', 'smtp', 'api']).default('mailpit'),
  MAIL_FROM: z.string().default('Immo Manager <no-reply@noameunier.fr>'),
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().default(1026),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_PROVIDER: z.enum(['mailpit', 'brevo', 'scaleway', 'ovh', 'resend']).default('mailpit'),
  MAIL_API_KEY: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: booleanFromEnv.default(false),

  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  EMAIL_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  SESSION_COOKIE_NAME: z.string().default('immo_session'),
  TRUST_PROXY: booleanFromEnv.default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Configuration invalide :\n${details}`);
  process.exit(1);
}

export const env: Env = parsed.data;

if (env.NODE_ENV === 'production' && env.APP_SECRET.startsWith('dev-only-secret')) {
  throw new Error('APP_SECRET de développement interdit en production');
}

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
