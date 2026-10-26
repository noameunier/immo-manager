import { describe, expect, it } from 'vitest';
import {
  api,
  createBuilding,
  createEntity,
  createProperty,
  registerUser,
} from './helpers';

describe('Immeubles', () => {
  it('crée un immeuble rattaché à une entité du propriétaire', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api<{ id: string; name: string; entity: { id: string } }>(
      '/buildings',
      {
        method: 'POST',
        token: user.token,
        body: {
          entityId: entity.id,
          name: 'Immeuble Victor Hugo',
          addressLine1: '25 rue Victor Hugo',
          postalCode: '69002',
          city: 'Lyon',
          constructionYear: 1900,
        },
      },
    );

    expect(response.status).toBe(201);
    expect(response.data.entity.id).toBe(entity.id);
  });

  it('rejette un code postal invalide', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api('/buildings', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        name: 'Immeuble',
        addressLine1: '1 rue du Test',
        postalCode: '69',
        city: 'Lyon',
      },
    });

    expect(response.status).toBe(400);
  });

  it('refuse de rattacher un immeuble à l’entité d’un autre propriétaire', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const entity = await createEntity(owner.token);

    const response = await api<{ error: { code: string } }>('/buildings', {
      method: 'POST',
      token: intruder.token,
      body: {
        entityId: entity.id,
        name: 'Immeuble indésirable',
        addressLine1: '1 rue du Test',
        postalCode: '69001',
        city: 'Lyon',
      },
    });

    expect(response.status).toBe(404);
    expect(response.data.error.code).toBe('ENTITY_NOT_FOUND');
  });

  it('retourne le détail avec ses lots', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const building = await createBuilding(user.token, entity.id);
    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      name: 'Lot 1',
      type: 'APARTMENT',
      lotNumber: 'L1',
    });
    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      name: 'Parking 4',
      type: 'PARKING',
      lotNumber: 'P4',
    });

    const detail = await api<{ properties: { name: string }[]; counts: { properties: number } }>(
      `/buildings/${building.id}`,
      { token: user.token },
    );

    expect(detail.status).toBe(200);
    expect(detail.data.counts.properties).toBe(2);
    expect(detail.data.properties.map((property) => property.name).sort()).toEqual([
      'Lot 1',
      'Parking 4',
    ]);
  });

  it('refuse d’archiver un immeuble contenant des lots actifs', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const building = await createBuilding(user.token, entity.id);
    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      type: 'APARTMENT',
      lotNumber: 'L1',
    });

    const response = await api<{ error: { code: string } }>(`/buildings/${building.id}`, {
      method: 'DELETE',
      token: user.token,
    });

    expect(response.status).toBe(409);
    expect(response.data.error.code).toBe('BUILDING_HAS_PROPERTIES');
  });

  it('isole les immeubles entre propriétaires', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const entity = await createEntity(owner.token);
    const building = await createBuilding(owner.token, entity.id);

    expect((await api(`/buildings/${building.id}`, { token: intruder.token })).status).toBe(404);
    expect(
      (
        await api(`/buildings/${building.id}`, {
          method: 'PATCH',
          token: intruder.token,
          body: { name: 'Détourné' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await api(`/buildings/${building.id}`, { method: 'DELETE', token: intruder.token })).status,
    ).toBe(404);
  });
});
