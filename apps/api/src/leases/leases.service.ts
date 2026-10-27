import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateLeaseInput,
  Lease,
  LeaseListQuery,
  LeaseStatus,
  UpdateLeaseInput,
} from '@immo/shared';
import { computeLeaseStatus } from '@immo/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashIp } from '../common/crypto';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';
import { fromDateOnly, toDateOnly, todayDateOnly } from '../common/dates';
import { Prisma } from '../generated/prisma/client';

const LEASE_INCLUDE = {
  entity: { select: { id: true, name: true, type: true } },
  property: { select: { id: true, name: true, city: true } },
  tenant: { select: { id: true, name: true, type: true } },
} as const;

type LeaseRowWithRelations = Prisma.LeaseGetPayload<{ include: typeof LEASE_INCLUDE }>;

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string, query: LeaseListQuery): Promise<Lease[]> {
    const where: Prisma.LeaseWhereInput = {
      ownerId,
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.status === 'ARCHIVED'
        ? { archivedAt: { not: null } }
        : query.includeArchived || query.status
          ? {}
          : { archivedAt: null }),
    };

    const rows = await this.prisma.lease.findMany({
      where,
      include: LEASE_INCLUDE,
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
    });

    const leases = rows.map((row) => mapLease(row));
    return query.status ? leases.filter((lease) => lease.status === query.status) : leases;
  }

  async get(ownerId: string, id: string): Promise<Lease> {
    const row = await this.prisma.lease.findFirst({
      where: { id, ownerId },
      include: LEASE_INCLUDE,
    });
    if (!row) throw leaseNotFound();
    return mapLease(row);
  }

  async create(
    ownerId: string,
    input: CreateLeaseInput,
    request: AuthenticatedRequest,
  ): Promise<Lease> {
    await this.assertRelations(ownerId, input.entityId, input.propertyId, input.tenantId);
    await this.assertNoOverlap(ownerId, input.propertyId, input.startsOn, input.endsOn ?? null);

    const row = await this.prisma.lease.create({
      data: {
        ownerId,
        entityId: input.entityId,
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        type: input.type,
        startsOn: toDateOnly(input.startsOn),
        endsOn: input.endsOn ? toDateOnly(input.endsOn) : null,
        rentAmount: input.rentAmount,
        chargesAmount: input.chargesAmount ?? 0,
        depositAmount: input.depositAmount ?? null,
        paymentDay: input.paymentDay,
        notes: input.notes ?? null,
      },
      include: LEASE_INCLUDE,
    });

    await this.syncPropertyOccupancy(ownerId, input.propertyId);

    await this.audit.record({
      actorUserId: ownerId,
      action: 'lease.created',
      resourceType: 'lease',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapLease(row);
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdateLeaseInput,
    request: AuthenticatedRequest,
  ): Promise<Lease> {
    const existing = await this.prisma.lease.findFirst({ where: { id, ownerId } });
    if (!existing) throw leaseNotFound();
    if (existing.archivedAt) {
      throw new ConflictException({
        code: 'LEASE_ARCHIVED',
        message: 'Ce bail est terminé. Restaurez-le avant de le modifier.',
      });
    }

    const nextEntityId = input.entityId ?? existing.entityId;
    const nextPropertyId = input.propertyId ?? existing.propertyId;
    const nextTenantId = input.tenantId ?? existing.tenantId;
    const nextStartsOn = input.startsOn ?? fromDateOnly(existing.startsOn);
    const nextEndsOn =
      input.endsOn !== undefined
        ? (input.endsOn ?? null)
        : existing.endsOn
          ? fromDateOnly(existing.endsOn)
          : null;

    await this.assertRelations(ownerId, nextEntityId, nextPropertyId, nextTenantId);

    if (
      input.startsOn !== undefined ||
      input.endsOn !== undefined ||
      input.propertyId !== undefined
    ) {
      await this.assertNoOverlap(ownerId, nextPropertyId, nextStartsOn, nextEndsOn, id);
    }

    const row = await this.prisma.lease.update({
      where: { id },
      data: {
        ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
        ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.startsOn !== undefined ? { startsOn: toDateOnly(input.startsOn) } : {}),
        ...(input.endsOn !== undefined
          ? { endsOn: input.endsOn ? toDateOnly(input.endsOn) : null }
          : {}),
        ...(input.rentAmount !== undefined ? { rentAmount: input.rentAmount } : {}),
        ...(input.chargesAmount !== undefined ? { chargesAmount: input.chargesAmount } : {}),
        ...(input.depositAmount !== undefined
          ? { depositAmount: input.depositAmount ?? null }
          : {}),
        ...(input.paymentDay !== undefined ? { paymentDay: input.paymentDay } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: LEASE_INCLUDE,
    });

    await this.syncPropertyOccupancy(ownerId, nextPropertyId);
    if (existing.propertyId !== nextPropertyId) {
      await this.syncPropertyOccupancy(ownerId, existing.propertyId);
    }

    await this.audit.record({
      actorUserId: ownerId,
      action: 'lease.updated',
      resourceType: 'lease',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapLease(row);
  }

  async archive(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Lease> {
    const existing = await this.prisma.lease.findFirst({ where: { id, ownerId } });
    if (!existing) throw leaseNotFound();

    const row = await this.prisma.lease.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: LEASE_INCLUDE,
    });

    await this.syncPropertyOccupancy(ownerId, existing.propertyId);

    await this.audit.record({
      actorUserId: ownerId,
      action: 'lease.terminated',
      resourceType: 'lease',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapLease(row);
  }

  async restore(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Lease> {
    const existing = await this.prisma.lease.findFirst({ where: { id, ownerId } });
    if (!existing) throw leaseNotFound();

    await this.assertNoOverlap(
      ownerId,
      existing.propertyId,
      fromDateOnly(existing.startsOn),
      existing.endsOn ? fromDateOnly(existing.endsOn) : null,
      id,
    );

    const row = await this.prisma.lease.update({
      where: { id },
      data: { archivedAt: null },
      include: LEASE_INCLUDE,
    });

    await this.syncPropertyOccupancy(ownerId, existing.propertyId);

    await this.audit.record({
      actorUserId: ownerId,
      action: 'lease.restored',
      resourceType: 'lease',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapLease(row);
  }

  private async assertRelations(
    ownerId: string,
    entityId: string,
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const [entity, property, tenant] = await Promise.all([
      this.prisma.ownerEntity.findFirst({ where: { id: entityId, ownerId } }),
      this.prisma.property.findFirst({ where: { id: propertyId, ownerId } }),
      this.prisma.tenant.findFirst({ where: { id: tenantId, ownerId } }),
    ]);

    if (!entity) {
      throw new NotFoundException({
        code: 'ENTITY_NOT_FOUND',
        message: "Cette entité propriétaire n'existe pas.",
      });
    }
    if (!property) {
      throw new NotFoundException({
        code: 'PROPERTY_NOT_FOUND',
        message: "Ce bien n'existe pas.",
      });
    }
    if (!tenant) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: "Ce locataire n'existe pas.",
      });
    }

    if (entity.archivedAt) {
      throw new BadRequestException({
        code: 'ENTITY_ARCHIVED',
        message: 'Cette entité est archivée : impossible de lui rattacher un bail.',
      });
    }
    if (property.archivedAt) {
      throw new BadRequestException({
        code: 'PROPERTY_ARCHIVED',
        message: 'Ce bien est archivé : impossible de lui rattacher un bail.',
      });
    }
    if (tenant.archivedAt) {
      throw new BadRequestException({
        code: 'TENANT_ARCHIVED',
        message: 'Ce locataire est archivé : impossible de lui rattacher un bail.',
      });
    }
    if (property.entityId !== entityId) {
      throw new BadRequestException({
        code: 'PROPERTY_ENTITY_MISMATCH',
        message: "Ce bien n'appartient pas à l'entité bailleur sélectionnée.",
      });
    }
  }

  private async assertNoOverlap(
    ownerId: string,
    propertyId: string,
    startsOn: string,
    endsOn: string | null,
    excludeId?: string,
  ): Promise<void> {
    const others = await this.prisma.lease.findMany({
      where: {
        ownerId,
        propertyId,
        archivedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { startsOn: true, endsOn: true },
    });

    const overlaps = others.some((lease) => {
      const otherStart = fromDateOnly(lease.startsOn);
      const otherEnd = lease.endsOn ? fromDateOnly(lease.endsOn) : null;
      const candidateEnd = endsOn;
      return (
        otherStart <= (candidateEnd ?? '9999-12-31') && (otherEnd === null || otherEnd >= startsOn)
      );
    });

    if (overlaps) {
      throw new ConflictException({
        code: 'LEASE_OVERLAP',
        message:
          'Un autre bail non archivé couvre déjà cette période pour ce bien. Terminez-le ou ajustez les dates.',
      });
    }
  }

  private async syncPropertyOccupancy(ownerId: string, propertyId: string): Promise<void> {
    const today = toDateOnly(todayDateOnly());
    const activeCount = await this.prisma.lease.count({
      where: {
        ownerId,
        propertyId,
        archivedAt: null,
        startsOn: { lte: today },
        OR: [{ endsOn: null }, { endsOn: { gte: today } }],
      },
    });

    if (activeCount > 0) {
      await this.prisma.property.updateMany({
        where: { id: propertyId, ownerId },
        data: { occupancyStatus: 'OCCUPIED' },
      });
      return;
    }

    await this.prisma.property.updateMany({
      where: { id: propertyId, ownerId, occupancyStatus: 'OCCUPIED' },
      data: { occupancyStatus: 'VACANT' },
    });
  }
}

export function mapLease(row: LeaseRowWithRelations): Lease {
  const startsOn = fromDateOnly(row.startsOn);
  const endsOn = row.endsOn ? fromDateOnly(row.endsOn) : null;
  const archivedAt = row.archivedAt?.toISOString() ?? null;
  const rentAmount = Number(row.rentAmount);
  const chargesAmount = Number(row.chargesAmount);
  const status: LeaseStatus = computeLeaseStatus({ archivedAt, startsOn, endsOn });

  return {
    id: row.id,
    entityId: row.entityId,
    propertyId: row.propertyId,
    tenantId: row.tenantId,
    type: row.type,
    startsOn,
    endsOn,
    rentAmount,
    chargesAmount,
    depositAmount: row.depositAmount === null ? null : Number(row.depositAmount),
    paymentDay: row.paymentDay,
    monthlyTotal: Math.round((rentAmount + chargesAmount) * 100) / 100,
    status,
    notes: row.notes,
    archivedAt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    entity: row.entity,
    property: row.property,
    tenant: row.tenant,
  };
}

function leaseNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'LEASE_NOT_FOUND',
    message: "Ce bail n'existe pas.",
  });
}
