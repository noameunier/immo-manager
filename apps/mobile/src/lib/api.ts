import Constants from 'expo-constants';
import type { ApiErrorPayload } from '@immo/shared';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/**
 * URL de l'API.
 * - Émulateur Android : 10.0.2.2 pointe vers la machine hôte.
 * - Appareil physique : définir EXPO_PUBLIC_API_URL (voir README).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://10.0.2.2:4100';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'x-client-type': 'mobile',
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const payload: unknown = text.length > 0 ? JSON.parse(text) : null;

  if (!response.ok) {
    const candidate = payload as ApiErrorPayload | null;
    throw new ApiError(
      response.status,
      candidate?.error?.code ?? 'UNKNOWN_ERROR',
      candidate?.error?.message ?? 'Une erreur est survenue.',
    );
  }

  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur inattendue est survenue.';
}
