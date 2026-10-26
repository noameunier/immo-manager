import { z } from 'zod';
import {
  countrySchema,
  optionalEmailSchema,
  optionalFrenchPostalCodeSchema,
  optionalText,
  phoneSchema,
  requiredText,
  sirenSchema,
  siretSchema,
} from './common';

export const ownerEntityTypeSchema = z.enum(['INDIVIDUAL', 'SCI', 'COMPANY', 'UNDIVIDED'], {
  message: "Type d'entité invalide",
});

export type OwnerEntityType = z.infer<typeof ownerEntityTypeSchema>;

const ownerEntityFields = {
  type: ownerEntityTypeSchema,
  name: requiredText(2, 160, "Le nom de l'entité"),
  legalName: optionalText(200, 'La raison sociale'),
  siren: sirenSchema,
  siret: siretSchema,
  vatNumber: optionalText(20, 'Le numéro de TVA'),
  email: optionalEmailSchema,
  phone: phoneSchema,
  addressLine1: optionalText(200, "L'adresse"),
  addressLine2: optionalText(200, "Le complément d'adresse"),
  postalCode: optionalFrenchPostalCodeSchema,
  city: optionalText(120, 'La ville'),
  country: countrySchema,
  notes: optionalText(2000, 'Les notes'),
};

export const createOwnerEntitySchema = z.object(ownerEntityFields);
export const updateOwnerEntitySchema = z.object(ownerEntityFields).partial();

export type CreateOwnerEntityInput = z.infer<typeof createOwnerEntitySchema>;
export type UpdateOwnerEntityInput = z.infer<typeof updateOwnerEntitySchema>;

export type OwnerEntity = {
  id: string;
  type: OwnerEntityType;
  name: string;
  legalName: string | null;
  siren: string | null;
  siret: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts?: { buildings: number; properties: number };
};

export type OwnerEntityListQuery = {
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};
