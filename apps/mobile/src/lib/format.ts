const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return numberFormatter.format(value);
}

export function formatSurface(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${numberFormatter.format(value)} m²`;
}
