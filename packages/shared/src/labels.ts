import type { OwnerEntityType } from './owner-entity';
import type { OccupancyStatus, PropertyType } from './property';

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

export const OWNER_ENTITY_TYPES = Object.keys(OWNER_ENTITY_TYPE_LABELS) as OwnerEntityType[];
export const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
export const OCCUPANCY_STATUSES = Object.keys(OCCUPANCY_STATUS_LABELS) as OccupancyStatus[];

export const APP_NAME = 'Immo Manager';
export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_LOCALE = 'fr-FR';
export const DEFAULT_TIMEZONE = 'Europe/Paris';
