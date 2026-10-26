/** Analyse minimale de l'en-tête Cookie (aucune dépendance externe). */
export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((accumulator, part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return accumulator;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {
      try {
        accumulator[key] = decodeURIComponent(value);
      } catch {
        accumulator[key] = value;
      }
    }
    return accumulator;
  }, {});
}
