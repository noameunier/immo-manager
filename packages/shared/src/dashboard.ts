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
  tenants: { total: number };
  leases: {
    active: number;
    upcoming: number;
    endingSoon: number;
  };
  rents: {
    monthlyRent: number;
    monthlyCharges: number;
    monthlyTotal: number;
  };
  archived: {
    entities: number;
    buildings: number;
    properties: number;
    tenants: number;
    leases: number;
  };
  generatedAt: string;
};
