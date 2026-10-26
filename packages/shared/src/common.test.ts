import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  frenchPostalCodeSchema,
  isValidLuhn,
  optionalText,
  passwordSchema,
  queryBooleanSchema,
  sirenSchema,
  siretSchema,
} from './common';
import { createPropertySchema } from './property';

describe('isValidLuhn', () => {
  it('accepte un SIREN valide', () => {
    expect(isValidLuhn('732829320')).toBe(true);
  });

  it('refuse une somme de contrôle incorrecte', () => {
    expect(isValidLuhn('732829321')).toBe(false);
  });

  it('refuse les caractères non numériques', () => {
    expect(isValidLuhn('73282932a')).toBe(false);
  });
});

describe('siren et siret', () => {
  it('accepte un SIREN valide et convertit la chaîne vide en absence', () => {
    expect(sirenSchema.parse('732829320')).toBe('732829320');
    expect(sirenSchema.parse('')).toBeUndefined();
    expect(sirenSchema.parse(undefined)).toBeUndefined();
  });

  it('refuse un SIREN invalide', () => {
    expect(sirenSchema.safeParse('123456789').success).toBe(false);
  });

  it('accepte un SIRET valide (Luhn)', () => {
    expect(siretSchema.parse('73282932000074')).toBe('73282932000074');
  });
});

describe('emailSchema', () => {
  it('normalise en minuscules et supprime les espaces', () => {
    expect(emailSchema.parse('  Camille@Exemple.FR ')).toBe('camille@exemple.fr');
  });

  it('refuse une adresse invalide', () => {
    expect(emailSchema.safeParse('camille@').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('exige au moins 12 caractères', () => {
    expect(passwordSchema.safeParse('court').success).toBe(false);
    expect(passwordSchema.safeParse('mot-de-passe-solide').success).toBe(true);
  });

  it('refuse au-delà de 128 caractères', () => {
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});

describe('frenchPostalCodeSchema', () => {
  it('accepte cinq chiffres', () => {
    expect(frenchPostalCodeSchema.parse('69002')).toBe('69002');
  });

  it('refuse les formats invalides', () => {
    expect(frenchPostalCodeSchema.safeParse('6900').success).toBe(false);
    expect(frenchPostalCodeSchema.safeParse('2A004').success).toBe(false);
  });
});

describe('optionalText', () => {
  it('convertit une chaîne vide en absence', () => {
    expect(optionalText(10).parse('')).toBeUndefined();
    expect(optionalText(10).parse('  ')).toBeUndefined();
    expect(optionalText(10).parse(' Lyon ')).toBe('Lyon');
  });

  it('refuse un texte trop long', () => {
    expect(optionalText(3).safeParse('quatre').success).toBe(false);
  });
});

describe('queryBooleanSchema', () => {
  it('interprète les valeurs usuelles', () => {
    expect(queryBooleanSchema.parse('true')).toBe(true);
    expect(queryBooleanSchema.parse('1')).toBe(true);
    expect(queryBooleanSchema.parse('false')).toBe(false);
    expect(queryBooleanSchema.parse('')).toBeUndefined();
    expect(queryBooleanSchema.parse(undefined)).toBeUndefined();
  });
});

describe('createPropertySchema', () => {
  const base = {
    entityId: '018f4f9a-0000-7000-8000-000000000001',
    name: 'Appartement 3B',
    type: 'APARTMENT',
  };

  it('accepte un lot sans adresse propre', () => {
    const parsed = createPropertySchema.parse({
      ...base,
      buildingId: '018f4f9a-0000-7000-8000-000000000002',
    });
    expect(parsed.buildingId).toBe('018f4f9a-0000-7000-8000-000000000002');
    expect(parsed.occupancyStatus).toBe('UNKNOWN');
  });

  it('convertit un immeuble vide en bien indépendant', () => {
    const parsed = createPropertySchema.parse({ ...base, buildingId: '' });
    expect(parsed.buildingId).toBeUndefined();
  });

  it('accepte explicitement null pour un bien indépendant', () => {
    const parsed = createPropertySchema.parse({ ...base, buildingId: null });
    expect(parsed.buildingId).toBeNull();
  });

  it('convertit les champs numériques vides en absence', () => {
    const parsed = createPropertySchema.parse({ ...base, surfaceM2: '', rooms: '' });
    expect(parsed.surfaceM2).toBeUndefined();
    expect(parsed.rooms).toBeUndefined();
  });

  it('refuse une surface négative', () => {
    expect(createPropertySchema.safeParse({ ...base, surfaceM2: '-3' }).success).toBe(false);
  });
});
