import { describe, expect, it } from 'vitest';
import { api, createBuilding, createEntity, createProperty, registerUser } from './helpers';

type Summary = {
  entities: { total: number; byType: Record<string, number> };
  buildings: { total: number };
  properties: {
    total: number;
    lots: number;
    independent: number;
    byType: Record<string, number>;
    totalSurfaceM2: number;
  };
  tenants: { total: number };
  leases: { active: number; upcoming: number; endingSoon: number };
  rents: { monthlyRent: number; monthlyCharges: number; monthlyTotal: number };
  archived: {
    entities: number;
    buildings: number;
    properties: number;
    tenants: number;
    leases: number;
  };
};

describe('Tableau de bord', () => {
  it('calcule les indicateurs à partir des données réelles', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token, { type: 'SCI' });
    await createEntity(user.token, { type: 'INDIVIDUAL' });
    const building = await createBuilding(user.token, entity.id);

    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      type: 'APARTMENT',
      lotNumber: 'L1',
      surfaceM2: 50,
    });
    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      type: 'PARKING',
      lotNumber: 'P1',
      surfaceM2: 12.5,
    });
    await createProperty(user.token, entity.id, {
      type: 'HOUSE',
      surfaceM2: 100,
      addressLine1: '2 rue des Tests',
      postalCode: '69003',
      city: 'Lyon',
    });

    const response = await api<Summary>('/dashboard/summary', { token: user.token });

    expect(response.status).toBe(200);
    expect(response.data.entities.total).toBe(2);
    expect(response.data.entities.byType.SCI).toBe(1);
    expect(response.data.entities.byType.INDIVIDUAL).toBe(1);
    expect(response.data.buildings.total).toBe(1);
    expect(response.data.properties.total).toBe(3);
    expect(response.data.properties.lots).toBe(2);
    expect(response.data.properties.independent).toBe(1);
    expect(response.data.properties.byType.APARTMENT).toBe(1);
    expect(response.data.properties.byType.PARKING).toBe(1);
    expect(response.data.properties.byType.HOUSE).toBe(1);
    expect(response.data.properties.totalSurfaceM2).toBe(162.5);
    expect(response.data.tenants.total).toBe(0);
    expect(response.data.leases).toEqual({ active: 0, upcoming: 0, endingSoon: 0 });
    expect(response.data.rents).toEqual({ monthlyRent: 0, monthlyCharges: 0, monthlyTotal: 0 });
    expect(response.data.archived).toEqual({
      entities: 0,
      buildings: 0,
      properties: 0,
      tenants: 0,
      leases: 0,
    });
  });

  it('ne compte que les données du propriétaire connecté', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const entity = await createEntity(owner.token);
    const building = await createBuilding(owner.token, entity.id);
    await createProperty(owner.token, entity.id, {
      buildingId: building.id,
      type: 'APARTMENT',
      lotNumber: 'A1',
    });

    const response = await api<Summary>('/dashboard/summary', { token: other.token });

    expect(response.status).toBe(200);
    expect(response.data.entities.total).toBe(0);
    expect(response.data.buildings.total).toBe(0);
    expect(response.data.properties.total).toBe(0);
    expect(response.data.properties.totalSurfaceM2).toBe(0);
  });

  it('exclut les ressources archivées des indicateurs actifs', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const property = await createProperty(user.token, entity.id, {
      type: 'BOX',
      addressLine1: '3 rue des Tests',
      postalCode: '69003',
      city: 'Lyon',
    });

    await api(`/properties/${property.id}`, { method: 'DELETE', token: user.token });

    const response = await api<Summary>('/dashboard/summary', { token: user.token });

    expect(response.data.properties.total).toBe(0);
    expect(response.data.archived.properties).toBe(1);
  });

  it('exige une authentification', async () => {
    const response = await api('/dashboard/summary');
    expect(response.status).toBe(401);
  });
});
