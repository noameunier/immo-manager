import type { ApiErrorPayload } from '@immo/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: unknown };
  return typeof candidate.error === 'object' && candidate.error !== null;
}

/**
 * Appel API côté navigateur.
 * Le cookie de session est first-party (même origine via /api), donc
 * `credentials: 'include'` suffit et aucun jeton n'est manipulé en JavaScript.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: options.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  const text = await response.text();
  const payload: unknown = text.length > 0 ? JSON.parse(text) : null;

  if (!response.ok) {
    if (isApiErrorPayload(payload)) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
        payload.error.details,
      );
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', 'Une erreur est survenue.');
  }

  return payload as T;
}

/** Transforme une erreur quelconque en message affichable en français. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur inattendue est survenue. Merci de réessayer.';
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  return Object.fromEntries(error.details.map((detail) => [detail.path, detail.message]));
}
