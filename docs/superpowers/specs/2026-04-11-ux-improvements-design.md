# Forkmap — UX & Navigation Improvements

**Date:** 2026-04-11  
**Status:** Approved by user

---

## Overview

Full UX overhaul of Forkmap across 9 areas: navigation architecture, place cards, place detail, filters, search, feedback, account page, empty states, and mobile experience.

---

## 1. Navigation Architecture

### Desktop — Sidebar icon rail (52px)

- Fixed left sidebar replacing the top-right dropdown
- Items top-to-bottom: Logo mark · Carte (active) · Favoris · Compte · — · Paramètres · Avatar
- Active item: `background: var(--forest-pale)`, icon in `var(--forest-mid)`, label visible
- Inactive: icon only, label on hover tooltip
- Avatar at bottom opens a popover: Aide · À propos · Contact · Déconnexion
- Logo mark: 28px green square with "F", links to `/`

### Mobile — Bottom nav bar

- Fixed bottom bar: Carte · Favoris · Compte · Plus
- "Plus" opens a bottom sheet: Paramètres · Aide · À propos · Contact · Déconnexion
- Active tab: icon + label in `var(--forest-mid)`, indicator dot above icon
- Height: 56px, safe-area inset respected
- Breakpoint: `@media (max-width: 768px)`

### Implementation notes

- New component: `components/ui/NavRail.tsx` (desktop sidebar)
- New component: `components/ui/BottomNav.tsx` (mobile nav)
- Both rendered in `app/layout.tsx` wrapping all pages
- `app/page.tsx` loses its current header auth buttons
- `components/ui/AuthButton.tsx` refactored to avatar-only popover

---

## 2. Place Cards — `components/place/PlaceCard.tsx`

### Visited badge

- When `place.visitCount > 0`: green badge top-left "✓ Visité" (`background: var(--forest-pale)`, `color: var(--forest-mid)`)
- Data: `visitCount` already available via `useRestaurants` hook

### Walk time instead of raw distance

- Convert metres → minutes: `Math.round(metres / 80)` (avg 80m/min walking)
- Display: "5 min à pied" instead of "400 m"
- Under 1 min: "À côté"

### Skeleton loading

- While `isLoading`: render `PlaceCardSkeleton` — animated shimmer bars matching card layout
- Use `@keyframes shimmer` (pulse background-position from -200% to 200%)
- Replace the current solid gradient background placeholder

---

## 3. Place Detail — `components/place/PlaceDetail.tsx`

### Horizontal scrollable photo gallery

- Replace arrow navigation with `overflow-x: auto; scroll-snap-type: x mandatory`
- Each photo: `scroll-snap-align: start`
- Dot indicators below (max 5 dots + "N+" for overflow)
- No change to photo fetch logic

### Itinéraire button prominence

- Move route/direction button to a sticky bottom bar inside the detail panel
- Primary CTA style: full-width green button "Itinéraire →"
- Transport mode tabs (walk/bike/car) displayed above it

### Cuisine tags → clickable filters

- Each cuisine tag becomes a `<button>` that calls `onFilterByCuisine(cuisine)`
- Passes filter up to `useRestaurants` hook via a new `onCuisineFilter` prop

### Visit section

- Rename section to "Mes visites" with count badge
- Show most recent visit summary inline (date + rating stars)
- "Voir tout / Modifier" link opens full visit list

---

## 4. Quick Filter Chips — `app/page.tsx` + `components/filters/`

### Chip bar below search input

New row of pill chips (horizontal scroll on mobile):

- `Ouvert maintenant` — toggles `openNow: true` in FilterState
- `⭐ 4+` — sets `minRating: 4`
- `💶 €` / `💶 €€` — sets price filter
- Top 3 cuisine chips derived from current results (dynamic)

### Active state

- Selected chip: `background: var(--forest-mid)`, `color: white`
- Unselected: `background: var(--off-white)`, `border: 1px solid var(--ink-10)`

### Result count

- Live label "200 lieux" updates as filters change (already exists, just make it more visible)

---

