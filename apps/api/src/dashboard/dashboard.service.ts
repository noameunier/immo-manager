import { Injectable } from '@nestjs/common';
import type {
  DashboardSummary,
  OccupancyStatus,
  OwnerEntityType,
  PropertyType,
} from '@immo/shared';
import { OCCUPANCY_STATUSES, OWNER_ENTITY_TYPES, PROPERTY_TYPES } from '@immo/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(ownerId: string): Promise<DashboardSummary> {
    const [
      entities,
      buildings,
      properties,
      archivedEntities,
      archivedBuildings,
      archivedProperties,
    ] = await Promise.all([
      this.prisma.ownerEntity.groupBy({
        by: ['type'],
        where: { ownerId, archivedAt: null },
        _count: { _all: true },
      }),
      this.prisma.building.count({ where: { ownerId, archivedAt: null } }),
      this.prisma.property.findMany({
        where: { ownerId, archivedAt: null },
        select: { type: true, occupancyStatus: true, buildingId: true, surfaceM2: true },
      }),
      this.prisma.ownerEntity.count({ where: { ownerId, archivedAt: { not: null } } }),
      this.prisma.building.count({ where: { ownerId, archivedAt: { not: null } } }),
      this.prisma.property.count({ where: { ownerId, archivedAt: { not: null } } }),
    ]);

    const byEntityType = Object.fromEntries(OWNER_ENTITY_TYPES.map((type) => [type, 0])) as Record<
      OwnerEntityType,
      number
    >;
    for (const row of entities) {
      byEntityType[row.type] = row._count._all;
    }

    const byType = Object.fromEntries(PROPERTY_TYPES.map((type) => [type, 0])) as Record<
      PropertyType,
      number
    >;
    const byOccupancy = Object.fromEntries(
      OCCUPANCY_STATUSES.map((status) => [status, 0]),
    ) as Record<OccupancyStatus, number>;

    let lots = 0;
    let totalSurface = 0;

    for (const property of properties) {
      byType[property.type] += 1;
      byOccupancy[property.occupancyStatus] += 1;
      if (property.buildingId) lots += 1;
      if (property.surfaceM2 !== null) totalSurface += Number(property.surfaceM2);
    }

    const entityTotal = entities.reduce((sum, row) => sum + row._count._all, 0);

    return {
      entities: { total: entityTotal, byType: byEntityType },
      buildings: { total: buildings },
      properties: {
        total: properties.length,
        lots,
        independent: properties.length - lots,
        byType,
        byOccupancy,
        totalSurfaceM2: Math.round(totalSurface * 100) / 100,
      },
      archived: {
        entities: archivedEntities,
        buildings: archivedBuildings,
        properties: archivedProperties,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
