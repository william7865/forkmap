# Forkmap — Fondation native & coquille app (Lot 1)

**Date :** 2026-06-29
**Statut :** validé — prêt pour plan d'implémentation
**Branche :** `feat/mobile-app-embedded`
**Plateforme cible :** iOS d'abord (puis Android, même code)

## Contexte

Forkmap est une app web Next.js 15 emballée avec Capacitor 8, désormais en **mode
embarqué** (le bundle statique `out/` est installé dans l'app ; les données
viennent de l'API hébergée). Voir le spec
`2026-06-25-app-mobile-embarquee-design.md` (Phase 1 ✅).

L'objectif global : **finir l'app et son design** avant publication sur les
stores. Décision actée avec l'utilisateur : l'**app installée** doit avoir un
design **distinct** du **site web** (mobile-navigateur ou desktop), tout en
réutilisant les composants et le langage visuel de fond (« Éditorial
Chaleureux » : Bricolage Grotesque + Hanken Grotesk, papier crème, accent
terracotta unique). Niveau de divergence retenu : **B — navigation & layout
repensés pour l'app, composants/style partagés** (pas une identité visuelle
totalement différente).

Le travail global a été découpé en blocs ; **ce spec couvre le Lot 1 : la
fondation native + la coquille app**, qui est la colonne vertébrale dont tout le
reste dépend. Les blocs suivants (parcours inachevés, polish visuel) viendront
ensuite, chacun avec son propre spec.

### Problème central

Aujourd'hui `components/ui/NavWrapper.tsx` bascule la navigation **par taille
d'écran** (`@media min-width:768px` → `NavRail` desktop ; sinon `BottomNav`
mobile), **pas par plateforme**. Conséquence : le **mobile-web** et l'**app
native** affichent exactement la même nav (`BottomNav` : Carte · Compte · Plus).
Rien ne distingue l'app installée d'un site responsive. C'est ce que ce lot
corrige.

## Objectif du Lot 1

Donner à l'app installée une **coquille native distincte** et un **feel
d'application**, sans toucher au rendu du site web.

## Périmètre

### 1. Coquille / navigation app

- **Nouvelle `AppTabBar`** (composant dédié) — tab bar à **4 onglets** :
  - **Carte** → `/` (découverte, l'écran actuel).
  - **Surprends-moi** → ouvre le `SurpriseSheet` en plein écran (aujourd'hui un
    CTA sur la carte). L'onglet est un déclencheur d'overlay, pas une route.
  - **Favoris** → `/favorites`.
  - **Compte** → `/account`.
- **Branchement par plateforme :** l'`AppTabBar` est rendue **uniquement en
  natif** (`Capacitor.isNativePlatform()`). En web, on continue de rendre
  `NavWrapper` (NavRail + BottomNav) **strictement inchangé**.
  - Mécanique : un point de décision unique (composant `AppChrome` ou condition
    dans le layout) choisit `AppTabBar` (natif) vs `NavWrapper` (web). Les deux
    ne coexistent jamais.
  - La détection de plateforme doit être **SSR-safe** : `isNativePlatform()`
    n'est fiable qu'après hydratation. Rendre la nav web par défaut au premier
    paint, puis basculer en natif après montage (éviter tout flash incohérent /
    mismatch d'hydratation, cf. pattern `useIsMobile`).
- **Compte absorbe « Plus » :** l'écran `/account` reçoit, en natif, une section
  « réglages » listant les entrées de l'ancien menu Plus (Paramètres, Aide, À
  propos, Contact, Attribution) + déconnexion. L'onglet « Plus » disparaît en
  natif. (En web, `BottomNav` garde son menu « Plus » tel quel.)
- **Onglet actif** : icône + label en `--accent` (terracotta), inactif en
  `--text-3`, fond `--bg`, bordure haute `--border`, `padding-bottom:
  env(safe-area-inset-bottom)` — cohérent avec le `BottomNav` actuel.
- **Icônes** : réutiliser le set lucide-react déjà en place (Map, User, Heart) +
  l'icône signature « étincelle » existante pour Surprends-moi (cf.
  `components/icons/`).

### 2. Chrome natif

- **Status bar** : ajuster `CapacitorInit.tsx` — couleur de fond accordée au
  papier crème (`--bg` ≈ `#fffdf8`) au lieu du blanc pur ; style de contenu
  **sombre** (texte foncé sur fond clair). Conserver le reste de l'init (deep
  links, push).
