import { z } from 'zod';
import {
  countrySchema,
  optionalFrenchPostalCodeSchema,
  optionalText,
  requiredText,
  uuidSchema,
} from './common';

export const createBuildingSchema = z.object({
  entityId: uuidSchema,
  name: requiredText(2, 160, "Le nom de l'immeuble"),
  reference: optionalText(64, 'La référence'),
  addressLine1: requiredText(4, 200, "L'adresse"),
  addressLine2: optionalText(200, "Le complément d'adresse"),
  postalCode: z
    .string({ message: 'Le code postal est obligatoire' })
    .trim()
    .regex(/^\d{5}$/, 'Code postal invalide (5 chiffres attendus)'),
  city: requiredText(2, 120, 'La ville'),
  country: countrySchema,
  constructionYear: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(1000, 'Année invalide')
      .max(new Date().getFullYear() + 5, 'Année invalide')
      .optional(),
  ),
  notes: optionalText(2000, 'Les notes'),
});

export const updateBuildingSchema = z
  .object({
    entityId: uuidSchema,
    name: requiredText(2, 160, "Le nom de l'immeuble"),
    reference: optionalText(64, 'La référence'),
    addressLine1: requiredText(4, 200, "L'adresse"),
    addressLine2: optionalText(200, "Le complément d'adresse"),
    postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres attendus)'),
    city: requiredText(2, 120, 'La ville'),
    country: countrySchema,
    constructionYear: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().int().min(1000).max(new Date().getFullYear() + 5).optional(),
    ),
    notes: optionalText(2000, 'Les notes'),
  })
  .partial();

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;

export type Building = {
  id: string;
  entityId: string;
  name: string;
  reference: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  constructionYear: number | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts?: { properties: number };
  entity?: { id: string; name: string; type: string };
};
