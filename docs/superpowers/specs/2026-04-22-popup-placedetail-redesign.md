# Spec — SaveToListPopup + PlaceDetail Redesign

**Date:** 2026-04-22
**Branch:** feat/lists (worktree at .worktrees/feat-lists)

---

## 1. SaveToListPopup — Refonte positionnement Instagram-style

### Problème actuel

Le popup se positionne `translateY(-100%)` au-dessus du bouton avec `position: absolute` ancré dans le DOM via portal. Le bouton "Nouvelle liste" est mal positionné car le calcul de position ne tient pas compte du viewport.

### Design retenu

Dropdown ancré **sous** le bouton bookmark, style Instagram :

- `position: fixed` calculé depuis `anchorRef.current.getBoundingClientRect()`
- Apparaît **en dessous** du bouton (top = `rect.bottom + 8`)
- Aligné à droite du bouton (right = `window.innerWidth - rect.right`)
- Animation `scaleIn` depuis le coin supérieur droit (`transform-origin: top right`)
- Largeur fixe 240px, max-height 320px avec scroll interne

### Structure du popup

```
┌──────────────────────────┐  ← border-radius: 14px, shadow
│ ENREGISTRER DANS…        │  ← label uppercase 9px
├──────────────────────────┤
│ ☑ À tester 🍜       (3) │  ← checked: fond accent-light
│ ☐ Brunch 🥞         (7) │
│ ☐ Date night 🕯️     (2) │
├──────────────────────────┤
│ + Nouvelle liste          │  ← ouvre CreateListModal
└──────────────────────────┘
```

### Comportement

- Au mount : `fetchLists()` + `getListsForPlace(osmId)` pour pré-cocher les listes existantes
- Toggle checkbox : optimistic UI (state local) + appel API en arrière-plan
- "Nouvelle liste" : ouvre `CreateListModal` via portal, auto-ajoute le lieu dans la nouvelle liste
- Fermeture : clic extérieur (mousedown), Escape, ou en cliquant le bouton bookmark à nouveau

### Changement de positionnement

```typescript
// Avant (incorrect — translateY au-dessus)
top: rect.top + window.scrollY - 8
transform: 'translateY(-100%)'

// Après (correct — en dessous du bouton)
top: rect.bottom + window.scrollY + 8
right: window.innerWidth - rect.right
// Pas de transform
```

---

## 2. PlaceDetail — Redesign responsive (Option C)

### Problème actuel

- Close button `position: absolute` en haut à droite force un `paddingRight: 46` qui coupe le nom
- Boutons d'action (4) dans une row qui déborde sur petits écrans
- Pas de hiérarchie visuelle claire entre la photo et le contenu

### Design retenu

Style Foursquare/Yelp : grande photo plein largeur avec overlay gradient, actions sur la photo.

### Structure

```
┌─────────────────────────────────┐
│  [←]              [🔖] [↗]     │  ← boutons glassmorphism sur photo
│                                 │
│  PHOTO PLEIN LARGEUR            │  ← height: 200px mobile, 240px desktop
│  object-fit: cover              │
│                                 │
│  ████ Le Petit Bistro ████████  │  ← overlay gradient en bas
│  [OUVERT] ⭐9.2 · €€ · Français │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ [Itinéraire] [Appeler] [Site web]│  ← quick actions row, 3 boutons
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Infos │ Photos │ Visites │ Route │  ← tabs existants conservés
└─────────────────────────────────┘
│ contenu scrollable...            │
```

### Boutons sur la photo

- **Close (←)** : `position: absolute, top: 12, left: 12` — cercle `rgba(0,0,0,0.35)` + `backdrop-filter: blur(6px)`
- **Bookmark** : `position: absolute, top: 12, right: 48` — même style glassmorphism, vert si favori
- **Partager** : `position: absolute, top: 12, right: 12` — même style glassmorphism

### Overlay gradient

```css
position: absolute;
bottom: 0;
left: 0;
right: 0;
padding: 40px 14px 12px;
background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
```

Contient :

- `<h2>` nom du restaurant (blanc, 20px, font-display)
- Ligne badges : `[OUVERT]` + rating + prix + cuisine (blanc semi-transparent)

### Quick actions row

```
background: var(--surface)
border-bottom: 1px solid var(--border)
display: flex; gap: 8px; padding: 10px 14px;
```

3 boutons :

- **Itinéraire** : primary (background accent, couleur blanche)
- **Appeler** : secondary (border + fond blanc) — visible seulement si `place.phone` existe
- **Site web** : secondary — visible seulement si `place.website` existe

### Photo absente

Si pas de photo Foursquare : gradient de couleur basé sur le `color_hue` de la cuisine (même logique que ListCard), hauteur 160px.

### Responsive

- Mobile (< 640px) : photo height 200px
- Desktop (≥ 640px) : photo height 240px
- Utilise `useIsMobile()` hook existant

---

## Fichiers modifiés

| Fichier                                | Changement                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `components/lists/SaveToListPopup.tsx` | Recalcul position (top = bottom + 8), animation scaleIn depuis top-right    |
| `components/place/PlaceDetail.tsx`     | Nouveau header photo overlay, quick actions row, suppression close flottant |

## Fichiers non modifiés

- `lib/hooks/useLists.ts` — aucun changement API
- `app/api/lists/` — aucun changement
- `lib/db.ts` — aucun changement
