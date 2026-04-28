# Favorites Page Redesign — Design Spec

## Goal

Redesign `app/(pages)/favorites/page.tsx` to feel rich and visual instead of sparse — inspired by Instagram Collections. Two clear sections: **Mes listes** (2-column card grid) and **Tous enregistrés** (sorted restaurant list).

---

## Layout Overview

```
┌─────────────────────────────────┐
│  Enregistré                     │
│  24 restaurants · 3 listes      │
├─────────────────────────────────┤
│  MES LISTES                     │
│  ┌──────────┐ ┌──────────┐     │
│  │ Paris    │ │ Date     │     │
│  │ Brunch🥐 │ │ Night 🕯  │     │
│  │ 8 restos │ │ 12 restos│     │
│  └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐     │
│  │ Sushis🍣 │ │    +     │     │
│  │ 5 restos │ │ Nouvelle │     │
│  └──────────┘ └──────────┘     │
├─────────────────────────────────┤
│  TOUS ENREGISTRÉS    Récent ▾ ⊞│
│  ┌─────────────────────────┐   │
│  │ 🟩 Le Comptoir · ⭐4.5  │   │
│  │    Paris Brunch         │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ 🟦 Sakura Sushi · ⭐4.8 │   │
│  │    Sushis               │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Section 1 — Header

- Title: "Enregistré" (`font-display`, 22px, `--ink`)
- Subtitle: `{favCount} restaurants · {listCount} listes` (12px, `--ink-60`)
- No back button — this is a top-level page

---

## Section 2 — Mes listes

**Layout:** 2-column CSS grid, `gap: 10px`, full-width inside page padding.

**ListCollectionCard** (new component at `components/lists/ListCollectionCard.tsx`):

- `aspect-ratio: 0.85` (portrait)
- `border-radius: 16px`
- `box-shadow: 0 2px 12px rgba(0,0,0,0.10)`
- Background: one of 6 deterministic gradient palettes based on `list.id` hash (green, red, blue, amber, purple, teal)
- Top 60%: 2-up photo mosaic (first 2 place photos from list items); if no photos → translucent white placeholder blocks
- Bottom: gradient overlay (`rgba(0,0,0,0.55)` to transparent) with list name (13px 700 white) + item count (10px white/65%)
- Tap → navigate to list detail view (`?list={id}`)

**NewListCollectionCard**:

- Same size, `border: 2px dashed var(--bone)`, `background: rgba(255,255,255,0.5)`
- Centered `+` icon in a circle + "Nouvelle liste" label
- Tap → open `CreateListModal`

**Empty state (no lists):** Single full-width dashed card saying "Crée ta première liste" with a + icon.

---

## Section 3 — Tous enregistrés

**Controls row:**

- Left: label `TOUS ENREGISTRÉS · {count}` (10px uppercase, `--ink-40`)
- Right: sort dropdown (Récent / A→Z / Note ↑ / Note ↓) + list/grid toggle icon button

**FavRestaurantCard** (replaces current `FavCardList` row, same file):

- `background: white`, `border-radius: 14px`, `padding: 12px`, `box-shadow: 0 1px 6px rgba(0,0,0,0.06)`
- Left: 52×52px thumbnail (`border-radius: 10px`); use first Foursquare photo if available, else a deterministic gradient from place `osm_id`
- Center: name (14px 700 `--ink`), cuisine + rating + distance (11px `--ink-60`)
- List badges row: pill for each list the restaurant belongs to (`background: var(--accent-light)`, `color: var(--accent)`, 9px 700)
- Right: chevron `›` in `--bone`
- Tap → open PlaceDetail

**Grid view** (toggle): 2-column grid, each card shows just the thumbnail + name + rating, no list badges.

**Sort logic:** Handled client-side on the existing `favorites` array:

- Récent → order by `saved_at DESC` (already in DB response)
- A→Z → `name.localeCompare`
- Note ↑ / Note ↓ → `score` field

**Empty state (no favorites):** Centered SVG bookmark icon + "Rien d'enregistré encore" + CTA "Explorer la carte" linking to `/`.

---

## Components

| Component               | File                                      | Action                             |
| ----------------------- | ----------------------------------------- | ---------------------------------- |
| `ListCollectionCard`    | `components/lists/ListCollectionCard.tsx` | New                                |
| `NewListCollectionCard` | inline in favorites page                  | New (small)                        |
| `FavRestaurantCard`     | inline in favorites page                  | Replace existing `FavCardList` row |
| Favorites page layout   | `app/(pages)/favorites/page.tsx`          | Rewrite visual structure           |

---

## Palette (gradient presets for lists)

6 options, chosen by `parseInt(list.id, 36) % 6`:

```ts
const GRADIENTS = [
  ['#1c3a28', '#4a8c5c'], // forest green
  ['#3a1c1c', '#8c4a4a'], // terracotta red
  ['#1c2a3a', '#4a5c8c'], // navy blue
  ['#3a2d1c', '#8c6c3a'], // warm amber
  ['#2d1c3a', '#6c4a8c'], // purple
  ['#1c3a3a', '#3a8c8c'], // teal
]
```

---

## What Does NOT Change

- `useLists`, `useRestaurants`, `useFavorites` hooks — no changes
- API routes — no changes
- DB schema — no changes
- List detail view (`?list=id`) — keep existing, only entry point changes (tap on ListCollectionCard)
- `CreateListModal` — keep existing
- Sort/filter logic — keep existing, just rewire to new controls UI
