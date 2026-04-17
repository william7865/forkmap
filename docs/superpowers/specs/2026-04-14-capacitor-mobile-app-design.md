# Capacitor Mobile App — Design Spec

**Date:** 2026-04-14
**Status:** Approved
**Scope:** iOS + Android native app wrapping the existing Next.js restaurant-finder

---

## 1. Objectif

Transformer l'app web Next.js Forkmap en vraie application mobile native iOS et Android, publiable sur l'App Store et le Google Play Store, en utilisant Capacitor comme couche native. L'app doit être installable sur le téléphone du développeur pour usage personnel ET publiable publiquement.

---

## 2. Architecture

### Vue d'ensemble

```
┌─────────────────────────────────┐
│  Vercel (Backend)               │
│  Next.js API routes + Auth      │
│  /api/favorites, /api/visits... │
│  /api/osm, /api/places/enrich   │
└────────────────┬────────────────┘
                 │ HTTPS
┌────────────────▼────────────────┐
│  Capacitor App (iOS / Android)  │
│  ┌─────────────────────────┐   │
│  │  Next.js Static Export  │   │
│  │  output: 'export' → /out│   │
│  │  bundlé sur le device   │   │
│  └─────────────────────────┘   │
│                                 │
│  Plugins natifs :               │
│  @capacitor/push-notifications  │
│  @capacitor/share               │
│  @capacitor/haptics             │
│  @capacitor/geolocation         │
│  @capacitor/status-bar          │
│  @capacitor/app (deep links)    │
└─────────────────────────────────┘
```

### Principe de séparation

- **Frontend** : bundlé statiquement sur le device (`/out`) → démarrage instantané, pas de réseau requis pour charger l'UI
- **API calls** : tous envoyés vers l'URL Vercel en production (`NEXT_PUBLIC_API_URL`)
- **Supabase** : contacté directement depuis le client pour auth et DB temps réel

---

## 3. Backend — Déploiement Vercel

### Configuration

- Déploiement du repo GitHub existant sur Vercel (plan gratuit suffisant)
- Variables d'environnement à migrer depuis `.env.local` :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FOURSQUARE_API_KEY`
  - `RESEND_API_KEY` (contact form)
- L'URL Vercel (ex: `https://forkmap.vercel.app`) devient `NEXT_PUBLIC_API_URL` dans la config Capacitor

### CORS

- Ajouter les origines Capacitor (`capacitor://localhost`, `http://localhost`) aux headers CORS dans `next.config.ts`

---

## 4. Export statique Next.js

### Changements dans `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'export', // génère /out
  trailingSlash: true, // requis pour Capacitor routing
  images: {
    unoptimized: true, // next/image ne fonctionne pas en export statique
  },
  // ...reste de la config inchangée
}
```

### Contraintes de l'export statique

- Les **API routes** (`app/api/`) ne sont PAS incluses dans l'export — elles restent sur Vercel
- La route `/app/auth/callback/route.ts` est remplacée par le deep link handling Capacitor (voir section Auth)
- `next/image` : passer à `<img>` standard ou `unoptimized: true`

### Build

```bash
npm run build    # génère /out
npx cap sync     # copie /out → ios/App/App/public + android/app/src/main/assets/public
```

---

## 5. Initialisation Capacitor

### Installation

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/push-notifications @capacitor/share
npm install @capacitor/haptics @capacitor/geolocation
npm install @capacitor/status-bar @capacitor/app
npx cap init "Forkmap" "com.forkmap.app" --web-dir out
npx cap add ios
npx cap add android
```

### `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forkmap.app',
  appName: 'Forkmap',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#ffffff',
    },
  },
}

export default config
```

---

## 6. Authentification — Deep Links

### Problème

L'auth Google Supabase utilise actuellement `/app/auth/callback/route.ts` (serveur). En mode export statique, cette route n'existe pas sur le device.

### Solution

Configurer Supabase pour rediriger vers un schéma custom `com.forkmap.app://` que Capacitor intercepte.

### Changements côté Supabase Dashboard

- Ajouter `com.forkmap.app://auth/callback` dans **URL Configuration → Redirect URLs**

### Changements côté code

**`lib/hooks/useAuth.ts`** — modifier `signInWithGoogle` :

```typescript
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Au lieu de window.location.origin + '/auth/callback'
const redirectTo = Capacitor.isNativePlatform()
  ? 'com.forkmap.app://auth/callback'
  : `${window.location.origin}/auth/callback`

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo },
})
```

**`app/page.tsx` ou `app/layout.tsx`** — écouter le deep link :

```typescript
import { App } from '@capacitor/app'

App.addListener('appUrlOpen', ({ url }) => {
  const callbackUrl = new URL(url)
  if (callbackUrl.pathname === '/auth/callback') {
    const code = callbackUrl.searchParams.get('code')
    supabase.auth.exchangeCodeForSession(code)
  }
})
```

### Configuration native

- **iOS** : ajouter URL scheme `com.forkmap.app` dans `ios/App/App/Info.plist`
- **Android** : ajouter intent-filter dans `android/app/src/main/AndroidManifest.xml`

---

## 7. Features natives

### A — Notifications push

**Setup :**

