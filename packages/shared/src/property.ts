import { z } from 'zod';
import {
  countrySchema,
  optionalFrenchPostalCodeSchema,
  optionalText,
  requiredText,
  uuidSchema,
} from './common';

export const propertyTypeSchema = z.enum(['APARTMENT', 'HOUSE', 'GARAGE', 'PARKING', 'BOX'], {
  message: 'Type de bien invalide',
});

export const occupancyStatusSchema = z.enum(['VACANT', 'OCCUPIED', 'UNKNOWN'], {
  message: "Statut d'occupation invalide",
});

export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type OccupancyStatus = z.infer<typeof occupancyStatusSchema>;

const propertyFields = {
  entityId: uuidSchema,
  buildingId: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.union([uuidSchema, z.null()]).optional(),
  ),
  name: requiredText(2, 160, 'Le nom du bien'),
  reference: optionalText(64, 'La référence'),
  type: propertyTypeSchema,
  lotNumber: optionalText(32, 'Le numéro de lot'),
  floor: optionalText(16, "L'étage"),
  surfaceM2: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number()
      .min(0, 'La surface ne peut pas être négative')
      .max(100000, 'Surface invalide')
      .optional(),
  ),
  rooms: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().min(0).max(500).optional(),
  ),
  occupancyStatus: occupancyStatusSchema.default('UNKNOWN'),
  description: optionalText(5000, 'La description'),
  addressLine1: optionalText(200, "L'adresse"),
  addressLine2: optionalText(200, "Le complément d'adresse"),
  postalCode: optionalFrenchPostalCodeSchema,
  city: optionalText(120, 'La ville'),
  country: countrySchema,
};

export const createPropertySchema = z.object(propertyFields);
export const updatePropertySchema = z.object(propertyFields).partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export type Property = {
  id: string;
  entityId: string;
  buildingId: string | null;
  name: string;
  reference: string | null;
  type: PropertyType;
  lotNumber: string | null;
  floor: string | null;
  surfaceM2: number | null;
  rooms: number | null;
  occupancyStatus: OccupancyStatus;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entity?: { id: string; name: string; type: string };
  building?: { id: string; name: string; city: string } | null;
};

export type PropertyListQuery = {
  entityId?: string;
  buildingId?: string;
  type?: PropertyType;
  archived?: boolean;
  search?: string;
};
