# État du projet — Immo Manager

> **Dernière mise à jour : 27 octobre 2026 (soir).**
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

Services applicatifs (systemd utilisateur, survivent à la déconnexion) :

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user status immo-api immo-web immo-staging-api immo-staging-web
systemctl --user restart immo-api
journalctl --user -u immo-staging-api -f
```

Vérification : `curl -s http://127.0.0.1:4100/health` et
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/connexion`.

Les tests d'intégration occupent le port 4200 : arrêter `immo-staging-api`
avant `pnpm test` (le script refuse de démarrer sinon, pour ne pas tester la
mauvaise instance).

## 2. Résumé

| Élément        | Valeur                                                       |
| -------------- | ------------------------------------------------------------ |
| Phase          | Phase 1 clôturée côté code ; phase 2 démarrée (baux livrés)  |
| Dépôt          | `github.com/noameunier/immo-manager` (public)                |
| Branche        | `main`, à jour et poussée                                    |
| API            | NestJS 11.2.8, Prisma 7.10.1, PostgreSQL 17                  |
| Web            | Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3                 |
| Mobile         | Expo SDK 58, React Native 0.88, expo-router 58               |
| Tests API      | **65/65 verts** (vitest + supertest, vraie base `immo_test`) |
| Tests partagés | **27/27 verts** (schémas Zod, Luhn, baux, statuts)           |
| Tests E2E      | **2/2 verts** (Playwright, Chromium)                         |
| Builds         | API, web et bundle Android Expo : OK                         |
| Lint / types   | Tous les paquets : OK                                        |
| CI GitHub      | **verte** : 2 jobs (checks, Playwright) sur `main`           |

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

- 28 pages : accueil, connexion, inscription, mot de passe oublié,
  réinitialisation, vérification email, tableau de bord, entités
  (liste / détail / création / édition), immeubles (idem), biens (idem),
  locataires (idem), baux (idem), profil, 404.
- Tableau de bord enrichi : locataires, baux actifs / à venir / à échéance sous
  60 jours, loyer mensuel total (loyer + charges).
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

- `apps/api/test/` : 7 fichiers, 65 tests — auth 19, entités 6, immeubles 6,
  biens 11, locataires 6, baux 13, tableau de bord 4. Vraie instance HTTP, vraie
  base, aucun mock Prisma.
- `packages/shared/src/common.test.ts` et `lease.test.ts` : 27 tests sur les
  schémas partagés (Luhn SIREN/SIRET, email, mot de passe, code postal,
  conversions de formulaire, dates, montants, statuts de bail).
- `apps/web/e2e/` : parcours propriétaire complet + redirection d'un visiteur.
- Isolation croisée testée : lecture, écriture, archivage, restauration,
  rattachement → 404.

### 3.6 Documentation et infrastructure

- `README.md`, `AGENTS.md`, ce fichier, `CAHIER_DES_CHARGES.md`,
  `ARCHITECTURE.md`, `ROADMAP.md`, `infra/README.md`.
- `infra/caddy/immo.caddy` (4 vhosts ; les vhosts web envoient tout à Next.js,
  `/api/*` compris), `infra/bootstrap/install-caddy-import.sh` (sudo, idempotent,
  copie vers `/etc/caddy` puis rechargement), `install-user-services.sh`.
- 4 unités systemd utilisateur (API/web, dev/préproduction), installées et
  actives sur le VPS, toutes liées à `127.0.0.1`.
- `infra/docker/docker-compose.staging.yml` (PostgreSQL 5435).
- `infra/backup/` : sauvegarde `pg_dump` + chiffrement `age` + envoi `rclone`,
  restauration avec garde-fous, exemple de configuration. `age` et `rclone`
  sont installés dans `~/.local/bin` ; une sauvegarde et une restauration
  réelles ont été validées.
- CI GitHub Actions : lint, types, tests API, builds (dont bundle mobile) et
  parcours Playwright.

### 3.7 Exploitation locative (phase 2, lots 2.1 et 2.2)

- Locataires : particulier ou société, coordonnées, adresse, notes, archivage.
- Baux : entité bailleur, bien, locataire, type (nu / meublé), dates de début et
  de fin, loyer, charges, dépôt de garantie, jour d'échéance, notes.
- Statut calculé : actif, à venir, terminé, archivé (jamais stocké).
- Règles appliquées côté API : un seul bail non archivé par bien et par période,
  date de fin postérieure au début, bien rattaché à l'entité bailleur, locataire
  et bien non archivés.
- Le bien passe automatiquement en « occupé » quand un bail actif existe et
  redevient « vacant » à la fin du dernier bail.
- Fiche bien : bail en cours ou à venir, avec lien et création préremplie.
- Fiche locataire : historique complet de ses baux.
- Tableau de bord : locataires, baux actifs / à venir / à échéance, loyers.
- Jeu de démonstration : 2 locataires et 3 baux actifs sur le patrimoine existant.

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
deebc4a  fix: fiabiliser les tests d'intégration et le diagnostic CI
de56a25  feat: relayer l'API à l'exécution et valider la préproduction
d3b219d  fix: construire le web en mode production dans la CI
57bf7d5  test: stabiliser le parcours Playwright et le diagnostic CI
737e8e0  fix: copier les vhosts Caddy au lieu de les lier
503d665  fix: accepter le préfixe /api dans l'API
83284cf  docs: documenter la compatibilité /api et le réglage WEB_ORIGIN
2589a46  feat: livrer les locataires et les baux
```

Deux échecs de CI ont été diagnostiqués puis corrigés :

1. **Tests d'intégration** : la cause réelle était masquée par un plantage du
   formateur de piles de Vitest (`code.charCodeAt`). Le job fournit désormais
   Mailpit, le port 4200 est vérifié et le message d'erreur est imprimé
   directement. Les échecs sont republiés en annotations lisibles sans
   authentification.
2. **Parcours Playwright** : `next build` héritait de `NODE_ENV=development` et
   le prérendu de `/_global-error` échouait. Chaque étape et chaque serveur
   Playwright fixe maintenant son `NODE_ENV`.

## 5. Vérifications réellement exécutées

| Commande                                      | Résultat                                                                                                                          | Date       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `pnpm --filter @immo/api test`                | 43 tests passés, 21 s                                                                                                             | 26/10/2026 |
| `pnpm --filter @immo/shared test`             | 20 tests passés                                                                                                                   | 26/10/2026 |
| `pnpm --filter @immo/web test:e2e`            | 2 tests passés                                                                                                                    | 26/10/2026 |
| `pnpm --filter @immo/web build`               | 17 routes, succès                                                                                                                 | 26/10/2026 |
| `pnpm --filter @immo/mobile build`            | bundle Android 3,2 Mo                                                                                                             | 26/10/2026 |
| `pnpm typecheck` (api, web, mobile, shared)   | 0 erreur                                                                                                                          | 26/10/2026 |
| `pnpm lint`                                   | 0 erreur, 0 avertissement                                                                                                         | 26/10/2026 |
| `pnpm --filter @immo/api db:seed`             | 2 entités, 1 immeuble, 4 biens                                                                                                    | 26/10/2026 |
| Smoke web via `/api`                          | inscription, cookie, création, rendu, redirection                                                                                 | 26/10/2026 |
| Préproduction réelle (port 4200)              | inscription → 403 avant vérification → email Mailpit → vérification → tableau de bord                                             | 26/10/2026 |
| `infra/backup/backup-immo.sh`                 | dump chiffré age (30 Kio) + empreinte SHA-256                                                                                     | 26/10/2026 |
| `infra/backup/restore-immo.sh`                | restauration dans `immo_restore` vérifiée (1 utilisateur)                                                                         | 26/10/2026 |
| Services systemd utilisateur                  | 4 services actifs, ports 3100/3200/4100/4200 en 127.0.0.1                                                                         | 26/10/2026 |
| `install-caddy-import.sh` (validation locale) | `caddy validate` du fichier de vhosts : valide                                                                                    | 26/10/2026 |
| Simulation CI en clone neuf                   | install, lint, types et 43 tests verts avec `NODE_ENV=test`                                                                       | 26/10/2026 |
| Garde-fou du port de test                     | message explicite si 4200 est occupé, au lieu de tests contre une autre instance                                                  | 26/10/2026 |
| GitHub Actions `main` (`d3b219d`)             | job `checks` vert (lint, types, 43 tests, builds) et job Playwright vert (2 tests)                                                | 26/10/2026 |
| HTTPS public (4 vhosts)                       | certificats émis, `https://immo…` et `https://staging-immo…` → 307 `/connexion`, HSTS                                             | 26/10/2026 |
| API mobile publique                           | `https://api-staging-immo…/health` → 200, `POST /auth/login` → 400 attendu                                                        | 26/10/2026 |
| Relais web local (`/api/auth/login`)          | 400 (validation) sur 3100 et 3200, jamais 404                                                                                     | 27/10/2026 |
| `caddy adapt` après correction du routage     | valide : chaque vhost web n'a qu'un upstream Next (3100/3200)                                                                     | 27/10/2026 |
| Préfixe `/api` accepté par l'API              | 46 tests verts, dont 3 dédiés (`/api/auth/*`, `/api/health`, non-répétition)                                                      | 27/10/2026 |
| Connexion publique dev (`/api/auth/login`)    | 200, cookie posé, `/api/auth/me` 200, `dashboard/summary` 200, page authentifiée 200                                              | 27/10/2026 |
| Parcours public préproduction (HTTPS)         | inscription 201 → email Mailpit → vérification 200 → connexion 200 → création 201 (CSRF OK) → archivage 200 → tableau de bord 200 | 27/10/2026 |

| Phase 2 — locataires et baux | 65 tests API + 27 tests partagés + 2 E2E, tous verts | 27/10/2026 |
| Règles métier des baux | chevauchement refusé, dates validées, occupation synchronisée, isolation croisée | 27/10/2026 |
| Préproduction avec jeu de démonstration | 2 locataires, 3 baux actifs, 2 380 €/mois, pages baux et locataires en 200 | 27/10/2026 |
| GitHub Actions `main` (`2589a46`) | job `checks` vert (lint, types, 65 tests, builds) et job Playwright vert (2 tests) | 27/10/2026 |
Ce qui **n'a pas** été vérifié : envoi d'email réel via Brevo, application mobile
sur appareil physique, sauvegarde distante (remote rclone non configuré), rendu
visuel dans un navigateur réel (les parcours ont été validés en HTTP et par
Playwright sur Chromium).

## 6. Blocages et dépendances humaines

| Blocage                           | Impact                        | Ce qu'il faut                                                                                                                   |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Caddy à simplifier (non bloquant) | Double chemin `/api/*`        | `sudo bash infra/bootstrap/install-caddy-import.sh` quand un poste est disponible : chaque vhost web n'aura plus qu'un upstream |
| Clé Brevo absente                 | Emails réels impossibles      | Fournir `MAIL_API_KEY` et passer `MAIL_PROVIDER=brevo` dans `~/.secrets/immo-manager/staging-api.env`                           |
| Remote rclone non configuré       | Sauvegarde distante inactive  | `rclone config` pour créer un remote nommé `immo-backup`, puis renseigner `RCLONE_REMOTE`                                       |
| Pas d'émulateur Android / KVM     | Mobile non testé sur appareil | Tester via Expo Go sur un téléphone, ou fournir un appareil                                                                     |
| `backup-vps` global non vérifié   | Couverture incertaine         | La sauvegarde projet autonome (testée) remplace cette dépendance                                                                |

Aucun de ces blocages n'empêche le développement local ni les tests.

## 7. Prochaines actions (ordre recommandé)

1. **Vérifier la CI** : elle est verte sur `main` (`checks` + Playwright). En cas
   d'échec futur, lire les **annotations** du job (API GitHub publique), elles
   contiennent les lignes d'échec essentielles.
2. **Le site public fonctionne sans action humaine** : l'API accepte le préfixe
   `/api`, donc la configuration Caddy actuelle (`/api/*` → API) suffit.
   Connexion et parcours de préproduction vérifiés en HTTPS le 27/10/2026.
3. **Livrer le suivi des loyers** (lot 2.4) : échéances mensuelles par bail,
   statut encaissé / en retard / impayé, marquage des paiements, puis quittances.
4. **Simplifier Caddy quand un poste est disponible** (non bloquant) :
   `sudo bash infra/bootstrap/install-caddy-import.sh`. Chaque vhost web
   n'aura plus qu'un upstream (Next.js) et `/api/*` passera par le relais Next
   au lieu d'atteindre directement l'API. Revalider ensuite
   `POST https://immo.noameunier.fr/api/auth/login` (attendu : 400 de validation).
5. **Configurer Brevo** : renseigner `MAIL_PROVIDER=brevo` et `MAIL_API_KEY`
   dans `~/.secrets/immo-manager/staging-api.env`, puis
   `systemctl --user restart immo-staging-api`. Tester inscription,
   vérification email et réinitialisation avec une adresse réelle.
6. **Activer la sauvegarde distante** : `rclone config` (remote `immo-backup`),
   renseigner `RCLONE_REMOTE` dans `backup.env`, puis exécuter
   `pnpm backup` et vérifier la présence de l'archive distante.
   Planifier la tâche cron quotidienne (voir `infra/README.md`).
7. **Tester le mobile** via Expo Go :
   `EXPO_PUBLIC_API_URL=https://api-staging-immo.noameunier.fr pnpm dev:mobile`.
   Vérifier connexion, tableau de bord, liste et fiche d'un bien, archivage.
8. **Valider la phase 1** avec un utilisateur réel, puis mettre à jour
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
- **NODE_ENV et Next.js** : `next build` doit toujours tourner avec
  `NODE_ENV=production`. Hérité en `development`, React utilise son runtime de
  développement et le prérendu de `/_global-error` échoue
  (`Cannot read properties of null (reading 'useContext')`). À l'inverse,
  `next start` exige `production` et l'API du parcours E2E exige `development`
  (cookie sans `Secure` sur http) : les deux serveurs Playwright fixent donc
  explicitement leur `NODE_ENV`.
- **Express** doit rester une dépendance directe de l'API (pnpm strict).
- **Ports** : 3100 web, 4100 API, 4200 API de test, 3200 web préprod,
  5434 base dev, 5435 base préprod, 1026/8026 Mailpit. Ne jamais utiliser
  4000, 5433, 8080, 1025, 8025 (autre projet).
- **`WEB_ORIGIN`** : doit lister **toutes** les origines navigateur séparées par
  des virgules (local, publique). Une origine absente provoque un 403
  `CSRF_REJECTED` sur les mutations authentifiées par cookie, alors que la
  connexion réussit. L'API de développement expose donc `localhost:3100` et
  `https://immo.noameunier.fr`, avec `TRUST_PROXY=true`.
- **Baux — statut** : ne jamais stocker le statut d'un bail. Il est calculé
  depuis `startsOn`/`endsOn` et `archivedAt` (`computeLeaseStatus` dans
  `@immo/shared`) ; le stocker créerait une dérive quotidienne.
- **Baux — chevauchement** : l'unicité « un bail actif par bien » est vérifiée
  en code (Prisma ne sait pas exprimer un index partiel). Toute nouvelle voie de
  création ou de restauration doit repasser par `assertNoOverlap`.
- **Baux — dates** : colonnes PostgreSQL `date`, jamais `timestamp`. Les chaînes
  `AAAA-MM-JJ` sont converties en UTC minuit (`apps/api/src/common/dates.ts`) ;
  ne pas mélanger les fuseaux, sinon un bail peut basculer d'un jour.
- **Tests d'intégration** : le port 4200 doit être libre. Les services systemd
  de préproduction occupent 4200 : les arrêter (`systemctl --user stop
immo-staging-api`) avant `pnpm test`, sinon le script refuse de démarrer —
  garde-fou volontaire pour éviter de tester une autre instance.
- **Tests et emails** : deux tests lisent les emails via l'API HTTP de Mailpit
  (8026). Sans Mailpit, ils échouent ; la CI fournit le service.
- **Vitest 5 / Vite 8** : ne jamais lire `error.stack` dans le `globalSetup`.
  Le formateur de piles de Vite plante (`code.charCodeAt is not a function`) et
  masque complètement la cause réelle. Imprimer `error.message` suffit.
- **Préfixe `/api`** : l'API retire elle-même un éventuel segment `/api` avant
  le routage (compatibilité de proxy), et le relais Next fait de même. Les deux
  chemins aboutissent au même routeur, mais un seul suffit : à terme, chaque
  vhost web ne doit avoir qu'un upstream, le web Next.js (3100/3200). Sans ce
  retrait, un vhost qui transmet `/api/*` à l'API renvoie
  `Cannot POST /api/auth/login` (404) alors que l'API directe répond.
- **Vhosts Caddy** : ne pas lier `/etc/caddy/immo.caddy` vers le dépôt.
  `/home/dev` est en 700 : `caddy validate` (root) réussit mais le rechargement
  échoue. Le script d'installation copie le fichier ; le relancer après chaque
  modification (il est idempotent).
- **Ne jamais lier un service à `0.0.0.0`** : toujours `127.0.0.1`, Caddy expose.

## 9. Comptes et données de démonstration

Uniquement en développement / préproduction avec données fictives :

```text
Email        : demo@immo.local
Mot de passe : DemoImmo2026!
Contenu      : 2 entités, 1 immeuble, 4 biens, 2 locataires, 3 baux actifs
```

Le script `prisma/seed.ts` refuse de s'exécuter si `NODE_ENV=production`.

## 10. Journal

| Date       | Événement                                                          |
| ---------- | ------------------------------------------------------------------ |
| 26/10/2026 | Monorepo, schéma Prisma, migration initiale, API auth + patrimoine |
| 26/10/2026 | 43 tests d'intégration, isolation multi-propriétaire validée       |
| 26/10/2026 | Application web complète, seed, 2 tests Playwright                 |
| 26/10/2026 | Application mobile Expo, documentation, infrastructure, CI         |
| 26/10/2026 | CI verte : tests API, builds et parcours Playwright                |
| 26/10/2026 | HTTPS public actif sur les 4 vhosts (DNS + Caddy branchés)         |
| 27/10/2026 | Routage Caddy corrigé dans le dépôt (à appliquer sans urgence)     |
| 27/10/2026 | API compatible `/api/*` : site public rétabli sans sudo            |
| 27/10/2026 | Parcours préproduction validé en HTTPS (inscription → tableau)     |
| 27/10/2026 | Phase 2 : locataires et baux livrés, 65 tests API, E2E étendu      |
| 27/10/2026 | Préproduction migrée et peuplée : 2 locataires, 3 baux actifs      |
| 27/10/2026 | CI verte sur la phase 2 (65 tests API, E2E étendu)                 |
