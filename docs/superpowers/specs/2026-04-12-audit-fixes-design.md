---
title: Audit Fixes — ESLint Warnings + Security Vulnerabilities
date: 2026-04-12
status: approved
---

# Audit Fixes Design

Fix all issues reported in the latest audit (`8250e29`): 33 ESLint warnings across 8 files and 6 moderate security vulnerabilities in dev dependencies.

## Approach

Option C — parallel agents per file. Each agent owns its files exclusively to avoid merge conflicts. No structural changes, no refactoring beyond the reported issues.

## Agent Assignments

### Agent 1 — `app/(pages)/account/page.tsx`

- Remove unused `eslint-disable` directive (line 245)
- Replace `<img>` with `<Image />` from `next/image` (line 304)
  - Check image source: if external URL, verify domain is in `next.config.ts` `images.remotePatterns`
  - Add `width`, `height` or `fill` prop as appropriate

### Agent 2 — `app/(pages)/favorites/page.tsx`

- Remove unused import `IcoArrow` (line 32)
- Remove unused variable `auth` (line 325)
- Replace `any` type with explicit type (line 348) — read context to determine correct type

### Agent 3 — `app/(pages)/settings/page.tsx`

- Remove unused import `IcoCamera` (line 10)
- Remove unused variable `currentPw` (line 34)
- Replace `<img>` with `<Image />` from `next/image` (line 157)
  - Same domain/sizing check as Agent 1

### Agent 4 — `app/page.tsx`

- Remove unused import `IcoBookmark` (line 51)
- Remove unused variable `clearRouteCache` (line 142)

### Agent 5 — `components/map/MapView.tsx`

- Fix ref cleanup pattern: capture `markersRef.current` in a local variable inside the effect, use that variable in the cleanup function (line 255)
- Remove now-unnecessary `eslint-disable` directive (line 268)

### Agent 6 — `components/place/` (NoteModal + PlaceCard + PlaceDetail)

- `NoteModal.tsx:3` — remove unused `useEffect` import
- `PlaceCard.tsx:82` — rename arg `index` → `_index` to satisfy unused-args rule
- `PlaceCard.tsx:193` — replace `<img>` with `<Image />` from `next/image`
- `PlaceDetail.tsx:53` — remove unused import `IcoChevLeft`

### Agent 7 — Security (dev dependencies)

- Run `npm audit fix --force` to upgrade `vitest` → v4
- Review `vitest.config.ts` for any breaking API changes in v4
- Run `npm run type-check` and `npm run lint` to confirm no regressions

## Constraints

- **No changes outside reported issues** — don't fix surrounding code, don't add comments
- **`<Image />` sizing**: use `fill` + `object-cover` if the img is in a sized container; use explicit `width`/`height` if dimensions are known
- **`any` fix**: use the narrowest correct type from existing types in `types/index.ts`
- **Security fix is a breaking change** — vitest v4 API may differ; verify config after upgrade

## Verification

After all agents complete:

- `npm run lint` → 0 warnings remaining for the fixed files
- `npm run type-check` → no errors
- `npm audit` → 0 vulnerabilities (or only unrelated ones)
