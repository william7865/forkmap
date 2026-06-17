# Refonte visuelle Forkmap — Simplicité, accent unique, icônes cohérentes

**Date :** 2026-06-17
**Statut :** Validé (directions choisies en maquette)

## Problème

L'interface est perçue comme « trop colorée » et « trop compliquée ». Trois causes
identifiées :

1. **Trop d'accents** — en plus du vert forêt + terracotta, la palette ajoute du bleu
   (`--sky`), du corail (`--coral`), de l'ambre (`--amber`), plus des couleurs **hors
   système codées en dur** (bleu `#1d65c8` du point GPS, vert `#16a34a` de l'itinéraire,
   or `#f59e0b` des étoiles de visite) et **6 dégradés bariolés** (violet, teal, navy) pour
   les couvertures de listes.
2. **Trop de pastilles** — une carte de restaurant empile jusqu'à 7 badges colorés (score,
   Michelin, Nouveau, note, ouvert, prix, distance) qui se disputent l'attention.
3. **Icônes hétérogènes** — `lucide-react` est déjà centralisé, mais cohabite avec des
   **emojis** (humeurs de visite 🧍👫, ⭐🏆, ♥ favori) et des **SVG inline disparates**.

Objectif : un rendu **premium et simple** où l'œil ne se perd pas, sans dénaturer l'identité
« Éditorial chaleureux » (Bricolage Grotesque / Hanken Grotesk / papier crème).

## Directions validées

- **Palette : un seul accent.** Terracotta (`#bb5e2e`) devient la **seule** couleur d'accent
  (actions, score, sélection, liens, focus). Le vert n'est plus conservé que comme **signal
  sémantique « ouvert maintenant »**. Tous les autres accents (bleu, corail, ambre) et les
  couleurs hors-système sont supprimés.
- **Simplicité : une info = un seul traitement visuel.** Moins de pastilles, plus de blanc.
  Le score se fond discrètement sur la photo ; note + prix + état tiennent sur une ligne
  sobre. La couleur est réservée à ce qui compte vraiment.
- **Icônes : base unifiée + signatures.** Une famille `lucide` cohérente partout (trait
  1.75, monochrome `currentColor`, **zéro emoji**), complétée par **4-5 icônes signature**
  dessinées pour Forkmap en terracotta (pin de carte, étincelle « Surprends-moi », humeurs
  de visite, « tout près », couvert).

## Architecture de la solution

Le travail se décompose en quatre unités indépendantes, dans l'ordre :

### 1. Tokens de couleur (`app/globals.css`)

Source unique de vérité. Les composants consomment des variables CSS — on retravaille les
tokens d'abord pour que la majorité du changement se propage automatiquement.

- **Promouvoir terracotta en accent unique.** Repointer `--accent`, `--accent-hover`,
  `--accent-light`, `--accent-text` sur les valeurs terracotta (actuellement `--ember*`).
  Conséquence : les ~90 usages de `--accent` (boutons primaires, focus, états sélectionnés,
  eyebrow) passent en terracotta — c'est l'effet recherché « accent unique ». `--ember*` est
  conservé comme **alias** de `--accent*` (rétrocompat, plus de doublon visuel).
- **Conserver le vert uniquement pour « ouvert ».** Introduire/garder `--open` + `--open-bg`
  en vert (`#1d7a4e`). Les anciens alias verts (`--forest*`, `--accent` historique) sont
  remappés : ce qui était décoratif → neutre encre/papier ; ce qui était sémantique
  « ouvert » → `--open`.
- **Supprimer les accents superflus.** Retirer `--sky*`, `--coral*`, `--amber` en tant que
  couleurs distinctes. Pour une migration sûre, les aliaser temporairement vers `--accent`
  ou un neutre, **puis purger** les usages composant par composant (étape 3).
- **Simplifier les couleurs de note.** Remplacer le tri-chromie `--rating-high/mid/low` par :
  note affichée en **encre** avec **étoile terracotta** ; la barre de note (PlaceDetail)
  utilise l'accent unique. `--closed` reste un rouge **discret** (état fermé), atténué.
