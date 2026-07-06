# CLAUDE.md

Ce fichier guide Claude Code (claude.ai/code) lorsqu'il travaille sur ce dépôt.

## Présentation du projet

**Forkmap** est une application web (et iOS/Android via Capacitor) de découverte de restaurants. L'utilisateur déplace une carte Leaflet interactive ; l'app récupère les restaurants réels depuis OpenStreetMap, les enrichit progressivement (tags OSM détaillés → Wikidata → Foursquare), les note et les trie, puis permet aux utilisateurs connectés d'enregistrer des favoris, de les organiser en listes et de consigner leurs visites (dépenses, note, commentaires).

- **Nom du package :** `restaurant-finder` (hérité) — le produit/la marque est **Forkmap** (`appId : com.forkmap.app`).
- **Langue :** l'interface est **uniquement en français** (voir [i18n](#i18n)). URL de production : `https://forkmap.vercel.app`.
- **Hébergement :** Vercel (région `cdg1` / Paris), routes API serverless plafonnées à 30 s (`vercel.json`).

## Commandes

```bash
npm run dev          # Serveur de dev sur http://localhost:3000
npm run build        # Build de production (cible Vercel)
npm run build:mobile # Export statique pour Capacitor (NEXT_EXPORT=true → ./out)
npm run start        # Sert le build de production
npm run lint         # ESLint via la config flat de Next.js
npm run type-check   # TypeScript (tsc --noEmit)
npm run format       # Prettier (écriture)
npm run format:check # Prettier (vérification — utilisé en CI)
npm run test         # Vitest (mode watch)
npm run test:run     # Vitest (exécution unique — à utiliser en CI/agents)
npm run test:coverage# Vitest avec couverture v8 (lib/** uniquement)
```

Les tests sont dans `tests/` (Vitest + jsdom + Testing Library). Couverts actuellement : `lib/scoring.ts`, `lib/api-errors.ts`. Fichier de setup : `tests/setup.ts`. En ajoutant de la logique dans `lib/`, ajoute un `tests/<nom>.test.ts` correspondant.

