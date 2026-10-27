# Roadmap — Immo Manager

> Dernière mise à jour : 27 octobre 2026.
> L'état réel d'avancement est tenu dans [`ETAT_DU_PROJET.md`](ETAT_DU_PROJET.md).

## Principe

Chaque phase livre un incrément utilisable de bout en bout, testé et documenté.
Une phase n'est déclarée terminée que lorsque ses critères d'acceptation sont
vérifiés par des tests exécutés, pas seulement écrits.

```text
Phase 1  ████████████████████░░  socle + patrimoine + web + mobile (clôture humaine)
Phase 2  ██████░░░░░░░░░░░░░░░░  exploitation locative (baux livrés, loyers à venir)
Phase 3  ░░░░░░░░░░░░░░░░░░░░░░  pilotage financier et conformité
Phase 4  ░░░░░░░░░░░░░░░░░░░░░░  collaboration et partage
```

## Phase 1 — Socle et patrimoine

**Objectif** : un propriétaire peut décrire l'intégralité de son patrimoine et le
consulter depuis le web et le mobile, en toute sécurité.

| Lot  | Contenu                                                                                 | État                                             |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1.1  | Monorepo, outillage, Docker de développement, CI                                        | livré                                            |
| 1.2  | Modèle de données Prisma, migration initiale, isolation par FK composites               | livré                                            |
| 1.3  | Authentification complète (inscription, session, email, réinitialisation, verrouillage) | livré                                            |
| 1.4  | CRUD entités propriétaires, immeubles, biens, archivage/restauration                    | livré                                            |
| 1.5  | Tableau de bord agrégé                                                                  | livré                                            |
| 1.6  | Application web Next.js (français, responsive, accessibilité de base)                   | livré                                            |
| 1.7  | Application mobile Expo (consultation, archivage, profil)                               | livré                                            |
| 1.8  | Tests d'intégration API + isolation multi-propriétaire                                  | livré                                            |
| 1.9  | Tests E2E Playwright du parcours propriétaire                                           | livré                                            |
| 1.10 | Documentation (cahier des charges, architecture, roadmap, état)                         | livré                                            |
| 1.11 | Préproduction HTTPS sur le VPS (Caddy, DNS, services utilisateur)                       | bloqué — actions humaines                        |
| 1.12 | Emails réels via Brevo                                                                  | bloqué — clé API à fournir                       |
| 1.13 | Sauvegarde chiffrée du projet                                                           | à livrer (script prêt, destination à configurer) |

**Critères de sortie** : parcours complet fonctionnel sur les trois clients,
tests d'intégration verts (65 au 27/10/2026), E2E vert, aucune donnée d'un compte
accessible depuis un autre compte.

## Phase 2 — Exploitation locative

**Objectif** : gérer la vie locative des biens, pas seulement leur description.

| Lot  | Contenu                                                                      | État    |
| ---- | ---------------------------------------------------------------------------- | ------- |
| 2.1  | Locataires (personne physique/morale), coordonnées, historique               | livré   |
| 2.2  | Baux : bailleur (entité), locataire, bien, dates, loyer, charges, dépôt      | livré   |
| 2.3  | Échéanciers et quittances générées en PDF                                    | à faire |
| 2.4  | Suivi des loyers : encaissé, en retard, impayé                               | à faire |
| 2.5  | Documents : upload, stockage local chiffré, association à un bien ou un bail | à faire |
| 2.6  | Photos des biens, galerie et couverture                                      | à faire |
| 2.7  | Révision annuelle des loyers (IRL), rappels automatiques                     | à faire |
| 2.8  | États des lieux (entrée/sortie) avec photos                                  | à faire |
| 2.9  | Création et modification des biens depuis le mobile                          | à faire |
| 2.10 | Pagination et recherche serveur sur toutes les listes                        | à faire |

**Critères de sortie** : un bail complet peut être créé, suivi sur 12 mois, et
les documents associés sont consultables ; les calculs de loyer sont couverts
par des tests.

## Phase 3 — Pilotage financier et conformité

**Objectif** : fournir les chiffres et les documents utiles à la déclaration et
au suivi de rentabilité.

| Lot | Contenu                                                                 |
| --- | ----------------------------------------------------------------------- |
| 3.1 | Charges et travaux par bien (factures, catégories)                      |
| 3.2 | Rentabilité par bien et par entité (brute, nette)                       |
| 3.3 | Amortissements et suivi fiscal simplifié                                |
| 3.4 | Export comptable (CSV, PDF récapitulatif annuel)                        |
| 3.5 | Assurance : polices, échéances, sinistres                               |
| 3.6 | Diagnostics techniques (DPE, amiante, électricité) et dates de validité |
| 3.7 | Double authentification TOTP                                            |
| 3.8 | Suppression de compte et export de données (RGPD)                       |
| 3.9 | Notifications email et push (échéances, impayés)                        |

**Critères de sortie** : l'utilisateur obtient un récapitulatif annuel par entité
exportable, et les alertes d'échéance fonctionnent.

## Phase 4 — Collaboration

**Objectif** : permettre à plusieurs personnes de gérer un patrimoine commun.

| Lot | Contenu                                                 |
| --- | ------------------------------------------------------- |
| 4.1 | Invitation d'un co-gestionnaire sur une entité          |
| 4.2 | Rôles (propriétaire, gestionnaire, lecture seule)       |
| 4.3 | Journal d'activité visible par les membres              |
| 4.4 | Partage temporaire d'une fiche (lien signé, expiration) |
| 4.5 | Application mobile complète (parité web)                |
| 4.6 | Mode hors ligne et synchronisation                      |
| 4.7 | Tableau de bord consolidé multi-entités avec graphiques |

## Transverse — continu

Ces sujets avancent en parallèle de toutes les phases :

- **Observabilité** : métriques, tableau de bord de santé, alertes.
- **Performance** : index, pagination, cache des agrégats.
- **Accessibilité** : audit RGAA progressif, tests au clavier.
- **Sécurité** : revue annuelle des dépendances, tests d'intrusion basiques,
  rotation des secrets.
- **Sauvegardes** : test de restauration trimestriel documenté.
- **Documentation** : mise à jour à chaque jalon, pas seulement en fin de phase.

## Jalons de livraison

| Jalon | Contenu                                         | Date cible                               |
| ----- | ----------------------------------------------- | ---------------------------------------- |
| J1    | Phase 1 fonctionnelle en local, tests verts     | atteint (26/10/2026)                     |
| J2    | Préproduction accessible en HTTPS, emails réels | à planifier (dépend d'actions humaines)  |
| J3    | Phase 1 validée par un utilisateur réel         | à planifier                              |
| J4    | Phase 2 — baux et loyers                        | baux livrés (27/10/2026), loyers à venir |
| J5    | Phase 3 — export fiscal                         | à définir                                |
| J6    | Phase 4 — collaboration                         | à définir                                |

Aucune date de mise en production n'est engagée : elle dépend d'une validation
humaine explicite, conformément aux règles du projet.

## Hors périmètre assumé

- Marketplace de biens ou mise en relation avec des locataires.
- Gestion de copropriété (assemblées générales, appels de fonds syndic).
- Comptabilité générale complète (plan comptable, bilan).
- Intégrations bancaires automatiques.
- Application pour les locataires.

Ces sujets pourraient devenir des produits distincts ; ils ne sont pas planifiés
dans Immo Manager.
