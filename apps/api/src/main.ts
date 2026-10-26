import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';
import { logger } from './config/logger';
import { PinoLoggerService } from './config/pino-logger.service';
import { CsrfMiddleware } from './common/csrf.middleware';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { SecurityHeadersMiddleware } from './common/security-headers.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new PinoLoggerService(),
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');

  if (env.TRUST_PROXY) {
    expressApp.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Middlewares transverses (ordre important).
  const securityHeaders = new SecurityHeadersMiddleware();
  const requestContext = new RequestContextMiddleware();
  const csrf = new CsrfMiddleware();
  app.use((request: Request, response: Response, next: NextFunction) =>
    securityHeaders.use(request, response, next),
  );
  app.use((request: Request, response: Response, next: NextFunction) =>
    csrf.use(request, response, next),
  );
  app.use((request: Request, response: Response, next: NextFunction) =>
    requestContext.use(request, response, next),
  );

  const allowedOrigins = [env.WEB_ORIGIN, env.MOBILE_ORIGIN]
    .flatMap((origin) => origin.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });

  app.enableShutdownHooks();

  await app.listen(env.API_PORT, env.API_HOST);

  logger.info(
    {
      environment: env.NODE_ENV,
      host: env.API_HOST,
      port: env.API_PORT,
      allowedOrigins,
      emailVerificationRequired: env.REQUIRE_EMAIL_VERIFICATION,
    },
    'API Immo Manager démarrée',
  );
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, "Échec du démarrage de l'API");
  process.exit(1);
});
