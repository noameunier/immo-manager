import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Filtre global : toutes les erreurs sortent sous une forme unique
 * { error: { code, message, details } }, sans fuite de stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { requestId?: string }>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' },
    };

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      body = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Les données envoyées sont invalides.',
          details: exception.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        body = { error: { code: httpCodeToErrorCode(status), message: payload } };
      } else if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        body = {
          error: {
            code:
              typeof record.code === 'string' ? record.code : httpCodeToErrorCode(status),
            message:
              typeof record.message === 'string'
                ? record.message
                : Array.isArray(record.message)
                  ? record.message.join(' ')
                  : 'Erreur.',
            ...(record.details !== undefined ? { details: record.details } : {}),
          },
        };
      }
    } else {
      logger.error(
        {
          err: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception,
          path: request.url,
          requestId: request.requestId,
        },
        'Erreur non gérée',
      );
    }

    if (status >= 500) {
      logger.error(
        { path: request.url, status, requestId: request.requestId },
        'Erreur serveur',
      );
    }

    response.status(status).json(body);
  }
}

function httpCodeToErrorCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'ERROR';
  }
}
