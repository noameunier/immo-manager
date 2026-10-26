# Cahier des charges — Immo Manager

> Version 1.0 — 26 octobre 2026
> Ce document décrit le besoin fonctionnel. Les choix techniques sont décrits dans
> [`ARCHITECTURE.md`](ARCHITECTURE.md), l'avancement réel dans [`ETAT_DU_PROJET.md`](ETAT_DU_PROJET.md).

## 1. Contexte et problème

Un propriétaire bailleur gère rarement un seul bien. Il peut détenir :

- des biens en son nom propre (personne physique) ;
- des biens au travers d'une SCI ;
- des biens via une société (SARL, SAS, SCI de gestion…) ;
- des biens en indivision (héritage, achat à plusieurs).

Les informations sont aujourd'hui dispersées entre tableurs, boîtes mail et documents
papier. Il n'existe pas de vue consolidée, et le rattachement d'un lot à la bonne
structure juridique est une source constante d'erreurs (déclarations fiscales,
assurances, comptabilité).

**Immo Manager** centralise ce patrimoine dans une application simple, en français,
accessible depuis le web et le mobile.

## 2. Objectifs

| Objectif                              | Indicateur de réussite                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Centraliser le patrimoine             | Toutes les entités, immeubles et biens sont saisissables et consultables       |
| Refléter la structure juridique       | Chaque bien est rattaché à exactement une entité propriétaire                  |
| Distinguer lots et biens indépendants | Un lot appartient à un immeuble ; une maison/garage/parking peut être autonome |
| Offrir une vue d'ensemble             | Tableau de bord calculé sur les données réelles, sans saisie manuelle          |
| Garantir la confidentialité           | Un propriétaire ne peut jamais accéder aux données d'un autre                  |
| Rester simple                         | Un parcours de création complet en moins de 5 minutes, sans formation          |

## 3. Personas

**Camille, 38 ans, particulier bailleur.**
Possède son appartement et un studio hérité en indivision. Veut savoir rapidement
ce qui est loué, vacant, et la surface totale de son patrimoine.

**Marc, 55 ans, gérant de SCI familiale.**
Gère trois immeubles pour le compte de sa SCI. A besoin que chaque lot soit
correctement rattaché à la SCI et non à lui-même, pour la comptabilité.

**Léa, 29 ans, gestionnaire pour un investisseur.**
Suit plusieurs sociétés. Veut une application mobile pour consulter une fiche
pendant une visite, sans sortir l'ordinateur.

## 4. Périmètre

### 4.1 Inclus en phase 1

1. **Compte propriétaire**
   - inscription par email + mot de passe ;
   - connexion, déconnexion ;
   - mot de passe oublié et réinitialisation ;
   - vérification de l'adresse email (obligatoire en préproduction/production) ;
   - profil en lecture (nom, email, état de vérification, dates).

2. **Entités propriétaires**
   - types : personne physique, SCI, société, indivision ;
   - nom usuel, raison sociale, SIREN, SIRET, TVA intracommunautaire ;
   - coordonnées (email, téléphone) et adresse ;
   - notes libres ;
   - création, consultation, modification, archivage et restauration.

3. **Immeubles**
   - rattachement obligatoire à une entité propriétaire ;
   - nom, référence interne, adresse complète, année de construction, notes ;
   - création, consultation, modification, archivage et restauration ;
   - liste des lots contenus.

4. **Biens**
   - types : appartement, maison, garage, parking, box ;
   - lot rattaché à un immeuble **ou** bien indépendant ;
   - nom, référence, numéro de lot, étage, surface, nombre de pièces ;
   - état d'occupation : vacant, occupé, non renseigné ;
   - adresse propre facultative pour un lot, obligatoire pour un bien indépendant ;
   - description libre ;
   - création, consultation, modification, archivage et restauration.

5. **Tableau de bord**
   - nombre d'entités, d'immeubles, de biens ;
   - répartition des entités par type et des biens par type ;
   - répartition par état d'occupation ;
   - surface totale renseignée ;
   - nombre d'éléments archivés ;
   - état vide pédagogique pour un compte neuf.

6. **Clients**
   - application web responsive (ordinateur, tablette, mobile) ;
   - application mobile Android/iOS (consultation et archivage en phase 1) ;
   - interface intégralement en français, montants et dates au format `fr-FR`.

### 4.2 Hors périmètre de la phase 1

