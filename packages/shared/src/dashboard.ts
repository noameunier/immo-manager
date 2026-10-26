import type { OwnerEntityType } from './owner-entity';
import type { OccupancyStatus, PropertyType } from './property';

export type DashboardSummary = {
  entities: {
    total: number;
    byType: Record<OwnerEntityType, number>;
  };
  buildings: { total: number };
  properties: {
    total: number;
    lots: number;
    independent: number;
    byType: Record<PropertyType, number>;
    byOccupancy: Record<OccupancyStatus, number>;
    totalSurfaceM2: number;
  };
  archived: {
    entities: number;
    buildings: number;
    properties: number;
  };
  generatedAt: string;
};
