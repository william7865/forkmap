# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint via Next.js
npm run type-check   # TypeScript type check (tsc --noEmit)
```

No test suite is configured — `npm test` is not available.

## Environment Setup

Create a `.env.local` file (gitignored — never commit secrets) and populate:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key       # needed for client-side auth
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # needed for server-side DB ops
FOURSQUARE_API_KEY=fsq3xxxxx                      # optional — graceful degradation without it
```

Run `sql/schema.sql` in the Supabase SQL editor to create the `favorites` and `osm_fsq_mapping` tables.

## Architecture

**Stack:** Next.js 15 (App Router) · TypeScript strict · Tailwind CSS · Leaflet · Supabase · Zod

### Data Flow

Map movement → debounce (500ms) → `useRestaurants` hook → three sequential enrichment layers:

1. **`GET /api/osm/overpass`** — Fetches raw POIs via Overpass API. Cached 10 min per bbox.
2. **`POST /api/places/enrich-osm`** — Extracts deep OSM tags (hours, amenities, social links). Free, fast.
3. **`POST /api/places/enrich`** — Foursquare enrichment (ratings, photos, price). Requires `FOURSQUARE_API_KEY`. Cached 1h per place. Skipped gracefully if key absent.

After each batch, places are re-scored via `lib/scoring.ts` (composite score = 40% rating + 30% distance + 20% popularity + 10% verified) and pushed to state, so the UI progressively improves.

### Key Files

| File                          | Role                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `app/page.tsx`                | Main page — wires all hooks, renders sidebar + map + overlays                   |
| `components/map/MapView.tsx`  | Leaflet map, **always dynamically imported** (`ssr: false`) to avoid SSR issues |
| `lib/hooks/useRestaurants.ts` | Central state — fetches, enriches, filters, handles favorites                   |
| `lib/hooks/useAuth.ts`        | Supabase browser client singleton + auth state                                  |
| `lib/api-auth.ts`             | Server-side auth: reads `Authorization: Bearer <token>` header                  |
| `lib/scoring.ts`              | Haversine distance, composite score, `applyFilters`                             |
| `lib/cache.ts`                | In-memory `cacheAside` — replace with Upstash Redis for multi-instance          |
| `types/index.ts`              | All shared types: `PlaceBase → PlaceCard`, `FilterState`, `FavoriteRow`         |

### Authentication Pattern

- **No middleware auth** — Supabase v2 chunked cookies are fragile to parse in middleware. Auth protection is client-side via `useAuthGuard` in each protected page.
- **API routes** use `requireUser(req)` from `lib/api-auth.ts`, which reads `Authorization: Bearer <token>`.
- **Client fetches** to protected endpoints must include the bearer token via `getAuthHeaders()` (defined in `useRestaurants.ts`).

### Type Hierarchy

```
PlaceBase (raw OSM)
  └─ PlaceCard (enriched — adds fsq?, osm_enriched?, wikidata?, distance?, score?, is_favorite?)
       └─ FavoriteRow (DB snapshot — stores full PlaceCard as JSONB)
```

### Leaflet / SSR

`MapView` must always be loaded with `dynamic(() => import(...), { ssr: false })`. `next.config.ts` also sets `fs: false` in webpack fallback for this reason.

### i18n

Translations live in `lib/i18n/translations.ts`. The `useLanguage` hook (Context) drives all UI strings — do not hardcode display text in components.
