import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePropertyInput,
  Property,
  PropertyListQuery,
  UpdatePropertyInput,
} from '@immo/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashIp } from '../common/crypto';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';
import { Prisma, type Property as PropertyRow } from '../generated/prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string, query: PropertyListQuery): Promise<Property[]> {
    const where: Prisma.PropertyWhereInput = {
      ownerId,
      ...(query.archived ? {} : { archivedAt: null }),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.buildingId ? { buildingId: query.buildingId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { lotNumber: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.property.findMany({
      where,
      include: {
        entity: { select: { id: true, name: true, type: true } },
        building: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => mapProperty(row));
  }

  async get(ownerId: string, id: string): Promise<Property> {
    const row = await this.prisma.property.findFirst({
      where: { id, ownerId },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        building: { select: { id: true, name: true, city: true } },
      },
    });
    if (!row) throw propertyNotFound();
    return mapProperty(row);
  }

  async create(
    ownerId: string,
    input: CreatePropertyInput,
    request: AuthenticatedRequest,
  ): Promise<Property> {
    await this.assertEntityOwned(ownerId, input.entityId);
    await this.assertBuildingMatches(ownerId, input.entityId, input.buildingId ?? null);

    if (!input.buildingId && (!input.postalCode || !input.city)) {
      throw new BadRequestException({
        code: 'ADDRESS_REQUIRED',
        message:
          'Un bien indépendant doit avoir une adresse complète (code postal et ville).',
      });
    }

    await this.assertLotNumberAvailable(ownerId, input.buildingId ?? null, input.lotNumber ?? null);

    try {
      const row = await this.prisma.property.create({
        data: {
          ownerId,
          entityId: input.entityId,
          buildingId: input.buildingId ?? null,
          name: input.name,
          reference: input.reference ?? null,
          type: input.type,
          lotNumber: input.lotNumber ?? null,
          floor: input.floor ?? null,
          surfaceM2: input.surfaceM2 ?? null,
          rooms: input.rooms ?? null,
          occupancyStatus: input.occupancyStatus ?? 'UNKNOWN',
          description: input.description ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          postalCode: input.postalCode ?? null,
          city: input.city ?? null,
          country: input.country ?? 'FR',
        },
        include: {
          entity: { select: { id: true, name: true, type: true } },
          building: { select: { id: true, name: true, city: true } },
        },
      });

      await this.audit.record({
        actorUserId: ownerId,
        action: 'property.created',
        resourceType: 'property',
        resourceId: row.id,
        ipHash: hashIp(request.ip),
      });

      return mapProperty(row);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdatePropertyInput,
    request: AuthenticatedRequest,
  ): Promise<Property> {
    const existing = await this.prisma.property.findFirst({ where: { id, ownerId } });
    if (!existing) throw propertyNotFound();
    if (existing.archivedAt) {
      throw new ConflictException({
        code: 'PROPERTY_ARCHIVED',
        message: 'Ce bien est archivé. Restaurez-le avant de le modifier.',
      });
    }

    const nextEntityId = input.entityId ?? existing.entityId;
    const nextBuildingId =
      input.buildingId !== undefined ? (input.buildingId ?? null) : existing.buildingId;

    if (input.entityId) {
      await this.assertEntityOwned(ownerId, input.entityId);
    }
    if (input.entityId || input.buildingId !== undefined) {
      await this.assertBuildingMatches(ownerId, nextEntityId, nextBuildingId);
    }

    if (!nextBuildingId) {
      const nextPostalCode =
        input.postalCode !== undefined ? input.postalCode : existing.postalCode;
      const nextCity = input.city !== undefined ? input.city : existing.city;
      if (!nextPostalCode || !nextCity) {
        throw new BadRequestException({
          code: 'ADDRESS_REQUIRED',
          message:
            'Un bien indépendant doit avoir une adresse complète (code postal et ville).',
        });
      }
    }

    if (input.lotNumber !== undefined) {
      await this.assertLotNumberAvailable(
        ownerId,
        nextBuildingId,
        input.lotNumber ?? null,
        id,
      );
    }

    try {
      const row = await this.prisma.property.update({
        where: { id },
        data: {
          ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
          ...(input.buildingId !== undefined ? { buildingId: input.buildingId ?? null } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.reference !== undefined ? { reference: input.reference ?? null } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.lotNumber !== undefined ? { lotNumber: input.lotNumber ?? null } : {}),
          ...(input.floor !== undefined ? { floor: input.floor ?? null } : {}),
          ...(input.surfaceM2 !== undefined ? { surfaceM2: input.surfaceM2 ?? null } : {}),
          ...(input.rooms !== undefined ? { rooms: input.rooms ?? null } : {}),
          ...(input.occupancyStatus !== undefined
            ? { occupancyStatus: input.occupancyStatus }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          ...(input.addressLine1 !== undefined
            ? { addressLine1: input.addressLine1 ?? null }
            : {}),
          ...(input.addressLine2 !== undefined
            ? { addressLine2: input.addressLine2 ?? null }
            : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
          ...(input.city !== undefined ? { city: input.city ?? null } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
        },
        include: {
          entity: { select: { id: true, name: true, type: true } },
          building: { select: { id: true, name: true, city: true } },
        },
      });

      await this.audit.record({
        actorUserId: ownerId,
        action: 'property.updated',
        resourceType: 'property',
        resourceId: row.id,
        ipHash: hashIp(request.ip),
      });

      return mapProperty(row);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async archive(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Property> {
    const existing = await this.prisma.property.findFirst({ where: { id, ownerId } });
    if (!existing) throw propertyNotFound();

    const row = await this.prisma.property.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        building: { select: { id: true, name: true, city: true } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'property.archived',
      resourceType: 'property',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapProperty(row);
  }

  async restore(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Property> {
    const existing = await this.prisma.property.findFirst({ where: { id, ownerId } });
    if (!existing) throw propertyNotFound();

    const row = await this.prisma.property.update({
      where: { id },
      data: { archivedAt: null },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        building: { select: { id: true, name: true, city: true } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'property.restored',
      resourceType: 'property',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapProperty(row);
  }

  private async assertEntityOwned(ownerId: string, entityId: string): Promise<void> {
    const entity = await this.prisma.ownerEntity.findFirst({
      where: { id: entityId, ownerId, archivedAt: null },
    });
    if (!entity) {
      throw new NotFoundException({
        code: 'ENTITY_NOT_FOUND',
        message: "Cette entité propriétaire n'existe pas.",
      });
    }
  }

  private async assertBuildingMatches(
    ownerId: string,
    entityId: string,
    buildingId: string | null,
  ): Promise<void> {
    if (!buildingId) return;

    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, ownerId },
    });

    if (!building) {
      throw new NotFoundException({
        code: 'BUILDING_NOT_FOUND',
        message: "Cet immeuble n'existe pas.",
      });
    }

    if (building.entityId !== entityId) {
      throw new BadRequestException({
        code: 'BUILDING_ENTITY_MISMATCH',
        message:
          "Ce lot doit être rattaché à l'immeuble et à l'entité propriétaire du même propriétaire.",
      });
    }
  }

  private async assertLotNumberAvailable(
    ownerId: string,
    buildingId: string | null,
    lotNumber: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (!buildingId || !lotNumber) return;

    const duplicate = await this.prisma.property.findFirst({
      where: {
        ownerId,
        buildingId,
        lotNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException({
        code: 'LOT_NUMBER_ALREADY_USED',
        message: `Le lot « ${lotNumber} » existe déjà dans cet immeuble.`,
      });
    }
  }
}

type PropertyRowWithRelations = PropertyRow & {
  entity?: { id: string; name: string; type: string } | null;
  building?: { id: string; name: string; city: string } | null;
};

export function mapProperty(row: PropertyRowWithRelations): Property {
  return {
    id: row.id,
    entityId: row.entityId,
    buildingId: row.buildingId,
    name: row.name,
    reference: row.reference,
    type: row.type,
    lotNumber: row.lotNumber,
    floor: row.floor,
    surfaceM2: row.surfaceM2 === null ? null : Number(row.surfaceM2),
    rooms: row.rooms,
    occupancyStatus: row.occupancyStatus,
    description: row.description,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.entity ? { entity: row.entity } : {}),
    ...(row.building !== undefined ? { building: row.building } : {}),
  };
}

function mapPrismaError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException({
        code: 'DUPLICATE_RESOURCE',
        message: 'Un bien identique existe déjà (même numéro de lot dans cet immeuble).',
      });
    }
    if (error.code === 'P2003') {
      return new BadRequestException({
        code: 'INVALID_RELATION',
        message:
          "Le rattachement demandé est impossible : l'entité ou l'immeuble n'appartient pas à ce propriétaire.",
      });
    }
  }
  return error instanceof Error ? error : new Error('Erreur inconnue');
}

function propertyNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'PROPERTY_NOT_FOUND',
    message: "Ce bien n'existe pas.",
  });
}
