# Infrastructure — Immo Manager

Tout ce qui touche au VPS, au reverse proxy, aux services et aux sauvegardes.
Les scripts marqués **sudo** doivent être exécutés par un humain ; les autres
tournent en espace utilisateur.

## Contenu

```text
infra/
├── caddy/immo.caddy              vhosts versionnés (source de vérité)
├── docker/docker-compose.dev.yml PostgreSQL 17 + Mailpit (dev)
├── docker/docker-compose.staging.yml PostgreSQL 17 (préproduction)
├── bootstrap/install-caddy-import.sh    sudo, une seule fois
├── bootstrap/install-user-services.sh   sans sudo
├── systemd/*.service             API et web, dev et préproduction
└── backup/                       sauvegarde chiffrée + restauration
```

## 1. Prérequis VPS

| Élément      | Valeur                                              |
| ------------ | --------------------------------------------------- |
| IP publique  | `45.155.171.57`                                     |
| Web dev      | `immo.noameunier.fr` → `127.0.0.1:3100`             |
| API dev      | `api-immo.noameunier.fr` → `127.0.0.1:4100`         |
| Web préprod  | `staging-immo.noameunier.fr` → `127.0.0.1:3200`     |
| API préprod  | `api-staging-immo.noameunier.fr` → `127.0.0.1:4200` |
| Base dev     | `immo-dev-db`, `127.0.0.1:5434`                     |
| Base préprod | `immo-staging-db`, `127.0.0.1:5435`                 |

Les enregistrements DNS (A, TTL 300, sans Alias) sont créés **par un humain**
chez le registrar. Ils ne sont pas automatisés.

Les deux vhosts web (`immo…`, `staging-immo…`) doivent envoyer **tout** à
Next.js, `/api/*` compris : le route handler du web relaie vers l'API interne
(`API_INTERNAL_URL`) en retirant le préfixe. L'API retire elle aussi un
éventuel segment `/api` (compatibilité de proxy), donc un vhost encore
configuré avec `/api/* → API` fonctionne ; on évite simplement un double
chemin. Les vhosts `api-…` servent le client mobile, qui appelle l'API sans
préfixe.

Ports utilisés par d'autres projets du VPS : 4000, 5433, 8080, 1025, 8025.
Ne jamais les réutiliser.

## 2. Branchement Caddy (sudo, une seule fois)

```bash
sudo bash infra/bootstrap/install-caddy-import.sh
```

Le script :

1. sauvegarde `/etc/caddy/Caddyfile` ;
2. copie `infra/caddy/immo.caddy` vers `/etc/caddy/immo.caddy` (mode 644) ;
3. ajoute `import /etc/caddy/immo.caddy` (idempotent) ;
4. valide la configuration, restaure en cas d'échec ;
5. recharge Caddy.

Après cette étape, **modifier un vhost** reprend le même script (idempotent) :

```bash
# après édition de infra/caddy/immo.caddy
sudo bash infra/bootstrap/install-caddy-import.sh
```

> Ne pas utiliser de lien symbolique vers le dépôt : `/home/dev` est en mode
> 700 et le service Caddy tourne sous l'utilisateur `caddy`, qui ne peut pas y
> entrer. `caddy validate` lancé en root réussirait, mais le rechargement
> échouerait (`permission denied`). C'est pour cela que le fichier est copié.

## 3. Services applicatifs (sans sudo)

```bash
# Développement
bash infra/bootstrap/install-user-services.sh dev

# Préproduction (nécessite ~/.secrets/immo-manager/staging-api.env)
bash infra/bootstrap/install-user-services.sh staging

# Tout ce qui est possible
bash infra/bootstrap/install-user-services.sh all
```

Surveillance :

```bash
systemctl --user status immo-api immo-web
journalctl --user -u immo-api -f
journalctl --user -u immo-staging-api -f
```

Pour que les services survivent à la déconnexion SSH :

