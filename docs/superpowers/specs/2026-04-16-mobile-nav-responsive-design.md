# Mobile Navigation & Responsive Design

**Date:** 2026-04-16  
**Status:** Approved

## Problem

On the Capacitor iOS app, the native Xcode tab bar navigates to `/favorites` and `/account` via full-page reloads. Each reload restarts the JS module, Supabase must restore the session from localStorage, and if there is any delay `useAuthGuard` redirects back to `/` before the user is recognized — even though the user is logged in.

Additionally, the main page header is designed for desktop and is completely unusable on mobile (too many elements crammed into 56px).

## Solution Overview

Add a web-based bottom navigation bar using Next.js `Link` (SPA navigation — no page reload, session stays in memory). Simplify the mobile header. Fix responsive layouts on all secondary pages.

---

## Section 1 — MobileNav Component

**File:** `components/ui/MobileNav.tsx`

A fixed bottom bar rendered on all pages on mobile screens only (`useIsMobile()`).

### Tabs

| Tab | Icon | Route | Auth required |
|-----|------|-------|---------------|
| Carte | map-pin | `/` | No |
| Favoris | bookmark | `/favorites` | Yes |
| Compte | user | `/account` | Yes |

### Behavior

- Navigation via `<Link href={...}>` — SPA, no reload, session preserved in memory
- Active tab detected via `usePathname()` — highlighted with forest-mid color + small dot indicator
- Height: 60px + iOS safe area inset (`env(safe-area-inset-bottom)`)
- If user is not authenticated and taps Favoris or Compte: does NOT navigate — triggers AuthModal callback instead
- Visible only when `useIsMobile()` returns true
- `z-index: 1000` (above map, below modals)

### Integration

- Added to `app/layout.tsx` as a client wrapper so it appears on all pages
- Pages with bottom nav get `padding-bottom: calc(60px + env(safe-area-inset-bottom))` to avoid content hiding behind the bar

---

## Section 2 — Mobile Header Simplification

**File:** `app/page.tsx` (main page header)

### Desktop (≥768px) — unchanged

Current behavior preserved exactly.

### Mobile (<768px)

Header is simplified to two elements only:

| Element | Position |
|---------|----------|
| Logo (icon + wordmark) | Left |
| AuthButton (compact avatar or Sign in) | Right |

**Removed from mobile header:**
- Search input (moved into BottomSheet)
- Filters button (moved into BottomSheet)
- Favorites link (replaced by bottom nav tab)
- LanguagePicker (moved into Account page or removed for now)
- Loading indicator (too subtle to matter on mobile)

The BottomSheet already renders inside the mobile layout and contains PlaceList + StartPanel — search and filters controls should be accessible from within the sheet.

**File:** `components/ui/PageLayout.tsx` (PageHeader for secondary pages)

### Mobile PageHeader

- Wordmark text hidden on mobile, show logo icon only
- "Carte" back-link kept (important for navigation)
- Current page pill kept but font-size reduced
- Actions slot kept but may wrap

---

## Section 3 — Responsive Fixes

### 3a — Favorites Page (`app/(pages)/favorites/page.tsx`)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Controls bar (sort + view toggle) | `flex-wrap: wrap` | Horizontal scroll (`overflow-x: auto`) |
| Cuisine filter chips | `flex-wrap: wrap` | Horizontal scroll |
| Grid view | `auto-fill minmax(200px, 1fr)` | Single column (1fr) |
| Card list padding | 16px sides | 12px sides |

### 3b — Account Page (`app/(pages)/account/page.tsx`)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Stats row (4 cols) | `repeat(4, 1fr)` | `repeat(2, 1fr)` (2×2) |
| Cuisine + Mood cards | `1fr 1fr` | `1fr` (stacked) |
| BarChart label width | 88px | 64px |
| Container padding | `32px 20px` | `16px 16px` |

### 3c — PageLayout GlobalFooter (`components/ui/PageLayout.tsx`)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Footer grid | `"1fr repeat(3, auto)"` | Single column, stacked |
| Bottom bar | `space-between` | Stacked vertically |

---

## Files Changed

| File | Change |
|------|--------|
| `components/ui/MobileNav.tsx` | **New** — bottom nav component |
| `app/layout.tsx` | Add MobileNav + body padding-bottom |
| `app/page.tsx` | Mobile-only header simplification |
| `app/(pages)/favorites/page.tsx` | Responsive controls + grid |
| `app/(pages)/account/page.tsx` | Responsive grids + padding |
| `components/ui/PageLayout.tsx` | Mobile PageHeader + GlobalFooter |

## Out of Scope

- Changing the Xcode native tab bar configuration
- LanguagePicker placement (keep in header desktop only for now)
- Any backend / API changes
