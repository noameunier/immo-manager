#!/usr/bin/env bash
#
# Immo Manager — branchement des vhosts Caddy (action humaine, une seule fois)
#
# Usage :
#   sudo bash infra/bootstrap/install-caddy-import.sh
#
# Ce que fait le script :
#   1. vérifie qu'il est lancé en root et que Caddy est installé ;
#   2. sauvegarde /etc/caddy/Caddyfile ;
#   3. copie infra/caddy/immo.caddy vers /etc/caddy/immo.caddy ;
#   4. ajoute une ligne `import immo.caddy` si elle n'existe pas déjà (idempotent) ;
#   5. valide la configuration AVANT de recharger, et restaure la sauvegarde
#      si la validation échoue ;
#   6. recharge Caddy.
#
# Pourquoi une copie et non un lien symbolique : /home/dev est en mode 700 et
# le service Caddy tourne sous l'utilisateur « caddy ». Il ne peut donc pas
# traverser /home/dev : un lien vers le dépôt échoue au rechargement (alors que
# `caddy validate`, lancé en root, réussit — piège déjà rencontré).
#
# Le dépôt reste la source de vérité : après modification de
# infra/caddy/immo.caddy, relancer ce script (il est idempotent) pour recopier
# le fichier et recharger Caddy.
#
# Ce script ne touche à aucun autre vhost (OpenCode, Pokero, etc.).
# Il ne modifie ni le DNS, ni le pare-feu, ni systemd.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_FILE="${REPO_DIR}/infra/caddy/immo.caddy"
TARGET_FILE="/etc/caddy/immo.caddy"
CADDYFILE="/etc/caddy/Caddyfile"
IMPORT_LINE="import ${TARGET_FILE}"

if [[ ${EUID} -ne 0 ]]; then
  echo "ERREUR : ce script doit être lancé avec sudo." >&2
  exit 1
fi

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "ERREUR : ${SOURCE_FILE} introuvable." >&2
  exit 1
fi

if [[ ! -f "${CADDYFILE}" ]]; then
  echo "ERREUR : ${CADDYFILE} introuvable." >&2
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "ERREUR : binaire caddy introuvable." >&2
  exit 1
fi

# --- 1. Sauvegarde ---------------------------------------------------------
BACKUP="${CADDYFILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "${CADDYFILE}" "${BACKUP}"
echo "Sauvegarde : ${BACKUP}"

restore() {
  echo "Restauration de ${BACKUP}…" >&2
  cp -a "${BACKUP}" "${CADDYFILE}"
}

# --- 2. Copie des vhosts ---------------------------------------------------
if [[ -L "${TARGET_FILE}" ]]; then
  echo "Lien symbolique existant remplacé par une copie (illisible par l'utilisateur caddy)."
  rm -f "${TARGET_FILE}"
fi
# 644 propriétaire root : lisible par le service, non modifiable par lui.
install -m 644 -o root -g root "${SOURCE_FILE}" "${TARGET_FILE}"
echo "Vhosts copiés : ${SOURCE_FILE} → ${TARGET_FILE}"

# --- 3. Import idempotent --------------------------------------------------
if grep -qF "${IMPORT_LINE}" "${CADDYFILE}"; then
  echo "Ligne d'import déjà présente — rien à ajouter."
elif grep -qE "^[[:space:]]*import[[:space:]]+(/etc/caddy/)?immo\.caddy[[:space:]]*$" "${CADDYFILE}"; then
  echo "Un import immo.caddy existe déjà sous une autre forme — rien à ajouter."
else
  {
    echo ""
    echo "# --- Immo Manager (web, API, préproduction) ---"
    echo "${IMPORT_LINE}"
  } >> "${CADDYFILE}"
  echo "Ligne d'import ajoutée."
fi

# --- 4. Validation ---------------------------------------------------------
echo "Validation de la configuration Caddy…"
if ! caddy validate --config "${CADDYFILE}" --adapter caddyfile; then
  echo "Configuration invalide : restauration." >&2
  restore
  exit 1
fi

# --- 5. Rechargement -------------------------------------------------------
echo "Rechargement de Caddy…"
if ! systemctl reload caddy; then
  echo "Échec du rechargement : restauration." >&2
  echo "Vérifier les droits de ${TARGET_FILE} et les journaux :" >&2
  echo "  readlink -f ${TARGET_FILE}" >&2
  echo "  systemctl status caddy" >&2
  echo "  sudo journalctl -u caddy -n 50 --no-pager" >&2
  restore
  systemctl reload caddy || true
  exit 1
fi

cat <<'EOF'

OK. Les vhosts Immo Manager sont branchés.

Prochaines étapes (humaines) :
  1. Créer les enregistrements DNS A (TTL 300, sans Alias) :
       immo.noameunier.fr            → 45.155.171.57
       api-immo.noameunier.fr        → 45.155.171.57
       staging-immo.noameunier.fr    → 45.155.171.57
       api-staging-immo.noameunier.fr→ 45.155.171.57
  2. Démarrer les services applicatifs (systemd --user) :
       systemctl --user start immo-api immo-web immo-staging-api immo-staging-web
  3. Vérifier :
       curl -I https://staging-immo.noameunier.fr
       curl -s https://api-staging-immo.noameunier.fr/health

Les certificats TLS sont émis automatiquement au premier accès.

Après une modification de infra/caddy/immo.caddy, relancer ce script
(idempotent) pour recopier le fichier et recharger Caddy.
EOF
