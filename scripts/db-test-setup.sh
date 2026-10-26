#!/usr/bin/env bash
#
# Prépare la base de test (immo_test) utilisée par les tests d'intégration.
# Idempotent : ne détruit la base que si --reset est passé.
# Usage : bash scripts/db-test-setup.sh [--reset]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTAINER="immo-dev-db"
DB_USER="immo"
TEST_DB="immo_test"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERREUR : le conteneur $CONTAINER n'existe pas. Lancer 'pnpm db:up'." >&2
  exit 1
fi

if [[ "${1:-}" == "--reset" ]]; then
  echo "==> Suppression de la base $TEST_DB"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE);" >/dev/null
fi

echo "==> Création de la base $TEST_DB si nécessaire"
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$TEST_DB'" | grep -q 1 || \
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE $TEST_DB;" >/dev/null

echo "==> Application des migrations sur $TEST_DB"
cd apps/api
DATABASE_URL="postgresql://immo:immo_dev_only@127.0.0.1:5434/$TEST_DB?schema=public" \
  pnpm exec prisma migrate deploy

echo "==> Base de test prête"
