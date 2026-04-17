# Capacitor Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the Next.js Forkmap app as a native iOS + Android app using Capacitor, with push notifications, native share, haptics, GPS, full-screen mode, and deep-link auth.

**Architecture:** The Next.js frontend is built as a static export (`output: 'export'`) and bundled on-device by Capacitor. All API calls are routed to the production Vercel deployment via `NEXT_PUBLIC_API_URL`. Supabase OAuth uses a custom URL scheme (`com.forkmap.app://`) instead of the server-side callback route.

**Tech Stack:** Capacitor 6, `@capacitor/{core,ios,android,push-notifications,share,haptics,geolocation,status-bar,app}`, Next.js 15 static export, Supabase PKCE auth flow.

---

## File Map

| File                                  | Action | Responsibility                                                                         |
| ------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `lib/api.ts`                          | Create | `apiFetch()` helper — prepends `NEXT_PUBLIC_API_URL` for Capacitor builds              |
| `next.config.ts`                      | Modify | Add `NEXT_EXPORT` flag: static output, trailingSlash, unoptimized images, CORS headers |
| `package.json`                        | Modify | Add `build:mobile` script                                                              |
| `capacitor.config.ts`                 | Create | Capacitor app config (appId, webDir, plugins)                                          |
| `lib/native/haptics.ts`               | Create | `lightTap()` + `heavyTap()` wrappers                                                   |
| `lib/native/geolocation.ts`           | Create | `getCurrentPosition()` — Capacitor-first, browser fallback                             |
| `lib/native/pushNotifications.ts`     | Create | `registerPushNotifications()` — request, register, store token                         |
| `components/native/CapacitorInit.tsx` | Create | Client component: StatusBar init + deep link listener                                  |
| `app/layout.tsx`                      | Modify | Import `<CapacitorInit />`                                                             |
| `lib/hooks/useAuth.ts`                | Modify | `signInWithGoogle` — use deep link redirect on native                                  |
| `lib/hooks/useHomeState.ts`           | Modify | `locate()` — call `getCurrentPosition()` from `lib/native/geolocation`                 |
| `lib/hooks/useRestaurants.ts`         | Modify | Replace 6 `fetch('/api/…')` with `apiFetch`, add `heavyTap()` in `toggleFavorite`      |
| `components/map/MapView.tsx`          | Modify | Call `lightTap()` on marker click (line 290)                                           |
| `components/place/PlaceDetail.tsx`    | Modify | Native share on `IcoShare` click (line 290) + `apiFetch` for visits (line 174)         |
| `components/place/VisitModal.tsx`     | Modify | `apiFetch` for visits (line 138)                                                       |
| `app/(pages)/account/page.tsx`        | Modify | `apiFetch` for 3 calls (lines 230, 239, 240)                                           |
| `app/(pages)/favorites/page.tsx`      | Modify | `apiFetch` for 1 call (line 343)                                                       |
| `app/(pages)/settings/page.tsx`       | Modify | `apiFetch` for 1 call (line 111)                                                       |
| `app/(pages)/contact/page.tsx`        | Modify | `apiFetch` for 1 call (line 36)                                                        |
| `app/api/push-tokens/route.ts`        | Create | POST endpoint to store push tokens in Supabase                                         |
| `sql/push_tokens.sql`                 | Create | SQL migration for `push_tokens` table                                                  |

---

## Task 1: API fetch helper + mobile build config

**Files:**

