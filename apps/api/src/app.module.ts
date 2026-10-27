import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { RateLimitGuard } from './common/rate-limit.guard';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { SessionGuard } from './auth/session.guard';
import { EmailVerifiedGuard } from './auth/email-verified.guard';
import { OwnerEntitiesModule } from './owner-entities/owner-entities.module';
import { BuildingsModule } from './buildings/buildings.module';
import { PropertiesModule } from './properties/properties.module';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    MailModule,
    AuthModule,
    OwnerEntitiesModule,
    BuildingsModule,
    PropertiesModule,
    TenantsModule,
    LeasesModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordre d'exécution : limitation de débit, puis session, puis email vérifié.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
  ],
})
export class AppModule {}
