import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { hash as hashPassword, verify as verifyPassword } from '@node-rs/argon2';
import { env } from '../config/env';
import { generateToken, hashIp, hashToken } from '../common/crypto';
import { ARGON2_OPTIONS } from '../common/password';
import { AuditService } from '../audit/audit.service';
import { MailService, buildPasswordResetEmail, buildVerificationEmail } from '../mail/mail.service';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '@immo/shared';
import type { User } from '../generated/prisma/client';

export type RequestMeta = { ip?: string; userAgent?: string };

export type SessionResult = {
  user: AuthenticatedUser;
  token: string;
  expiresAt: Date;
};

export { ARGON2_OPTIONS };

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHashPromise: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async register(
    input: { fullName: string; email: string; password: string },
    meta: RequestMeta,
  ): Promise<SessionResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_USED',
        message: 'Un compte existe déjà avec cette adresse email.',
      });
    }

    const passwordHash = await hashPassword(input.password, ARGON2_OPTIONS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
      },
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: user.id,
      ipHash: hashIp(meta.ip),
    });

    await this.sendVerificationEmail(user);

    const session = await this.createSession(user.id, meta);
    return { user: toPublicUser(user), ...session };
  }

  async login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.archivedAt) {
      // Comparaison factice pour égaliser le temps de réponse.
      await verifyPassword(await this.getDummyHash(), input.password).catch(() => false);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException({
        code: 'ACCOUNT_LOCKED',
        message:
          'Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans quelques minutes.',
      });
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);
    if (!passwordValid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
      });
    }

    if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirmez votre adresse email avant de vous connecter.',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      ipHash: hashIp(meta.ip),
      metadata: { userAgent: meta.userAgent?.slice(0, 120) },
    });

    const session = await this.createSession(user.id, meta);
    return { user: toPublicUser(updated), ...session };
  }

  async logout(sessionId: string, userId: string, meta: RequestMeta): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorUserId: userId,
      action: 'auth.logout',
      resourceType: 'session',
      resourceId: sessionId,
      ipHash: hashIp(meta.ip),
    });
  }

  async verifyEmail(token: string, meta: RequestMeta): Promise<AuthenticatedUser> {
    const record = await this.findUsableEmailToken(token, 'VERIFY_EMAIL');
    const now = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: record.user.emailVerifiedAt ?? now },
      }),
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    ]);

    await this.audit.record({
      actorUserId: record.userId,
      action: 'auth.email_verified',
      resourceType: 'user',
      resourceId: record.userId,
      ipHash: hashIp(meta.ip),
    });

    return toPublicUser(updated);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Compte introuvable.' });
    }
    if (user.emailVerifiedAt) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Cette adresse email est déjà confirmée.',
      });
    }
    await this.sendVerificationEmail(user);
  }

  async forgotPassword(email: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.archivedAt) {
      // Réponse identique pour ne pas révéler l'existence d'un compte.
      return;
    }

    await this.prisma.emailToken.updateMany({
      where: { userId: user.id, type: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = await this.issueEmailToken(user.id, 'RESET_PASSWORD');
    const link = `${env.WEB_ORIGIN}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    const message = buildPasswordResetEmail({
      fullName: user.fullName,
      link,
      expiresInMinutes: env.EMAIL_TOKEN_TTL_MINUTES,
    });
    message.to = user.email;

    try {
      await this.mail.send(message);
    } catch (error) {
      this.logger.error(
        `Échec d'envoi de l'email de réinitialisation : ${(error as Error).message}`,
      );
    }

    await this.audit.record({
      actorUserId: user.id,
      action: 'auth.password_reset_requested',
      resourceType: 'user',
      resourceId: user.id,
      ipHash: hashIp(meta.ip),
    });
  }

  async resetPassword(
    input: { token: string; password: string },
    meta: RequestMeta,
  ): Promise<void> {
    const record = await this.findUsableEmailToken(input.token, 'RESET_PASSWORD');
    const passwordHash = await hashPassword(input.password, ARGON2_OPTIONS);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: now } }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    await this.audit.record({
      actorUserId: record.userId,
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: record.userId,
      ipHash: hashIp(meta.ip),
    });
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.archivedAt) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Session invalide.',
      });
    }
    return toPublicUser(user);
  }

  private async createSession(
    userId: string,
    meta: RequestMeta,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ipHash: hashIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      },
    });

    return { token, expiresAt };
  }

  private async issueEmailToken(
    userId: string,
    type: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ): Promise<string> {
    const token = generateToken(32);
    await this.prisma.emailToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + env.EMAIL_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
    return token;
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;

    await this.prisma.emailToken.updateMany({
      where: { userId: user.id, type: 'VERIFY_EMAIL', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = await this.issueEmailToken(user.id, 'VERIFY_EMAIL');
    const link = `${env.WEB_ORIGIN}/verifier-email?token=${encodeURIComponent(token)}`;
    const message = buildVerificationEmail({
      fullName: user.fullName,
      link,
      expiresInMinutes: env.EMAIL_TOKEN_TTL_MINUTES,
    });
    message.to = user.email;

    try {
      await this.mail.send(message);
    } catch (error) {
      this.logger.error(`Échec d'envoi de l'email de vérification : ${(error as Error).message}`);
    }
  }

  private async findUsableEmailToken(token: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    const record = await this.prisma.emailToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Ce lien est invalide ou a expiré.',
      });
    }

    return record;
  }

  private async registerFailedAttempt(user: User): Promise<void> {
    const attempts = user.failedLoginCount + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
          : user.lockedUntil,
      },
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'auth.login_failed',
      resourceType: 'user',
      resourceId: user.id,
    });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHashPromise ??= hashPassword('timing-equalization-dummy-password', ARGON2_OPTIONS);
    return this.dummyHashPromise;
  }
}

export function toPublicUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    emailVerified: Boolean(user.emailVerifiedAt),
    locale: user.locale,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}
