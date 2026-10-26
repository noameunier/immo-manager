import { describe, expect, it } from 'vitest';
import { api, createBuilding, createEntity, registerUser } from './helpers';

describe('Entités propriétaires', () => {
  it('crée une entité pour le propriétaire connecté', async () => {
    const user = await registerUser();

    const response = await api<{ id: string; name: string; type: string; counts: unknown }>(
      '/owner-entities',
      {
        method: 'POST',
        token: user.token,
        body: {
          type: 'SCI',
          name: 'SCI Bellecour',
          siren: '130025265',
          email: 'contact@sci-bellecour.fr',
          addressLine1: '1 place Bellecour',
          postalCode: '69002',
          city: 'Lyon',
        },
      },
    );

    expect(response.status).toBe(201);
    expect(response.data.name).toBe('SCI Bellecour');
    expect(response.data.type).toBe('SCI');
    expect(response.data.counts).toEqual({ buildings: 0, properties: 0 });
  });

  it('rejette une entité sans nom ou avec un type inconnu', async () => {
    const user = await registerUser();

    const withoutName = await api('/owner-entities', {
      method: 'POST',
      token: user.token,
      body: { type: 'SCI' },
    });
    expect(withoutName.status).toBe(400);

    const badType = await api('/owner-entities', {
      method: 'POST',
      token: user.token,
      body: { type: 'ASSOCIATION', name: 'Type invalide' },
    });
    expect(badType.status).toBe(400);
  });

  it('rejette un SIREN dont la somme de contrôle est invalide', async () => {
    const user = await registerUser();

    const response = await api<{ error: { details?: { path: string }[] } }>('/owner-entities', {
      method: 'POST',
      token: user.token,
      body: { type: 'SCI', name: 'SCI invalide', siren: '123456789' },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.details?.some((detail) => detail.path === 'siren')).toBe(true);
  });

  it('liste, modifie et archive ses entités', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token, { name: 'SCI à modifier' });

    const list = await api<{ id: string }[]>('/owner-entities', { token: user.token });
    expect(list.status).toBe(200);
    expect(list.data.some((item) => item.id === entity.id)).toBe(true);

    const update = await api<{ name: string; city: string | null }>(
      `/owner-entities/${entity.id}`,
      {
        method: 'PATCH',
        token: user.token,
        body: { name: 'SCI modifiée', city: 'Villeurbanne' },
      },
    );
    expect(update.status).toBe(200);
    expect(update.data.name).toBe('SCI modifiée');
    expect(update.data.city).toBe('Villeurbanne');

    const archive = await api<{ archivedAt: string | null }>(`/owner-entities/${entity.id}`, {
      method: 'DELETE',
      token: user.token,
    });
    expect(archive.status).toBe(200);
    expect(archive.data.archivedAt).not.toBeNull();

    const activeList = await api<{ id: string }[]>('/owner-entities', { token: user.token });
    expect(activeList.data.some((item) => item.id === entity.id)).toBe(false);

    const fullList = await api<{ id: string }[]>('/owner-entities?includeArchived=true', {
      token: user.token,
    });
    expect(fullList.data.some((item) => item.id === entity.id)).toBe(true);

    const restore = await api<{ archivedAt: string | null }>(
      `/owner-entities/${entity.id}/restore`,
      { method: 'POST', token: user.token },
    );
    expect(restore.status).toBe(200);
    expect(restore.data.archivedAt).toBeNull();
  });

  it('refuse d’archiver une entité qui possède encore des biens actifs', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    await createBuilding(user.token, entity.id);

    const response = await api<{ error: { code: string } }>(`/owner-entities/${entity.id}`, {
      method: 'DELETE',
      token: user.token,
    });

    expect(response.status).toBe(409);
    expect(response.data.error.code).toBe('ENTITY_HAS_ACTIVE_RESOURCES');
  });

  it('isole les entités entre propriétaires', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const entity = await createEntity(owner.token);

    const read = await api(`/owner-entities/${entity.id}`, { token: intruder.token });
    expect(read.status).toBe(404);

    const update = await api(`/owner-entities/${entity.id}`, {
      method: 'PATCH',
      token: intruder.token,
      body: { name: 'Détournée' },
    });
    expect(update.status).toBe(404);

    const archive = await api(`/owner-entities/${entity.id}`, {
      method: 'DELETE',
      token: intruder.token,
    });
    expect(archive.status).toBe(404);

    const intruderList = await api<{ id: string }[]>('/owner-entities', { token: intruder.token });
    expect(intruderList.data).toHaveLength(0);
  });
});
