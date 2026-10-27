# Architecture — Immo Manager

> Version 1.0 — 26 octobre 2026
> Le besoin fonctionnel est décrit dans [`CAHIER_DES_CHARGES.md`](CAHIER_DES_CHARGES.md).
> L'avancement et les blocages sont dans [`ETAT_DU_PROJET.md`](ETAT_DU_PROJET.md).

## 1. Vue d'ensemble

```text
                        ┌──────────────────────────┐
   Navigateur ─────────▶│  Caddy (TLS, reverse)    │
                        │  immo / staging-immo     │
                        └───────┬──────────┬───────┘
                                │          │
                     /api/*     ▼          ▼  /*
                        ┌────────────┐  ┌───────────────┐
                        │ API NestJS │◀─│ Next.js (web) │  relais /api/* → API
                        │ 127.0.0.1  │  │  127.0.0.1    │
                        │   :4100    │  │    :3100      │
                        └─────┬──────┘  └───────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
  ┌──────────────┐                          ┌──────────────┐
  │ PostgreSQL 17│                          │ SMTP / API   │
  │  immo_dev    │                          │ Mailpit dev  │
  │  immo_staging│                          │ Brevo prod   │
  │  immo_test   │                          └──────────────┘
  └──────────────┘

   Mobile Expo ── HTTPS ──▶ api-immo (même API, jeton Bearer)
```

Une seule API sert le web, le mobile et les intégrations futures. Le web ne parle
jamais directement à la base : il relaie via Next.js, ce qui garantit une origine
unique et des cookies first-party.

## 2. Monorepo

```text
immo-manager/
├── apps/
│   ├── api/          NestJS 11, Prisma 7, PostgreSQL
│   ├── web/          Next.js 16 (App Router), React 19, Tailwind 4
│   └── mobile/       Expo SDK 58, React Native 0.88, expo-router
├── packages/
│   └── shared/       Schémas Zod, types, libellés FR (source unique de vérité)
├── infra/
│   ├── docker/       docker-compose dev / staging
│   ├── caddy/        vhosts à importer dans le Caddyfile système
│   ├── bootstrap/    script d'installation initiale (humain, sudo)
│   └── backup/       sauvegarde chiffrée + restauration
├── scripts/          base de test, utilitaires
└── docs/             cette documentation
```

**Outillage** : pnpm workspaces, pas de Turborepo (inutile à cette échelle).
Les paquets sont liés par `workspace:*` et `@immo/shared` est construit avant
ses consommateurs (`tsup`, sortie ESM + CJS + types).

## 3. Choix techniques

| Sujet         | Décision                                    | Justification                                                      |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| API           | NestJS 11                                   | Modules par domaine, garde globale, testabilité, écosystème mature |
| ORM           | Prisma 7 + `@prisma/adapter-pg`             | Typage strict, migrations versionnées, SQL explicite possible      |
| Base          | PostgreSQL 17                               | Contraintes composites, index partiels, robustesse                 |
| Web           | Next.js 16 App Router                       | Rendu serveur, relais same-origin, déploiement simple              |
| Styles        | Tailwind CSS 4                              | Aucun runtime CSS-in-JS, build rapide                              |
| Mobile        | Expo SDK 58                                 | Build Android/iOS sans toolchain native sur le VPS                 |
| Validation    | Zod 4 dans `packages/shared`                | Un seul schéma pour l'API et les deux clients                      |
| Tests API     | Vitest + Supertest, vraie base              | Détecte les régressions SQL et HTTP réelles                        |
| Tests web     | Playwright                                  | Parcours navigateur réaliste                                       |
| Sessions      | Jeton opaque 256 bits, hash SHA-256 en base | Révocation immédiate, aucun JWT à révoquer                         |
| Mots de passe | Argon2id (19 456 Kio, 2 passes, 1 fil)      | Recommandation OWASP 2024, adaptée au VPS                          |

## 4. Modèle de données

### 4.1 Entités

```text
User 1──n Session
User 1──n EmailToken
User 1──n OwnerEntity 1──n Building 1──n Property
User 1───────────────n Property
User 1──n AuditLog
User 1──n MediaAsset
```

`OwnerEntity` porte le type juridique (`INDIVIDUAL`, `SCI`, `COMPANY`, `UNDIVIDED`).
`Property` est soit un lot (`buildingId` renseigné), soit un bien indépendant
(`buildingId` nul). `MediaAsset` et les colonnes TOTP sont prévues pour les phases
suivantes mais inutilisées par l'interface actuelle.

### 4.2 Isolation par clés composites