```bash
loginctl enable-linger dev
```

## 4. Secrets

Tous les secrets vivent dans `/home/dev/.secrets/immo-manager/` (`chmod 700`),
jamais dans le dépôt.

| Fichier           | Contenu                                                        |
| ----------------- | -------------------------------------------------------------- |
| `staging-api.env` | variables complètes de l'API de préproduction                  |
| `staging-web.env` | `API_INTERNAL_URL=http://127.0.0.1:4200`                       |
| `backup.env`      | configuration de sauvegarde (voir `backup/backup.env.example`) |
| `age-key.txt`     | clé privée age (`chmod 600`)                                   |

Exemple de création :

```bash
mkdir -p ~/.secrets/immo-manager && chmod 700 ~/.secrets/immo-manager
cp infra/backup/backup.env.example ~/.secrets/immo-manager/backup.env
chmod 600 ~/.secrets/immo-manager/backup.env
age-keygen -o ~/.secrets/immo-manager/age-key.txt
chmod 600 ~/.secrets/immo-manager/age-key.txt
```

## 5. Base de préproduction

```bash
export IMMO_STAGING_DB_PASSWORD="$(openssl rand -base64 32)"
docker compose -f infra/docker/docker-compose.staging.yml up -d --wait
```

Puis, avec `DATABASE_URL` pointant sur `immo_staging` (port 5435) :

```bash
pnpm --filter @immo/api prisma:migrate
```

Le jeu de démonstration (`db:seed`) est **interdit** en production ; il est
utilisable en préproduction uniquement avec des données fictives.

## 6. Sauvegardes

```bash
# Test à blanc (aucune écriture)
bash infra/backup/backup-immo.sh --env staging --dry-run

# Sauvegarde réelle
bash infra/backup/backup-immo.sh --env staging
```

Planification quotidienne (crontab utilisateur) :

```cron
15 3 * * * cd /home/dev/repos/immo-manager && /usr/bin/env bash infra/backup/backup-immo.sh --env staging >> /home/dev/.local/state/immo-backup.log 2>&1
```

Restauration :

```bash
bash infra/backup/restore-immo.sh backups/immo-staging-20261026T031500Z.dump.age \
  --target-db immo_restore
```

La restauration refuse d'écraser `immo_staging` ou `immo_prod` sans
`ALLOW_OVERWRITE=1`.

**Test de restauration trimestriel obligatoire** : restaurer la dernière
sauvegarde dans `immo_restore`, lancer les migrations, vérifier qu'un compte de
test se connecte, puis supprimer la base de test.

### Sans root : installer age et rclone

Les deux outils disposent de binaires statiques :

```bash
mkdir -p ~/.local/bin
# age
curl -L https://github.com/FiloSottile/age/releases/latest/download/age-v1.2.1-linux-amd64.tar.gz \
  | tar -xz --strip-components=1 -C ~/.local/bin age/age age/age-keygen
# rclone
curl -L https://downloads.rclone.org/rclone-current-linux-amd64.zip -o /tmp/rclone.zip
unzip -o /tmp/rclone.zip -d /tmp/rclone && install -m755 /tmp/rclone/rclone-*/rclone ~/.local/bin/rclone
```

Puis configurer le remote (interactif, hors dépôt) :

```bash
rclone config   # créer un remote nommé immo-backup
```

## 7. Vérifications après déploiement

```bash
curl -fsS https://api-staging-immo.noameunier.fr/health
curl -fsSI https://staging-immo.noameunier.fr | head -5
curl -fsS https://staging-immo.noameunier.fr/api/health
ss -ltnp | grep -E ':(3100|3200|4100|4200|5434|5435)\b'   # tout en 127.0.0.1
```

Si `curl` renvoie 502 : le vhost est bon mais le service applicatif est arrêté.
Si le certificat n'est pas émis : vérifier le DNS (`dig +short staging-immo.noameunier.fr`).
