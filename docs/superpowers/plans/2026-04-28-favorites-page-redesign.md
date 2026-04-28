# Favorites Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the favorites page to feel rich and visual — portrait collection cards for lists, clean restaurant rows with thumbnails and list badges.

**Architecture:** Two focused changes: (1) redesign `ListCard` in its own component file to be a portrait collection card, (2) redesign the page layout, header, controls row, and restaurant cards in `app/(pages)/favorites/page.tsx`. All hooks, API routes, and modals stay untouched.

**Tech Stack:** Next.js 15 App Router, React inline styles (no Tailwind — matches existing pattern), CSS variables from `app/globals.css`.

---

## File Map

| File                             | Change                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| `components/lists/ListCard.tsx`  | Replace `ListCard` with portrait collection card; resize `NewListCard` |
| `app/(pages)/favorites/page.tsx` | Redesign header, `FavCardList`, `FavCardGrid`, controls row            |

---

### Task 1: Redesign `ListCard` → portrait collection card

**Files:**

- Modify: `components/lists/ListCard.tsx`

Context: The current `ListCard` has a 60px gradient bar on top and text below. We're replacing it with a portrait card (`aspect-ratio: 0.85`) where the gradient fills the whole card and text is overlaid at the bottom with a dark gradient veil. `NewListCard` gets the same aspect ratio for visual consistency.

- [ ] **Step 1: Read the current file**

Run: `cat components/lists/ListCard.tsx`
Expected: the current 106-line file.

- [ ] **Step 2: Replace the entire file**

Write `components/lists/ListCard.tsx` with this content:

```tsx
'use client'

import React from 'react'
import type { ListRow } from '@/lib/hooks/useLists'

const GRADIENTS: [string, string][] = [
  ['#1c3a28', '#4a8c5c'], // forest green
  ['#3a1c1c', '#8c4a4a'], // terracotta red
  ['#1c2a3a', '#4a5c8c'], // navy blue
  ['#3a2d1c', '#8c6c3a'], // warm amber
  ['#2d1c3a', '#6c4a8c'], // purple
  ['#1c3a3a', '#3a8c8c'], // teal
]

function gradientForId(id: string): [string, string] {
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

export function ListCard({ list, onClick }: { list: ListRow; onClick: () => void }) {
  const [from, to] = gradientForId(list.id)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir la liste ${list.name}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '0.85',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontFamily: 'var(--font-body)',
        flexShrink: 0,
      }}
    >
      {/* Bottom gradient veil */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Text overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 12px',
        }}
      >
        <p
          style={{
            margin: '0 0 2px',
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {list.name}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
          {list.item_count} restaurant{list.item_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

export function NewListCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Créer une nouvelle liste"
      style={{
        width: '100%',
        aspectRatio: '0.85',
        borderRadius: 16,
        border: `2px dashed ${hovered ? 'var(--accent)' : 'var(--bone)'}`,
        background: hovered ? 'var(--accent-light)' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 160ms',
        fontFamily: 'var(--font-body)',
        padding: 0,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: hovered ? 'rgba(45,122,85,0.15)' : 'var(--bone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 160ms',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hovered ? 'var(--accent)' : 'var(--text-3)'}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: hovered ? 'var(--accent)' : 'var(--text-3)',
          transition: 'color 160ms',
        }}
      >
        Nouvelle liste
      </span>
    </button>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: no errors related to `ListCard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/lists/ListCard.tsx
