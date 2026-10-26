# AGENTS.md — instructions permanentes

Ce fichier s'adresse à tout agent (humain ou IA) travaillant sur Immo Manager.
Il prime sur les habitudes génériques. En cas de doute : lire
`docs/ETAT_DU_PROJET.md`, puis `docs/ARCHITECTURE.md`.

## 1. Contexte d'exécution

- VPS Debian 13, hébergé chez PulseHeberg, utilisateur `dev`.
- Le VPS héberge **d'autres projets** (Pokero, OpenCode, etc.) : ne jamais les modifier.
- Répertoire du projet : `/home/dev/repos/immo-manager`.
- Toolchain en espace utilisateur (absente du PATH des shells non interactifs) :

```bash
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:$PATH"
```

- Node 24.22.1, pnpm 12.x, PostgreSQL 17 en Docker, JDK 21, Android SDK 36.
- **Aucun accès sudo sans mot de passe.** Ne jamais tenter `sudo`, `apt`, ni modifier
  `/etc/caddy`, le pare-feu, les DNS ou les services systemd partagés.

## 2. Structure et conventions

```text
apps/api      NestJS — modules par domaine (auth, owner-entities, buildings, properties, dashboard)
apps/web      Next.js App Router — pages, composants, hooks
apps/mobile   Expo — écrans, client API, stockage sécurisé
packages/shared  Schémas Zod + types + libellés FR (source unique de vérité)
infra         Docker, Caddy, scripts (à exécuter par un humain avec sudo)
```

Règles :

- TypeScript strict, `noUncheckedIndexedAccess`. Pas de `any` non justifié.
- Validation **toujours** via les schémas de `@immo/shared` (jamais de validation ad hoc).
- Un module Nest = un domaine ; les services reçoivent `ownerId` explicitement.
- Les réponses API sont des objets simples (pas de classes sérialisées).
- Erreurs : `{ error: { code, message, details? } }` avec un code métier stable.
- Textes d'interface en français, dates et montants formatés `fr-FR` / `EUR`.
- Pas de dépendance ajoutée sans justification écrite dans `docs/ARCHITECTURE.md`.

## 3. Sécurité (non négociable)

1. Toute requête métier est authentifiée par session opaque ; aucune confiance dans un
   identifiant de propriétaire envoyé par le client.
2. Toute lecture/écriture filtre par `ownerId` issu de la session.
3. Les rattachements inter-ressources passent par les FK composites `(id, owner_id)`.
4. Une ressource appartenant à un autre utilisateur renvoie **404**, jamais 403
   (pas de fuite d'existence).
5. Jamais de secret dans le dépôt ni dans un log. `.env` en `chmod 600`.
6. Mots de passe : Argon2id uniquement, paramètres de `ARGON2_OPTIONS`.
7. Ne jamais désactiver `REQUIRE_EMAIL_VERIFICATION` en préproduction/production.
8. Ne jamais exposer un port Docker sur `0.0.0.0` : uniquement `127.0.0.1`.
9. Toute nouvelle route est privée par défaut ; `@Public()` doit être justifié.
10. Ne pas implémenter de contournement d'autorisation, même temporaire.

## 4. Tests

- Toute fonctionnalité livrée doit avoir au moins un test d'intégration API.
- Les tests d'isolation (accès croisé entre deux propriétaires) sont **obligatoires**
  pour chaque nouvelle ressource métier.
- Tests d'intégration : vraie base `immo_test`, vraie instance HTTP, aucun mock de Prisma.
- Ne jamais marquer un test comme réussi sans l'avoir exécuté.
- Avant commit : `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## 5. Git

- Branche principale : `main`. Commits conventionnels (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Commits atomiques par unité de travail ; message en français, impératif.
- Ne jamais `git push --force` sur `main`, ne jamais réécrire l'historique publié.
- Vérifier `git status` avant chaque commit : aucun `.env`, secret, dump ou fichier généré.
- Pousser à chaque jalon validé (sauvegarde distante = reprise possible).

## 6. Limites d'intervention

Autorisé sans demander : code, dépendances du projet, conteneurs Docker préfixés `immo-`,
migrations, tests, builds, commits, push, documentation.

Interdit sans validation humaine explicite :

- `sudo`, `apt`, modification de Caddy, DNS, pare-feu, systemd ;
- toute action sur les autres projets ou volumes Docker existants ;
- déploiement en production ;
- suppression de données existantes ;
- modification du mécanisme de sauvegarde commun ;
- achat ou activation de service payant.

En cas de blocage : ne pas contourner, documenter dans `docs/ETAT_DU_PROJET.md`,
poursuivre les tâches indépendantes.

## 7. Reprise du travail

1. Lire `docs/ETAT_DU_PROJET.md` (section « Reprise »).
2. `pnpm install && pnpm db:up`, puis `pnpm db:test` si des tests doivent tourner.
3. Vérifier `git status` et `git log --oneline -10`.
4. Lancer `pnpm typecheck && pnpm test` pour confirmer l'état de départ.
5. Reprendre à la première action non terminée listée dans l'état du projet.

## 8. Pièges connus

- **Injections NestJS** : `tsx`/esbuild n'émet pas `emitDecoratorMetadata`.
  Utiliser `nest start --watch` (tsc) ou lancer le build compilé. Ne pas revenir à `tsx`
  pour exécuter l'API.
- **Prisma 7** : l'URL de connexion est dans `prisma.config.ts`, pas dans `schema.prisma`.
  Le client utilise `@prisma/adapter-pg`.
- **Next.js 16** : `params` et `searchParams` sont des `Promise` dans les pages.
- **Ports** : 3100 web, 4100 API, 5434 PostgreSQL dev, 1026/8026 Mailpit. Ne pas réutiliser
  les ports de Pokero (4000, 5433, 8080, 1025, 8025).
