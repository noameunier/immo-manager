/**
 * Paramètres Argon2id — source unique de vérité.
 * memoryCost 19 456 Kio (~19 Mio), 2 passes, 1 fil : recommandation OWASP 2024
 * pour Argon2id, adaptée à un VPS mutualisé.
 */
export const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;
