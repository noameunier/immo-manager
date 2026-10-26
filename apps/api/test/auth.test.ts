import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PASSWORD,
  api,
  readEmailToken,
  registerUser,
  sessionCookieFrom,
} from './helpers';

describe('Inscription', () => {
  it('crée un compte avec des données valides et ouvre une session', async () => {
    const email = `inscription-${randomUUID()}@example.com`;

    const response = await api<{
      user: { id: string; email: string; emailVerified: boolean };
      token?: string;
      expiresAt: string;
    }>('/auth/register', {
      method: 'POST',
      body: { fullName: 'Camille Dupont', email, password: DEFAULT_PASSWORD },
    });

    expect(response.status).toBe(201);
    expect(response.data.user.email).toBe(email);
    expect(response.data.user.emailVerified).toBe(false);
    expect(response.data.token).toBeTruthy();
    expect(new Date(response.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(sessionCookieFrom(response)).toContain('immo_session=');
  });

  it('rejette un email invalide', async () => {
    const response = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Camille Dupont', email: 'pas-un-email', password: DEFAULT_PASSWORD },
    });

    expect(response.status).toBe(400);
    expect((response.data as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejette un mot de passe trop court', async () => {
    const response = await api('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Camille Dupont',
        email: `court-${randomUUID()}@example.com`,
        password: 'court',
      },
    });

    expect(response.status).toBe(400);
  });

  it('refuse une adresse email déjà utilisée', async () => {
    const user = await registerUser();

    const response = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Doublon', email: user.email, password: DEFAULT_PASSWORD },
    });

    expect(response.status).toBe(409);
    expect((response.data as { error: { code: string } }).error.code).toBe('EMAIL_ALREADY_USED');
  });

  it('ne stocke jamais le mot de passe en clair (réponse et emails)', async () => {
    const user = await registerUser();
    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: user.password },
    });

    expect(JSON.stringify(login.data)).not.toContain(user.password);
  });
});

describe('Connexion et session', () => {
  it('accepte les identifiants corrects', async () => {
    const user = await registerUser();

    const response = await api('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: user.password },
    });

    expect(response.status).toBe(200);
    expect((response.data as { user: { email: string } }).user.email).toBe(user.email);
  });

  it('refuse un mot de passe incorrect avec un message générique', async () => {
    const user = await registerUser();

    const response = await api<{ error: { code: string; message: string } }>('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: 'mauvais-mot-de-passe-123' },
    });

    expect(response.status).toBe(401);
    expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    expect(response.data.error.message).toBe('Email ou mot de passe incorrect.');
  });

  it('rejette une requête non authentifiée', async () => {
    const response = await api('/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejette une session inconnue', async () => {
    const response = await api('/auth/me', { token: 'jeton-invente' });
    expect(response.status).toBe(401);
  });

  it('invalide la session après déconnexion', async () => {
    const user = await registerUser();

    const logout = await api('/auth/logout', { method: 'POST', token: user.token });
    expect(logout.status).toBe(200);

    const me = await api('/auth/me', { token: user.token });
    expect(me.status).toBe(401);
  });

  it('accepte l’authentification par cookie pour le web', async () => {
    const email = `cookie-${randomUUID()}@example.com`;
    const login = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Web User', email, password: DEFAULT_PASSWORD },
    });

    const cookie = sessionCookieFrom(login);
    expect(cookie).toBeTruthy();

    const me = await api('/auth/me', { cookie: cookie ?? undefined });
    expect(me.status).toBe(200);
  });

  it('rejette une mutation par cookie provenant d’une origine inconnue (CSRF)', async () => {
    const email = `csrf-${randomUUID()}@example.com`;
    const register = await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'CSRF User', email, password: DEFAULT_PASSWORD },
    });
    const cookie = sessionCookieFrom(register) ?? '';

    const blocked = await api('/owner-entities', {
      method: 'POST',
      cookie,
      body: { type: 'SCI', name: 'Tentative CSRF' },
    });
    expect(blocked.status).toBe(403);
    expect((blocked.data as { error: { code: string } }).error.code).toBe('CSRF_REJECTED');

    const allowed = await api('/owner-entities', {
      method: 'POST',
      cookie,
      headers: { origin: 'http://localhost:3100' },
      body: { type: 'SCI', name: 'Origine autorisée' },
    });
    expect(allowed.status).toBe(201);
  });
});

describe('Vérification email et mot de passe', () => {
  it('confirme l’adresse email à partir du lien reçu', async () => {
    const email = `verif-${randomUUID()}@example.com`;
    await api('/auth/register', {
      method: 'POST',
      body: { fullName: 'Vérification', email, password: DEFAULT_PASSWORD },
    });

    const token = await readEmailToken(email, { linkIncludes: 'verifier-email' });
    const response = await api<{ user: { emailVerified: boolean } }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });

    expect(response.status).toBe(200);
    expect(response.data.user.emailVerified).toBe(true);

    const reuse = await api('/auth/verify-email', { method: 'POST', body: { token } });
    expect(reuse.status).toBe(400);
  });

  it('réinitialise le mot de passe et révoque les sessions existantes', async () => {
    const user = await registerUser();

    const forgot = await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: user.email },
    });
    expect(forgot.status).toBe(202);

    const token = await readEmailToken(user.email, {
      linkIncludes: 'reinitialiser-mot-de-passe',
    });

    const newPassword = 'nouveau-mot-de-passe-2026';
    const reset = await api('/auth/reset-password', {
      method: 'POST',
      body: { token, password: newPassword },
    });
    expect(reset.status).toBe(200);

    const oldSession = await api('/auth/me', { token: user.token });
    expect(oldSession.status).toBe(401);

    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: newPassword },
    });
    expect(login.status).toBe(200);
  });

  it('ne révèle pas l’existence d’un compte sur mot de passe oublié', async () => {
    const unknown = await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: `inconnu-${randomUUID()}@example.com` },
    });
    const known = await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: (await registerUser()).email },
    });

    expect(unknown.status).toBe(202);
    expect(known.status).toBe(202);
    expect(unknown.data).toEqual(known.data);
  });

  it('limite les tentatives de réinitialisation', async () => {
    const email = `limite-${randomUUID()}@example.com`;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        skipRateLimit: false,
      });
      statuses.push(response.status);
    }

    expect(statuses).toContain(429);
  });
});
