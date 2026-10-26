# Immo Manager

Application de gestion de patrimoine immobilier pour propriétaires particuliers, SCI, sociétés et indivisions.

> **État du projet : phase 1 en cours.** Le socle technique, l'API, l'authentification et la gestion du patrimoine sont fonctionnels et testés. Voir [`docs/ETAT_DU_PROJET.md`](docs/ETAT_DU_PROJET.md) pour l'état exact, les blocages et la reprise du travail.

## Sommaire

- [Périmètre de la phase 1](#périmètre-de-la-phase-1)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Démarrage local](#démarrage-local)
- [Tests](#tests)
- [Commandes utiles](#commandes-utiles)
- [Environnements](#environnements)
- [Sécurité](#sécurité)
- [Documentation](#documentation)

## Périmètre de la phase 1

Parcours livré de bout en bout :

1. Créer un compte et se connecter.
2. Créer une entité propriétaire (personne physique, SCI, société, indivision).
3. Ajouter un immeuble.
4. Ajouter des lots rattachés à l'immeuble.
5. Ajouter un bien indépendant (maison, garage, parking, box).
6. Consulter, modifier et archiver ses fiches.
7. Consulter un tableau de bord calculé à partir des données réelles.
8. Se déconnecter.

Chaque propriétaire ne voit que ses propres données : l'isolation est vérifiée par des tests d'intégration et garantie au niveau base par des clés étrangères composites `(id, owner_id)`.

## Architecture

```text
immo-manager/
├── apps/
│   ├── api/        API REST NestJS + Prisma + PostgreSQL
│   ├── web/        Application web Next.js (App Router)
│   └── mobile/     Application mobile Expo / React Native
├── packages/
│   ├── shared/     Schémas Zod, types et constantes partagés
│   └── config/     Configuration TypeScript / lint partagée
├── infra/          Docker (dev, staging), Caddy, scripts d'installation
├── scripts/        Utilitaires (base de test, sauvegardes)
├── docs/           Cahier des charges, architecture, roadmap, état du projet
└── AGENTS.md       Instructions permanentes pour les agents de développement
```

| Brique | Technologie |
|---|---|
| Mobile | Expo SDK 58, React Native, expo-router |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| API | NestJS 11, Prisma 7, Zod 4 |
| Base | PostgreSQL 17 |
| Langage | TypeScript 5.9 (mode strict) |
| Tests | Vitest, Supertest, Playwright |

Détails et décisions : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Prérequis

- Node.js 24 (voir `.node-version`) et pnpm 12 (`corepack enable`)
- Docker et Docker Compose (base de données et Mailpit de développement)
- Un client PostgreSQL (`psql`) est utile mais non requis

Sur le VPS de développement, la toolchain est installée en espace utilisateur :

```bash
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:$PATH"
```

## Installation

```bash
git clone git@gh-immo-manager:noameunier/immo-manager.git
cd immo-manager
pnpm install
cp .env.example apps/api/.env     # puis renseigner APP_SECRET (openssl rand -base64 48)
pnpm db:up                        # PostgreSQL 17 (5434) + Mailpit (8026)
pnpm --filter @immo/api prisma:migrate
pnpm --filter @immo/api db:seed   # optionnel : jeu de démonstration
```

## Démarrage local

```bash
pnpm dev          # API (4100) + web (3100) en parallèle
pnpm dev:mobile   # Expo (QR code / émulateur)
pnpm db:up        # services Docker de développement
```

- Web : <http://localhost:3100>
- API : <http://127.0.0.1:4100/health>
- Emails de développement : <http://127.0.0.1:8026> (Mailpit)

Le web appelle l'API via une réécriture Next.js (`/api/*` → API interne), ce qui garantit une origine unique et des cookies `httpOnly` protégés.

## Tests

```bash
pnpm db:up                 # PostgreSQL requis
pnpm db:test               # prépare la base immo_test
pnpm test                  # tests unitaires + intégration API
pnpm test:e2e              # parcours navigateur Playwright (web)
pnpm lint                  # ESLint
pnpm typecheck             # TypeScript strict
pnpm build                 # build de tous les paquets
```

Les tests d'intégration démarrent une vraie instance de l'API sur la base `immo_test` et vérifient notamment :

- inscription valide et invalide ;
- connexion correcte et incorrecte ;
- rejet des requêtes non authentifiées ;
- création d'entité, d'immeuble, de lot et de bien indépendant ;
- modification et archivage ;
- **isolation entre propriétaires** (lecture, écriture, rattachement).

## Commandes utiles

| Commande | Description |
|---|---|
| `pnpm db:up` / `pnpm db:down` | Démarre / arrête PostgreSQL et Mailpit de développement |
| `pnpm db:reset` | Recrée la base de développement (destructif) |
| `pnpm db:test` | Prépare la base `immo_test` |
| `pnpm db:seed` | Injecte un jeu de données de démonstration |
| `pnpm --filter @immo/api prisma:studio` | Explorateur de base Prisma Studio |
| `pnpm format` | Formatage Prettier |

## Environnements

| Environnement | Usage | Accès |
|---|---|---|
| Développement | Poste de travail / VPS, données fictives | `localhost` |
| Préproduction | Validation avant publication | `staging-immo.noameunier.fr` |
| Production | Non autorisée à ce stade | — |

Aucun déploiement en production n'est effectué sans validation explicite. Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#environnements).

## Sécurité

- Mots de passe hachés avec Argon2id.
- Sessions opaques de 256 bits, stockées **hachées** (SHA-256) en base, révocables.
- Cookie `httpOnly`, `SameSite=Lax`, `Secure` hors développement ; jeton `Bearer` pour le mobile.
- Protection CSRF par contrôle d'origine sur les mutations authentifiées par cookie.
- Validation stricte des entrées avec Zod, côté API et côté clients.
- Limitation de débit sur l'inscription, la connexion et la réinitialisation.
- Isolation des données par `ownerId` **et** par clés étrangères composites en base.
- Journal d'audit sans données sensibles ; aucun mot de passe, jeton ou IP en clair dans les logs.
- Aucun secret dans le dépôt (`.env` ignoré, `.env.example` documenté).

## Documentation

- [`docs/CAHIER_DES_CHARGES.md`](docs/CAHIER_DES_CHARGES.md) — vision fonctionnelle complète
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture et modèle de données
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phases de développement
- [`docs/ETAT_DU_PROJET.md`](docs/ETAT_DU_PROJET.md) — état réel, blocages, reprise
- [`AGENTS.md`](AGENTS.md) — règles pour les agents de développement