Chaque ressource métier porte `ownerId`. Les relations inter-ressources ne
référencent pas seulement `id`, mais la paire `(id, ownerId)` :

```prisma
model Building {
  id       String @id
  ownerId  String
  entityId String
  entity   OwnerEntity @relation(fields: [entityId, ownerId], references: [id, ownerId])
  @@unique([id, ownerId])
}
```

Conséquence : PostgreSQL refuse physiquement qu'un immeuble pointe vers l'entité
d'un autre propriétaire, même si le code applicatif contenait un bug. C'est une
défense en profondeur, pas un remplacement du filtrage applicatif.

### 4.3 Archivage

Toutes les tables métier possèdent `archived_at`. Les requêtes excluent les
éléments archivés par défaut ; `includeArchived=true` (liste) ou une lecture par
identifiant permet de les consulter. Aucune suppression physique n'est exposée.

### 4.4 Identifiants

UUID v7 (`uuid(7)` PostgreSQL) : ordonnés dans le temps, donc bons pour les index,
sans fuite d'information de volume.

## 5. API

### 5.1 Conventions

- Préfixe racine : `/` (pas de `/api` côté API ; le web ajoute `/api` via son route handler).
- Réponses : objets JSON simples, jamais de classe sérialisée.
- Erreurs :

```json
{ "error": { "code": "PROPERTY_NOT_FOUND", "message": "Bien introuvable.", "details": [] } }
```

- Codes métier stables, messages en français destinés à l'utilisateur.
- Validation : `ZodValidationPipe` sur chaque route mutante, schémas de `@immo/shared`.
- Pagination : non exposée en phase 1 (volumes faibles), prévue en phase 2.

### 5.2 Routes

| Méthode          | Route                         | Auth    | Rôle                                                                    |
| ---------------- | ----------------------------- | ------- | ----------------------------------------------------------------------- |
| GET              | `/health`                     | public  | Sonde de vie                                                            |
| POST             | `/auth/register`              | public  | Inscription + session                                                   |
| POST             | `/auth/login`                 | public  | Connexion + session                                                     |
| POST             | `/auth/logout`                | session | Révocation de la session courante                                       |
| GET              | `/auth/me`                    | session | Utilisateur + expiration de session                                     |
| POST             | `/auth/verify-email`          | public  | Consommation d'un jeton email                                           |
| POST             | `/auth/verification/resend`   | session | Renvoi de l'email de vérification                                       |
| POST             | `/auth/forgot-password`       | public  | Demande de réinitialisation                                             |
| POST             | `/auth/reset-password`        | public  | Réinitialisation + révocation des sessions                              |
| GET/POST         | `/owner-entities`             | session | Lister (filtres `search`, `includeArchived`) / créer                    |
| GET/PATCH/DELETE | `/owner-entities/:id`         | session | Lire / modifier / archiver                                              |
| POST             | `/owner-entities/:id/restore` | session | Restaurer                                                               |
| GET/POST         | `/buildings`                  | session | Lister (`entityId`, `search`, `includeArchived`) / créer                |
| GET/PATCH/DELETE | `/buildings/:id`              | session | Lire (avec lots) / modifier / archiver                                  |
| POST             | `/buildings/:id/restore`      | session | Restaurer                                                               |
| GET/POST         | `/properties`                 | session | Lister (`entityId`, `buildingId`, `type`, `archived`, `search`) / créer |
| GET/PATCH/DELETE | `/properties/:id`             | session | Lire / modifier / archiver                                              |
| POST             | `/properties/:id/restore`     | session | Restaurer                                                               |
| GET              | `/dashboard/summary`          | session | Indicateurs consolidés                                                  |

### 5.3 Chaîne de traitement d'une requête

```text
Caddy → NestJS
  ├─ SecurityHeadersMiddleware      (nosniff, frame-deny, referrer, permissions)
  ├─ CsrfMiddleware                 (Origin/Referer sur mutations par cookie)
  ├─ RequestContextMiddleware       (request id, logs)
  ├─ RateLimitGuard                 (global, @RateLimit sur routes sensibles)
  ├─ SessionGuard                   (privé par défaut, @Public() explicite)
  ├─ EmailVerifiedGuard             (si REQUIRE_EMAIL_VERIFICATION)
  ├─ ZodValidationPipe              (schéma partagé)
  ├─ Controller → Service           (ownerId issu de la session, jamais du client)
  └─ AllExceptionsFilter            (normalisation { error: { code, message } })
```

L'ordre des gardes est significatif et déclaré dans `app.module.ts` :
limitation de débit → session → email vérifié.

### 5.4 Authentification

