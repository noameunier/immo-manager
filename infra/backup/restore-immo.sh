#!/usr/bin/env bash
#
# Immo Manager — restauration d'une sauvegarde chiffrée
#
# Usage :
#   bash infra/backup/restore-immo.sh <fichier.dump.age> [--target-db immo_restore]
#
# Prérequis :
#   - age et la clé privée (AGE_IDENTITY, par défaut
#     /home/dev/.secrets/immo-manager/age-key.txt, chmod 600)
#   - pg_restore, ou docker pour exécuter pg_restore dans le conteneur
#
# ATTENTION : la restauration ÉCRASE le contenu de la base cible.
# Par défaut, le script refuse de restaurer dans immo_staging ou immo_prod.
# Pour forcer, définir explicitement ALLOW_OVERWRITE=1.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_DIR="${HOME}/.secrets/immo-manager"
IDENTITY="${AGE_IDENTITY:-${SECRETS_DIR}/age-key.txt}"

if [[ $# -lt 1 ]]; then
  sed -n '2,20p' "${BASH_SOURCE[0]}"
  exit 1
fi

ARCHIVE="$1"
shift
TARGET_DB="immo_restore"
TARGET_PORT="5435"
DB_CONTAINER="immo-staging-db"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-db)
      TARGET_DB="${2:-}"
      shift 2
      ;;
    --port)
      TARGET_PORT="${2:-}"
      shift 2
      ;;
    --container)
      DB_CONTAINER="${2:-}"
      shift 2
      ;;
    *)
      echo "Option inconnue : $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "ERREUR : ${ARCHIVE} introuvable." >&2
  exit 1
fi

if [[ ! -f "${IDENTITY}" ]]; then
  echo "ERREUR : clé privée age introuvable (${IDENTITY})." >&2
  exit 1
fi

case "${TARGET_DB}" in
  immo_staging|immo_prod)
    if [[ "${ALLOW_OVERWRITE:-0}" != "1" ]]; then
      echo "REFUS : restauration dans ${TARGET_DB} sans ALLOW_OVERWRITE=1." >&2
      exit 1
    fi
    ;;
esac

for tool in age gzip; do
  command -v "${tool}" >/dev/null 2>&1 || {
    echo "ERREUR : ${tool} introuvable." >&2
    exit 1
  }
done

# Vérifie l'empreinte si elle est disponible à côté de l'archive.
if [[ -f "${ARCHIVE}.sha256" ]]; then
  echo "Vérification de l'empreinte…"
  (cd "$(dirname "${ARCHIVE}")" && sha256sum -c "$(basename "${ARCHIVE}").sha256")
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "Déchiffrement…"
age --decrypt --identity "${IDENTITY}" --output "${TMP_DIR}/restore.dump" "${ARCHIVE}"

echo "Restauration vers ${TARGET_DB}…"
if command -v pg_restore >/dev/null 2>&1; then
  PGPASSWORD="${PGPASSWORD:?définir PGPASSWORD}" \
    pg_restore \
      --host=127.0.0.1 \
      --port="${TARGET_PORT}" \
      --username="${DB_USER:-immo}" \
      --dbname="${TARGET_DB}" \
      --clean \
      --if-exists \
      --no-owner \
      --no-privileges \
      "${TMP_DIR}/restore.dump"
else
  docker exec -i "${DB_CONTAINER}" \
    pg_restore --username="${DB_USER:-immo}" --dbname="${TARGET_DB}" \
      --clean --if-exists --no-owner --no-privileges \
    < "${TMP_DIR}/restore.dump"
fi

echo "Restauration terminée dans ${TARGET_DB}."
echo "Vérifiez ensuite : pnpm --filter @immo/api prisma:migrate puis un test de connexion."
