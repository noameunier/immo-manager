import pino from 'pino';
import { env, isProduction } from '../config/env';

/**
 * Journalisation structurée. Aucun corps de requête, mot de passe ni jeton
 * n'est journalisé. Les chemins sensibles sont explicitement masqués.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'immo-api', environment: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      '*.password',
      '*.token',
    ],
    censor: '[redacted]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
});
