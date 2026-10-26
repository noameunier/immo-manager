#!/usr/bin/env bash
#
# Immo Manager — installation des services utilisateur (sans sudo)
#
# Usage :
#   bash infra/bootstrap/install-user-services.sh [dev|staging|all]
#
# Installe les unités systemd --user, recharge le démon et active les services.
# Les services de préproduction ne sont installés que si
# /home/dev/.secrets/immo-manager/staging-api.env existe.
#
# Activer le démarrage au boot sans root :
#   loginctl enable-linger dev     (déjà actif si des services utilisateur existent)
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"
SECRETS_DIR="${HOME}/.secrets/immo-manager"
MODE="${1:-all}"

# Les shells non interactifs n'ont pas toujours XDG_RUNTIME_DIR ; systemd --user
# en a besoin pour joindre le bus utilisateur.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

mkdir -p "${UNIT_DIR}"

install_unit() {
  local name="$1"
  install -m 644 "${REPO_DIR}/infra/systemd/${name}.service" "${UNIT_DIR}/${name}.service"
  echo "Unité installée : ${name}.service"
}

case "${MODE}" in
  dev)
    install_unit immo-api
    install_unit immo-web
    SERVICES=(immo-api immo-web)
    ;;
  staging)
    if [[ ! -f "${SECRETS_DIR}/staging-api.env" ]]; then
      echo "ERREUR : ${SECRETS_DIR}/staging-api.env manquant." >&2
      echo "Créez-le (chmod 600) avant d'installer la préproduction." >&2
      exit 1
    fi
    install_unit immo-staging-api
    install_unit immo-staging-web
    SERVICES=(immo-staging-api immo-staging-web)
    ;;
  all)
    install_unit immo-api
    install_unit immo-web
    SERVICES=(immo-api immo-web)
    if [[ -f "${SECRETS_DIR}/staging-api.env" ]]; then
      install_unit immo-staging-api
      install_unit immo-staging-web
      SERVICES+=(immo-staging-api immo-staging-web)
    else
      echo "Préproduction ignorée : ${SECRETS_DIR}/staging-api.env absent."
    fi
    ;;
  *)
    echo "Usage : $0 [dev|staging|all]" >&2
    exit 1
    ;;
esac

systemctl --user daemon-reload
for service in "${SERVICES[@]}"; do
  systemctl --user enable --now "${service}.service"
  systemctl --user --no-pager --lines=0 status "${service}.service" || true
done

cat <<'EOF'

Services installés. Commandes utiles :
  systemctl --user status immo-api immo-web
  journalctl --user -u immo-api -f
  systemctl --user restart immo-api

Si les services doivent survivre à la déconnexion :
  loginctl enable-linger dev
EOF
