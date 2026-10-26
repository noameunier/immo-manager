import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Building,
  CreateBuildingInput,
  Property,
  UpdateBuildingInput,
} from '@immo/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashIp } from '../common/crypto';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';
import type { Building as BuildingRow, Prisma } from '../generated/prisma/client';
import { mapProperty } from '../properties/properties.service';

export type BuildingDetail = Building & { properties: Property[] };

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    ownerId: string,
    options: { entityId?: string; includeArchived?: boolean; search?: string },
  ): Promise<Building[]> {
    const where: Prisma.BuildingWhereInput = {
      ownerId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { city: { contains: options.search, mode: 'insensitive' } },
              { postalCode: { contains: options.search } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.building.findMany({
      where,
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: {
          select: { properties: { where: { archivedAt: null } } },
        },
      },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => mapBuilding(row));
  }

  async get(ownerId: string, id: string): Promise<BuildingDetail> {
    const row = await this.prisma.building.findFirst({
      where: { id, ownerId },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: { select: { properties: { where: { archivedAt: null } } } },
        properties: {
          where: { archivedAt: null },
          orderBy: [{ lotNumber: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!row) throw buildingNotFound();

    return {
      ...mapBuilding(row),
      properties: row.properties.map((property) => mapProperty(property)),
    };
  }

  async create(
    ownerId: string,
    input: CreateBuildingInput,
    request: AuthenticatedRequest,
  ): Promise<Building> {
    await this.assertEntityOwned(ownerId, input.entityId);

    const row = await this.prisma.building.create({
      data: {
        ownerId,
        entityId: input.entityId,
        name: input.name,
        reference: input.reference ?? null,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        postalCode: input.postalCode,
        city: input.city,
        country: input.country ?? 'FR',
        constructionYear: input.constructionYear ?? null,
        notes: input.notes ?? null,
      },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: { select: { properties: { where: { archivedAt: null } } } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'building.created',
      resourceType: 'building',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapBuilding(row);
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdateBuildingInput,
    request: AuthenticatedRequest,
  ): Promise<Building> {
    const existing = await this.prisma.building.findFirst({ where: { id, ownerId } });
    if (!existing) throw buildingNotFound();
    if (existing.archivedAt) {
      throw new ConflictException({
        code: 'BUILDING_ARCHIVED',
        message: 'Cet immeuble est archivé. Restaurez-le avant de le modifier.',
      });
    }

    if (input.entityId && input.entityId !== existing.entityId) {
      await this.assertEntityOwned(ownerId, input.entityId);
    }

    const row = await this.prisma.building.update({
      where: { id },
      data: {
        ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.reference !== undefined ? { reference: input.reference ?? null } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
        ...(input.addressLine2 !== undefined
          ? { addressLine2: input.addressLine2 ?? null }
          : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.constructionYear !== undefined
          ? { constructionYear: input.constructionYear ?? null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: { select: { properties: { where: { archivedAt: null } } } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'building.updated',
      resourceType: 'building',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapBuilding(row);
  }

  async archive(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Building> {
    const existing = await this.prisma.building.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { properties: { where: { archivedAt: null } } } } },
    });
    if (!existing) throw buildingNotFound();

    if (existing._count.properties > 0) {
      throw new ConflictException({
        code: 'BUILDING_HAS_PROPERTIES',
        message:
          'Cet immeuble contient encore des lots actifs. Archivez-les avant d’archiver l’immeuble.',
      });
    }

    const row = await this.prisma.building.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: { select: { properties: { where: { archivedAt: null } } } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'building.archived',
      resourceType: 'building',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapBuilding(row);
  }

  async restore(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Building> {
    const existing = await this.prisma.building.findFirst({ where: { id, ownerId } });
    if (!existing) throw buildingNotFound();

    const row = await this.prisma.building.update({
      where: { id },
      data: { archivedAt: null },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        _count: { select: { properties: { where: { archivedAt: null } } } },
      },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'building.restored',
      resourceType: 'building',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapBuilding(row);
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
}

export function mapBuilding(
  row: BuildingRow & {
    entity?: { id: string; name: string; type: string } | null;
    _count?: { properties: number };
  },
): Building {
  return {
    id: row.id,
    entityId: row.entityId,
    name: row.name,
    reference: row.reference,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    constructionYear: row.constructionYear,
    notes: row.notes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.entity ? { entity: row.entity } : {}),
    ...(row._count ? { counts: { properties: row._count.properties } } : {}),
  };
}

function buildingNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'BUILDING_NOT_FOUND',
    message: "Cet immeuble n'existe pas.",
  });
}
