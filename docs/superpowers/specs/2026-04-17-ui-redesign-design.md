# Forkmap — UI/UX Redesign Spec

Date: 2026-04-17

## Résumé

Refonte complète de l'interface. Le code métier (hooks, API routes, scoring) ne change pas — seuls les composants visuels, le CSS et le layout sont remplacés.

## Décisions de design

| Axe              | Décision                                                            |
| ---------------- | ------------------------------------------------------------------- |
| Style            | Clean Minimal — blanc `#ffffff`, gris `#f5f5f5`, pas de décorations |
| Layout           | Carte pleine écran + barre flottante + bottom sheet glissant        |
| Couleur d'accent | Forest green `#2d7a55` (conservé)                                   |
| Icônes           | Lucide React (remplace tous les SVG custom)                         |
| Typographie      | Geist uniquement — on retire Fraunces                               |
| Radius           | 12px standard, 999px pills                                          |
| Ombres           | Légères, une seule valeur : `0 2px 12px rgba(0,0,0,0.08)`           |

## Layout principal (`app/page.tsx`)

### Avant

Sidebar fixe à gauche (40%) + carte à droite (60%). Nav rail vertical à gauche (52px).

### Après

- **Carte pleine écran** — prend 100% viewport
- **Barre flottante** en haut : search input + bouton filtres + bouton localiser
- **Bottom sheet** : ancré en bas, s'étend vers le haut au scroll. Contient la liste des restaurants.
  - État réduit : handle visible + 2-3 cartes en aperçu (hauteur ~220px)
  - État étendu : liste complète scrollable (hauteur ~70vh)
  - Sur desktop : bottom sheet remplacé par une sidebar gauche flottante (non-fixe, width 380px, hauteur 100%, scrollable)
- **Nav** : BottomNav mobile inchangée dans sa position, redesignée visuellement. NavRail desktop inchangé dans sa position, redesigné.

## Système de couleurs

```css
/* Accents */
--accent: #2d7a55;
--accent-hover: #1a4a35;
--accent-light: #e6f4ee;
--accent-text: #2d7a55;

/* Surfaces */
--bg: #ffffff;
--surface: #f7f7f7;
--surface-2: #f0f0f0;
--border: rgba(0, 0, 0, 0.08);
--border-strong: rgba(0, 0, 0, 0.14);

/* Texte */
--text: #111111;
--text-2: #555555;
--text-3: #999999;

/* Sémantique */
--open: #16a34a;
--closed: #dc2626;
```

## Icônes

Remplacer `components/icons/index.tsx` par des exports Lucide :

```tsx
export {
  Search,
  MapPin,
  Heart,
  SlidersHorizontal,
  Navigation,
  Star,
  Share2,
  Pencil,
  CheckSquare,
  Phone,
  Globe,
  Clock,
  ArrowRight,
  Route,
  Utensils,
  Bike,
  Car,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Settings,
  BookMarked,
  BarChart2,
  LogOut,
  Menu,
} from 'lucide-react'
```

Taille standard : `size={18}` pour les actions, `size={16}` pour les labels, `size={20}` pour la nav. `strokeWidth={1.75}` partout.

## Composants à modifier

### `globals.css`

- Retirer la police Fraunces (import Google Fonts)
- Garder Geist
- Remplacer les variables CSS par le nouveau système ci-dessus
- Conserver les animations (fadeUp, slideUp, shimmer, heartBeat, etc.)
- Conserver les classes utilitaires (no-scrollbar, truncate-1, etc.)
- Conserver le CSS Leaflet

### `components/icons/index.tsx`

- Remplacer tous les SVG custom par des re-exports Lucide
- Conserver les noms d'exports existants pour éviter de toucher aux imports partout (ex: `export const IcoSearch = (props) => <Search {...props} />`)

### `components/ui/NavRail.tsx`

- Icônes Lucide
- Fond blanc, bordure droite fine `var(--border)`
- Icône active : fond `var(--accent-light)`, couleur `var(--accent)`
- Width 56px

### `components/ui/BottomNav.tsx`

- Icônes Lucide
- Fond blanc, bordure top fine
- Tab active : couleur `var(--accent)`, label visible
- Tabs inactives : `var(--text-3)`

### `components/place/PlaceCard.tsx`

- Hauteur réduite, plus aérée
- Fond blanc, border `var(--border)`, radius 12px
- Score en badge vert compact (ex: `9.4`)
- Statut ouvert/fermé : petit dot coloré + texte
- Distance en gris léger
- Actions (favori, partager) avec icônes Lucide
- Pas d'emoji cuisine — remplacé par un tag texte (ex: `Français`)

### `components/place/PlaceDetail.tsx`

- Bottom sheet detail qui monte quand on clique sur une carte
- Header : nom + catégorie + score
- Sections : Infos (adresse, tel, web, horaires), Actions (itinéraire, partager, noter), Note personnelle

### `components/filters/FiltersPanel.tsx`

- Drawer latéral sur desktop, modal bottom sheet sur mobile
- Icônes Lucide pour chaque filtre
- Chips de filtre arrondies (pills)

### `components/states/SkeletonList.tsx` + `PlaceCardSkeleton.tsx`

- Adapter au nouveau format de carte

### Pages secondaires (`favorites`, `settings`, `account`, `contact`, etc.)

- Icônes Lucide
- Fond `var(--bg)`, surface cards `var(--surface)`
- Headers épurés, pas de Fraunces

### `app/page.tsx`

- Supprimer la sidebar fixe
- Ajouter la barre flottante en haut (position absolute, z-index élevé)
- Intégrer le composant BottomSheet pour la liste
- Sur desktop (≥768px) : sidebar flottante gauche à la place du bottom sheet

## Dépendances à ajouter

```bash
npm install lucide-react
```

`lucide-react` est tree-shakeable — seules les icônes importées sont bundlées.

## Ce qui NE change PAS

- Toute la logique dans `lib/` (hooks, scoring, api-auth, db, cache, etc.)
- Toutes les routes API dans `app/api/`
- Le système d'auth
- Le système i18n (`lib/i18n/`)
- La logique Leaflet dans `MapView.tsx` (seulement les styles CSS de la carte)
- Les types dans `types/index.ts`

## Ordre d'implémentation recommandé

1. Installer lucide-react
2. Refaire `globals.css` (design tokens)
3. Refaire `components/icons/index.tsx` (wrapper Lucide)
4. Refaire `NavRail` + `BottomNav`
5. Refaire `PlaceCard` + `PlaceCardSkeleton`
6. Refaire le layout `app/page.tsx` (barre flottante + bottom sheet)
7. Refaire `FiltersPanel`
8. Refaire `PlaceDetail`
9. Refaire les pages secondaires
10. Vérification type-check + lint
