# 🍽 RestaurantFinder

> Interactive restaurant map powered by **OpenStreetMap + Overpass API** (free) with optional **Foursquare** enrichment (1000 req/day free).

![Stack](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Leaflet](https://img.shields.io/badge/Leaflet-1.9-3fb543)

---

## ✨ Features

| Feature | Status |
|---|---|
| Interactive Leaflet map (OSM tiles) | ✅ |
| Overpass API — free POI data | ✅ |
| Foursquare enrichment (rating, price, photos) | ✅ optional |
| Filters: rating, price, cuisine, distance, open now | ✅ |
| Composite scoring algorithm | ✅ |
| Marker clustering | ✅ |
| List ↔ map sync (hover/select) | ✅ |
| Place detail panel with photos | ✅ |
| Favorites with PostgreSQL (Supabase) | ✅ |
| In-memory cache (10min Overpass, 1h FSQ) | ✅ |
| Type-safe API with Zod validation | ✅ |
| Debounced map events (500ms) | ✅ |

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/your-org/restaurant-finder
cd restaurant-finder
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase (required for favorites)
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Foursquare (optional — enriches OSM data with ratings/photos)
# Free tier: 1000 req/day → https://developer.foursquare.com
FOURSQUARE_API_KEY=fsq3xxxxx
```

### 3. Database setup (Supabase)
```bash
# Copy sql/schema.sql content into your Supabase SQL editor and run it
```

### 4. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel
```bash
npx vercel
# Add env vars in Vercel dashboard
```

---

## 🏗 Architecture

```
restaurant-finder/
├── app/
│   ├── page.tsx                    # Main map page
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   ├── osm/overpass/route.ts   # GET  /api/osm/overpass?bbox=...
│   │   ├── places/enrich/route.ts  # POST /api/places/enrich
│   │   └── favorites/
│   │       ├── route.ts            # GET, POST /api/favorites
│   │       └── [osmId]/route.ts    # DELETE /api/favorites/:osmId
│   └── (pages)/favorites/page.tsx  # Saved favorites page
│
├── components/
│   ├── map/MapView.tsx             # Leaflet map (dynamic import, no SSR)
│   ├── filters/FiltersPanel.tsx    # Filter controls
│   └── place/
│       ├── PlaceList.tsx           # Scrollable list
│       ├── PlaceCard.tsx           # List item
│       └── PlaceDetail.tsx         # Slide-in detail panel
│
├── lib/
│   ├── overpass.ts                 # Overpass QL builder + normalizer
│   ├── foursquare.ts               # FSQ API client + fuzzy matcher
│   ├── scoring.ts                  # Haversine + composite score + filters
│   ├── cache.ts                    # In-memory cache (cacheAside pattern)
│   ├── db.ts                       # Supabase client + helpers
│   └── hooks/
│       └── useRestaurants.ts       # Main data orchestration hook
│
├── types/index.ts                  # All shared TypeScript types
├── sql/schema.sql                  # Supabase tables + RLS
└── .env.example
```

---

## 🔌 API Reference

### `GET /api/osm/overpass`

Fetch restaurants from Overpass API within a bounding box.

**Query params:**
| Param | Type | Required | Example |
|---|---|---|---|
| `bbox` | string | ✅ | `2.30,48.84,2.40,48.87` |
| `types` | string | ❌ | `restaurant,cafe,bar` |

**Example request:**
```bash
curl "http://localhost:3000/api/osm/overpass?bbox=2.30,48.84,2.40,48.87&types=restaurant,cafe"
```

**Response:**
```json
{
  "data": [
    {
      "osm_id": "node/123456789",
      "osm_type": "node",
      "name": "Le Procope",
      "lat": 48.8527,
      "lon": 2.3398,
      "cuisine": "French",
      "address": "13 Rue de l'Ancienne Comédie, 75006 Paris",
      "tags": { "amenity": "restaurant", "cuisine": "french", ... }
    }
  ],
  "count": 47,
  "cached": false,
  "bbox_key": "overpass:2.3,48.84,2.4,48.87:restaurant"
}
```

**Caching:** 10 minutes per bbox (rounded to 3 decimal places ≈ 111m)  
**Rate limit:** Overpass has a fair-use policy, the 500ms debounce prevents abuse.

---

### `POST /api/places/enrich`

Enrich OSM places with Foursquare data (ratings, photos, price, hours).

**Body:**
```json
{
  "places": [
    {
      "osm_id": "node/123456789",
      "osm_type": "node",
      "name": "Le Procope",
      "lat": 48.8527,
      "lon": 2.3398,
      "tags": {}
    }
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "osm_id": "node/123456789",
      "name": "Le Procope",
      "lat": 48.8527,
      "lon": 2.3398,
      "fsq": {
        "fsq_id": "4adcda28f964a5205b1e21e3",
        "rating": 8.2,
        "price": 3,
        "total_ratings": 412,
        "categories": [{ "id": 13065, "name": "French Restaurant" }],
        "photos": [{ "prefix": "https://fastly.4sqi.net/img/general/", "suffix": "/123.jpg", ... }],
        "hours": { "open_now": true, "display": "Mon-Fri 12:00-23:00" },
        "website": "https://www.procope.com"
      }
    }
  ],
  "enriched_count": 1,
  "cached_count": 0
}
```

**Matching algorithm:**
1. Search FSQ within 100m radius + place name
2. Fuzzy name match (Levenshtein similarity ≥ 0.6)
3. Cache result for 1 hour per place

**Without `FOURSQUARE_API_KEY`:** Returns places as-is (graceful degradation).

---

### `GET /api/favorites`
Returns all saved favorites for the current user.

### `POST /api/favorites`
Save a restaurant. Body: `{ place: PlaceCard }`.

### `DELETE /api/favorites/:osmId`
Remove a favorite by OSM ID (URL-encoded).

---

## ⚙️ Data Flow

```
User moves map
    │
    ▼ (debounce 500ms)