- **Web** : l'API renvoie un cookie `immo_session` (`httpOnly`, `SameSite=Lax`,
  `Secure` hors développement, `Path=/`). Aucun jeton accessible en JavaScript.
- **Mobile** : si l'en-tête `x-client-type: mobile` est présent, la réponse
  contient aussi `token`. Le client le stocke dans `expo-secure-store`.
- **CSRF** : toute mutation authentifiée par cookie doit présenter un `Origin`
  (ou `Referer`) correspondant à `WEB_ORIGIN`. Les requêtes `Bearer` en sont
  dispensées (pas d'ambiguïté de navigateur).
- **Verrouillage** : 10 échecs consécutifs → verrouillage temporaire, compteur remis à zéro.
- **Réinitialisation** : la consommation d'un jeton révoque toutes les sessions actives.

### 5.5 Limitation de débit

Compteur en mémoire par IP + route (suffisant sur un VPS mono-instance).
Valeurs actuelles : inscription 10/heure, connexion 20/15 min, mot de passe
oublié 5/heure. En-tête de contournement `x-test-skip-rate-limit: 1` accepté
**uniquement** si `NODE_ENV=test`.

## 6. Web

- App Router, composants serveur pour la lecture, composants clients pour les formulaires.
- `proxy.ts` (ancien `middleware.ts`, renommé pour Next 16) redirige les visiteurs
  non connectés vers `/connexion?suivant=…` sur la seule base du cookie ; la
  validité réelle est toujours vérifiée par l'API.
- `src/app/api/[...path]/route.ts` relaie `/api/*` vers `API_INTERNAL_URL`
  (défaut `http://127.0.0.1:4100`), lu à l'exécution : le même build sert le
  développement (4100) et la préproduction (4200), sans CORS.
- Composants serveur : `serverFetch` transmet explicitement le cookie entrant.
- Composants clients : `apiFetch` utilise `credentials: 'include'`.
- Erreurs API mappées vers des messages français, `details` distribués par champ.
- Pages : `/`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`,
  `/reinitialiser-mot-de-passe`, `/verifier-email`, `/tableau-de-bord`,
  `/entites`, `/immeubles`, `/biens`, `/profil`, 404 personnalisée.

## 7. Mobile

- Expo SDK 58 / React Native 0.88, `expo-router` avec groupes `(auth)` et `(app)`.
- Contexte d'authentification : lecture/écriture du jeton dans `expo-secure-store`,
  revalidation via `/auth/me` au démarrage.
- Client API : `x-client-type: mobile` + `Authorization: Bearer`.
- URL par défaut `http://10.0.2.2:4100` (émulateur Android) ; surcharge par
  `EXPO_PUBLIC_API_URL` pour un appareil physique.
- Écrans phase 1 : connexion, inscription, tableau de bord, liste et fiche des
  biens (archivage/restauration), profil et déconnexion.
- Aucune création de bien sur mobile en phase 1 : le web reste la référence.

## 8. Environnements

| Environnement | Base               | API              | Web              | Emails              | Accès           |
| ------------- | ------------------ | ---------------- | ---------------- | ------------------- | --------------- |
| Développement | `immo_dev` (5434)  | `127.0.0.1:4100` | `localhost:3100` | Mailpit :1026/:8026 | local           |
| Test          | `immo_test` (5434) | `127.0.0.1:4200` | —                | désactivé           | local           |
| Préproduction | `immo_staging`     | `127.0.0.1:4200` | `127.0.0.1:3200` | Mailpit → Brevo     | `staging-immo…` |
| Production    | `immo_prod`        | non déployé      | non déployé      | —                   | —               |

Les ports 4000, 5433, 8080, 1025 et 8025 appartiennent à un autre projet du VPS
(Pokero) et ne doivent jamais être réutilisés. Aucun conteneur Docker n'expose
`0.0.0.0` : uniquement `127.0.0.1`.

## 9. Déploiement

### 9.1 Préproduction sur le VPS

```text
Caddy (systemd, root)
 ├─ immo.noameunier.fr        → 127.0.0.1:3100, /api/* → 127.0.0.1:4100
 ├─ api-immo.noameunier.fr    → 127.0.0.1:4100   (mobile)
 ├─ staging-immo.noameunier.fr→ 127.0.0.1:3200, /api/* → 127.0.0.1:4200
 └─ api-staging-immo…         → 127.0.0.1:4200
```

- Les vhosts sont versionnés dans `infra/caddy/immo.caddy` ; le script
  `infra/bootstrap/install-caddy-import.sh` (sudo, idempotent) copie le fichier
  vers `/etc/caddy/immo.caddy`, ajoute l'import et recharge Caddy. Une copie est
  nécessaire : `/home/dev` est en mode 700, donc le service Caddy (utilisateur
  `caddy`) ne peut pas lire un lien pointant dans le dépôt.
- API et web tournent en services utilisateur (`systemd --user`), pas en root.
- Les conteneurs de base de données restent sur `127.0.0.1`.

### 9.2 Sauvegardes

- `infra/backup/backup-immo.sh` : `pg_dump` → archive chiffrée `age` → `rclone`
  vers un stockage distant, rétention configurable.
- La clé `age` et le mot de passe rclone vivent dans `/home/dev/.secrets/immo-manager/`
  (`chmod 700`), jamais dans le dépôt.
- `infra/backup/restore-immo.sh` documente et automatise la restauration.
- La sauvegarde globale du VPS existante ne couvre pas ce projet de façon vérifiée :
  la sauvegarde projet est donc autonome.

## 10. Tests

| Niveau          | Outil                          | Portée                                                |
| --------------- | ------------------------------ | ----------------------------------------------------- |
| Intégration API | Vitest + Supertest             | 43 tests sur `immo_test`, vraie instance HTTP         |
| E2E web         | Playwright                     | Parcours propriétaire complet + visiteur non connecté |
| Types           | `tsc --noEmit`                 | API, web, mobile, shared                              |
| Lint            | ESLint 9                       | Tous les paquets                                      |
| Build           | tsc / next build / expo export | Tous les paquets                                      |

Cas d'isolation couverts : lecture, modification, archivage, restauration et
rattachement croisés entre deux propriétaires → 404 systématique.

Les tests d'intégration démarrent l'API compilée (`node dist/main.js`) : `tsx`
n'émet pas `emitDecoratorMetadata`, ce qui casserait l'injection NestJS.

Deux dépendances d'exécution sont nécessaires :

- **PostgreSQL** (`immo_test`) pour les données ;
- **Mailpit** pour deux tests de bout en bout (vérification d'email et
  réinitialisation de mot de passe, lus via l'API HTTP de Mailpit sur 8026).
  La CI GitHub Actions fournit les deux services.

Le script de préparation refuse de démarrer si le port 4200 est déjà occupé :
sans ce garde-fou, les tests interrogeraient silencieusement une autre instance
(par exemple l'API de préproduction) et les résultats seraient faux sans erreur.

En CI, les journaux d'un dépôt public ne sont pas lisibles sans authentification.
Les lignes d'échec essentielles sont donc republiées en **annotations** de job,
lisibles via l'API GitHub. La préparation imprime aussi son message d'erreur
directement : Vitest 5 plante en formatant certaines piles (`code.charCodeAt`),
ce qui masquerait totalement la cause d'un échec de démarrage. Il ne faut donc
jamais lire `error.stack` dans le `globalSetup`.

## 11. Décisions et compromis

| Décision                       | Alternative écartée           | Raison                                                                 |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| Sessions opaques en base       | JWT                           | Révocation immédiate, pas de clé de signature à faire tourner          |
| Same-origin via relais serveur | CORS + cookies tiers          | Cookies first-party, pas de préflight, cible lue à l'exécution         |
| FK composites `(id, owner_id)` | Filtrage applicatif seul      | La base garantit l'isolation même en cas de bug                        |
| Archivage                      | Suppression physique          | Récupération possible, historique conservé, pas de cascade destructive |
| pnpm workspaces                | Turborepo / Nx                | Complexité inutile pour 4 paquets                                      |
| Zod partagé                    | DTO class-validator dupliqués | Une seule vérité, mêmes messages côté client et serveur                |
| Compteur de débit mémoire      | Redis                         | Mono-instance, aucune dépendance supplémentaire                        |
| Tailwind                       | Bibliothèque de composants    | Contrôle total du rendu, aucune dépendance UI lourde                   |

## 12. Dettes techniques connues

1. **Pas de pagination** sur les listes — acceptable < 1 000 éléments.
2. **Compteur de débit en mémoire** — à migrer vers Redis si multi-instance.
3. **Pas de file d'attente email** — l'envoi est synchrone ; un échec SMTP est
   journalisé mais non réessayé.
4. **Médias non implémentés** — table présente, upload absent.
5. **Pas de TOTP** — colonnes présentes, interface absente.
6. **Mobile en lecture seule** — création/modification réservées au web.
7. **Peu de tests unitaires isolés** — les schémas partagés sont couverts
   (20 tests), le reste l'est par l'intégration ; compléter pour la crypto et
   les formats.
