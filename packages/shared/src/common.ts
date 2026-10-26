import { z } from 'zod';

/** Convertit les chaînes vides envoyées par les formulaires en `undefined`. */
export const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const uuidSchema = z.uuid({ message: 'Identifiant invalide' });

/** Chaîne obligatoire, nettoyée des espaces superflus. */
export const requiredText = (min: number, max: number, label = 'Ce champ') =>
  z
    .string({ message: `${label} est obligatoire` })
    .trim()
    .min(min, `${label} doit contenir au moins ${min} caractères`)
    .max(max, `${label} ne peut pas dépasser ${max} caractères`);

/** Chaîne facultative : `''` devient `undefined`. */
export const optionalText = (max: number, label = 'Ce champ') =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `${label} ne peut pas dépasser ${max} caractères`).optional(),
  );

export const emailSchema = z
  .string({ message: "L'adresse email est obligatoire" })
  .trim()
  .min(3, 'Adresse email trop courte')
  .max(254, 'Adresse email trop longue')
  .transform((value) => value.toLowerCase())
  .refine((value) => z.email().safeParse(value).success, {
    message: 'Adresse email invalide',
  });

export const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase())
    .refine((value) => z.email().safeParse(value).success, {
      message: 'Adresse email invalide',
    })
    .optional(),
);

export const passwordSchema = z
  .string({ message: 'Le mot de passe est obligatoire' })
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères');

/** Code postal français : 5 chiffres. */
export const frenchPostalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, 'Code postal invalide (5 chiffres attendus)');

export const optionalFrenchPostalCodeSchema = z.preprocess(
  emptyToUndefined,
  frenchPostalCodeSchema.optional(),
);

export const countrySchema = z
  .string()
  .trim()
  .length(2, 'Code pays à 2 lettres attendu')
  .transform((value) => value.toUpperCase())
  .default('FR');

export const phoneSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(32, 'Numéro de téléphone trop long')
    .regex(/^[+0-9 ().-]{6,32}$/, 'Numéro de téléphone invalide')
    .optional(),
);

/** Somme de contrôle de Luhn (SIREN / SIRET). */
export function isValidLuhn(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export const sirenSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'Le SIREN doit contenir 9 chiffres')
    .refine(isValidLuhn, 'SIREN invalide (somme de contrôle)')
    .optional(),
);

export const siretSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres')
    .refine(isValidLuhn, 'SIRET invalide (somme de contrôle)')
    .optional(),
);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Booléen d'URL : "true"/"1" → true, "false"/"0" → false, absent → undefined. */
export const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}, z.boolean().optional());

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
};

export const isApiErrorPayload = (value: unknown): value is ApiErrorPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: unknown };
  return (
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof (candidate.error as { message?: unknown }).message === 'string'
  );
};
