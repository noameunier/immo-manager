#!/usr/bin/env bash
#
# Immo Manager — sauvegarde chiffrée de la base de données
#
# Usage :
#   bash infra/backup/backup-immo.sh [--env staging|dev] [--dry-run]
#
# Prérequis :
#   - pg_dump (client PostgreSQL) ou accès au conteneur Docker immo-*-db
#   - age (chiffrement)      : https://github.com/FiloSottile/age
#   - rclone (envoi distant) : optionnel, activé si RCLONE_REMOTE est défini
#
# Configuration (JAMAIS dans le dépôt) :
#   /home/dev/.secrets/immo-manager/backup.env   (chmod 600)
#
#   AGE_RECIPIENT="age1..."            # clé publique age
#   RCLONE_REMOTE="immo-backup:immo"   # destination rclone (optionnel)
#   LOCAL_RETENTION_DAYS=7
#   REMOTE_RETENTION_DAYS=30
#   DB_CONTAINER="immo-staging-db"
#   DB_NAME="immo_staging"
#   DB_USER="immo"
#
# Le script n'écrit aucun secret dans les journaux.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_DIR="${HOME}/.secrets/immo-manager"
CONFIG_FILE="${SECRETS_DIR}/backup.env"
BACKUP_DIR="${REPO_DIR}/backups"
LOCK_FILE="/tmp/immo-backup.lock"
ENVIRONMENT="staging"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENVIRONMENT="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      sed -n '2,30p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *)
      echo "Option inconnue : $1" >&2
      exit 1
      ;;
  esac
done

case "${ENVIRONMENT}" in
  staging)
    DEFAULT_CONTAINER="immo-staging-db"
    DEFAULT_DB="immo_staging"
    ;;
  dev)
    DEFAULT_CONTAINER="immo-dev-db"
    DEFAULT_DB="immo_dev"
    ;;
  *)
    echo "Environnement inconnu : ${ENVIRONMENT} (attendu : staging ou dev)" >&2
    exit 1
    ;;
esac

if [[ -f "${CONFIG_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
else
  echo "ERREUR : ${CONFIG_FILE} introuvable." >&2
  echo "Copiez infra/backup/backup.env.example et renseignez les valeurs." >&2
  exit 1
fi

: "${AGE_RECIPIENT:?AGE_RECIPIENT manquant dans ${CONFIG_FILE}}"
DB_CONTAINER="${DB_CONTAINER:-${DEFAULT_CONTAINER}}"
DB_NAME="${DB_NAME:-${DEFAULT_DB}}"
DB_USER="${DB_USER:-immo}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
REMOTE_RETENTION_DAYS="${REMOTE_RETENTION_DAYS:-30}"

for tool in gzip age; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "ERREUR : ${tool} introuvable." >&2
    if [[ "${tool}" == "age" ]]; then
      echo "Installation sans root : voir https://github.com/FiloSottile/age/releases" >&2
      echo "(binaire statique à placer dans ~/.local/bin)." >&2
    fi
    exit 1
  fi
done

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# --- Verrou : empêche deux sauvegardes simultanées -------------------------
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Une sauvegarde est déjà en cours (${LOCK_FILE}). Abandon." >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN_FILE="${BACKUP_DIR}/immo-${ENVIRONMENT}-${TIMESTAMP}.dump"
ENCRYPTED_FILE="${PLAIN_FILE}.age"

cleanup() {
  rm -f "${PLAIN_FILE}"
}
trap cleanup EXIT

echo "[$(date -Is)] Sauvegarde ${ENVIRONMENT} → ${ENCRYPTED_FILE}"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "Mode --dry-run : aucune commande exécutée."
  exit 0
fi

# --- Dump ------------------------------------------------------------------
if command -v pg_dump >/dev/null 2>&1; then
  # Connexion via le port publié sur 127.0.0.1 uniquement.
  PGPASSWORD="${PGPASSWORD:?définir PGPASSWORD dans ${CONFIG_FILE}}" \
    pg_dump \
      --host=127.0.0.1 \
      --port="${DB_PORT:-5435}" \
      --username="${DB_USER}" \
      --dbname="${DB_NAME}" \
      --format=custom \
      --compress=0 \
      --no-owner \
      --no-privileges \
      --file="${PLAIN_FILE}"
elif command -v docker >/dev/null 2>&1; then
  docker exec "${DB_CONTAINER}" \
    pg_dump --username="${DB_USER}" --dbname="${DB_NAME}" \
      --format=custom --compress=0 --no-owner --no-privileges \
    > "${PLAIN_FILE}"
else
  echo "ERREUR : ni pg_dump ni docker ne sont disponibles." >&2
  exit 1
fi

if [[ ! -s "${PLAIN_FILE}" ]]; then
  echo "ERREUR : le dump est vide, sauvegarde annulée." >&2
  exit 1
fi

# --- Chiffrement -----------------------------------------------------------
age --encrypt --recipient "${AGE_RECIPIENT}" --output "${ENCRYPTED_FILE}" "${PLAIN_FILE}"
chmod 600 "${ENCRYPTED_FILE}"

# Vérifie que le fichier chiffré est lisible (en-tête age + taille).
if [[ ! -s "${ENCRYPTED_FILE}" ]] || ! head -c 21 "${ENCRYPTED_FILE}" | grep -q "age-encryption.org"; then
  echo "ERREUR : le fichier chiffré est invalide." >&2
  rm -f "${ENCRYPTED_FILE}"
  exit 1
fi

SHA256="$(sha256sum "${ENCRYPTED_FILE}" | awk '{print $1}')"
echo "${SHA256}  $(basename "${ENCRYPTED_FILE}")" > "${ENCRYPTED_FILE}.sha256"

echo "[$(date -Is)] Dump chiffré : $(du -h "${ENCRYPTED_FILE}" | cut -f1) — sha256 ${SHA256}"

# --- Envoi distant (optionnel) --------------------------------------------
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "AVERTISSEMENT : RCLONE_REMOTE défini mais rclone absent — envoi ignoré." >&2
  else
    echo "[$(date -Is)] Envoi vers ${RCLONE_REMOTE}"
    rclone copy "${ENCRYPTED_FILE}" "${RCLONE_REMOTE}/" --immutable
    rclone copy "${ENCRYPTED_FILE}.sha256" "${RCLONE_REMOTE}/" --immutable
    rclone delete "${RCLONE_REMOTE}/" --min-age "${REMOTE_RETENTION_DAYS}d" --include "immo-*.age*"
    echo "[$(date -Is)] Envoi terminé."
  fi
fi

# --- Rétention locale ------------------------------------------------------
find "${BACKUP_DIR}" -maxdepth 1 -type f \
  \( -name 'immo-*.dump.age' -o -name 'immo-*.dump.age.sha256' \) \
  -mtime "+${LOCAL_RETENTION_DAYS}" -delete

echo "[$(date -Is)] Sauvegarde terminée."