- baux, locataires, quittances et loyers ;
- comptabilité, déclarations fiscales, amortissements ;
- documents et photos (le modèle de données les prévoit, l'interface non) ;
- travaux, sinistres, assurances ;
- partage d'accès entre plusieurs utilisateurs ;
- import/export de données existantes ;
- notifications push et emails de rappel ;
- paiement et abonnement.

Ces éléments sont planifiés en phase 2 et suivantes (voir [`ROADMAP.md`](ROADMAP.md)).

## 5. Règles de gestion

1. Un bien appartient à **exactement une** entité propriétaire, elle-même rattachée
   à un utilisateur.
2. Un immeuble appartient à exactement une entité.
3. Un bien peut être rattaché à un immeuble (c'est un **lot**) ou à aucun
   (c'est un **bien indépendant**).
4. Un numéro de lot doit être unique au sein d'un même immeuble.
5. Si un bien est un lot sans adresse propre, l'adresse de l'immeuble s'applique.
6. Si un bien est indépendant, code postal et ville sont obligatoires.
7. La suppression est **logique** : l'élément est archivé, reste consultable et
   peut être restauré. Aucune donnée métier n'est effacée par l'interface.
8. Un immeuble archivé ne peut plus recevoir de nouveau lot.
9. Une entité archivée ne peut plus recevoir de nouvel immeuble.
10. Toute ressource appartenant à un autre propriétaire est traitée comme
    inexistante (réponse 404), afin de ne pas révéler son existence.
11. Les montants (phase 2) seront exprimés en euros et formatés `fr-FR`.

## 6. Parcours utilisateur de référence

```text
Inscription
   └─> Tableau de bord (état vide)
         └─> Créer une entité propriétaire
               └─> Créer un immeuble rattaché
                     └─> Créer un lot
                           └─> Tableau de bord mis à jour
                                 └─> Déconnexion
```

Variante : création directe d'un **bien indépendant** sans passer par un immeuble.

## 7. Exigences non fonctionnelles

### 7.1 Sécurité

- Mots de passe stockés avec Argon2id, paramètres documented dans `ARCHITECTURE.md`.
- Sessions opaques de 256 bits, stockées hachées, révocables individuellement.
- Cookie de session `httpOnly`, `SameSite=Lax`, `Secure` hors développement.
- Jeton `Bearer` pour le mobile, stocké dans le Keychain/Keystore.
- Protection CSRF sur toute mutation authentifiée par cookie.
- Limitation de débit sur inscription, connexion et réinitialisation.
- Verrouillage temporaire du compte après échecs de connexion répétés.
- Aucun secret dans le dépôt, aucun jeton ni mot de passe dans les journaux.
- Isolation multi-tenant garantie par l'application **et** par la base
  (clés étrangères composites).

### 7.2 Confidentialité et données personnelles

- Chaque compte ne voit que ses propres données.
- Les emails transactionnels ne contiennent jamais de données patrimoniales.
- Les journaux d'audit ne conservent ni mot de passe, ni jeton, ni adresse IP en clair.
- Droit à l'effacement : prévu en phase 3 (suppression de compte avec purge).

### 7.3 Performance et disponibilité

- Réponse API < 300 ms au 95ᵉ centile sur les listes usuelles (< 1 000 biens).
- Interface utilisable sur un smartphone d'entrée de gamme.
- Sauvegarde chiffrée quotidienne de la base (voir `infra/backup`).

### 7.4 Accessibilité et ergonomie

- Libellés explicites associés aux champs de formulaire.
- Messages d'erreur en français, au niveau du champ concerné et en résumé.
- Navigation au clavier sur le web, contrastes suffisants.
- Aucune dépendance à la couleur seule pour transmettre une information.

### 7.5 Compatibilité

- Web : Chrome, Firefox, Safari et Edge, deux dernières versions majeures.
- Mobile : Android 8+ et iOS 15+.
- Résolutions : de 360 px à 1920 px de large.

## 8. Contraintes techniques

- Monorepo TypeScript strict, validation partagée entre clients et API.
- PostgreSQL comme unique base de données.
- Hébergement sur un VPS Debian existant, partagé avec d'autres projets :
  aucun port public autre que ceux gérés par le reverse proxy.
- Aucun déploiement en production sans validation humaine explicite.
- Trois environnements : développement, préproduction, production.

## 9. Critères d'acceptation de la phase 1

La phase 1 est considérée comme livrée lorsque :

- [x] un visiteur peut créer un compte, se connecter et se déconnecter ;
- [x] un utilisateur peut créer, modifier, archiver et restaurer une entité,
      un immeuble, un lot et un bien indépendant ;
- [x] le tableau de bord reflète exactement les données saisies ;
- [x] un utilisateur ne peut accéder à aucune donnée d'un autre compte
      (vérifié par tests automatisés) ;
- [x] l'application web est utilisable sur mobile et sur ordinateur ;
- [x] l'application mobile se connecte à l'API et affiche le patrimoine ;
- [x] les tests d'intégration API et le parcours Playwright passent ;
- [ ] la préproduction est accessible en HTTPS (en attente de l'ouverture DNS
      et de la configuration Caddy, action humaine) ;
- [ ] les emails réels sont envoyés via un fournisseur (clé API à fournir).

## 10. Glossaire

| Terme                      | Définition                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Entité propriétaire**    | Structure juridique qui détient le patrimoine (personne physique, SCI, société, indivision) |
| **Immeuble**               | Construction regroupant plusieurs lots (copropriété ou immeuble entier)                     |
| **Lot**                    | Bien rattaché à un immeuble (appartement, parking, box), identifié par un numéro            |
| **Bien indépendant**       | Bien sans immeuble : maison, garage isolé, parking extérieur                                |
| **Archivage**              | Suppression logique réversible ; les données restent en base                                |
| **Isolation multi-tenant** | Garantie qu'un compte ne peut lire ou modifier que ses propres données                      |
