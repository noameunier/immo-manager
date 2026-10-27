import { describe, expect, it } from 'vitest';
import {
  api,
  createEntity,
  createLease,
  createProperty,
  createTenant,
  registerUser,
} from './helpers';

describe('Locataires', () => {
  it('crée un locataire pour le propriétaire connecté', async () => {
    const user = await registerUser();

    const response = await api<{
      id: string;
      name: string;
      type: string;
      email: string;
      leaseCount: number;
    }>('/tenants', {
      method: 'POST',
      token: user.token,
      body: {
        type: 'COMPANY',
        name: 'SARL Locataire',
        email: 'contact@sarl-locataire.fr',
        phone: '04 78 00 00 00',
        addressLine1: '3 rue de la Paix',
        postalCode: '69003',
        city: 'Lyon',
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.name).toBe('SARL Locataire');
    expect(response.data.type).toBe('COMPANY');
    expect(response.data.email).toBe('contact@sarl-locataire.fr');
    expect(response.data.leaseCount).toBe(0);
  });

  it('rejette un locataire sans nom ou avec un email invalide', async () => {
    const user = await registerUser();

    const withoutName = await api('/tenants', {
      method: 'POST',
      token: user.token,
      body: { type: 'INDIVIDUAL' },
    });
    expect(withoutName.status).toBe(400);

    const badEmail = await api<{ error: { details?: { path: string }[] } }>('/tenants', {
      method: 'POST',
      token: user.token,
      body: { type: 'INDIVIDUAL', name: 'Email invalide', email: 'pas-un-email' },
    });
    expect(badEmail.status).toBe(400);
    expect(badEmail.data.error.details?.some((detail) => detail.path === 'email')).toBe(true);
  });

  it('modifie, archive et restaure un locataire', async () => {
    const user = await registerUser();
    const tenant = await createTenant(user.token, { name: 'Locataire à modifier' });

    const update = await api<{ name: string; city: string | null }>(`/tenants/${tenant.id}`, {
      method: 'PATCH',
      token: user.token,
      body: { name: 'Locataire modifié', city: 'Villeurbanne' },
    });
    expect(update.status).toBe(200);
    expect(update.data.name).toBe('Locataire modifié');
    expect(update.data.city).toBe('Villeurbanne');

    const archived = await api<{ archivedAt: string | null }>(`/tenants/${tenant.id}`, {
      method: 'DELETE',
      token: user.token,
    });
    expect(archived.status).toBe(200);
    expect(archived.data.archivedAt).not.toBeNull();

    const withoutArchives = await api<{ id: string }[]>('/tenants', { token: user.token });
    expect(withoutArchives.data.some((item) => item.id === tenant.id)).toBe(false);

    const withArchives = await api<{ id: string }[]>('/tenants?archived=true', {
      token: user.token,
    });
    expect(withArchives.data.some((item) => item.id === tenant.id)).toBe(true);

    const restored = await api<{ archivedAt: string | null }>(`/tenants/${tenant.id}/restore`, {
      method: 'POST',
      token: user.token,
    });
    expect(restored.status).toBe(200);
    expect(restored.data.archivedAt).toBeNull();
  });

  it('recherche un locataire par nom ou ville', async () => {
    const user = await registerUser();
    const unique = `Cherchable-${Date.now()}`;
    await createTenant(user.token, { name: unique, city: 'Marseille' });

    const byName = await api<{ name: string }[]>(`/tenants?search=${encodeURIComponent(unique)}`, {
      token: user.token,
    });
    expect(byName.data).toHaveLength(1);

    const byCity = await api<{ city: string | null }[]>('/tenants?search=Marseille', {
      token: user.token,
    });
    expect(byCity.data.some((tenant) => tenant.city === 'Marseille')).toBe(true);
  });

  it('isole les locataires entre propriétaires', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const tenant = await createTenant(owner.token, { name: 'Locataire privé' });

    const read = await api(`/tenants/${tenant.id}`, { token: other.token });
    expect(read.status).toBe(404);

    const update = await api(`/tenants/${tenant.id}`, {
      method: 'PATCH',
      token: other.token,
      body: { name: 'Tentative' },
    });
    expect(update.status).toBe(404);

    const archive = await api(`/tenants/${tenant.id}`, {
      method: 'DELETE',
      token: other.token,
    });
    expect(archive.status).toBe(404);

    const list = await api<{ id: string }[]>('/tenants', { token: other.token });
    expect(list.data.some((item) => item.id === tenant.id)).toBe(false);
  });

  it('refuse d’archiver un locataire qui a un bail en cours', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const property = await createProperty(user.token, entity.id, {
      postalCode: '69003',
      city: 'Lyon',
    });
    const tenant = await createTenant(user.token);
    await createLease(user.token, {
      entityId: entity.id,
      propertyId: property.id,
      tenantId: tenant.id,
    });

    const response = await api<{ error: { code: string } }>(`/tenants/${tenant.id}`, {
      method: 'DELETE',
      token: user.token,
    });

    expect(response.status).toBe(409);
    expect(response.data.error.code).toBe('TENANT_HAS_ACTIVE_LEASE');

    const detail = await api<{ leaseCount: number }>(`/tenants/${tenant.id}`, {
      token: user.token,
    });
    expect(detail.data.leaseCount).toBe(1);
  });
});
