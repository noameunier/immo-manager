import { z } from 'zod';
import {
  countrySchema,
  optionalEmailSchema,
  optionalFrenchPostalCodeSchema,
  optionalText,
  phoneSchema,
  requiredText,
} from './common';

export const tenantTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY'], {
  message: 'Type de locataire invalide',
});

export type TenantType = z.infer<typeof tenantTypeSchema>;

const tenantFields = {
  type: tenantTypeSchema,
  name: requiredText(2, 160, 'Le nom du locataire'),
  email: optionalEmailSchema,
  phone: phoneSchema,
  addressLine1: optionalText(200, "L'adresse"),
  addressLine2: optionalText(200, "Le complément d'adresse"),
  postalCode: optionalFrenchPostalCodeSchema,
  city: optionalText(120, 'La ville'),
  country: countrySchema,
  notes: optionalText(2000, 'Les notes'),
};

export const createTenantSchema = z.object(tenantFields);
export const updateTenantSchema = z.object(tenantFields).partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export type Tenant = {
  id: string;
  type: TenantType;
  name: string;
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
  leaseCount?: number;
  activeLeaseCount?: number;
};

export type TenantListQuery = {
  includeArchived?: boolean;
  search?: string;
};