git commit -m "feat: redesign ListCard → portrait collection card avec dégradés de marque"
```

---

### Task 2: Redesign `FavCardList` → new `FavRestaurantCard`

**Files:**

- Modify: `app/(pages)/favorites/page.tsx` (lines 827–1080, the `FavCardList` component)

Context: Replace the current border-left card with a clean white card: 52×52 thumbnail (deterministic gradient from `osm_id`), name + meta row, list badges, and compact action buttons. The tap area opens the map (existing `onOpenMap` handler).

- [ ] **Step 1: Replace the `FavCardList` function**

In `app/(pages)/favorites/page.tsx`, find and replace the entire `FavCardList` function (lines 828–1080) with:

```tsx
// ── Fav card — liste ──────────────────────────────────────
const FAV_GRADIENTS: [string, string][] = [
  ['#1c3a28', '#4a8c5c'],
  ['#3a1c1c', '#8c4a4a'],
  ['#1c2a3a', '#4a5c8c'],
  ['#3a2d1c', '#8c6c3a'],
  ['#2d1c3a', '#6c4a8c'],
  ['#1c3a3a', '#3a8c8c'],
]
function thumbGradient(osmId: string): string {
  const idx = osmId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % FAV_GRADIENTS.length
  const [from, to] = FAV_GRADIENTS[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function FavCardList({
  fav,
  index,
  note,
  listNames,
  onRemove,
  onOpenMap,
  onShare,
  onNote,
}: {
  fav: FavoriteRow
  index: number
  note: string
  listNames: string[]
  onRemove: () => void
  onOpenMap: () => void
  onShare: () => void
  onNote: () => void
}) {
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const rating = fav.snapshot?.fsq?.rating
  const meta = [cuisine, rating != null ? `⭐ ${rating.toFixed(1)}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="anim-card-in"
      style={{
        background: 'var(--white)',
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${fav.name} sur la carte`}
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          background: thumbGradient(fav.osm_id),
          border: 'none',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      />

      {/* Content */}
      <button
        type="button"
        onClick={onOpenMap}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <p
          style={{
            margin: '0 0 2px',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fav.name}
        </p>
        {meta && <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--ink-60)' }}>{meta}</p>}
        {/* List badges */}
        {listNames.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {listNames.map((n) => (
              <span
                key={n}
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  letterSpacing: '0.03em',
                }}
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <ActionBtn
          icon={<IcoPen />}
          label="Note"
          active={!!note}
          activeColor="var(--accent)"
          activeBg="var(--accent-light)"
          onClick={onNote}
          small
        />
        <ActionBtn icon={<IcoShare />} label="Partager" onClick={onShare} small />
        <ActionBtn
          icon={<IcoTrash />}
          label="Retirer"
          hoverColor="var(--coral)"
          hoverBg="var(--coral-pale)"
          onClick={onRemove}
          small
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: errors at the `FavCardList` call sites (missing `listNames` prop) — these are fixed in Task 4. Ignore them for now.

- [ ] **Step 3: Commit (partial — callers fixed in Task 4)**

```bash
git add app/(pages)/favorites/page.tsx
git commit -m "feat: nouveau FavCardList — thumbnail + badges listes + actions compactes"
```

---

### Task 3: Redesign `FavCardGrid` and add `thumbGradient` dedup

**Files:**

- Modify: `app/(pages)/favorites/page.tsx` (lines 1082–1261, the `FavCardGrid` component)

Context: `FavCardGrid` becomes a simple 2-column portrait card with the thumbnail on top (larger), name and rating below. Remove note/share from grid view — only delete. `FAV_GRADIENTS` and `thumbGradient` were added in Task 2 so remove the old `GRADIENTS` map inside `FavCardGrid`.

- [ ] **Step 1: Replace the `FavCardGrid` function**

In `app/(pages)/favorites/page.tsx`, find and replace the entire `FavCardGrid` function (lines 1083–1261) with:

```tsx
// ── Fav card — grille ─────────────────────────────────────
function FavCardGrid({
  fav,
  index,
  onRemove,
  onOpenMap,
}: {
  fav: FavoriteRow
  index: number
  onRemove: () => void
  onOpenMap: () => void
}) {
  const rating = fav.snapshot?.fsq?.rating

  return (
    <div
      className="anim-card-in"
      style={{
        background: 'var(--white)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        animationDelay: `${index * 30}ms`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${fav.name} sur la carte`}
        style={{
          height: 90,
          background: thumbGradient(fav.osm_id),
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          position: 'relative',
          padding: 0,
        }}
      >
        {rating != null && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.18)',
              color: 'white',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            ⭐ {rating.toFixed(1)}
          </span>
        )}
      </button>
      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={onOpenMap}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
        </button>
        <ActionBtn
          icon={<IcoTrash />}
          label="Retirer"
          hoverColor="var(--coral)"
          hoverBg="var(--coral-pale)"
          onClick={onRemove}
          small
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: errors at the `FavCardGrid` call sites (extra props passed) — these are fixed in Task 4. Ignore them for now.

- [ ] **Step 3: Commit**

```bash
git add app/(pages)/favorites/page.tsx
git commit -m "feat: nouveau FavCardGrid — épuré, thumbnail + nom + rating"
```

---

### Task 4: Redesign page header, controls row, and fix callers

**Files:**

- Modify: `app/(pages)/favorites/page.tsx` (the `FavoritesPageInner` return JSX)

Context: This task (a) redesigns the page header to show "Enregistré" + subtitle, (b) replaces the sort pills + cuisine filter with a compact select dropdown, (c) adds `listNames` computation and passes it to `FavCardList`, (d) updates `FavCardGrid` call sites (remove `note`/`onShare`/`onNote` props), (e) updates the "Mes listes" label styling.

- [ ] **Step 1: Add `listNames` computation**

In `FavoritesPageInner`, after the `sorted` useMemo, add:

```tsx
// Map osm_id → list names for badge display
const osmIdToListNames = useMemo((): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  // lists don't store items inline — we only know item_count
  // list badges will be populated when listItems are loaded for a specific list
  // For main view: show no badges (we'd need all list items, which we don't load)
  return map
}, [])
```

Note: The API only loads list items when a specific list is open (`?list=id`). For the main feed we skip the badges rather than making N API calls. The badge slots will be empty arrays for now — that is correct per the data model.

- [ ] **Step 2: Replace the header block**

Find this block in the return JSX (around line 1513):

```tsx
{/* Titre */}
<div style={{ marginBottom: 24, animation: 'fadeUp 280ms var(--ease-out) both' }}>
  <Link
    href="/"
    ...
  >
    ← Carte
  </Link>
  <h1 ...>
    Lieux sauvegardés
  </h1>
  <p ...>
    {loading ? 'Chargement…' : `${sorted.length}...`}
  </p>
</div>
```

Replace it with:

```tsx
{
  /* Header */
}
;<div style={{ marginBottom: 24, animation: 'fadeUp 280ms var(--ease-out) both' }}>
  <h1
    style={{
      margin: '0 0 4px',
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      fontWeight: 400,
      letterSpacing: '-0.04em',
      lineHeight: 1.1,
      color: 'var(--ink)',
    }}
  >
    Enregistré
  </h1>
  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)' }}>
    {loading
      ? 'Chargement…'
      : `${favorites.length} restaurant${favorites.length !== 1 ? 's' : ''} · ${lists.length} liste${lists.length !== 1 ? 's' : ''}`}
  </p>
</div>
```

- [ ] **Step 3: Replace the controls bar**

Find the controls bar block (around line 1549):

```tsx
{/* Barre contrôles */}
{!loading && favorites.length > 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, ... }}>
    {/* Sort */}
    ...
    {/* Vue grille/liste */}
    ...
  </div>
)}
```

Replace it (and the cuisine filter block that follows) with:

```tsx
{
  /* Controls */
}
{
  !loading && !activeListId && (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        animation: 'fadeUp 280ms var(--ease-out) 40ms both',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--ink-40)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Tous enregistrés · {sorted.length}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            background: 'var(--white)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="date_desc">Récent</option>
          <option value="date_asc">Ancien</option>
          <option value="name">A→Z</option>
          <option value="rating">Note</option>
        </select>
        <div
          style={{
            display: 'flex',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: 'var(--surface)',
          }}
        >
          {(['list', 'grid'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: viewMode === m ? 'var(--ink)' : 'transparent',
                color: viewMode === m ? 'white' : 'var(--text-2)',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {m === 'list' ? <IcoList /> : <IcoGrid />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update the "Mes listes" section label**

Find (around line 1700):

```tsx
<p
  style={{
    margin: '0 0 12px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  }}
>
  Mes listes
</p>
```

Replace with:

```tsx
<p
  style={{
    margin: '0 0 10px',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--ink-40)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  }}
>
  Mes listes
</p>
```

- [ ] **Step 5: Fix `FavCardList` call sites — add `listNames` prop**

Find the `FavCardList` render in the `viewMode === 'list'` branch (around line 2087):

```tsx
<FavCardList
  key={fav.id}
  fav={fav}
  index={i}
  note={notes[fav.osm_id] ?? ''}
  onRemove={() => setToDelete(fav)}
  onOpenMap={() => router.push(`/?select=...`)}
  onShare={() => setShareTarget(fav)}
  onNote={() => setNoteTarget(fav)}
/>
```

Replace with:

```tsx
<FavCardList
  key={fav.id}
  fav={fav}
  index={i}
  note={notes[fav.osm_id] ?? ''}
  listNames={osmIdToListNames.get(fav.osm_id) ?? []}
  onRemove={() => setToDelete(fav)}
  onOpenMap={() =>
    router.push(`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`)
  }
  onShare={() => setShareTarget(fav)}
  onNote={() => setNoteTarget(fav)}
/>
```

- [ ] **Step 6: Fix `FavCardGrid` call sites — remove unused props**

Find the `FavCardGrid` render in the grid branch (around line 2112):

```tsx
<FavCardGrid
  key={fav.id}
  fav={fav}
  index={i}
  note={notes[fav.osm_id] ?? ''}
  onRemove={() => setToDelete(fav)}
  onOpenMap={() => router.push(`/?select=...`)}
  onShare={() => setShareTarget(fav)}
  onNote={() => setNoteTarget(fav)}
/>
```

Replace with:

```tsx
<FavCardGrid
  key={fav.id}
  fav={fav}
  index={i}
  onRemove={() => setToDelete(fav)}
  onOpenMap={() =>
    router.push(`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`)
  }
/>
```

- [ ] **Step 7: Remove `headerActions` variable and its prop**

Find and delete these lines (around line 1466):

```tsx
const headerActions = (
  <span ...>
    <IcoHeart filled />
    {favorites.length} lieu{...}
  </span>
)
```

And update `PageHeader` to remove the `actions` prop:

```tsx
<PageHeader current="Enregistrés" />
```

- [ ] **Step 8: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/(pages)/favorites/page.tsx
git commit -m "feat: redesign page Enregistré — header, contrôles, grille listes"
```

---

### Task 5: Visual QA and cleanup

**Files:**

- Modify: `app/(pages)/favorites/page.tsx` (minor style tweaks based on visual check)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Navigate to `http://localhost:3000` → log in → go to `/favorites`

- [ ] **Step 2: Check list cards**

Verify:

- Lists show as portrait cards with gradient background and white text overlay
- "Nouvelle liste" card has same height as list cards
- Tapping a list card navigates to `?list=id`

- [ ] **Step 3: Check restaurant rows**

Verify:

- Each restaurant row has a 52×52 gradient thumbnail on the left
- Name + cuisine/rating line below
- Three compact icon buttons (note, share, delete) on the right in a column
- No list badges visible (expected — we'd need to load all list items to compute them)

- [ ] **Step 4: Check controls**

Verify:

- "TOUS ENREGISTRÉS · N" label left-aligned
- Sort `<select>` and list/grid toggle right-aligned
- Sort changes the order of cards
- Grid toggle shows 2-column grid

- [ ] **Step 5: Check empty state**

Remove all favorites in DB or verify the existing empty state SVG + "Explorer la carte" CTA still renders correctly.

- [ ] **Step 6: Check mobile**

Resize browser to 375px width. Verify:

- List cards are properly sized in 2-column grid
- Restaurant rows don't overflow
- Controls row doesn't wrap awkwardly

- [ ] **Step 7: Final commit (only if tweaks were needed)**

```bash
git add app/(pages)/favorites/page.tsx
git commit -m "fix: ajustements visuels page Enregistré après QA"
```

- [ ] **Step 8: Push**

```bash
git push origin master
```
