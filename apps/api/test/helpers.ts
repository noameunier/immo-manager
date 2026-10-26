import { randomUUID } from 'node:crypto';

export const API_URL = process.env.TEST_API_URL ?? 'http://127.0.0.1:4200';
export const MAILPIT_URL = process.env.TEST_MAILPIT_URL ?? 'http://127.0.0.1:8026';
export const DEFAULT_PASSWORD = 'mot-de-passe-de-test-2026';

export type ApiResponse<T> = {
  status: number;
  data: T;
  headers: Headers;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookie?: string;
  /** Désactive la limitation de débit (autorisé uniquement en NODE_ENV=test). */
  skipRateLimit?: boolean;
};

export async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.skipRateLimit === false ? {} : { 'x-test-skip-rate-limit': '1' }),
    'x-client-type': 'mobile',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = (text.length > 0 ? JSON.parse(text) : null) as T;

  return { status: response.status, data, headers: response.headers };
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  token: string;
  fullName: string;
};

export async function registerUser(
  overrides: Partial<{ email: string; password: string; fullName: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `test-${randomUUID()}@example.com`;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const fullName = overrides.fullName ?? 'Propriétaire de test';

  const response = await api<{
    user: { id: string; email: string };
    token?: string;
  }>('/auth/register', {
    method: 'POST',
    body: { fullName, email, password },
  });

  if (response.status !== 201 || !response.data.token) {
    throw new Error(`Inscription impossible : ${response.status} ${JSON.stringify(response.data)}`);
  }

  return {
    id: response.data.user.id,
    email: response.data.user.email,
    password,
    token: response.data.token,
    fullName,
  };
}

export async function createEntity(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const response = await api<{ id: string; name: string }>('/owner-entities', {
    method: 'POST',
    token,
    body: {
      type: 'SCI',
      name: `SCI ${randomUUID().slice(0, 8)}`,
      city: 'Lyon',
      postalCode: '69003',
      ...overrides,
    },
  });

  if (response.status !== 201) {
    throw new Error(`Création d'entité impossible : ${response.status}`);
  }

  return response.data;
}

export async function createBuilding(
  token: string,
  entityId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const response = await api<{ id: string }>('/buildings', {
    method: 'POST',
    token,
    body: {
      entityId,
      name: `Immeuble ${randomUUID().slice(0, 8)}`,
      addressLine1: '12 rue de la République',
      postalCode: '69002',
      city: 'Lyon',
      ...overrides,
    },
  });

  if (response.status !== 201) {
    throw new Error(`Création d'immeuble impossible : ${response.status}`);
  }

  return response.data;
}

export async function createProperty(
  token: string,
  entityId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const response = await api<{ id: string }>('/properties', {
    method: 'POST',
    token,
    body: {
      entityId,
      name: `Bien ${randomUUID().slice(0, 8)}`,
      type: 'APARTMENT',
      ...overrides,
    },
  });

  if (response.status !== 201) {
    throw new Error(`Création de bien impossible : ${response.status}`);
  }

  return response.data;
}

/**
 * Récupère un jeton envoyé par email via l'API HTTP de Mailpit.
 * Permet de tester la vérification d'email de bout en bout, sans exposer
 * de jeton dans les réponses de l'API.
 */
export async function readEmailToken(
  email: string,
  options: { linkIncludes?: string; timeoutMs?: number } = {},
): Promise<string> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000);

  while (Date.now() < deadline) {
    const listResponse = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=100`);
    if (listResponse.ok) {
      const list = (await listResponse.json()) as {
        messages?: { ID: string; To?: { Address: string }[] }[];
      };

      for (const message of list.messages ?? []) {
        const recipients = (message.To ?? []).map((to) => to.Address.toLowerCase());
        if (!recipients.includes(email.toLowerCase())) continue;

        const detailResponse = await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`);
        if (!detailResponse.ok) continue;

        const detail = (await detailResponse.json()) as {
          Text?: string;
          HTML?: string;
        };
        const content = `${detail.Text ?? ''}\n${detail.HTML ?? ''}`;
        if (options.linkIncludes && !content.includes(options.linkIncludes)) continue;

        const match = /token=([A-Za-z0-9_-]+)/.exec(content);
        if (match?.[1]) return decodeURIComponent(match[1]);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Aucun email contenant un jeton trouvé pour ${email}`);
}

/** Extrait l'en-tête Cookie de session d'une réponse de l'API. */
export function sessionCookieFrom(response: { headers: Headers }): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = /immo_session=([^;]+)/.exec(setCookie);
  return match?.[1] ? `immo_session=${match[1]}` : null;
}