- iOS : certificat APNS dans Apple Developer Portal
- Android : projet Firebase, fichier `google-services.json` dans `android/app/`
- Supabase : stocker les tokens push dans une table `push_tokens(user_id, token, platform)`

**Implémentation :**

```typescript
// lib/native/pushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications'

export async function registerPushNotifications(userId: string) {
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async ({ value: token }) => {
    await fetch('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    })
  })
}
```

**Triggers côté serveur (Supabase Edge Function) :**

- Nouveau resto dans la zone favorite de l'utilisateur
- Rappel de visite planifiée (J-1)

### B — Partage natif

```typescript
// Dans PlaceDetail.tsx
import { Share } from '@capacitor/share'

async function sharePlace(place: PlaceCard) {
  await Share.share({
    title: place.name,
    text: `${place.name} — ${place.address}`,
    url: `https://forkmap.vercel.app/place/${place.id}`,
    dialogTitle: 'Partager ce restaurant',
  })
}
```

Bouton "Partager" ajouté dans la fiche détail `PlaceDetail.tsx`, visible uniquement si `Capacitor.isNativePlatform()`.

### C — Retour haptique

```typescript
// lib/native/haptics.ts
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export async function lightTap() {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

export async function heavyTap() {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Heavy })
}
```

**Utilisé dans :**

- `MapView.tsx` : `lightTap()` au tap sur un marqueur
- `useRestaurants.ts` : `heavyTap()` à l'ajout/suppression d'un favori

### D — Géolocalisation native

```typescript
// lib/native/geolocation.ts
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'

export async function getCurrentPosition() {
  if (Capacitor.isNativePlatform()) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }
  // fallback navigateur
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true }
    )
  })
}
```

Remplace `navigator?.geolocation` dans `useHomeState.ts` → fonction `locate`.

### E — Widget écran d'accueil _(Phase 2)_

Hors scope pour ce sprint. Requiert :

- **iOS** : extension Swift WidgetKit (nouveau target Xcode)
- **Android** : AppWidget en Kotlin

À planifier après la publication initiale.

### F — Mode plein écran

```typescript
// app/layout.tsx (ou capacitor init)
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Default })
  StatusBar.setBackgroundColor({ color: '#ffffff' })
}
```

---

## 8. Pipeline de build & release

### Script de build complet

```bash
# 1. Build static
npm run build

# 2. Sync vers iOS + Android
npx cap sync

# iOS
npx cap open ios
# → Xcode : Product > Archive > Distribute App > App Store Connect

# Android
npx cap open android
# → Android Studio : Build > Generate Signed Bundle/APK > AAB > Play Store
```

### Prérequis

- **iOS** : Mac avec Xcode 15+, Apple Developer Program ($99/an), certificats de distribution
- **Android** : Android Studio, Java 17+, compte Google Play Console ($25 one-time)

### Versioning

- `package.json` version → synchronisée dans `capacitor.config.ts`
- iOS : `CFBundleShortVersionString` + `CFBundleVersion` dans Info.plist
- Android : `versionName` + `versionCode` dans build.gradle

---

## 9. Fichiers modifiés / créés

| Fichier                            | Action  | Description                                                       |
| ---------------------------------- | ------- | ----------------------------------------------------------------- |
| `next.config.ts`                   | Modifié | Ajouter `output: 'export'`, `trailingSlash`, `images.unoptimized` |
| `capacitor.config.ts`              | Créé    | Config Capacitor (appId, plugins)                                 |
| `lib/hooks/useAuth.ts`             | Modifié | Deep link OAuth redirect                                          |
| `lib/hooks/useHomeState.ts`        | Modifié | Géolocalisation native                                            |
| `lib/native/haptics.ts`            | Créé    | Helper haptics                                                    |
| `lib/native/geolocation.ts`        | Créé    | Helper géolocalisation                                            |
| `lib/native/pushNotifications.ts`  | Créé    | Enregistrement push tokens                                        |
| `components/place/PlaceDetail.tsx` | Modifié | Bouton partage natif                                              |
| `components/map/MapView.tsx`       | Modifié | Haptics sur tap marqueur                                          |
| `app/layout.tsx`                   | Modifié | StatusBar + deep link listener                                    |
| `app/api/push-tokens/route.ts`     | Créé    | Endpoint stockage tokens push                                     |
| `ios/`                             | Créé    | Projet Xcode (généré par Capacitor)                               |
| `android/`                         | Créé    | Projet Android Studio (généré)                                    |

---

## 10. Estimation

| Tâche                             | Effort                |
| --------------------------------- | --------------------- |
| Vercel deploy + variables env     | 30 min                |
| `output: 'export'` + fix images   | 1h                    |
| Capacitor init + plugins install  | 1h                    |
| Deep links auth                   | 2h                    |
| Share + Haptics + StatusBar + GPS | 2h                    |
| Push notifications (APNS + FCM)   | 4h                    |
| Tests sur device physique         | 2h                    |
| App Store + Play Store submission | 3h                    |
| **Total**                         | **~15h (~1.5 jours)** |

---

## 11. Hors scope (Phase 2)

- Widget écran d'accueil (iOS WidgetKit + Android AppWidget)
- Mode offline (service worker + cache des restos récents)
- Notifications push géolocalisées (geofencing)
- Apple Pay / Google Pay pour réservations
