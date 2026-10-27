import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTenantInput, Tenant, TenantListQuery, UpdateTenantInput } from '@immo/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashIp } from '../common/crypto';
import type { AuthenticatedRequest } from '../common/current-auth.decorator';
import { Prisma, type Tenant as TenantRow } from '../generated/prisma/client';
import { todayDateOnly } from '../common/dates';

const ACTIVE_LEASES_INCLUDE = { where: { archivedAt: null } } as const;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ownerId: string, query: TenantListQuery): Promise<Tenant[]> {
    const where: Prisma.TenantWhereInput = {
      ownerId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.tenant.findMany({
      where,
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => mapTenant(row));
  }

  async get(ownerId: string, id: string): Promise<Tenant> {
    const row = await this.prisma.tenant.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
    });
    if (!row) throw tenantNotFound();
    return mapTenant(row);
  }

  async create(
    ownerId: string,
    input: CreateTenantInput,
    request: AuthenticatedRequest,
  ): Promise<Tenant> {
    const row = await this.prisma.tenant.create({
      data: {
        ownerId,
        type: input.type,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        postalCode: input.postalCode ?? null,
        city: input.city ?? null,
        country: input.country ?? 'FR',
        notes: input.notes ?? null,
      },
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'tenant.created',
      resourceType: 'tenant',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapTenant(row);
  }

  async update(
    ownerId: string,
    id: string,
    input: UpdateTenantInput,
    request: AuthenticatedRequest,
  ): Promise<Tenant> {
    const existing = await this.prisma.tenant.findFirst({ where: { id, ownerId } });
    if (!existing) throw tenantNotFound();
    if (existing.archivedAt) {
      throw new ConflictException({
        code: 'TENANT_ARCHIVED',
        message: 'Ce locataire est archivé. Restaurez-le avant de le modifier.',
      });
    }

    const row = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 ?? null } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 ?? null } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
        ...(input.city !== undefined ? { city: input.city ?? null } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapTenant(row);
  }

  async archive(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Tenant> {
    const existing = await this.prisma.tenant.findFirst({ where: { id, ownerId } });
    if (!existing) throw tenantNotFound();

    const today = new Date(`${todayDateOnly()}T00:00:00.000Z`);
    const activeLeases = await this.prisma.lease.count({
      where: {
        ownerId,
        tenantId: id,
        archivedAt: null,
        startsOn: { lte: today },
        OR: [{ endsOn: null }, { endsOn: { gte: today } }],
      },
    });

    if (activeLeases > 0) {
      throw new ConflictException({
        code: 'TENANT_HAS_ACTIVE_LEASE',
        message: 'Ce locataire a un bail en cours. Terminez le bail avant d’archiver le locataire.',
      });
    }

    const row = await this.prisma.tenant.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'tenant.archived',
      resourceType: 'tenant',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapTenant(row);
  }

  async restore(ownerId: string, id: string, request: AuthenticatedRequest): Promise<Tenant> {
    const existing = await this.prisma.tenant.findFirst({ where: { id, ownerId } });
    if (!existing) throw tenantNotFound();

    const row = await this.prisma.tenant.update({
      where: { id },
      data: { archivedAt: null },
      include: { _count: { select: { leases: ACTIVE_LEASES_INCLUDE } } },
    });

    await this.audit.record({
      actorUserId: ownerId,
      action: 'tenant.restored',
      resourceType: 'tenant',
      resourceId: row.id,
      ipHash: hashIp(request.ip),
    });

    return mapTenant(row);
  }
}

type TenantRowWithCount = TenantRow & { _count: { leases: number } };

export function mapTenant(row: TenantRowWithCount): Tenant {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
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
    leaseCount: row._count.leases,
  };
}

function tenantNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'TENANT_NOT_FOUND',
    message: "Ce locataire n'existe pas.",
  });
}
