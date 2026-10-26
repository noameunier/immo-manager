import { describe, expect, it } from 'vitest';
import { api, createBuilding, createEntity, createProperty, registerUser } from './helpers';

describe('Biens et lots', () => {
  it('crée un lot rattaché à un immeuble', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const building = await createBuilding(user.token, entity.id);

    const response = await api<{
      lotNumber: string;
      surfaceM2: number;
      building: { id: string };
      entity: { id: string };
    }>('/properties', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        buildingId: building.id,
        name: 'Appartement 3B',
        type: 'APARTMENT',
        lotNumber: '3B',
        surfaceM2: 62.5,
        rooms: 3,
        occupancyStatus: 'VACANT',
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.lotNumber).toBe('3B');
    expect(response.data.surfaceM2).toBe(62.5);
    expect(response.data.building.id).toBe(building.id);
  });

  it('crée un bien indépendant avec une adresse complète', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api<{ id: string; buildingId: string | null }>('/properties', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        name: 'Maison des Lilas',
        type: 'HOUSE',
        addressLine1: '4 allée des Lilas',
        postalCode: '69100',
        city: 'Villeurbanne',
        surfaceM2: 110,
      },
    });

    expect(response.status).toBe(201);
    expect(response.data.buildingId).toBeNull();
  });

  it('refuse un bien indépendant sans adresse', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api<{ error: { code: string } }>('/properties', {
      method: 'POST',
      token: user.token,
      body: { entityId: entity.id, name: 'Maison sans adresse', type: 'HOUSE' },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('ADDRESS_REQUIRED');
  });

  it('refuse deux lots avec le même numéro dans un immeuble', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const building = await createBuilding(user.token, entity.id);

    await createProperty(user.token, entity.id, {
      buildingId: building.id,
      type: 'APARTMENT',
      lotNumber: 'L1',
    });

    const duplicate = await api<{ error: { code: string } }>('/properties', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        buildingId: building.id,
        name: 'Doublon',
        type: 'APARTMENT',
        lotNumber: 'L1',
      },
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.data.error.code).toBe('LOT_NUMBER_ALREADY_USED');
  });

  it('refuse un lot rattaché à un immeuble d’une autre entité', async () => {
    const user = await registerUser();
    const entityA = await createEntity(user.token);
    const entityB = await createEntity(user.token);
    const buildingA = await createBuilding(user.token, entityA.id);

    const response = await api<{ error: { code: string } }>('/properties', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entityB.id,
        buildingId: buildingA.id,
        name: 'Lot incohérent',
        type: 'APARTMENT',
      },
    });

    expect(response.status).toBe(400);
    expect(response.data.error.code).toBe('BUILDING_ENTITY_MISMATCH');
  });

  it('modifie et archive un bien', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);
    const property = await createProperty(user.token, entity.id, {
      name: 'Ancien nom',
      addressLine1: '1 rue A',
      postalCode: '69001',
      city: 'Lyon',
    });

    const update = await api<{ name: string; occupancyStatus: string }>(
      `/properties/${property.id}`,
      {
        method: 'PATCH',
        token: user.token,
        body: { name: 'Nouveau nom', occupancyStatus: 'OCCUPIED' },
      },
    );
    expect(update.status).toBe(200);
    expect(update.data.name).toBe('Nouveau nom');
    expect(update.data.occupancyStatus).toBe('OCCUPIED');

    const archive = await api<{ archivedAt: string | null }>(`/properties/${property.id}`, {
      method: 'DELETE',
      token: user.token,
    });
    expect(archive.status).toBe(200);
    expect(archive.data.archivedAt).not.toBeNull();

    const active = await api<{ id: string }[]>('/properties', { token: user.token });
    expect(active.data.some((item) => item.id === property.id)).toBe(false);

    const restore = await api<{ archivedAt: string | null }>(`/properties/${property.id}/restore`, {
      method: 'POST',
      token: user.token,
    });
    expect(restore.status).toBe(200);
    expect(restore.data.archivedAt).toBeNull();
  });

  it('isole les biens entre propriétaires', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const entity = await createEntity(owner.token);
    const property = await createProperty(owner.token, entity.id, {
      addressLine1: '1 rue A',
      postalCode: '69001',
      city: 'Lyon',
    });

    expect((await api(`/properties/${property.id}`, { token: intruder.token })).status).toBe(404);
    expect(
      (
        await api(`/properties/${property.id}`, {
          method: 'PATCH',
          token: intruder.token,
          body: { name: 'Détourné' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await api(`/properties/${property.id}`, { method: 'DELETE', token: intruder.token })).status,
    ).toBe(404);

    const intruderList = await api<{ id: string }[]>('/properties', { token: intruder.token });
    expect(intruderList.data).toHaveLength(0);
  });

  it('refuse d’associer un lot à l’immeuble d’un autre propriétaire', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const ownerEntity = await createEntity(owner.token);
    const ownerBuilding = await createBuilding(owner.token, ownerEntity.id);

    const intruderEntity = await createEntity(intruder.token);
    const response = await api<{ error: { code: string } }>('/properties', {
      method: 'POST',
      token: intruder.token,
      body: {
        entityId: intruderEntity.id,
        buildingId: ownerBuilding.id,
        name: 'Lot volé',
        type: 'APARTMENT',
      },
    });

    expect(response.status).toBe(404);
    expect(response.data.error.code).toBe('BUILDING_NOT_FOUND');
  });
});

describe('Validation des biens', () => {
  it('rejette un type de bien inconnu', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api('/properties', {
      method: 'POST',
      token: user.token,
      body: { entityId: entity.id, name: 'Château', type: 'CASTLE' },
    });

    expect(response.status).toBe(400);
  });

  it('rejette une surface négative', async () => {
    const user = await registerUser();
    const entity = await createEntity(user.token);

    const response = await api('/properties', {
      method: 'POST',
      token: user.token,
      body: {
        entityId: entity.id,
        name: 'Maison',
        type: 'HOUSE',
        surfaceM2: -12,
        postalCode: '69001',
        city: 'Lyon',
      },
    });

    expect(response.status).toBe(400);
  });

  it('rejette un identifiant de ressource invalide', async () => {
    const user = await registerUser();
    const response = await api('/properties/pas-un-uuid', { token: user.token });
    expect(response.status).toBe(400);
  });
});