**Hooks Git :** Husky lance `lint-staged` au pre-commit (`eslint --fix` + `prettier` sur les `.ts/.tsx` indexés, `prettier` sur les `.json/.md/.css`). Définir `HUSKY=0` pour contourner (la CI le fait pendant l'installation).

## Configuration de l'environnement

Créer `.env.local` (ignoré par git — ne jamais committer de secrets) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key       # auth côté client + vérification du token côté serveur
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # opérations BDD côté serveur (contourne la RLS)
FOURSQUARE_API_KEY=fsq3xxxxx                       # optionnel — dégradation gracieuse sans la clé
# --- Enrichissement Google (note/photos/horaires) via lib/google.ts — providers interchangeables ---
PLACES_PROVIDER=                                   # optionnel — force le provider : scrape | serpapi | google. Défaut : scrape (DIY, gratuit, sans clé)
PLACES_SCRAPE=                                     # optionnel — mettre "off" pour désactiver le scraper DIY
SERPAPI_KEY=                                       # optionnel — provider serpapi (moteur google_maps, palier gratuit ~100/mois)
GOOGLE_PLACES_API_KEY=AIzaxxxxx                    # optionnel — provider google (API Places New, nécessite facturation)
RESEND_API_KEY=re_xxxxx                            # optionnel — sans elle, le formulaire de contact n'envoie pas d'email
CONTACT_EMAIL_TO=hello@forkmap.app                 # optionnel — destinataire du formulaire de contact (défaut : hello@forkmap.app)
NEXT_PUBLIC_API_URL=https://forkmap.vercel.app     # UNIQUEMENT pour les builds mobiles — pointe l'app statique vers l'API. Laisser vide sur Vercel (appels relatifs).
```

Exécuter les fichiers SQL dans l'éditeur SQL de Supabase **dans cet ordre** :

1. `sql/schema.sql` — tables `favorites`, `osm_fsq_mapping`, `visits` + RLS.
2. `sql/lists.sql` — tables `lists`, `list_items` + RLS.
3. `sql/push_tokens.sql` — table `push_tokens` + RLS (push mobile).
4. `sql/profiles.sql` — table `profiles` + RLS (profils publics).
5. `sql/avatars-storage.sql` — bucket Storage `avatars` + politiques d'accès.
6. `sql/notes.sql` — table `notes` + RLS (notes perso synchronisées, ex-localStorage).
7. `sql/polls.sql` — tables `polls`, `poll_options`, `poll_votes` + RLS (sondages de groupe ; vote anonyme par lien via routes service-role).

Pour l'OAuth Google, activer le provider Google dans Supabase Auth et ajouter la redirection vers `/auth/callback`.

## Architecture

**Stack :** Next.js 15 (App Router) · React 18 · TypeScript strict · Tailwind CSS 3 · Leaflet + markercluster · Supabase (auth + Postgres) · Zod · Capacitor 8 (iOS/Android).

### Flux de données

Déplacement de la carte → `handleMoveEnd` (dans `useHomeState`) → `useRestaurants.fetchRestaurants(bbox)` → trois couches d'enrichissement séquentielles, chacune poussée dans le state pour que l'UI s'améliore progressivement :

1. **`GET /api/osm/overpass`** — POI bruts via l'API Overpass (bascule multi-endpoints). Mis en cache 10 min par bbox. Limité à 30 req/min/IP.
2. **`POST /api/places/enrich-osm`** — Extraction détaillée des tags OSM (horaires, équipements, régime, liens sociaux) + Wikidata optionnel (seulement si `deep:true` ou si le lieu a un tag `wikidata`/`wikipedia`). Gratuit, rapide. Par lots de 30.
3. **`POST /api/places/enrich`** — Enrichissement Foursquare (notes, photos, prix, catégories). Nécessite `FOURSQUARE_API_KEY`. Mis en cache 1 h par lieu. Limité à 20 req/min/IP. Ignoré gracieusement si la clé est absente. Premier lot de 20, puis lots de 30.

Après chaque lot, les lieux sont re-notés via `lib/scoring.ts`, re-filtrés, puis poussés dans le state. **Les courses de requêtes sont protégées** par `fetchCount` (id monotone) et un `AbortController` — un nouveau déplacement de carte annule la requête en cours et écarte les lots périmés. `bboxChanged` (seuil `0.004°`) supprime les refetch inutiles.

Le bouton « Rechercher dans cette zone » (`showSearchHere`) apparaît au lieu d'un fetch automatique quand l'utilisateur s'éloigne de la dernière bbox recherchée, pour que le déplacement ne consomme pas le quota d'API.

### Notation (`lib/scoring.ts`)

Score composite dans `[0,1]` : **note 40 % + popularité 20 % + distance 30 % + vérifié 10 %**, plus de petits bonus (ouvert maintenant, Michelin, présence photo, présence adresse, présence site web). Les données manquantes retombent sur des valeurs neutres par défaut. `applyFilters` fait à la fois le filtrage (note, avis, prix, cuisine, ouvert, distance) **et** le tri (`distance` / `rating` / `score` / `name`). La distance est en Haversine depuis le centre de la carte. Les filtres sont **inclusifs envers les données inconnues** (ex. un lieu sans note n'est PAS exclu par `minRating`).

### Fichiers clés

| Fichier                       | Rôle                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/page.tsx`                | Accueil — vue pure ; lit tout depuis `useHomeState`. Affiche carte + barre de recherche flottante + sidebar desktop / bottom sheet mobile + détail du lieu.                                |
| `lib/hooks/useHomeState.ts`   | **Hook orchestrateur** — compose les autres hooks, détient l'état UI, les handlers (localisation, itinéraire, pin-drop, favoris, filtres). `app/page.tsx` n'en est qu'un consommateur fin. |
| `lib/hooks/useRestaurants.ts` | Hook de données central — fetch + enrichissement en 3 couches, Set des favoris, protections de course, bascule optimiste des favoris.                                                      |
| `components/map/MapView.tsx`  | Carte Leaflet. **Toujours `dynamic(..., { ssr: false })`.** Expose une ref impérative `MapViewHandle` (`flyTo`, `drawRoute`, `clearRoute`, `enablePinDrop`/`disablePinDrop`, `getBounds`). |
| `lib/hooks/useAuth.ts`        | **Singleton** du client navigateur Supabase (`getSupabaseBrowserClient`) + état d'auth, email/mot de passe, OAuth Google, `resetPassword`.                                                 |
| `lib/api-auth.ts`             | `requireUser(req)` côté serveur — vérifie `Authorization: Bearer <token>`.                                                                                                                 |
| `lib/db.ts`                   | Client Supabase **service-role** côté serveur + tous les helpers BDD (favoris, visites, listes, mapping fsq). Ne jamais importer côté client.                                              |
| `lib/scoring.ts`              | Haversine, score composite, `applyFilters`, `extractCuisines`.                                                                                                                             |
| `lib/overpass.ts`             | Constructeur de requêtes Overpass QL + normaliseur OSM → `PlaceBase`, bascule d'endpoints.                                                                                                 |
| `lib/foursquare.ts`           | Client Foursquare Places v3 (match + enrichissement), avec cache.                                                                                                                          |
| `lib/osm-enrichment.ts`       | Extraction tags OSM détaillés → `OsmEnrichedData` (sans réseau).                                                                                                                           |
| `lib/wikidata.ts`             | SPARQL Wikidata + résumé Wikipédia (étoiles Michelin, distinctions, image).                                                                                                                |
| `lib/opening-hours.ts`        | Parseur `opening_hours` sans dépendance (`isOpenNow`, `getTodayHours`).                                                                                                                    |
| `lib/cache.ts`                | `cacheGet/cacheSet` en mémoire + constructeurs de clés. Mono-instance uniquement — remplacer par Upstash Redis pour le multi-région.                                                       |
| `lib/rate-limit.ts`           | Limiteur par IP à fenêtre glissante → renvoie une 429 `NextResponse` ou null.                                                                                                              |
| `lib/api.ts`                  | `apiFetch` — préfixe avec `NEXT_PUBLIC_API_URL` pour que le bundle statique mobile atteigne l'API hébergée. **À utiliser à la place de `fetch` brut pour les appels API.**                 |
| `lib/api-errors.ts`           | `friendlyError` — mappe les codes d'erreur Postgres/réseau vers des messages français.                                                                                                     |
| `lib/gradients.ts`            | Dégradé déterministe à partir d'un id (cartes de lieu, couvertures de listes).                                                                                                             |
| `types/index.ts`              | Tous les types partagés — la hiérarchie `PlaceBase → PlaceCard → FavoriteRow`, `FilterState`, formes des réponses API.                                                                     |

### Autres hooks (`lib/hooks/`)

- `useLists` — CRUD des listes utilisateur + items de liste (utilise directement le client navigateur).
- `useRouteCache` — fetch d'itinéraire OSRM + cache mémoire 15 min (modes `foot`/`bike`/`car`).
- `useGeocoder` — autocomplétion d'adresse Nominatim (debounce 400 ms, dédup, min 3 caractères).
- `useAuthGuard` — garde côté client pour les pages protégées (`/account`, `/favorites`) ; redirige vers l'accueil avec `?auth=required`.
- `useToast` — système de toasts minimal (`success`/`error`/`info`), rendu par `ToastStack`.
- `useMediaQuery` / `useIsMobile` — SSR-safe (renvoie `false` côté serveur pour éviter un mismatch d'hydratation). Le breakpoint mobile pilote toute la bascule de layout.
- `useVirtualList` — rendu de liste fenêtré, sans dépendance.

### Routes API (`app/api/`)

| Route                       | Méthodes            | Notes                                                  |
| --------------------------- | ------------------- | ------------------------------------------------------ |
| `osm/overpass`              | GET                 | POI bruts. Cache, limité à 30/min.                     |
| `places/enrich-osm`         | POST                | Tags OSM détaillés + Wikidata optionnel. Gratuit.      |
| `places/enrich`             | POST                | Foursquare. Limité à 20/min.                           |
| `places/enrich-google`      | POST                | Google Places New (note/prix/photos/horaires). 20/min. |
| `places/google-photo`       | GET                 | Proxy image Google (clé côté serveur, non stockée).    |
| `places/social`             | GET                 | Amis ayant enregistré/visité un lieu (`?osm_id=`).     |
| `notes`                     | GET / PUT           | Notes perso synchronisées (`?`/body `osm_id`+`text`).  |
| `favorites`                 | GET / POST / DELETE | Liste / ajout / vidage des favoris.                    |
| `favorites/[osmId]`         | DELETE              | Supprime un favori.                                    |
| `lists`                     | GET / POST          | Listes utilisateur.                                    |
| `lists/[id]`                | PATCH / DELETE      | Renomme/recolore / supprime une liste.                 |
| `lists/[id]/items`          | GET / POST          | Membres d'une liste.                                   |
| `lists/[id]/items/[osm_id]` | DELETE              | Retire un lieu d'une liste.                            |
| `lists/for-place`           | GET                 | Quelles listes contiennent un lieu donné.              |
| `visits`                    | GET / POST          | Liste / consigne une visite.                           |
| `visits/[visitId]`          | PATCH / DELETE      | Édite / supprime une visite.                           |
| `visits/stats`              | GET                 | Statistiques de visites agrégées (totaux, dépenses).   |
| `push-tokens`               | POST                | Enregistre un token push d'appareil (mobile).          |
| `polls`                     | GET / POST          | Mes sondages / création (requireUser, 2–6 options).    |
| `polls/[id]`                | GET                 | **Public** — sondage + décompte live + `?token=`.      |
| `polls/[id]/vote`           | POST                | **Public** — vote anonyme (upsert par `voter_token`).  |
| `polls/[id]/close`          | POST                | Clôture (owner).                                       |
| `account`                   | DELETE              | Supprime le compte + toutes les données utilisateur.   |
| `contact`                   | POST                | Formulaire de contact.                                 |

Toutes les routes mutantes/utilisateur appellent `requireUser(req)` et renvoient des erreurs françaises via `friendlyError`. Valider les corps de requête avec **Zod**.

### Pattern d'authentification

- **Pas d'auth dans le middleware.** `middleware.ts` est volontairement un no-op (matcher vide) — les cookies Supabase v2 fragmentés sont fragiles à parser dans le middleware et causaient de fausses redirections `?auth=required`. **Ne pas** y ajouter de logique d'auth.
- **Client → serveur :** chaque fetch vers un endpoint protégé doit envoyer `Authorization: Bearer <token>`. Récupérer les en-têtes via `getAuthHeaders()` dans `useRestaurants.ts` (lit la session depuis le singleton navigateur Supabase).
- **Serveur :** `requireUser(req)` vérifie le JWT bearer avec le client anon Supabase. Les écritures BDD utilisent le client **service-role** de `lib/db.ts` (contourne la RLS — donc autoriser par `userId` dans le code).
- **Protection des pages :** côté client via `useAuthGuard` dans chaque page protégée.
- Utiliser le client navigateur **unique** depuis `getSupabaseBrowserClient()` (`useAuth.ts`) partout côté client — jamais de `createClient` ad hoc, sinon on obtient plusieurs instances GoTrue.

### Hiérarchie des types

```
PlaceBase (OSM brut)
  └─ PlaceCard (enrichi — ajoute fsq?, osm_enriched?, wikidata?, distance?, score?, is_favorite?, visitCount?)
       └─ FavoriteRow (snapshot BDD — stocke le PlaceCard complet en JSONB dans `snapshot`)
```

`PlaceCard` est la monnaie d'échange centrale de l'UI. Les lignes BDD (`favorites`, `visits`, `list_items`) stockent un snapshot JSONB (`snapshot`/`place_snapshot`) du `PlaceCard` pour que l'UI fonctionne hors des données OSM/FSQ en direct.

### Leaflet / SSR

`MapView` (et les autres composants couplés à la carte : `PlaceDetail`, `FiltersPanel`, `ShareModal`, `AuthModal` dans `page.tsx`) sont chargés via `dynamic(() => import(...), { ssr: false })`. `next.config.ts` définit `webpack.resolve.fallback.fs = false` pour la même raison. La div de la carte utilise `zIndex:0` pour contenir les z-index internes 400+ de Leaflet.

### Mobile (Capacitor)

- `capacitor.config.ts` — `appId : com.forkmap.app`, `webDir : out`, pointe vers l'URL hébergée.
- `npm run build:mobile` produit l'export statique ; les coques natives sont dans `ios/` et `android/`.
- `components/native/CapacitorInit.tsx` initialise la status bar / le cycle de vie de l'app. `lib/native/` enveloppe les plugins Capacitor avec des **no-ops compatibles web** (`geolocation`, `haptics`, `pushNotifications`) — toujours passer par ces wrappers, ne jamais importer `@capacitor/*` directement dans du code partagé.
- `next.config.ts` ajoute un CORS permissif sur `/api/*` pour l'origine WebView et une CSP complète (seuls les hôtes listés sont joignables — ajouter les nouveaux hôtes externes à `connect-src`/`img-src` lors d'une intégration d'API).

### i18n

**Forkmap est uniquement en français.** Les traductions sont dans `lib/i18n/translations.ts` ; le hook `useLanguage` (`tr(key)`) pilote toutes les chaînes de l'UI — **ne pas coder en dur de texte affiché dans les composants.** `LANGUAGES` liste fr/en/es/de/ja mais la langue est **verrouillée sur `fr`** (`setLang` est un no-op). Toute nouvelle chaîne visible → ajouter une `TranslationKey` + sa valeur française.

### Styles

Tailwind est configuré mais la plupart des composants utilisent des **styles inline avec des variables CSS** (`var(--accent)`, `var(--text)`, `var(--surface)`, ombres `var(--s2)`/`--s3`, `var(--font-body)`) définies dans `app/globals.css`. Suivre l'approche du composant environnant (majoritairement des objets de styles inline) plutôt que d'introduire de nouveaux patterns.

## Conventions

- **Argent/copie UX en français** ; commentaires en anglais (style existant).
- **Pas de `console.log`** — ESLint n'autorise que `console.warn`/`console.error`.
- **`any` est un warning** — préférer de vrais types ; la hiérarchie de `types/index.ts` fait foi.
- Routes serveur : valider avec Zod, protéger avec `requireUser`, renvoyer des messages mappés par `friendlyError`.
- Appels API client : utiliser `apiFetch`, attacher `getAuthHeaders()` pour les routes protégées.
- Ajouter des tests pour toute nouvelle logique de `lib/` ; lancer `npm run test:run && npm run lint && npm run type-check` avant de déclarer terminé.

## CI / Automatisation (`.github/workflows/`)

- `ci.yml` — au push/PR vers `master` : lint · type-check · build.

Aucune étape `npm test` ne tourne encore dans `ci.yml` — lancer Vitest en local.
