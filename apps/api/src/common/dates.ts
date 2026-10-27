/**
 * Dates calendaires (sans heure) pour les baux.
 * En base : colonnes `date` ; dans l'API et le web : chaînes « AAAA-MM-JJ ».
 */

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function fromDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToDateOnly(value: string, days: number): string {
  const date = toDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDateOnly(date);
}