- **Safe areas** : gestion globale via `env(safe-area-inset-*)` —
  - haut : la barre de recherche flottante de l'accueil ne doit pas passer sous
    l'encoche / Dynamic Island ;
  - bas : la tab bar respecte `safe-area-inset-bottom` (déjà fait pour
    `BottomNav`, à reproduire dans `AppTabBar`) ;
  - gauche/droite : marges sûres en paysage / appareils à coins.
  - Ajouter les helpers CSS nécessaires dans `app/globals.css` (variables /
    classes utilitaires safe-area), appliqués au conteneur app.
- **Splash screen** : configurer `@capacitor/splash-screen` aux couleurs marque
  (fond crème, marque terracotta centrée), avec masquage propre une fois l'app
  prête (pas de flash blanc). Assets **fonctionnels** ici ; artwork définitif en
  Phase 3.
- **Tuer les « tics web » — en natif uniquement** (via une classe sur `<html>`
  ou `<body>` appliquée quand `isNativePlatform()`):
  - rebond / scroll élastique de page (`overscroll-behavior`, blocage du bounce
    de la WebView) ;
  - sélection de texte indésirable (`user-select: none` sur le chrome,
    conservée sur les contenus lisibles) ;
  - surbrillance de tap (`-webkit-tap-highlight-color: transparent`) ;
  - menu contextuel long-press / callout (`-webkit-touch-callout: none`).
  - Ces règles ne doivent **pas** s'appliquer en web (où la sélection et le
    scroll natifs du navigateur restent souhaitables).

### 3. Comportements natifs

- **Itinéraire → Plans natif** : dans `components/place/PlaceDetail.tsx`, quand
  `isNativePlatform()`, remplacer le lien Google Maps web par l'ouverture des
  **Plans natifs** (schéma `maps://` / Apple Maps sur iOS ; `geo:` sur Android).
  Garder le lien Google Maps web comme comportement web.
- **Partage natif** : consolider le chemin `Share` natif déjà branché
  (`PlaceDetail.tsx`) — vérifier qu'en natif on passe par l'API de partage
  système (et non la `ShareModal` web). Pas de régression web.
- **Haptique** : généraliser via le wrapper `lib/native/haptics.ts` — retour
  léger au **changement d'onglet** et à l'**ajout/retrait d'un favori** (en plus
  du Surprends-moi déjà câblé). No-op en web.
- **Deep link OAuth Google** : le listener `appUrlOpen` existe déjà
  (`CapacitorInit.tsx` → `com.forkmap.app://auth/callback?code=…`). **Vérifier le
  flux de bout en bout** sur simulateur (connexion Google → retour à l'app →
  session établie). Documenter la structure d'URL attendue.

### 4. Quick-wins i18n (corrections au passage)

- **Labels de cuisine EN→FR** : mapper les valeurs de cuisine OSM (« French »,
  « Burger », « Italian », …) vers le français à l'affichage (carte/listes/fiche).
  Centraliser le mapping (probablement dans `lib/` + `translations.ts`), pas de
  texte affiché en dur.
- **`LegalFooter`** : remplacer les chaînes anglaises (« ← Map », « Privacy »,
  « Terms », « Data attribution ») par leurs équivalents français via
  `useLanguage().tr()`.
- **Formulaire contact** : harmoniser le message d'erreur réseau en français
  (cohérent avec le message d'erreur d'envoi déjà en français).

## Hors périmètre (ce lot)

- **Artwork définitif** des icônes d'app et du splash → Phase 3 (fiches store).
  Ici : mécanique + assets fonctionnels seulement.
- Refonte des **parcours inachevés** (log de visite, filtres Surprends-moi,
  itinéraire multi-étapes, états vides/erreur génériques) → Lot 2.
- **Polish visuel** transverse (photos manquantes sur cartes, barre de note
  monochrome, skeletons) → Lot 3.
- **Publication stores** (signatures, captures, fiches, comptes développeur) →
  Phase 3.
- **Mode hors-ligne des données** (cache local des restos) → projet distinct.
- Le **rendu du site web** reste **figé** : aucune modification visible côté web
  hormis les quick-wins i18n (qui corrigent des bugs présents aussi en web).

## Architecture & fichiers