GET /api/osm/overpass?bbox=...
    │
    ▼ (check cache → Overpass QL → normalize)
PlaceBase[]
    │
    ▼ (batches of 20)
POST /api/places/enrich
    │
    ▼ (FSQ search → fuzzy match → detail fetch → cache)
PlaceCard[]
    │
    ▼ (haversine distance + composite score)
Annotated PlaceCard[]
    │
    ▼ (client-side filter + sort)
Filtered PlaceCard[]
    │
    ├──▶ Leaflet markers (amber=default, red=selected, purple=favorite)
    └──▶ Scrollable list (synchronized)
```

---

## 🎯 Scoring Algorithm

The composite score (0–1) is used as the default sort:

```
score = rating_score × 0.4
      + popularity_score × 0.2
      + distance_score × 0.3
      + verified_bonus × 0.1
```

Where:
- `rating_score` = FSQ rating / 10 (fallback 0.5 if unknown)
- `popularity_score` = min(total_ratings / 500, 1)
- `distance_score` = max(0, 1 - distance_m / 2000)
- `verified_bonus` = 1 if FSQ verified, 0 otherwise

---

## 🗄 Database Schema

```sql
-- Favorites table
CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT NOT NULL,
  osm_id     TEXT NOT NULL,
  name       TEXT NOT NULL,
  lat        DOUBLE PRECISION,
  lon        DOUBLE PRECISION,
  fsq_id     TEXT,
  snapshot   JSONB,       -- Full PlaceCard for offline display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, osm_id)
);

-- Match cache (avoids re-matching same OSM place)
CREATE TABLE osm_fsq_mapping (
  osm_id     TEXT PRIMARY KEY,
  fsq_id     TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  matched_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Authentication

The current implementation uses a hardcoded `demo-user` ID. For production:

1. Integrate **Supabase Auth** or **Clerk**
2. Extract `userId` from session in route handlers
3. Enable Row Level Security (RLS) policies in Supabase

---

## 🚦 Rate Limits & Caching

| Source | Limit | Our Cache |
|---|---|---|
| Overpass API | Fair use (~1 req/sec) | 10 min per bbox |
| Foursquare (free) | 1000 req/day | 1h per FSQ ID |
| Map tiles (OSM) | Reasonable use | Browser-cached |

The 500ms debounce on map movement prevents excessive Overpass calls during panning.

---

## 📦 Production Upgrades

### Redis caching (Upstash)
```bash
npm install @upstash/redis
```
Replace `cacheGet`/`cacheSet` in `lib/cache.ts` with Upstash client. The `cacheAside` interface stays identical.

### Cluster support
`leaflet.markercluster` is already integrated. The cluster radius is set to 50px.

### Multi-user auth
Swap `DEMO_USER_ID` constant with `auth().userId` from your auth provider.

---

## 🤝 Contributing

PRs welcome! The codebase is intentionally modular — each lib file has a single responsibility.

---

*Built with ❤️ using free and open APIs. No paid services required for basic functionality.*
