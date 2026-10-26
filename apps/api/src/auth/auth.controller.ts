import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@immo/shared';
import { env, isProduction } from '../config/env';
import {
  CurrentAuth,
  type AuthContext,
  type AuthenticatedRequest,
} from '../common/current-auth.decorator';
import { Public } from '../common/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RateLimit } from '../common/rate-limit.guard';
import { AuthService, type RequestMeta, type SessionResult } from './auth.service';

const HOUR = 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @RateLimit({ limit: 10, windowMs: HOUR })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body, requestMeta(request));
    return this.respondWithSession(request, response, result);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit({ limit: 15, windowMs: 15 * 60 * 1000, bodyFields: ['email'] })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body, requestMeta(request));
    return this.respondWithSession(request, response, result);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentAuth() auth: AuthContext,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(auth.session.id, auth.user.id, requestMeta(request));
    response.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @Get('me')
  async me(@CurrentAuth() auth: AuthContext) {
    const user = await this.auth.getProfile(auth.user.id);
    return { user, expiresAt: auth.session.expiresAt.toISOString() };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @RateLimit({ limit: 20, windowMs: HOUR })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string },
    @Req() request: AuthenticatedRequest,
  ) {
    const user = await this.auth.verifyEmail(body.token, requestMeta(request));
    return { user };
  }

  @Post('verification/resend')
  @HttpCode(202)
  @RateLimit({ limit: 5, windowMs: HOUR })
  async resendVerification(@CurrentAuth() auth: AuthContext) {
    await this.auth.resendVerification(auth.user.id);
    return { success: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @RateLimit({ limit: 5, windowMs: HOUR, bodyFields: ['email'] })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.forgotPassword(body.email, requestMeta(request));
    // Réponse volontairement identique, que le compte existe ou non.
    return {
      success: true,
      message: 'Si un compte existe avec cette adresse, un email a été envoyé.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowMs: HOUR })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.resetPassword(body, requestMeta(request));
    return { success: true };
  }

  private respondWithSession(
    request: AuthenticatedRequest,
    response: Response,
    result: SessionResult,
  ) {
    response.cookie(env.SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: result.expiresAt,
    });

    // Les clients mobiles ne gèrent pas les cookies : le jeton leur est
    // renvoyé explicitement, mais uniquement s'ils se déclarent comme tels.
    const isMobile = request.headers['x-client-type'] === 'mobile';

    return {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      ...(isMobile ? { token: result.token } : {}),
    };
  }
}

function requestMeta(request: Request): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  };
}
