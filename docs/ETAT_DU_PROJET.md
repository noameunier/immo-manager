# État du projet — Immo Manager

> **Dernière mise à jour : 26 octobre 2026 (soir).**
> Ce document est la référence pour reprendre le travail. Il décrit ce qui est
> réellement fait, ce qui est vérifié, ce qui est bloqué et par quoi commencer.
> En cas de doute : ce fichier, puis [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 1. Reprise en 5 minutes

```bash
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:$PATH"
cd /home/dev/repos/immo-manager

git status                     # doit être propre
git log --oneline -5
pnpm install
pnpm db:up                     # PostgreSQL 5434 + Mailpit 8026

# Vérifier l'état de départ (obligatoire avant de coder)
pnpm db:test
pnpm typecheck
pnpm test
```

Puis reprendre à la **section 7 — Prochaines actions**, dans l'ordre.

Services actuellement lancés manuellement sur le VPS (à relancer si absents) :

```bash
cd apps/api && nohup node dist/main.js > /tmp/opencode/immo-api.log 2>&1 &
cd apps/web && nohup pnpm exec next start --hostname 127.0.0.1 --port 3100 \
  > /tmp/opencode/immo-web.log 2>&1 &
```

Vérification : `curl -s http://127.0.0.1:4100/health` et
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/connexion`.

## 2. Résumé

| Élément        | Valeur                                                       |
| -------------- | ------------------------------------------------------------ |
| Phase          | Phase 1 — fonctionnellement complète, clôture en cours       |
| Dépôt          | `github.com/noameunier/immo-manager` (public)                |
| Branche        | `main`, à jour et poussée                                    |
| API            | NestJS 11.2.8, Prisma 7.10.1, PostgreSQL 17                  |
| Web            | Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3                 |
| Mobile         | Expo SDK 58, React Native 0.88, expo-router 58               |
| Tests API      | **43/43 verts** (vitest + supertest, vraie base `immo_test`) |
| Tests partagés | **20/20 verts** (schémas Zod, Luhn, normalisation)           |
| Tests E2E      | **2/2 verts** (Playwright, Chromium)                         |
| Builds         | API, web et bundle Android Expo : OK                         |
| Lint / types   | Tous les paquets : OK                                        |

## 3. Ce qui est livré

### 3.1 Socle

- Monorepo pnpm (4 paquets), TypeScript 5.9 strict avec `noUncheckedIndexedAccess`.
- ESLint 9 + Prettier, `.editorconfig`, `.node-version` (24).
- `packages/shared` : schémas Zod 4, types, libellés français, validation SIREN/SIRET,
  téléphone, code postal, emails. Construit avec tsup (ESM + CJS + `.d.ts`).
- Docker de développement : PostgreSQL 17 (`immo-dev-db`, port 5434) et
  Mailpit (1026/8026), tous deux liés à `127.0.0.1`.
- Scripts : `db:up`, `db:down`, `db:reset`, `db:test`, `db:seed`,
  `db:staging:up`, `backup`, `services:install`.

### 3.2 API

Modules : `auth`, `owner-entities`, `buildings`, `properties`, `dashboard`,
`audit`, `mail`, `health`, `database`.

- Authentification complète : inscription, connexion, déconnexion, session
  courante, vérification d'email, renvoi, mot de passe oublié, réinitialisation.
- Argon2id (19 456 Kio, 2 passes, 1 fil), sessions opaques hachées SHA-256,
  verrouillage après 10 échecs, révocation de toutes les sessions après reset.
- Cookie `httpOnly` pour le web, jeton `Bearer` pour le mobile
  (`x-client-type: mobile`).
- CSRF par contrôle d'origine, limitation de débit, en-têtes de sécurité,
  filtre d'exceptions normalisé, journalisation pino sans données sensibles.
- CRUD complet entités / immeubles / biens avec archivage et restauration.
- Tableau de bord agrégé (compteurs, répartitions, surface, archives).
- Isolation multi-propriétaire par `ownerId` **et** FK composites en base.
- Migration `20261026223638_init` appliquée sur `immo_dev`.

### 3.3 Web

- 16 pages : accueil, connexion, inscription, mot de passe oublié,
  réinitialisation, vérification email, tableau de bord, entités
  (liste / détail / création / édition), immeubles (idem), biens (idem),
  profil, 404.
- Interface française, responsive, navigation clavier, messages d'erreur
  champ par champ issus des schémas partagés.
- Same-origin : relais `/api/*` → API interne via route handler lisant
  `API_INTERNAL_URL` à l'exécution (4100 en dev, 4200 en préproduction),
  cookies first-party, pas de CORS.
- `proxy.ts` (ex-`middleware.ts`, renommé pour Next 16).

### 3.4 Mobile

- Écrans : connexion, inscription, tableau de bord, liste des biens, fiche d'un
  bien (archivage/restauration), profil, déconnexion.
- Jeton stocké dans `expo-secure-store`, revalidation au démarrage.
- Bundle Android exporté avec succès (`expo export`, 1 253 modules).
- **Non testé sur émulateur/appareil** : aucun émulateur ni KVM sur le VPS.

### 3.5 Tests

- `apps/api/test/` : 5 fichiers, 43 tests — auth 16, entités 6, immeubles 6,
  biens 11, tableau de bord 4. Vraie instance HTTP, vraie base, aucun mock Prisma.
- `packages/shared/src/common.test.ts` : 20 tests sur les schémas partagés
  (Luhn SIREN/SIRET, email, mot de passe, code postal, conversions de formulaire).
- `apps/web/e2e/` : parcours propriétaire complet + redirection d'un visiteur.
- Isolation croisée testée : lecture, écriture, archivage, restauration,
  rattachement → 404.

### 3.6 Documentation et infrastructure

- `README.md`, `AGENTS.md`, ce fichier, `CAHIER_DES_CHARGES.md`,
  `ARCHITECTURE.md`, `ROADMAP.md`, `infra/README.md`.
- `infra/caddy/immo.caddy` (4 vhosts), `infra/bootstrap/install-caddy-import.sh`
  (sudo, idempotent, lien symbolique), `install-user-services.sh`.
- 4 unités systemd utilisateur (API/web, dev/préproduction), installées et
  actives sur le VPS, toutes liées à `127.0.0.1`.
- `infra/docker/docker-compose.staging.yml` (PostgreSQL 5435).
- `infra/backup/` : sauvegarde `pg_dump` + chiffrement `age` + envoi `rclone`,
  restauration avec garde-fous, exemple de configuration. `age` et `rclone`
  sont installés dans `~/.local/bin` ; une sauvegarde et une restauration
  réelles ont été validées.
- CI GitHub Actions : lint, types, tests API, builds (dont bundle mobile) et
  parcours Playwright.

## 4. Commits notables

```text
5241c07  chore: initialiser le monorepo Immo Manager et l'API du patrimoine
7155690  test: couvrir l'authentification, le patrimoine et l'isolation
eeb7dc0  feat: livrer l'application web Next.js et le jeu de démonstration
f445c55  style: uniformiser le formatage Prettier sur le dépôt
5f1a236  feat: ajouter l'application mobile Expo
740f28b  fix: restreindre le serveur web à l'interface locale
19a0157  test: couvrir les schémas de validation partagés
10acb6b  feat: préparer la préproduction, les sauvegardes et la CI
```

Les commits suivants remplacent le rewrite Next.js par un relais runtime
(préproduction sur 4200 sans rebuild) et ajoutent la validation de la
préproduction et de la sauvegarde.

## 5. Vérifications réellement exécutées

| Commande                                      | Résultat                                                                              | Date       |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| `pnpm --filter @immo/api test`                | 43 tests passés, 21 s                                                                 | 26/10/2026 |
| `pnpm --filter @immo/shared test`             | 20 tests passés                                                                       | 26/10/2026 |
| `pnpm --filter @immo/web test:e2e`            | 2 tests passés                                                                        | 26/10/2026 |
| `pnpm --filter @immo/web build`               | 17 routes, succès                                                                     | 26/10/2026 |
| `pnpm --filter @immo/mobile build`            | bundle Android 3,2 Mo                                                                 | 26/10/2026 |
| `pnpm typecheck` (api, web, mobile, shared)   | 0 erreur                                                                              | 26/10/2026 |
| `pnpm lint`                                   | 0 erreur, 0 avertissement                                                             | 26/10/2026 |
| `pnpm --filter @immo/api db:seed`             | 2 entités, 1 immeuble, 4 biens                                                        | 26/10/2026 |
| Smoke web via `/api`                          | inscription, cookie, création, rendu, redirection                                     | 26/10/2026 |
| Préproduction réelle (port 4200)              | inscription → 403 avant vérification → email Mailpit → vérification → tableau de bord | 26/10/2026 |
| `infra/backup/backup-immo.sh`                 | dump chiffré age (30 Kio) + empreinte SHA-256                                         | 26/10/2026 |
| `infra/backup/restore-immo.sh`                | restauration dans `immo_restore` vérifiée (1 utilisateur)                             | 26/10/2026 |
| Services systemd utilisateur                  | 4 services actifs, ports 3100/3200/4100/4200 en 127.0.0.1                             | 26/10/2026 |
| `install-caddy-import.sh` (validation locale) | `caddy validate` du fichier de vhosts : valide                                        | 26/10/2026 |
| Simulation CI en clone neuf                   | install, lint, types et 43 tests verts avec `NODE_ENV=test`                           | 26/10/2026 |
| Garde-fou du port de test                     | message explicite si 4200 est occupé, au lieu de tests contre une autre instance      | 26/10/2026 |

Ce qui **n'a pas** été vérifié : CI GitHub Actions verte (le premier essai a
échoué au démarrage des tests, cause masquée par un bug de formatage de Vitest ;
diagnostic publié en annotations au prochain push), exposition HTTPS publique
(DNS et Caddy en attente), envoi d'email réel via Brevo, application mobile sur
appareil physique.

## 6. Blocages et dépendances humaines

| Blocage                         | Impact                        | Ce qu'il faut                                                                                                                 |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| DNS non créé                    | Aucun accès HTTPS public      | Créer 4 enregistrements A (TTL 300, sans Alias) vers `45.155.171.57` : `immo`, `api-immo`, `staging-immo`, `api-staging-immo` |
| Caddy non branché               | Vhosts absents du Caddyfile   | `sudo bash infra/bootstrap/install-caddy-import.sh` (une fois)                                                                |
| Clé Brevo absente               | Emails réels impossibles      | Fournir `MAIL_API_KEY` et passer `MAIL_PROVIDER=brevo` dans `~/.secrets/immo-manager/staging-api.env`                         |
| Remote rclone non configuré     | Sauvegarde distante inactive  | `rclone config` pour créer un remote nommé `immo-backup`, puis renseigner `RCLONE_REMOTE`                                     |
| Pas d'émulateur Android / KVM   | Mobile non testé sur appareil | Tester via Expo Go sur un téléphone, ou fournir un appareil                                                                   |
| `backup-vps` global non vérifié | Couverture incertaine         | La sauvegarde projet autonome (testée) remplace cette dépendance                                                              |

Aucun de ces blocages n'empêche le développement local ni les tests.

## 7. Prochaines actions (ordre recommandé)

1. **Pousser le commit courant** et vérifier la CI (onglet Actions du dépôt,
   ou API GitHub publique). Corriger en priorité tout échec de
   `pnpm install --frozen-lockfile` ou du parcours Playwright.
2. **Demander à l'humain** les deux actions bloquantes :
   - création des 4 enregistrements DNS A vers `45.155.171.57` ;
   - `sudo bash infra/bootstrap/install-caddy-import.sh`.
3. **Vérifier HTTPS** dès que le DNS répond :
   `curl -fsS https://api-staging-immo.noameunier.fr/health`,
   puis la page `https://staging-immo.noameunier.fr/connexion`.
   Les certificats sont émis au premier accès.
4. **Configurer Brevo** : renseigner `MAIL_PROVIDER=brevo` et `MAIL_API_KEY`
   dans `~/.secrets/immo-manager/staging-api.env`, puis
   `systemctl --user restart immo-staging-api`. Tester inscription,
   vérification email et réinitialisation avec une adresse réelle.
5. **Activer la sauvegarde distante** : `rclone config` (remote `immo-backup`),
   renseigner `RCLONE_REMOTE` dans `backup.env`, puis exécuter
   `pnpm backup` et vérifier la présence de l'archive distante.
   Planifier la tâche cron quotidienne (voir `infra/README.md`).
6. **Tester le mobile** via Expo Go :
   `EXPO_PUBLIC_API_URL=https://api-staging-immo.noameunier.fr pnpm dev:mobile`.
   Vérifier connexion, tableau de bord, liste et fiche d'un bien, archivage.
7. **Valider la phase 1** avec un utilisateur réel, puis mettre à jour
   `ROADMAP.md` et ouvrir la phase 2 (baux et loyers).

Rappels d'exploitation :

```bash
systemctl --user status immo-api immo-web immo-staging-api immo-staging-web
journalctl --user -u immo-staging-api -f
systemctl --user restart immo-staging-api   # après modification des secrets
pnpm backup                                  # sauvegarde chiffrée
```

## 8. Pièges à ne pas réintroduire

- **Décorateurs NestJS** : ne jamais exécuter l'API avec `tsx`/esbuild
  (`emitDecoratorMetadata` absent). Utiliser `tsc` puis `node dist/main.js`,
  ou `nest start --watch`.
- **Prisma 7** : l'URL de connexion est dans `prisma.config.ts`, pas dans
  `schema.prisma` ; le client utilise `@prisma/adapter-pg` et est généré dans
  `apps/api/src/generated/prisma` (ignoré par git).
- **Next 16** : `params` et `searchParams` sont des `Promise` ; le fichier
  `middleware.ts` est renommé `proxy.ts`.
- **Tailwind 4** : `@apply` n'accepte pas une classe personnalisée définie dans
  le même fichier (`@apply btn` échoue). Répéter les utilitaires.
- **Playwright** : utiliser `http://localhost:3100` (et non `127.0.0.1`) pour que
  l'origine corresponde à `WEB_ORIGIN` et que le contrôle CSRF passe.
- **Express** doit rester une dépendance directe de l'API (pnpm strict).
- **Ports** : 3100 web, 4100 API, 4200 API de test, 3200 web préprod,
  5434 base dev, 5435 base préprod, 1026/8026 Mailpit. Ne jamais utiliser
  4000, 5433, 8080, 1025, 8025 (autre projet).
- **Tests d'intégration** : le port 4200 doit être libre. Les services systemd
  de préproduction occupent 4200 : les arrêter (`systemctl --user stop
immo-staging-api`) avant `pnpm test`, sinon le script refuse de démarrer —
  garde-fou volontaire pour éviter de tester une autre instance.
- **Tests et emails** : deux tests lisent les emails via l'API HTTP de Mailpit
  (8026). Sans Mailpit, ils échouent ; la CI fournit le service.
- **Vitest 5 / Vite 8** : ne jamais lire `error.stack` dans le `globalSetup`.
  Le formateur de piles de Vite plante (`code.charCodeAt is not a function`) et
  masque complètement la cause réelle. Imprimer `error.message` suffit.
- **Ne jamais lier un service à `0.0.0.0`** : toujours `127.0.0.1`, Caddy expose.

## 9. Comptes et données de démonstration

Uniquement en développement / préproduction avec données fictives :

```text
Email        : demo@immo.local
Mot de passe : DemoImmo2026!
Contenu      : 2 entités, 1 immeuble, 4 biens
```

Le script `prisma/seed.ts` refuse de s'exécuter si `NODE_ENV=production`.

## 10. Journal

| Date       | Événement                                                          |
| ---------- | ------------------------------------------------------------------ |
| 26/10/2026 | Monorepo, schéma Prisma, migration initiale, API auth + patrimoine |
| 26/10/2026 | 43 tests d'intégration, isolation multi-propriétaire validée       |
| 26/10/2026 | Application web complète, seed, 2 tests Playwright                 |
| 26/10/2026 | Application mobile Expo, documentation, infrastructure, CI         |