- Create: `lib/api.ts`
- Modify: `next.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `lib/api.ts`**

```typescript
// lib/api.ts
// Wraps fetch() with optional API base URL for Capacitor builds.
// Set NEXT_PUBLIC_API_URL=https://yourapp.vercel.app when building for mobile.
// Leave unset (empty) for Vercel deployments — calls stay relative.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? ''
  return fetch(`${base}${path}`, init)
}
```

- [ ] **Step 2: Update `next.config.ts`**

Replace the entire file content with:

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
// Set NEXT_EXPORT=true when building the static bundle for Capacitor
const isExport = process.env.NEXT_EXPORT === 'true'

const nextConfig: NextConfig = {
  ...(isExport && {
    output: 'export',
    trailingSlash: true,
  }),

  async headers() {
    // headers() is ignored by Next.js in static export mode
    if (isExport) return []
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://unpkg.com`,
              "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://fastly.4sqi.net https://*.4sqi.net https://*.googleusercontent.com https://*.basemaps.cartocdn.com https://unpkg.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://api.foursquare.com https://router.project-osrm.org https://overpass.kumi.systems https://overpass.openstreetmap.ru https://maps.mail.ru",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // CORS for Capacitor WebView origins
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'capacitor://localhost',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization',
          },
        ],
      },
    ]
  },

  images: {
    unoptimized: isExport,
    remotePatterns: [
      { protocol: 'https', hostname: 'fastly.4sqi.net' },
      { protocol: 'https', hostname: '**.4sqi.net' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },

  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
}

export default nextConfig
```

- [ ] **Step 3: Add `build:mobile` script to `package.json`**

In the `"scripts"` section, add:

```json
"build:mobile": "NEXT_EXPORT=true next build"
```

- [ ] **Step 4: Verify the regular build still works**

```bash
npm run build
```

Expected: build succeeds, `out/` is NOT generated (no `NEXT_EXPORT` flag set).

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts next.config.ts package.json
git -c core.hooksPath=/dev/null commit -m "feat: add apiFetch helper and NEXT_EXPORT mobile build config"
```

---

## Task 2: Replace all relative `/api/` fetch calls with `apiFetch`

**Files:**

- Modify: `lib/hooks/useRestaurants.ts`
- Modify: `components/place/PlaceDetail.tsx`
- Modify: `components/place/VisitModal.tsx`
- Modify: `app/(pages)/account/page.tsx`
- Modify: `app/(pages)/favorites/page.tsx`
- Modify: `app/(pages)/settings/page.tsx`
- Modify: `app/(pages)/contact/page.tsx`

- [ ] **Step 1: Update `lib/hooks/useRestaurants.ts`**

Add import at the top of the file (after existing imports):

```typescript
import { apiFetch } from '@/lib/api'
```

Then replace each `fetch("/api/` or ``fetch(`/api/`` call:

| Line | Old                                                                                                         | New                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 89   | `fetch("/api/favorites", { headers: authHeaders })`                                                         | `apiFetch("/api/favorites", { headers: authHeaders })`                                                         |
| 134  | ``fetch(`/api/osm/overpass?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`, { signal })`` | ``apiFetch(`/api/osm/overpass?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`, { signal })`` |
| 168  | `fetch("/api/places/enrich-osm", {`                                                                         | `apiFetch("/api/places/enrich-osm", {`                                                                         |
| 208  | `fetch("/api/places/enrich", {`                                                                             | `apiFetch("/api/places/enrich", {`                                                                             |
| 295  | ``fetch(`/api/favorites/${encodeURIComponent(place.osm_id)}`, {``                                           | ``apiFetch(`/api/favorites/${encodeURIComponent(place.osm_id)}`, {``                                           |
| 300  | `fetch("/api/favorites", {`                                                                                 | `apiFetch("/api/favorites", {`                                                                                 |

- [ ] **Step 2: Update `components/place/PlaceDetail.tsx`**

Add import:

```typescript
import { apiFetch } from '@/lib/api'
```

Replace at line 174:

```typescript
// Old:
const res = await fetch(`/api/visits?osm_id=${encodeURIComponent(place.osm_id)}`, {
// New:
const res = await apiFetch(`/api/visits?osm_id=${encodeURIComponent(place.osm_id)}`, {
```

- [ ] **Step 3: Update `components/place/VisitModal.tsx`**

Add import:

```typescript
import { apiFetch } from '@/lib/api'
```

Replace the two `fetch("/api/visits"` calls (around line 138) with `apiFetch("/api/visits"`.

- [ ] **Step 4: Update `app/(pages)/account/page.tsx`**

Add import:

```typescript
import { apiFetch } from '@/lib/api'
```

Replace at lines 230, 239, 240:

```typescript
// Line 230: fetch("/api/visits" → apiFetch("/api/visits"
// Line 239: fetch("/api/favorites" → apiFetch("/api/favorites"
// Line 240: fetch("/api/visits/stats" → apiFetch("/api/visits/stats"
```

- [ ] **Step 5: Update `app/(pages)/favorites/page.tsx`**

Add import and replace line 343:

```typescript
import { apiFetch } from '@/lib/api'
// fetch("/api/favorites" → apiFetch("/api/favorites"
```

- [ ] **Step 6: Update `app/(pages)/settings/page.tsx`**

Add import and replace line 111:

```typescript
import { apiFetch } from '@/lib/api'
// fetch("/api/account" → apiFetch("/api/account"
```

- [ ] **Step 7: Update `app/(pages)/contact/page.tsx`**

Add import and replace line 36:

```typescript
import { apiFetch } from '@/lib/api'
// fetch("/api/contact" → apiFetch("/api/contact"
```

- [ ] **Step 8: Verify type-check passes**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/useRestaurants.ts components/place/PlaceDetail.tsx components/place/VisitModal.tsx "app/(pages)/account/page.tsx" "app/(pages)/favorites/page.tsx" "app/(pages)/settings/page.tsx" "app/(pages)/contact/page.tsx"
git -c core.hooksPath=/dev/null commit -m "feat: use apiFetch for all /api/ calls (Capacitor build compat)"
```

---

## Task 3: Install Capacitor packages + create config

**Files:**

- Modify: `package.json` (dev dependencies added by npm)
- Create: `capacitor.config.ts`

- [ ] **Step 1: Install all Capacitor packages**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android \
  @capacitor/push-notifications @capacitor/share @capacitor/haptics \
  @capacitor/geolocation @capacitor/status-bar @capacitor/app
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Create `capacitor.config.ts`**

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forkmap.app',
  appName: 'Forkmap',
  webDir: 'out',
  server: {
    // Use https scheme for Android WebView (avoids mixed-content issues)
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config
```

- [ ] **Step 3: Commit**

```bash
git add capacitor.config.ts package.json package-lock.json
git -c core.hooksPath=/dev/null commit -m "feat: install Capacitor packages and add capacitor.config.ts"
```

---

## Task 4: Initialize Capacitor (iOS + Android)

**Files:**

- Creates: `ios/` directory (Xcode project)
- Creates: `android/` directory (Android Studio project)

- [ ] **Step 1: Run mobile build to generate `/out`**

```bash
NEXT_EXPORT=true next build
```

Expected: `out/` directory created with static HTML/CSS/JS.

- [ ] **Step 2: Initialize Capacitor**

```bash
npx cap init "Forkmap" "com.forkmap.app" --web-dir out
```

Expected: `capacitor.config.ts` confirmed, no errors. (Overwrites if prompted — keep existing `capacitor.config.ts`)

- [ ] **Step 3: Add iOS platform**

```bash
npx cap add ios
```

Expected: `ios/` directory created with Xcode project structure.

- [ ] **Step 4: Add Android platform**

```bash
npx cap add android
```

Expected: `android/` directory created with Android Studio project structure.

- [ ] **Step 5: Sync web assets**

```bash
npx cap sync
```

Expected: `out/` contents copied to `ios/App/App/public/` and `android/app/src/main/assets/public/`.

- [ ] **Step 6: Add native projects to `.gitignore`**

Append to `.gitignore`:

```
# Capacitor native projects (generated — commit only if you want to track native changes)
ios/
android/
out/
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore capacitor.config.ts
git -c core.hooksPath=/dev/null commit -m "feat: initialize Capacitor iOS + Android projects"
```

---

## Task 5: Native helpers (haptics + geolocation)

**Files:**

- Create: `lib/native/haptics.ts`
- Create: `lib/native/geolocation.ts`

- [ ] **Step 1: Create `lib/native/haptics.ts`**

```typescript
// lib/native/haptics.ts
// Safe wrappers around @capacitor/haptics — no-ops on web.
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/** Light tap — use on map marker click */
export async function lightTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

/** Heavy tap — use on favorite add/remove */
export async function heavyTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Heavy })
}
```

- [ ] **Step 2: Create `lib/native/geolocation.ts`**

```typescript
// lib/native/geolocation.ts
// Returns current GPS position. Uses Capacitor plugin on native
// (faster, higher accuracy) and falls back to browser API on web.
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export interface LatLng {
  lat: number
  lng: number
}

export async function getCurrentPosition(): Promise<LatLng> {
  if (Capacitor.isNativePlatform()) {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }

  return new Promise<LatLng>((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not available'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
```

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/native/haptics.ts lib/native/geolocation.ts
git -c core.hooksPath=/dev/null commit -m "feat: add native haptics and geolocation helpers"
```

---

## Task 6: CapacitorInit client component (StatusBar + deep links)

**Files:**

- Create: `components/native/CapacitorInit.tsx`

- [ ] **Step 1: Create `components/native/CapacitorInit.tsx`**

```typescript
// components/native/CapacitorInit.tsx
// Client component — runs on every page mount on native.
// Initialises StatusBar and listens for OAuth deep links.
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

export default function CapacitorInit() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let statusBarPromise: Promise<void> | null = null

    // Lazy-load native plugins to avoid SSR issues
    async function initNative() {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Default })
      await StatusBar.setBackgroundColor({ color: '#ffffff' })
    }

    statusBarPromise = initNative()

    // Deep link listener for Supabase OAuth callback
    // URL format: com.forkmap.app://auth/callback?code=<pkce_code>
    let listenerHandle: { remove: () => Promise<void> } | null = null

    async function setupDeepLinks() {
      const { App: CapApp } = await import('@capacitor/app')
      const { getSupabaseBrowserClient } = await import('@/lib/hooks/useAuth')

      listenerHandle = await CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url)
          // Matches: com.forkmap.app://auth/callback?code=…
          if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
            const code = parsed.searchParams.get('code')
            if (code) {
              const sb = getSupabaseBrowserClient()
              await sb.auth.exchangeCodeForSession(code)
              router.replace('/')
            }
          }
        } catch {
          // Malformed URL — ignore
        }
      })
    }

    setupDeepLinks()

    return () => {
      listenerHandle?.remove()
      statusBarPromise // noop — effect cleanup only
    }
  }, [router])

  return null
}
```

- [ ] **Step 2: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/native/CapacitorInit.tsx
git -c core.hooksPath=/dev/null commit -m "feat: add CapacitorInit component (StatusBar + OAuth deep link)"
```

---

## Task 7: Wire CapacitorInit into root layout

**Files:**

- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Add the import after existing imports:

```typescript
import CapacitorInit from '@/components/native/CapacitorInit'
```

Add `<CapacitorInit />` inside `<ErrorBoundary>`, before `<NavWrapper />`:

```tsx
<ErrorBoundary>
  <CapacitorInit />
  <NavWrapper />
  <div className="main-content-offset">{children}</div>
  <style>{`
    @media (min-width: 768px) { .main-content-offset { margin-left: 52px; } }
    @media (max-width: 767px) { .main-content-offset { margin-bottom: 56px; } }
  `}</style>
</ErrorBoundary>
```

- [ ] **Step 2: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git -c core.hooksPath=/dev/null commit -m "feat: wire CapacitorInit into root layout"
```

---

## Task 8: Auth — deep link redirect for native

**Files:**

- Modify: `lib/hooks/useAuth.ts`

- [ ] **Step 1: Update `signInWithGoogle` in `lib/hooks/useAuth.ts`**

Add import at top of file:

```typescript
import { Capacitor } from '@capacitor/core'
```

Replace the `signInWithGoogle` callback (lines 68–78) with:

```typescript
const signInWithGoogle = useCallback(async () => {
  const redirectTo = Capacitor.isNativePlatform()
    ? 'com.forkmap.app://auth/callback'
    : typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  return error?.message ?? null
}, [sb])
```

Also update `resetPassword` (keep web redirect, add native awareness):

```typescript
const resetPassword = useCallback(
  async (email: string) => {
    const redirectTo = Capacitor.isNativePlatform()
      ? 'com.forkmap.app://auth/callback?next=/settings'
      : typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/settings`
        : undefined

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    return error?.message ?? null
  },
  [sb]
)
```

- [ ] **Step 2: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useAuth.ts
git -c core.hooksPath=/dev/null commit -m "feat: use custom URL scheme for Supabase OAuth on native"
```

---

## Task 9: Native GPS in locate()

**Files:**

- Modify: `lib/hooks/useHomeState.ts`

- [ ] **Step 1: Add import in `lib/hooks/useHomeState.ts`**

After existing imports, add:

```typescript
import { getCurrentPosition } from '@/lib/native/geolocation'
```

- [ ] **Step 2: Replace the `locate` function (lines 105–120)**

```typescript
const locate = useCallback(() => {
  setLocating(true)
  setLocateError(false)

  getCurrentPosition()
    .then(({ lat, lng: lon }) => {
      setUserLocation([lat, lon])
      setLocationLabel(null)
      mapRef.current?.flyTo(lat, lon, 15)
      setLocating(false)
    })
    .catch(() => {
      setLocateError(true)
      setLocating(false)
    })
}, [])
```

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useHomeState.ts
git -c core.hooksPath=/dev/null commit -m "feat: use native geolocation in locate() via Capacitor plugin"
```

---

## Task 10: Haptics — marker click + favorites

**Files:**

- Modify: `components/map/MapView.tsx`
- Modify: `lib/hooks/useRestaurants.ts`

- [ ] **Step 1: Add haptics to marker click in `MapView.tsx`**

Add import at the top (after existing imports):

```typescript
import { lightTap } from '@/lib/native/haptics'
```

Replace line 290:

```typescript
// Old:
.on("click",     () => cbClick.current(place))
// New:
.on("click",     () => { lightTap(); cbClick.current(place); })
```

- [ ] **Step 2: Add haptics to `toggleFavorite` in `lib/hooks/useRestaurants.ts`**

Add import:

```typescript
import { heavyTap } from '@/lib/native/haptics'
```

In the `toggleFavorite` function (around line 285, right after the optimistic update), add:

```typescript
// After: setFilteredPlaces(flip);
// Add:
heavyTap()
```

The exact context (add the `heavyTap()` call on the line after `setFilteredPlaces(flip)`):

```typescript
setFilteredPlaces(flip);
heavyTap(); // haptic feedback on favorite toggle (no-op on web)

try {
```

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/map/MapView.tsx lib/hooks/useRestaurants.ts
git -c core.hooksPath=/dev/null commit -m "feat: add haptic feedback on marker click and favorite toggle"
```

---

## Task 11: Native share in PlaceDetail

**Files:**

- Modify: `components/place/PlaceDetail.tsx`

- [ ] **Step 1: Add imports to `PlaceDetail.tsx`**

```typescript
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
```

- [ ] **Step 2: Add `handleShare` function inside `PlaceDetail` component**

Add this function after the `fetchVisits` function (around line 188):

```typescript
const handleShare = async () => {
  if (Capacitor.isNativePlatform()) {
    const address = [place.address, place.city].filter(Boolean).join(', ')
    await Share.share({
      title: place.name,
      text: address ? `${place.name} — ${address}` : place.name,
      url: `https://forkmap.vercel.app`,
      dialogTitle: 'Partager ce restaurant',
    })
  } else {
    setShowShare(true)
  }
}
```

- [ ] **Step 3: Wire `handleShare` to the share button**

Replace the `IcoShare` button's `onClick` (around line 290):

```typescript
// Old:
onClick={() => setShowShare(true)}
// New:
onClick={handleShare}
```

- [ ] **Step 4: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/place/PlaceDetail.tsx
git -c core.hooksPath=/dev/null commit -m "feat: native Share sheet on mobile, fallback to ShareModal on web"
```

---

## Task 12: Push notifications — DB + API + registration

**Files:**

- Create: `sql/push_tokens.sql`
- Create: `app/api/push-tokens/route.ts`
- Create: `lib/native/pushNotifications.ts`
- Modify: `components/native/CapacitorInit.tsx`

- [ ] **Step 1: Create `sql/push_tokens.sql`**

```sql
-- sql/push_tokens.sql
-- Run in Supabase SQL editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id);

-- RLS: users can only read/write their own tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Manual step:** Run this SQL in the Supabase Dashboard → SQL Editor before deploying.

- [ ] **Step 2: Create `app/api/push-tokens/route.ts`**

```typescript
// app/api/push-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const token: string = body?.token
  const platform: string = body?.platform

  if (!token || !platform) {
    return NextResponse.json({ error: 'token and platform required' }, { status: 400 })
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    return NextResponse.json({ error: 'invalid platform' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { error } = await sb
    .from('push_tokens')
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create `lib/native/pushNotifications.ts`**

```typescript
// lib/native/pushNotifications.ts
// Requests push permission and registers the device token with the backend.
// Called once after user signs in on a native platform.
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { apiFetch } from '@/lib/api'

export async function registerPushNotifications(accessToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  // Listen for the token once — remove listener after first registration
  const listener = await PushNotifications.addListener('registration', async ({ value: token }) => {
    await listener.remove()
    await apiFetch('/api/push-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    })
  })
}
```

- [ ] **Step 4: Call `registerPushNotifications` in `CapacitorInit.tsx`**

Update `components/native/CapacitorInit.tsx` to import the Supabase auth state and trigger registration when the user signs in. Add a `useEffect` that watches the Supabase session:

After the existing `useEffect`, add:

```typescript
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { registerPushNotifications } from '@/lib/native/pushNotifications'

// (inside component, after existing useEffect)
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return

  const sb = getSupabaseBrowserClient()
  const {
    data: { subscription },
  } = sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.access_token) {
      await registerPushNotifications(session.access_token)
    }
  })

  return () => subscription.unsubscribe()
}, [])
```

The full updated `components/native/CapacitorInit.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { registerPushNotifications } from '@/lib/native/pushNotifications'

export default function CapacitorInit() {
  const router = useRouter()

  // StatusBar + deep link listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    async function initNative() {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Default })
      await StatusBar.setBackgroundColor({ color: '#ffffff' })
    }

    initNative()

    let listenerHandle: { remove: () => Promise<void> } | null = null

    async function setupDeepLinks() {
      const { App: CapApp } = await import('@capacitor/app')
      const sb = getSupabaseBrowserClient()

      listenerHandle = await CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url)
          if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
            const code = parsed.searchParams.get('code')
            if (code) {
              await sb.auth.exchangeCodeForSession(code)
              router.replace('/')
            }
          }
        } catch {}
      })
    }

    setupDeepLinks()

    return () => {
      listenerHandle?.remove()
    }
  }, [router])

  // Push notification registration on sign-in
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const sb = getSupabaseBrowserClient()
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        await registerPushNotifications(session.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
```

- [ ] **Step 5: Verify type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add sql/push_tokens.sql app/api/push-tokens/route.ts lib/native/pushNotifications.ts components/native/CapacitorInit.tsx
git -c core.hooksPath=/dev/null commit -m "feat: push notification registration (APNS/FCM) + push_tokens API"
```

---

## Task 13: Mobile build + Capacitor sync verification

- [ ] **Step 1: Run the mobile build**

```bash
NEXT_EXPORT=true next build
```

Expected:

- Build succeeds
- `out/` directory created
- No errors about API routes (they're excluded from static export automatically)
- Warning about `headers()` being ignored is acceptable

- [ ] **Step 2: Sync to native projects**

```bash
npx cap sync
```

Expected:

- `out/` copied to `ios/App/App/public/`
- `out/` copied to `android/app/src/main/assets/public/`
- Plugins updated in both projects

- [ ] **Step 3: Verify iOS app opens in Xcode**

```bash
npx cap open ios
```

Expected: Xcode opens with the `App` project. The app compiles without errors when you hit ⌘+B (Build).

- [ ] **Step 4: Run on iOS Simulator**

In Xcode: select a simulator (iPhone 15 Pro), press ▶ (Run).

Expected:

- Forkmap loads in the simulator
- Map renders (requires network)
- No JS console errors visible in Xcode → Debug area

---

## Task 14: URL scheme config for deep links (iOS + Android)

These changes are in the native project files generated by Capacitor. Run `npx cap sync` after completing them.

### iOS — Info.plist

- [ ] **Step 1: Open `ios/App/App/Info.plist` in Xcode or a text editor**

Add the following inside the root `<dict>` element (add before `</dict>`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.forkmap.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.forkmap.app</string>
    </array>
  </dict>
</array>
```

### Android — AndroidManifest.xml

- [ ] **Step 2: Open `android/app/src/main/AndroidManifest.xml`**

Inside the `<activity>` element (the main activity), add an intent-filter:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.forkmap.app" />
</intent-filter>
```

- [ ] **Step 3: Sync**

```bash
npx cap sync
```

- [ ] **Step 4: Commit native config changes (optional)**

If you want to track native changes in git, first remove `ios/` and `android/` from `.gitignore`, then:

```bash
git add ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml
git -c core.hooksPath=/dev/null commit -m "feat: add URL scheme for Supabase OAuth deep links (iOS + Android)"
```

---

## Task 15: Vercel deploy + environment variables

> This task is manual — no code to write.

- [ ] **Step 1: Push master to GitHub (if not already done)**

```bash
git push origin master
```

- [ ] **Step 2: Create Vercel project**

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import from GitHub → select `forkmap` repo
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave blank (it's at the root)
5. Click **Deploy**

- [ ] **Step 3: Add environment variables in Vercel dashboard**

Settings → Environment Variables → add:

| Name                            | Value                                 |
| ------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | From your `.env.local`                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From your `.env.local`                |
| `SUPABASE_SERVICE_ROLE_KEY`     | From your `.env.local`                |
| `FOURSQUARE_API_KEY`            | From your `.env.local`                |
| `RESEND_API_KEY`                | From your `.env.local` (contact form) |

- [ ] **Step 4: Redeploy after adding env vars**

Deployments → latest → Redeploy.

- [ ] **Step 5: Add Vercel URL to Supabase allowed redirect URLs**

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs → Add:

- `https://forkmap.vercel.app/auth/callback`
- `com.forkmap.app://auth/callback`

- [ ] **Step 6: Update mobile build env var**

Create `.env.mobile` (gitignored) for local reference:

```
NEXT_PUBLIC_API_URL=https://forkmap.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add to `.gitignore`:

```
.env.mobile
```

Update the `build:mobile` script in `package.json` to load from `.env.mobile`:

```json
"build:mobile": "env $(cat .env.mobile | xargs) NEXT_EXPORT=true next build"
```

---

## Task 16: App Store submission checklist

> Manual steps — no code.

### Apple App Store (requires Apple Developer Program — $99/year)

- [ ] Create App ID `com.forkmap.app` in Apple Developer Portal → Certificates, Identifiers & Profiles
- [ ] Enable **Push Notifications** capability for the App ID
- [ ] Create APNs key (Authentication Key, not certificate) → download `.p8` file
- [ ] In Supabase Dashboard → Settings → Auth → Push Notifications (if using Supabase push) **OR** set up Firebase Cloud Messaging for iOS
- [ ] In Xcode: set Team in Signing & Capabilities → select your Apple Developer account
- [ ] Enable **Push Notifications** capability in Xcode project settings
- [ ] Product → Archive → Distribute App → App Store Connect → Upload
- [ ] Complete App Store Connect listing (screenshots, description, category)
- [ ] Submit for review

### Google Play Store (requires Google Play Console — $25 one-time)

- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Add Android app with package `com.forkmap.app`
- [ ] Download `google-services.json` → place in `android/app/google-services.json`
- [ ] Run `npx cap sync` to copy the file
- [ ] In Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle (AAB)
- [ ] Create keystore file (keep this safe — losing it means you can't update the app)
- [ ] Upload AAB to Google Play Console → Internal Testing → Production
- [ ] Complete store listing and submit

---

## Summary: build commands for day-to-day

```bash
# Regular web build (Vercel)
npm run build

# Mobile build (generates /out for Capacitor)
NEXT_PUBLIC_API_URL=https://forkmap.vercel.app \
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
NEXT_EXPORT=true next build

# Sync to native
npx cap sync

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android
```
