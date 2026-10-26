#!/usr/bin/env bash
#
# Recrée complètement la base de développement (destructif, dev uniquement).
# Usage : pnpm db:reset
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Arrêt et suppression du volume de développement immo-dev-db"
docker compose -f infra/docker/docker-compose.dev.yml down -v

echo "==> Redémarrage du conteneur PostgreSQL"
docker compose -f infra/docker/docker-compose.dev.yml up -d --wait

echo "==> Application des migrations"
pnpm --filter @immo/api exec prisma migrate deploy

echo "==> Base de développement prête"