- **État cible des tokens :** un accent (terracotta), deux signaux sémantiques (vert
  « ouvert », rouge discret « fermé »), le reste en encre/papier + ombres chaudes existantes.

### 2. Système d'icônes (`components/icons/`)

- **Unifier la base.** Vérifier que toutes les icônes `lucide` exportées par
  `components/icons/index.tsx` utilisent le même `strokeWidth` (1.75) et héritent de la
  couleur via `currentColor` (monochrome). Aucune couleur en dur.
- **Ajouter les icônes signature.** Créer les composants custom (SVG inline, même grille
  24×24, même grammaire de trait) : `IcoPin` (marqueur), `IcoSurprise` (étincelle),
  humeurs de visite (`IcoMoodSolo/Couple/Friends/Family/Work`), `IcoNear` (tout près),
  `IcoFork` (couvert/visite). Exportés depuis le même point d'entrée que la base.
- **Bannir les emojis.** Remplacer chaque emoji d'UI par l'icône correspondante :
  - `components/place/VisitModal.tsx` — humeurs (🧍👫👯👨‍👩‍👧💼) → icônes signature ; « ⭐ Ma
    note » → `IcoStar` ; étoiles interactives `#f59e0b` → terracotta (`--accent`).
  - `app/(pages)/favorites/page.tsx` & `account/page.tsx` — ⭐ Michelin / 🏆 stats → `IcoStar`
    / icône trophée.
  - `components/map/MapView.tsx` — cœur favori (♥ serif) → `IcoHeart` plein.

### 3. Purge des couleurs composant (simplicité)

- **`components/place/PlaceCard.tsx`** — score → pastille discrète floutée sur la photo ;
  note (étoile terracotta) + prix + état « ouvert » sur **une seule ligne** ; supprimer les
  pastilles colorées surnuméraires (Michelin/Nouveau deviennent des marqueurs sobres, pas
  des badges criards). Une info = un traitement.
- **`components/map/MapView.tsx`** — supprimer les hex hors-système : point GPS `#1d65c8` et
  départ d'itinéraire `#16a34a` → tokens. Marqueur favori = terracotta, défaut = encre.
- **`lib/gradients.ts`** — remplacer les 6 dégradés multicolores par un jeu **camaïeu
  terracotta → encre** (et neutres chauds), déterministe par id (signature conservée).
- **`components/place/PlaceDetail.tsx`, `FiltersPanel.tsx`, chips/filtres** — chips
  sélectionnées = accent unique ; retirer toute teinte bleu/corail/ambre résiduelle.
- **Exception assumée :** les couleurs de marque Google (`#4285F4`…) dans `AuthModal.tsx`
  restent (contrainte de marque), isolées au bouton OAuth.

### 4. Vérification

`grep` final des hex hors-système (`#[0-9a-fA-F]{6}`) dans `components/` et `app/` : il ne doit
plus rester que les couleurs Google (AuthModal) et les valeurs neutres justifiées. Lancer
`npm run lint && npm run type-check && npm run build`.

## Hors périmètre (YAGNI)

- Pas de refonte typographique (les polices et l'échelle restent).
- Pas de changement de layout/navigation ni de logique métier.
- Pas de mode sombre.
- Pas de redessin complet des 23 icônes de base (seulement unification + signatures).

## Critères de réussite

1. Une seule couleur d'accent visible dans l'app (terracotta) ; vert = « ouvert », rouge
   discret = « fermé », rien d'autre.
2. Aucun emoji dans l'UI ; une seule famille d'icônes cohérente + signatures Forkmap.
3. Carte de restaurant lisible « au premier coup d'œil » : l'œil va au nom, une ligne de méta
   sobre, score discret.
4. `lib/gradients.ts` ne produit plus que des camaïeux terracotta/neutres.
5. Plus aucun hex hors-système hors marque Google ; lint + type-check + build verts.
