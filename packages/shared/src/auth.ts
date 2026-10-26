import { z } from 'zod';
import { emailSchema, passwordSchema, requiredText } from './common';

export const registerSchema = z.object({
  fullName: requiredText(2, 120, 'Le nom complet'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est obligatoire').max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Jeton invalide').max(200),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, 'Jeton invalide').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  locale: string;
  timezone: string;
  createdAt: string;
};

export type AuthSession = {
  user: AuthenticatedUser;
  expiresAt: string;
};
