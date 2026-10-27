import { describe, expect, it } from 'vitest';
import {
  api,
  createBuilding,
  createEntity,
  createLease,
  createProperty,
  createTenant,
  registerUser,
  todayDateOnly,
} from './helpers';

async function bootstrap(token: string) {
  const entity = await createEntity(token);
  const property = await createProperty(token, entity.id, {
    postalCode: '69003',
    city: 'Lyon',
  });
  const tenant = await createTenant(token);
  return { entity, property, tenant };
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('Baux', () => {
  it('crée un bail actif et marque le bien comme occupé', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);

    const response = await api<{
      id: string;
      status: string;
      rentAmount: number;
      chargesAmount: number;
      monthlyTotal: number;
      startsOn: string;
      depositAmount: number | null;
      property: { id: string; name: string };
      tenant: { id: string; name: string };
      entity: { id: string; name: string };
    }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        type: 'MEUBLEE',
        startsOn: shiftDate(todayDateOnly(), -30),
        rentAmount: 850.5,
        chargesAmount: 49.5,
        depositAmount: 1701,
        paymentDay: 5,
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('ACTIVE');
    expect(response.data.rentAmount).toBe(850.5);
    expect(response.data.monthlyTotal).toBe(900);
    expect(response.data.depositAmount).toBe(1701);
    expect(response.data.tenant.id).toBe(tenant.id);
    expect(response.data.property.id).toBe(property.id);
    expect(response.data.entity.id).toBe(entity.id);

    const propertyAfter = await api<{ occupancyStatus: string }>(`/properties/${property.id}`, {
      token: user.token,
    });
    expect(propertyAfter.data.occupancyStatus).toBe('OCCUPIED');
  });

  it('classe un bail futur en « à venir » sans occuper le bien', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);

    const response = await api<{ status: string }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: shiftDate(todayDateOnly(), 15),
        rentAmount: 700,
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('UPCOMING');

    const propertyAfter = await api<{ occupancyStatus: string }>(`/properties/${property.id}`, {
      token: user.token,
    });
    expect(propertyAfter.data.occupancyStatus).toBe('UNKNOWN');
  });

  it('refuse deux baux qui se chevauchent sur le même bien', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);
    await createLease(
      user.token,
      { entityId: entity.id, propertyId: property.id, tenantId: tenant.id },
      { startsOn: shiftDate(todayDateOnly(), -10) },
    );

    const response = await api<{ error: { code: string } }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: (await createTenant(user.token)).id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });

    expect(response.status).toBe(409);
    expect(response.data.error.code).toBe('LEASE_OVERLAP');
  });

  it('autorise des baux successifs sur le même bien', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);
    const today = todayDateOnly();

    await createLease(
      user.token,
      { entityId: entity.id, propertyId: property.id, tenantId: tenant.id },
      { startsOn: shiftDate(today, -400), endsOn: shiftDate(today, -40) },
    );

    const response = await api<{ status: string }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: shiftDate(today, -30),
        rentAmount: 900,
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('ACTIVE');
  });

  it('rejette une date de fin antérieure au début', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);

    const response = await api<{ error: { details?: { path: string }[] } }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: '2026-06-01',
        endsOn: '2026-05-01',
        rentAmount: 700,
      },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.details?.some((detail) => detail.path === 'endsOn')).toBe(true);
  });

  it('refuse un bien rattaché à une autre entité bailleur', async () => {
    const user = await registerUser();
    const { property, tenant } = await bootstrap(user.token);
    const otherEntity = await createEntity(user.token, { name: 'Autre SCI' });

    const response = await api<{ error: { code: string } }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: otherEntity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('PROPERTY_ENTITY_MISMATCH');
  });

  it('refuse un bien, une entité ou un locataire d’un autre propriétaire', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const mine = await bootstrap(owner.token);
    const theirs = await bootstrap(other.token);

    const foreignProperty = await api('/leases', {
      method: 'POST',
      token: owner.token,
      body: {
        entityId: mine.entity.id,
        propertyId: theirs.property.id,
        tenantId: mine.tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });
    expect(foreignProperty.status).toBe(404);

    const foreignTenant = await api('/leases', {
      method: 'POST',
      token: owner.token,
      body: {
        entityId: mine.entity.id,
        propertyId: mine.property.id,
        tenantId: theirs.tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });
    expect(foreignTenant.status).toBe(404);

    const foreignEntity = await api('/leases', {
      method: 'POST',
      token: owner.token,
      body: {
        entityId: theirs.entity.id,
        propertyId: mine.property.id,
        tenantId: mine.tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });
    expect(foreignEntity.status).toBe(404);
  });

  it('refuse un bien ou un locataire archivé', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const property = await createProperty(user.token, entity.id, {
      postalCode: '69003',
      city: 'Lyon',
    });
    const tenant = await createTenant(user.token);

    await api(`/properties/${property.id}`, { method: 'DELETE', token: user.token });

    const archivedProperty = await api<{ error: { code: string } }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 800,
      },
    });
    expect(archivedProperty.status).toBe(400);
    expect(archivedProperty.data.error.code).toBe('PROPERTY_ARCHIVED');
  });

  it('termine un bail, libère le bien, puis le restaure', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);
    const lease = await createLease(user.token, {
      entityId: entity.id,
      propertyId: property.id,
      tenantId: tenant.id,
    });

    const ended = await api<{ status: string }>(`/leases/${lease.id}`, {
      method: 'DELETE',
      token: user.token,
    });
    expect(ended.status).toBe(200);
    expect(ended.data.status).toBe('ARCHIVED');

    const propertyAfter = await api<{ occupancyStatus: string }>(`/properties/${property.id}`, {
      token: user.token,
    });
    expect(propertyAfter.data.occupancyStatus).toBe('VACANT');

    const restored = await api<{ status: string }>(`/leases/${lease.id}/restore`, {
      method: 'POST',
      token: user.token,
    });
    expect(restored.status).toBe(200);
    expect(restored.data.status).toBe('ACTIVE');

    const propertyRestored = await api<{ occupancyStatus: string }>(`/properties/${property.id}`, {
      token: user.token,
    });
    expect(propertyRestored.data.occupancyStatus).toBe('OCCUPIED');
  });

  it('filtre les baux par statut, bien et locataire', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);
    const active = await createLease(user.token, {
      entityId: entity.id,
      propertyId: property.id,
      tenantId: tenant.id,
    });

    const futureProperty = await createProperty(user.token, entity.id, {
      name: 'Bien futur',
      type: 'HOUSE',
      postalCode: '69003',
      city: 'Lyon',
    });
    const future = await createLease(
      user.token,
      { entityId: entity.id, propertyId: futureProperty.id, tenantId: tenant.id },
      { startsOn: shiftDate(todayDateOnly(), 30) },
    );

    const actives = await api<{ id: string }[]>('/leases?status=ACTIVE', { token: user.token });
    expect(actives.data.map((lease) => lease.id)).toContain(active.id);
    expect(actives.data.map((lease) => lease.id)).not.toContain(future.id);

    const upcoming = await api<{ id: string }[]>('/leases?status=UPCOMING', {
      token: user.token,
    });
    expect(upcoming.data.map((lease) => lease.id)).toContain(future.id);

    const byTenant = await api<{ id: string }[]>(`/leases?tenantId=${tenant.id}`, {
      token: user.token,
    });
    expect(byTenant.data).toHaveLength(2);

    const byProperty = await api<{ id: string }[]>(`/leases?propertyId=${property.id}`, {
      token: user.token,
    });
    expect(byProperty.data).toHaveLength(1);
  });

  it('isole les baux entre propriétaires', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const mine = await bootstrap(owner.token);
    const lease = await createLease(owner.token, {
      entityId: mine.entity.id,
      propertyId: mine.property.id,
      tenantId: mine.tenant.id,
    });

    const read = await api(`/leases/${lease.id}`, { token: other.token });
    expect(read.status).toBe(404);

    const update = await api(`/leases/${lease.id}`, {
      method: 'PATCH',
      token: other.token,
      body: { rentAmount: 10 },
    });
    expect(update.status).toBe(404);

    const terminate = await api(`/leases/${lease.id}`, {
      method: 'DELETE',
      token: other.token,
    });
    expect(terminate.status).toBe(404);

    const restore = await api(`/leases/${lease.id}/restore`, {
      method: 'POST',
      token: other.token,
    });
    expect(restore.status).toBe(404);

    const list = await api<{ id: string }[]>('/leases', { token: other.token });
    expect(list.data.some((item) => item.id === lease.id)).toBe(false);
  });

  it('refuse de rattacher un bail à l’immeuble d’une autre entité', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const building = await createBuilding(user.token, entity.id);
    const property = await createProperty(user.token, entity.id, { buildingId: building.id });
    const tenant = await createTenant(user.token);
    const otherEntity = await createEntity(user.token, { name: 'SCI bis' });

    const response = await api<{ error: { code: string } }>('/leases', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: otherEntity.id,
        propertyId: property.id,
        tenantId: tenant.id,
        startsOn: todayDateOnly(),
        rentAmount: 900,
      },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('PROPERTY_ENTITY_MISMATCH');
  });

  it('agrège baux et loyers dans le tableau de bord', async () => {
    const user = await registerUser();
    const { entity, property, tenant } = await bootstrap(user.token);
    await createLease(
      user.token,
      { entityId: entity.id, propertyId: property.id, tenantId: tenant.id },
      { rentAmount: 1000, chargesAmount: 100 },
    );

    const secondProperty = await createProperty(user.token, entity.id, {
      name: 'Bien à venir',
      type: 'HOUSE',
      postalCode: '69003',
      city: 'Lyon',
    });
    await createLease(
      user.token,
      { entityId: entity.id, propertyId: secondProperty.id, tenantId: tenant.id },
      { startsOn: shiftDate(todayDateOnly(), 20), rentAmount: 500 },
    );

    const summary = await api<{
      tenants: { total: number };
      leases: { active: number; upcoming: number; endingSoon: number };
      rents: { monthlyRent: number; monthlyCharges: number; monthlyTotal: number };
      archived: { tenants: number; leases: number };
    }>('/dashboard/summary', { token: user.token });

    expect(summary.status).toBe(200);
    expect(summary.data.tenants.total).toBe(1);
    expect(summary.data.leases.active).toBe(1);
    expect(summary.data.leases.upcoming).toBe(1);
    expect(summary.data.leases.endingSoon).toBe(0);
    expect(summary.data.rents).toEqual({
      monthlyRent: 1000,
      monthlyCharges: 100,
      monthlyTotal: 1100,
    });
    expect(summary.data.archived.tenants).toBe(0);
    expect(summary.data.archived.leases).toBe(0);

    const other = await registerUser();
    const otherSummary = await api<{
      tenants: { total: number };
      leases: { active: number };
      rents: { monthlyTotal: number };
    }>('/dashboard/summary', { token: other.token });
    expect(otherSummary.data.tenants.total).toBe(0);
    expect(otherSummary.data.leases.active).toBe(0);
    expect(otherSummary.data.rents.monthlyTotal).toBe(0);
  });
});
