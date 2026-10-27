import { describe, expect, it } from 'vitest';
import { computeLeaseStatus, createLeaseSchema, updateLeaseSchema } from './lease';

const base = {
  entityId: '00000000-0000-7000-8000-000000000001',
  propertyId: '00000000-0000-7000-8000-000000000002',
  tenantId: '00000000-0000-7000-8000-000000000003',
  startsOn: '2026-01-01',
  rentAmount: '850,50',
};

describe('Baux — validation', () => {
  it('applique les valeurs par défaut et convertit les montants français', () => {
    const parsed = createLeaseSchema.safeParse({ ...base, chargesAmount: '50,25' });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.type).toBe('NUE');
    expect(parsed.data.paymentDay).toBe(1);
    expect(parsed.data.rentAmount).toBe(850.5);
    expect(parsed.data.chargesAmount).toBe(50.25);
  });

  it('refuse une date de fin antérieure au début', () => {
    const parsed = createLeaseSchema.safeParse({
      ...base,
      startsOn: '2026-06-01',
      endsOn: '2026-05-31',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.path.includes('endsOn'))).toBe(true);
  });

  it('refuse une date qui n’existe pas', () => {
    const parsed = createLeaseSchema.safeParse({ ...base, startsOn: '2026-02-31' });
    expect(parsed.success).toBe(false);
  });

  it('refuse un loyer négatif et un jour d’échéance hors bornes', () => {
    const negative = createLeaseSchema.safeParse({ ...base, rentAmount: -10 });
    expect(negative.success).toBe(false);

    const day = createLeaseSchema.safeParse({ ...base, paymentDay: 32 });
    expect(day.success).toBe(false);
  });

  it('vérifie les dates aussi en modification partielle', () => {
    const parsed = updateLeaseSchema.safeParse({ startsOn: '2026-03-01', endsOn: '2026-02-01' });
    expect(parsed.success).toBe(false);
  });
});

describe('Baux — statut calculé', () => {
  it('distingue à venir, actif, terminé et archivé', () => {
    const today = '2026-10-27';

    expect(
      computeLeaseStatus({ archivedAt: null, startsOn: '2026-11-01', endsOn: null }, today),
    ).toBe('UPCOMING');
    expect(
      computeLeaseStatus({ archivedAt: null, startsOn: '2025-01-01', endsOn: null }, today),
    ).toBe('ACTIVE');
    expect(
      computeLeaseStatus({ archivedAt: null, startsOn: '2025-01-01', endsOn: '2026-06-30' }, today),
    ).toBe('ENDED');
    expect(
      computeLeaseStatus(
        { archivedAt: '2026-02-01T10:00:00.000Z', startsOn: '2025-01-01', endsOn: null },
        today,
      ),
    ).toBe('ARCHIVED');
  });

  it('considère le dernier jour de bail comme actif', () => {
    expect(
      computeLeaseStatus(
        { archivedAt: null, startsOn: '2026-01-01', endsOn: '2026-10-27' },
        '2026-10-27',
      ),
    ).toBe('ACTIVE');
  });
});
