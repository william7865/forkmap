# 🍽 Forkmap

> Carte interactive de restaurants, propulsée par **OpenStreetMap + Overpass API** (gratuit), enrichie par **Wikidata** (étoiles Michelin, distinctions) et, en option, **Foursquare** (notes, photos, prix). Web + apps iOS/Android via Capacitor.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Leaflet](https://img.shields.io/badge/Leaflet-1.9-3fb543) ![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff)

> Interface **100 % française**. Détails d'architecture pour les contributeurs : voir [`CLAUDE.md`](./CLAUDE.md).

---

## ✨ Fonctionnalités

| Fonctionnalité                                              | Statut       |
| ----------------------------------------------------------- | ------------ |
| Carte Leaflet interactive (tuiles OSM) + clustering         | ✅           |
| Overpass API — POI gratuits, bascule multi-endpoints        | ✅           |
| Enrichissement OSM détaillé (horaires, équipements, régime) | ✅           |
| Enrichissement Wikidata/Wikipédia (Michelin, distinctions)  | ✅           |
| Enrichissement Foursquare (note, prix, photos)              | ✅ optionnel |
| Filtres : note, avis, prix, cuisine, distance, ouvert       | ✅           |
| Score composite + tri                                       | ✅           |
| Sync liste ↔ carte (survol/sélection)                       | ✅           |
| Auth Supabase (email/mot de passe + Google OAuth)           | ✅           |
| Favoris (Postgres/Supabase, RLS)                            | ✅           |
| Listes personnalisées                                       | ✅           |
| Journal de visites (dépenses, note, humeur)                 | ✅           |
| Itinéraires OSRM (à pied / vélo / voiture)                  | ✅           |
| Apps iOS/Android (Capacitor) + notifications push           | ✅           |
| Cache mémoire (Overpass 10 min, FSQ 1 h) + rate limiting    | ✅           |
| API typée avec validation Zod                               | ✅           |

---

## 🚀 Démarrage rapide

### 1. Cloner & installer

```bash
git clone <repo-url> forkmap
cd forkmap
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# puis renseigner les valeurs (voir CLAUDE.md → « Configuration de l'environnement »)
```

### 3. Base de données (Supabase)

Exécuter, **dans l'ordre**, dans l'éditeur SQL Supabase :

1. `sql/schema.sql` — `favorites`, `osm_fsq_mapping`, `visits`
2. `sql/lists.sql` — `lists`, `list_items`
3. `sql/push_tokens.sql` — `push_tokens`
4. `sql/profiles.sql` — `profiles` (RLS)
5. `sql/avatars-storage.sql` — `avatars` Storage bucket + policies

Pour Google OAuth : activer le provider Google dans Supabase Auth (redirection `/auth/callback`).

### 4. Lancer en local

```bash
npm run dev          # http://localhost:3000
```

### 5. Déployer

```bash
npx vercel           # ajouter les variables d'env dans le dashboard Vercel
```

### 6. Builds mobiles (Capacitor)

```bash
npm run build:mobile # export statique → ./out
npx cap sync         # synchronise ios/ et android/
```

---

## 🏗 Architecture

```
forkmap/
├── app/
│   ├── page.tsx                    # Carte principale (vue ; logique dans useHomeState)
│   ├── layout.tsx · globals.css · error.tsx
│   ├── auth/callback/              # Retour OAuth
│   ├── (pages)/                    # favorites, account, settings, about, help, contact, legal…
│   └── api/                        # overpass, places/enrich(-osm), favorites, lists, visits, push-tokens, account, contact
│
├── components/                     # map, place, filters, lists, ui, states, native…
│
├── lib/
│   ├── overpass.ts · foursquare.ts · osm-enrichment.ts · wikidata.ts · opening-hours.ts
│   ├── scoring.ts · cache.ts · rate-limit.ts · api.ts · api-auth.ts · api-errors.ts · db.ts
│   ├── hooks/                      # useHomeState, useRestaurants, useAuth, useLists, useRouteCache…
│   ├── i18n/                       # translations.ts + useLanguage (verrouillé sur « fr »)
│   └── native/                     # wrappers Capacitor web-safe (geolocation, haptics, push)
│
├── types/index.ts                  # Types partagés (PlaceBase → PlaceCard → FavoriteRow)
├── sql/                            # schema.sql · lists.sql · push_tokens.sql · migrations/
├── ios/ · android/                 # coques natives Capacitor
└── capacitor.config.ts · next.config.ts · vitest.config.ts
```

Pour le détail du flux de données, des patterns d'auth et des conventions : **voir [`CLAUDE.md`](./CLAUDE.md)**.

---

## ⚙️ Flux de données

```
Déplacement carte
    │  (debounce + garde-fous : fetchCount + AbortController)
    ▼
GET /api/osm/overpass?bbox=…           → PlaceBase[]   (cache 10 min, 30 req/min)
    ▼
POST /api/places/enrich-osm            → tags OSM détaillés + Wikidata (gratuit)
    ▼
POST /api/places/enrich                → Foursquare (note/prix/photos, optionnel)
    ▼
score composite + filtres/tri (lib/scoring.ts)
    ▼
Marqueurs Leaflet + liste synchronisée (amélioration progressive après chaque lot)
```

---

## 🎯 Algorithme de score

Score composite (0–1), tri par défaut :

```
score = note × 0.4 + popularité × 0.2 + distance × 0.3 + vérifié × 0.1
        + bonus (ouvert, Michelin, photo, adresse, site web)
```

- `note` = note FSQ / 10 (défaut 0.5 si inconnue)
- `popularité` = min(nb_avis / 500, 1)
- `distance` = max(0, 1 − distance_m / 2000)
- Les données manquantes retombent sur des valeurs neutres ; les filtres sont inclusifs envers l'inconnu.

---

## 🔐 Authentification

- **Supabase Auth** : email/mot de passe + Google OAuth (`lib/hooks/useAuth.ts`).
- Pas d'auth dans le middleware (no-op volontaire) ; protection des pages côté client via `useAuthGuard`.
- Routes API : `requireUser(req)` lit `Authorization: Bearer <token>` ; écritures via le client service-role (`lib/db.ts`), autorisation par `userId` + RLS.

---

## 🚦 Rate limits & cache

| Source               | Limite                        | Cache                      |
| -------------------- | ----------------------------- | -------------------------- |
| Overpass API         | 30 req/min/IP                 | 10 min par bbox            |
| Foursquare (gratuit) | 20 req/min/IP · 1000 req/jour | 1 h par lieu               |
| Routage OSRM         | —                             | 15 min par trajet (client) |
| Tuiles OSM           | usage raisonnable             | cache navigateur           |

Le cache est en mémoire (mono-instance). Pour le multi-région, remplacer `lib/cache.ts` par Upstash Redis (l'interface reste identique).

---

## 🧪 Qualité

```bash
npm run lint && npm run type-check && npm run test:run
```

CI (`.github/workflows/ci.yml`) : lint · type-check · build à chaque push/PR sur `master`.

---

_Construit avec ❤️ sur des APIs ouvertes. Données © OpenStreetMap contributors (ODbL)._
