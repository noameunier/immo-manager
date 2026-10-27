import type { LeaseStatus, LeaseType } from './lease';
import type { OwnerEntityType } from './owner-entity';
import type { OccupancyStatus, PropertyType } from './property';
import type { TenantType } from './tenant';

export const OWNER_ENTITY_TYPE_LABELS: Record<OwnerEntityType, string> = {
  INDIVIDUAL: 'Personne physique',
  SCI: 'SCI',
  COMPANY: 'Société',
  UNDIVIDED: 'Indivision',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  GARAGE: 'Garage',
  PARKING: 'Parking',
  BOX: 'Box',
};

export const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupé',
  UNKNOWN: 'Non renseigné',
};

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  INDIVIDUAL: 'Particulier',
  COMPANY: 'Société',
};

export const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  NUE: 'Bail nu',
  MEUBLEE: 'Bail meublé',
};

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  ACTIVE: 'Actif',
  UPCOMING: 'À venir',
  ENDED: 'Terminé',
  ARCHIVED: 'Archivé',
};

export const OWNER_ENTITY_TYPES = Object.keys(OWNER_ENTITY_TYPE_LABELS) as OwnerEntityType[];
export const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
export const OCCUPANCY_STATUSES = Object.keys(OCCUPANCY_STATUS_LABELS) as OccupancyStatus[];
export const TENANT_TYPES = Object.keys(TENANT_TYPE_LABELS) as TenantType[];
export const LEASE_TYPES = Object.keys(LEASE_TYPE_LABELS) as LeaseType[];
export const LEASE_STATUSES = Object.keys(LEASE_STATUS_LABELS) as LeaseStatus[];

export const APP_NAME = 'Immo Manager';
export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_LOCALE = 'fr-FR';
export const DEFAULT_TIMEZONE = 'Europe/Paris';
