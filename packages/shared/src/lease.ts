import { z } from 'zod';
import { emptyToUndefined, optionalText, uuidSchema } from './common';

export const leaseTypeSchema = z.enum(['NUE', 'MEUBLEE'], {
  message: 'Type de bail invalide',
});

export const leaseStatusSchema = z.enum(['ACTIVE', 'UPCOMING', 'ENDED', 'ARCHIVED']);

export type LeaseType = z.infer<typeof leaseTypeSchema>;
export type LeaseStatus = z.infer<typeof leaseStatusSchema>;

const isDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Date calendaire sans heure, au format AAAA-MM-JJ (fuseau ignoré). */
export const dateOnlySchema = z
  .string({ message: 'La date est obligatoire' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (format AAAA-MM-JJ attendu)')
  .refine(isDateOnly, 'Cette date n’existe pas');

export const optionalDateOnlySchema = z.preprocess(emptyToUndefined, dateOnlySchema.optional());

const toNumber = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'));
    return Number.isNaN(normalized) ? value : normalized;
  }
  return value;
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

/** Montant en euros : accepte « 850,50 » comme « 850.5 ». */
export const moneySchema = (label: string) =>
  z.preprocess(
    toNumber,
    z
      .number({ message: `${label} doit être un nombre` })
      .min(0, `${label} ne peut pas être négatif`)
      .max(10_000_000, `${label} est trop élevé`)
      .transform(roundCurrency),
  );

export const optionalMoneySchema = (label: string) =>
  z.preprocess(
    (value) => toNumber(value) ?? undefined,
    z
      .number({ message: `${label} doit être un nombre` })
      .min(0, `${label} ne peut pas être négatif`)
      .max(10_000_000, `${label} est trop élevé`)
      .transform(roundCurrency)
      .optional(),
  );

export const paymentDaySchema = z.preprocess(
  (value) => toNumber(value) ?? 1,
  z.coerce
    .number()
    .int('Le jour d’échéance doit être un entier')
    .min(1, 'Le jour d’échéance est compris entre 1 et 31')
    .max(31, 'Le jour d’échéance est compris entre 1 et 31'),
);

const leaseFields = {
  entityId: uuidSchema,
  propertyId: uuidSchema,
  tenantId: uuidSchema,
  type: leaseTypeSchema.default('NUE'),
  startsOn: dateOnlySchema,
  endsOn: optionalDateOnlySchema,
  rentAmount: moneySchema('Le loyer'),
  chargesAmount: optionalMoneySchema('Les charges'),
  depositAmount: optionalMoneySchema('Le dépôt de garantie'),
  paymentDay: paymentDaySchema,
  notes: optionalText(2000, 'Les notes'),
};

const checkDates = (
  value: { startsOn?: string; endsOn?: string | null },
  context: z.RefinementCtx,
): void => {
  if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
    context.addIssue({
      code: 'custom',
      path: ['endsOn'],
      message: 'La date de fin doit être postérieure à la date de début.',
    });
  }
};

export const createLeaseSchema = z.object(leaseFields).superRefine(checkDates);
export const updateLeaseSchema = z.object(leaseFields).partial().superRefine(checkDates);

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;

export type Lease = {
  id: string;
  entityId: string;
  propertyId: string;
  tenantId: string;
  type: LeaseType;
  startsOn: string;
  endsOn: string | null;
  rentAmount: number;
  chargesAmount: number;
  depositAmount: number | null;
  paymentDay: number;
  monthlyTotal: number;
  status: LeaseStatus;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entity?: { id: string; name: string; type: string };
  property?: { id: string; name: string; city: string | null };
  tenant?: { id: string; name: string; type: string };
};

export type LeaseListQuery = {
  entityId?: string;
  propertyId?: string;
  tenantId?: string;
  status?: LeaseStatus;
  includeArchived?: boolean;
};

/** Statut d'un bail à une date donnée (jour courant par défaut). */
export function computeLeaseStatus(
  lease: { archivedAt: string | null; startsOn: string; endsOn: string | null },
  today: string = new Date().toISOString().slice(0, 10),
): LeaseStatus {
  if (lease.archivedAt) return 'ARCHIVED';
  if (lease.startsOn > today) return 'UPCOMING';
  if (lease.endsOn !== null && lease.endsOn < today) return 'ENDED';
  return 'ACTIVE';
}