## 5. Search Improvements — `app/page.tsx`

### Autocomplete suggestions

- While typing: filter `places` array client-side by name/cuisine
- Show dropdown of up to 5 matches below the input
- Click suggestion → select place + fly map to it
- No external API call needed — purely client-side filter

### Recent searches

- Store last 5 searches in `localStorage` key `forkmap_recent_searches`
- Show on input focus (before typing)
- Clear button per item

---

## 6. Feedback & Micro-interactions

### Favorite toast with Undo

- When adding favorite: toast "❤️ Ajouté aux favoris · Annuler"
- "Annuler" calls `removeFavorite` within 5s window
- Existing `useToast` hook extended with `action: { label, onClick }`

### Visit save animation

- On save success: button pulses green + checkmark for 700ms (already partially implemented)
- Map pin for that restaurant gains a small "✓" badge

### User-friendly error messages

- `lib/api-errors.ts`: map known error codes to French strings
  - `PGRST116` → "Aucun résultat trouvé"
  - `23505` → "Déjà enregistré"
  - Network error → "Problème de connexion. Réessayez."
- All API routes return structured `{ error: string, code?: string }`

---

## 7. Account Page — `app/(pages)/account/page.tsx`

### Tab structure

Three tabs replacing the current single scrolling page:

- **Statistiques** — existing charts (monthly, donut, bar)
- **Visites** — existing visit list (added in previous session) with sort + filter
- **Paramètres** — move settings content here OR keep as separate page (link)

### Key stats header

Above tabs: 3 stat pills — "X visites · Y€ moy. · 🏆 Restaurant fréquenté"

### Visit list improvements

- Sort dropdown: Date · Note · Montant
- Search/filter by restaurant name
- Infinite scroll replaced by pagination (20 per page)

---

## 8. Empty States & Onboarding

### Favorites page (empty)

- Large illustration area (SVG map pin with heart)
- Heading: "Aucun favori pour l'instant"
- Subtext: "Appuyez sur ♡ sur n'importe quel restaurant"
- CTA button: "Explorer la carte" → navigates to `/`

### Account — no visits yet

- Replace empty stats with: icon + "Vous n'avez pas encore logué de visite"
- CTA: "Comment ça marche ?" → mini-tooltip explaining the ✓ button

### First-time user tooltip

- `localStorage` key `forkmap_onboarded`
- If not set: after 2s, show a pulsing tooltip on the first PlaceCard's ✓ button
- "Appuyez ici pour logger une visite !" — dismiss on click

---

## 9. Mobile Experience

### BottomSheet for PlaceDetail

- On mobile (`< 768px`): PlaceDetail renders as a bottom sheet instead of side panel
- Default snap: 40% height (showing name + rating)
- Drag to 80% for full detail
- Existing `components/ui/BottomSheet.tsx` can be extended

### List collapse on map pan

- When user drags the map: sidebar list slides down/minimizes
- Tap map pin: list slides back up with that restaurant selected

### Tap targets

- All icon buttons: minimum `44×44px` touch target (padding if needed)
- Audit: heart, share, visit, close buttons in PlaceCard and PlaceDetail

### Swipe to dismiss modals

- VisitModal, NoteModal, ShareModal: swipe down closes the bottom sheet
- Add `touchstart`/`touchmove` handler — delta > 80px triggers `onClose`

---

## Implementation Waves

| Wave  | Features                                                       | Complexity            |
| ----- | -------------------------------------------------------------- | --------------------- |
| **1** | Navigation (sidebar + bottom nav)                              | High — touches layout |
| **2** | PlaceCard (badge, walk time, skeleton) + Quick filter chips    | Medium                |
| **3** | Feedback (toast undo, error messages) + Empty states           | Low                   |
| **4** | PlaceDetail redesign (photo scroll, sticky CTA, cuisine tags)  | Medium                |
| **5** | Account tabs + Visit list improvements                         | Medium                |
| **6** | Search autocomplete + Mobile (swipe, tap targets, BottomSheet) | High                  |

Total estimated files changed: ~15 components + layout.