| Élément | Fichier(s) | Action |
| --- | --- | --- |
| Coquille app native | `components/ui/AppTabBar.tsx` (nouveau) | Tab bar 4 onglets, natif only |
| Point de décision nav | `components/ui/AppChrome.tsx` (nouveau) ou `app/layout.tsx` | Branche AppTabBar (natif) vs NavWrapper (web), SSR-safe |
| Nav web | `components/ui/NavWrapper.tsx`, `NavRail.tsx`, `BottomNav.tsx` | **Inchangés** |
| Ouverture Surprends-moi par onglet | `app/page.tsx` / `useHomeState.ts`, `SurpriseSheet.tsx` | Exposer un déclencheur d'overlay accessible depuis la tab bar |
| Section réglages dans Compte (natif) | `app/(pages)/account/page.tsx` | Liste « Plus » + déconnexion, conditionnée natif |
| Status bar + chrome | `components/native/CapacitorInit.tsx` | Couleur crème, style sombre |
| Safe areas + tics web | `app/globals.css` | Helpers safe-area + classe natif anti-tics-web |
| Splash | `capacitor.config.ts` + assets | Config splash marque |
| Plans natif | `components/place/PlaceDetail.tsx` | Branche maps natif vs Google Maps web |
| Haptique | `lib/native/haptics.ts` + appels | Onglet + favori |
| Cuisine FR | `lib/` (nouveau mapping) + `lib/i18n/translations.ts` | Mapping EN→FR |
| LegalFooter FR | `components/ui/LegalFooter.tsx` | Chaînes via `tr()` |
| Contact i18n | `app/api/contact/route.ts` | Message réseau FR |

### Détection de plateforme (règle)

Toujours passer par `Capacitor.isNativePlatform()`. **Ne jamais** importer
`@capacitor/*` directement dans du code partagé : passer par les wrappers
`lib/native/*` (compatibles web). Le branchement nav doit gérer le décalage
hydratation (web au premier paint, bascule natif après montage).

## Critères d'acceptation

1. **Web inchangé** : `npm run dev` dans un navigateur (mobile et desktop)
   affiche exactement la nav actuelle (NavRail / BottomNav). Aucune régression
   visuelle web hors quick-wins i18n.
2. **App native** : sur simulateur iOS, l'app affiche l'`AppTabBar` à 4 onglets
   (Carte · Surprends-moi · Favoris · Compte), pas le `BottomNav` web.
3. L'onglet **Surprends-moi** ouvre le deck plein écran ; **Favoris** et
   **Compte** naviguent vers leurs écrans ; **Compte** liste les entrées « Plus »
   + déconnexion en natif.
4. **Safe areas** respectées : barre de recherche sous l'encoche, tab bar
   au-dessus de l'indicateur home ; pas de contenu coupé.
5. **Status bar** lisible (contenu sombre sur fond crème), pas de flash blanc au
   splash.
6. **Tics web** absents en natif (pas de bounce de page, pas de sélection de
   texte sur le chrome, pas de surbrillance de tap, pas de callout long-press) —
   et toujours présents/normaux en web.
7. **Plans natif** : « itinéraire » ouvre l'app Plans du système en natif ;
   Google Maps web en navigateur.
8. **Haptique** au changement d'onglet et au toggle favori (sur appareil/simu
   compatible) ; no-op silencieux en web.
9. **OAuth Google** : connexion via deep link fonctionne de bout en bout sur
   simulateur (session établie, retour à l'app).
10. **i18n** : plus aucun label de cuisine en anglais à l'écran ; `LegalFooter`
    et l'erreur réseau du formulaire contact en français.
11. `npm run test:run && npm run lint && npm run type-check` passent. Build :
    `npm run build` (web) **et** `npm run build:mobile` (export) réussissent.

## Risques / points de vigilance

- **Mismatch d'hydratation** sur le branchement nav (le natif n'est connu
  qu'après montage) — suivre le pattern SSR-safe de `useIsMobile`.
- **Onglet Surprends-moi sans route** : c'est un overlay, pas une page. Gérer
  l'état actif de l'onglet et le retour propre (fermeture du deck → onglet Carte
  actif).
- **Plans natif** : schémas d'URL différents iOS/Android ; tester les deux (iOS
  prioritaire).
- **Splash** : éviter le flash blanc entre splash et premier paint de la WebView.
- **CSP / réseau** : ne pas introduire d'hôte externe non listé (Plans natif
  passe par un schéma système, pas par `connect-src`).
