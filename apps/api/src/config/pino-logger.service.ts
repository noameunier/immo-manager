import type { LoggerService } from '@nestjs/common';
import { logger } from '../config/logger';

/** Adaptateur Nest → pino (journalisation structurée, sans fuite de contexte). */
export class PinoLoggerService implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    logger.info({ context: optionalParams.at(-1) }, String(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    logger.error({ context: optionalParams.at(-1) }, String(message));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    logger.warn({ context: optionalParams.at(-1) }, String(message));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    logger.debug({ context: optionalParams.at(-1) }, String(message));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    logger.trace({ context: optionalParams.at(-1) }, String(message));
  }
}
