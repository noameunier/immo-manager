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
#   3. crée un lien symbolique /etc/caddy/immo.caddy vers le fichier du dépôt,
#      afin que les mises à jour futures ne demandent plus de sudo (hors reload) ;
#   4. ajoute une ligne `import immo.caddy` si elle n'existe pas déjà (idempotent) ;
#   5. valide la configuration AVANT de recharger, et restaure la sauvegarde
#      si la validation échoue ;
#   6. recharge Caddy.
#
# Ce script ne touche à aucun autre vhost (OpenCode, Pokero, etc.).
# Il ne modifie ni le DNS, ni le pare-feu, ni systemd.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_FILE="${REPO_DIR}/infra/caddy/immo.caddy"
TARGET_LINK="/etc/caddy/immo.caddy"
CADDYFILE="/etc/caddy/Caddyfile"
IMPORT_LINE="import ${TARGET_LINK}"

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

# --- 2. Lien symbolique ----------------------------------------------------
if [[ -L "${TARGET_LINK}" ]]; then
  CURRENT="$(readlink -f "${TARGET_LINK}")"
  if [[ "${CURRENT}" != "${SOURCE_FILE}" ]]; then
    echo "Lien existant vers ${CURRENT} : remplacement par ${SOURCE_FILE}."
    rm -f "${TARGET_LINK}"
    ln -s "${SOURCE_FILE}" "${TARGET_LINK}"
  else
    echo "Lien ${TARGET_LINK} déjà correct."
  fi
elif [[ -e "${TARGET_LINK}" ]]; then
  echo "ERREUR : ${TARGET_LINK} existe et n'est pas un lien symbolique." >&2
  echo "Déplacez-le manuellement avant de relancer ce script." >&2
  exit 1
else
  ln -s "${SOURCE_FILE}" "${TARGET_LINK}"
  echo "Lien créé : ${TARGET_LINK} → ${SOURCE_FILE}"
fi

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
EOF
