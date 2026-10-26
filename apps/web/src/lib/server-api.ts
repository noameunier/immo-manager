import { cookies } from 'next/headers';
import type { AuthenticatedUser } from '@immo/shared';
import { ApiError } from './api';

const API_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4100';
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'immo_session';

/**
 * Appel API côté serveur (composants serveur Next.js).
 * Le cookie de session est transmis explicitement : l'API reste l'unique
 * source de vérité pour l'authentification.
 */
export async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });

  const text = await response.text();
  const payload: unknown = text.length > 0 ? JSON.parse(text) : null;

  if (!response.ok) {
    const candidate = payload as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      candidate?.error?.code ?? 'UNKNOWN_ERROR',
      candidate?.error?.message ?? 'Une erreur est survenue.',
    );
  }

  return payload as T;
}

export type SessionInfo = { user: AuthenticatedUser; expiresAt: string };

/** Retourne la session courante, ou null si l'utilisateur n'est pas connecté. */
export async function getSession(): Promise<SessionInfo | null> {
  try {
    return await serverFetch<SessionInfo>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function hasSessionCookie(cookieHeader: string | null): boolean {
  return Boolean(
    cookieHeader?.split(';').some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`)),
  );
}
