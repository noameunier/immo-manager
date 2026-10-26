import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOwnerEntityInput, OwnerEntity, UpdateOwnerEntityInput } from '@immo/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';
import { hashIp } from '../common/crypto';
import type { OwnerEntity as OwnerEntityRow, Prisma } from '../generated/prisma/client';

@Injectable()
export class OwnerEntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    ownerId: string,
    options: { includeArchived?: boolean; search?: string },
  ): Promise<OwnerEntity[]> {
    const where: Prisma.OwnerEntityWhereInput = {
      ownerId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { legalName: { contains: options.search, mode: 'insensitive' } },
              { city: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.ownerEntity.findMany({
      where,
      include: {
        _count: {
          select: {
            buildings: { where: { archivedAt: null } },
            properties: { where: { archivedAt: null } },
          },
        },
      },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => mapEntity(row));
  }

  async get(ownerId: string, id: string): Promise<OwnerEntity> {
    const row = await this.prisma.ownerEntity.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { buildings: true, properties: true } } },
    });
    if (!row) throw notFound();
    return mapEntity(row);
  }

  async create(
    ownerId: string,
    input: CreateOwnerEntityInput,
    request: AuthenticatedRequest,
  ): Promise<OwnerEntity> {
    const row = await this.prisma.ownerEntity.create({
      data: {
        ownerId,
        type: input.type,
        name: input.name,
        legalName: input.legalName ?? null,
        siren: input.siren ?? null,
        siret: input.siret ?? null,
        vatNumber: input.vatNumber ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        postalCode: input.postalCode ?? null,
        city: input.city ?? null,
        country: input.country ?? 'FR',
        notes: input.notes ?? null,
      },
      include: { _count: { select: { buildings: true, properties: true } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'entity.created',
      resourceType: 'owner_entity',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapEntity(row);
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdateOwnerEntityInput,
    request: AuthenticatedRequest,
  ): Promise<OwnerEntity> {
    const existing = await this.prisma.ownerEntity.findFirst({ where: { id, ownerId } });
    if (!existing) throw notFound();

    const row = await this.prisma.ownerEntity.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName ?? null } : {}),
        ...(input.siren !== undefined ? { siren: input.siren ?? null } : {}),
        ...(input.siret !== undefined ? { siret: input.siret ?? null } : {}),
        ...(input.vatNumber !== undefined ? { vatNumber: input.vatNumber ?? null } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 ?? null } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 ?? null } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
        ...(input.city !== undefined ? { city: input.city ?? null } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: { _count: { select: { buildings: true, properties: true } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'entity.updated',
      resourceType: 'owner_entity',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapEntity(row);
  }

  async archive(ownerId: string, id: string, request: AuthenticatedRequest): Promise<OwnerEntity> {
    const existing = await this.prisma.ownerEntity.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { buildings: true, properties: true } } },
    });
    if (!existing) throw notFound();

    const activeChildren = existing._count.buildings + existing._count.properties;
    if (activeChildren > 0) {
      throw new ConflictException({
        code: 'ENTITY_HAS_ACTIVE_RESOURCES',
        message:
          'Cette entité possède encore des immeubles ou des biens actifs. Archivez-les ou rattachez-les ailleurs avant de l’archiver.',
      });
    }

    const row = await this.prisma.ownerEntity.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { _count: { select: { buildings: true, properties: true } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'entity.archived',
      resourceType: 'owner_entity',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapEntity(row);
  }

  async restore(ownerId: string, id: string, request: AuthenticatedRequest): Promise<OwnerEntity> {
    const existing = await this.prisma.ownerEntity.findFirst({ where: { id, ownerId } });
    if (!existing) throw notFound();

    const row = await this.prisma.ownerEntity.update({
      where: { id },
      data: { archivedAt: null },
      include: { _count: { select: { buildings: true, properties: true } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'entity.restored',
      resourceType: 'owner_entity',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapEntity(row);
  }
}

export function mapEntity(
  row: OwnerEntityRow & { _count?: { buildings: number; properties: number } },
): OwnerEntity {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    legalName: row.legalName,
    siren: row.siren,
    siret: row.siret,
    vatNumber: row.vatNumber,
    email: row.email,
    phone: row.phone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    notes: row.notes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row._count ? { counts: { ...row._count } } : {}),
  };
}

function notFound(): NotFoundException {
  return new NotFoundException({
    code: 'ENTITY_NOT_FOUND',
    message: "Cette entité propriétaire n'existe pas.",
  });
}
