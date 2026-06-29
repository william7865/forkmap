# Fondation native & coquille app (Lot 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'app Forkmap installée (Capacitor) une coquille native distincte du site web — tab bar 4 onglets, chrome natif, comportements natifs — sans modifier le rendu web.

**Architecture:** Branchement par plateforme (`Capacitor.isNativePlatform()`, SSR-safe) au niveau du layout : natif → nouvelle `AppTabBar` ; web → `NavWrapper` existant inchangé. Le chrome natif (status bar, safe-areas, anti-tics-web, splash) et les comportements natifs (Plans natif, haptique, partage, deep link OAuth) s'activent uniquement en natif via les wrappers `lib/native/*`. Quelques corrections i18n bloquantes sont incluses.

**Tech Stack:** Next.js 15 (App Router) · React 18 · TypeScript strict · Capacitor 8 (status-bar, splash-screen, app, haptics) · lucide-react · Vitest · styles inline + variables CSS.

## Global Constraints

- **Interface uniquement en français.** Toute chaîne visible passe par `useLanguage().tr(key)` + une `TranslationKey` dans `lib/i18n/translations.ts`. Jamais de texte affiché en dur.
- **Jamais d'import `@capacitor/*` direct dans du code partagé** — toujours via les wrappers `lib/native/*` (compatibles web). Exception tolérée : `Capacitor.isNativePlatform()` depuis `@capacitor/core` (déjà le pattern existant) et l'init dans `CapacitorInit.tsx`.
- **Détection plateforme SSR-safe** : `isNativePlatform()` n'est fiable qu'après hydratation. Rendre la nav web au premier paint, basculer natif après montage (pattern `useIsMobile`). `suppressHydrationWarning` déjà sur `<html>`.
- **Pas de `console.log`** (ESLint autorise `console.warn`/`console.error`).
- **`any` = warning** — typer correctement (`types/index.ts` fait foi).
- **Web figé** : aucune régression visible côté web hors quick-wins i18n.
- **Accent unique terracotta** `--accent: #bb5e2e` ; fond `--bg: #fffdf8` ; surface `--surface: #f6efe1` ; texte `--text` / `--text-3`. Polices `--font-display` (Bricolage), `--font-body` (Hanken).
- **Avant de déclarer terminé** : `npm run test:run && npm run lint && npm run type-check`, puis `npm run build` (web) et `npm run build:mobile` (export). Recette simulateur iOS : `npm run build:mobile` → `npx cap sync ios` → `xcodebuild … -scheme App -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO build` → `simctl install/launch` → `simctl io booted screenshot`.
- **Fichiers Claude (specs/plans)** : commit local OK, **jamais `git push`**.

---

## File Structure

| Fichier | Responsabilité | Action |
| --- | --- | --- |
| `lib/cuisine.ts` | Mapping nom de cuisine OSM (EN/slug) → libellé FR | Créer |
| `tests/cuisine.test.ts` | Tests du mapping cuisine | Créer |
| `components/place/PlaceCard.tsx` | Affiche le libellé cuisine (carte/liste) | Modifier (afficher FR) |
| `components/ui/LegalFooter.tsx` | Footer légal | Modifier (FR via `tr`) |
| `lib/i18n/translations.ts` | Clés de traduction | Modifier (ajouts) |
| `app/api/contact/route.ts` | Erreurs formulaire contact | Modifier (message réseau FR) |
| `app/globals.css` | Helpers safe-area + classe `native-app` anti-tics-web | Modifier |
| `components/native/CapacitorInit.tsx` | Status bar + classe native + splash hide | Modifier |
| `capacitor.config.ts` | Config splash screen | Modifier |
| `lib/native/platform.ts` | Hook `useIsNative()` SSR-safe | Créer |
| `components/ui/AppTabBar.tsx` | Tab bar native 4 onglets | Créer |
| `components/ui/AppChrome.tsx` | Branche AppTabBar (natif) vs NavWrapper (web) | Créer |
| `app/layout.tsx` | Monte AppChrome au lieu de NavWrapper en dur | Modifier |
| `lib/hooks/useHomeState.ts` | Lit `?surprise=1` pour ouvrir le deck | Modifier |
| `app/(pages)/account/page.tsx` | Section réglages « Plus » en natif | Modifier |
| `components/place/PlaceDetail.tsx` | Itinéraire → Plans natif en natif | Modifier |
| `lib/native/haptics.ts` | (déjà existant) appelé sur onglet + favori | Utiliser |

---

## Task 1 : Mapping cuisine EN→FR (lib + tests)

**Files:**
- Create: `lib/cuisine.ts`
- Test: `tests/cuisine.test.ts`

**Interfaces:**
- Produces: `frCuisine(raw: string): string` — convertit un nom de cuisine OSM brut (`"italian"`, `"French"`, `"sushi;japanese"`) en libellé FR (`"Italien"`, `"Français"`, `"Sushi"`). Inconnu → Capitalize du brut. Gère les valeurs multiples séparées par `;` ou `,` (prend la première). Vide → `''`.

- [ ] **Step 1: Write the failing test**

`tests/cuisine.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { frCuisine } from '@/lib/cuisine'

describe('frCuisine', () => {
  it('translates known cuisines case-insensitively', () => {
    expect(frCuisine('italian')).toBe('Italien')
    expect(frCuisine('French')).toBe('Français')
    expect(frCuisine('BURGER')).toBe('Burger')
    expect(frCuisine('japanese')).toBe('Japonais')
  })
  it('takes the first of multiple values', () => {
    expect(frCuisine('sushi;japanese')).toBe('Sushi')
    expect(frCuisine('pizza,italian')).toBe('Pizza')
  })
  it('capitalizes unknown cuisines', () => {
    expect(frCuisine('fusion_experimental')).toBe('Fusion experimental')
  })
  it('returns empty string for empty input', () => {
    expect(frCuisine('')).toBe('')
    expect(frCuisine('   ')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- cuisine`
Expected: FAIL — `Cannot find module '@/lib/cuisine'`.

- [ ] **Step 3: Write minimal implementation**

`lib/cuisine.ts` :
```ts
// Mapping des valeurs de cuisine OSM (anglais/slug) vers un libellé FR.
// Les valeurs OSM `cuisine=` sont en anglais et parfois multiples (`a;b`).
const MAP: Record<string, string> = {
  french: 'Français',
  italian: 'Italien',
  japanese: 'Japonais',
  chinese: 'Chinois',
  thai: 'Thaï',
  vietnamese: 'Vietnamien',
  indian: 'Indien',
  mexican: 'Mexicain',
  spanish: 'Espagnol',
  greek: 'Grec',
  lebanese: 'Libanais',
  turkish: 'Turc',
  moroccan: 'Marocain',
  korean: 'Coréen',
  american: 'Américain',
  burger: 'Burger',
  pizza: 'Pizza',
  sushi: 'Sushi',
  kebab: 'Kebab',
  seafood: 'Fruits de mer',
  steak_house: 'Grill',
  barbecue: 'Barbecue',
  sandwich: 'Sandwich',
  bakery: 'Boulangerie',
  cafe: 'Café',
  coffee_shop: 'Café',
  ice_cream: 'Glacier',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  asian: 'Asiatique',
  regional: 'Régional',
  international: 'International',
  fast_food: 'Fast-food',
  tapas: 'Tapas',
  ramen: 'Ramen',
  noodle: 'Nouilles',
  fish_and_chips: 'Fish & chips',
  crepe: 'Crêperie',
  portuguese: 'Portugais',
  brazilian: 'Brésilien',
  argentinian: 'Argentin',
  german: 'Allemand',
  african: 'Africain',
  ethiopian: 'Éthiopien',
  caribbean: 'Antillais',
}

function capitalize(s: string): string {
  const t = s.replace(/_/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

export function frCuisine(raw: string): string {
  if (!raw) return ''
  const first = raw.split(/[;,]/)[0]?.trim() ?? ''
  if (!first) return ''
  const key = first.toLowerCase().replace(/\s+/g, '_')
  return MAP[key] ?? capitalize(first)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- cuisine`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/cuisine.ts tests/cuisine.test.ts
git commit -m "feat: mapping cuisine OSM EN->FR + tests"
```

---

## Task 2 : Afficher la cuisine en FR sur les cartes/fiche

**Files:**
- Modify: `components/place/PlaceCard.tsx`
- Modify: `components/place/PlaceDetail.tsx`

**Interfaces:**
- Consumes: `frCuisine` (Task 1).

- [ ] **Step 1: Localiser l'affichage cuisine dans `PlaceCard.tsx`**

Run: `grep -n "cuisine" components/place/PlaceCard.tsx`
Repérer où la valeur cuisine brute est rendue (ex. `{place.cuisine}` ou via `extractCuisines`). Le screenshot montre « French / Burger / Italian » sous le nom.

- [ ] **Step 2: Remplacer le rendu brut par `frCuisine(...)`**

En tête de fichier : `import { frCuisine } from '@/lib/cuisine'`.
Remplacer l'affichage du libellé cuisine par `frCuisine(<valeurBrute>)`. Exemple si le code rend `{cuisineLabel}` : afficher `{frCuisine(cuisineLabel)}`. Ne pas changer la logique de filtrage (qui opère sur la valeur brute) — seulement l'affichage.

- [ ] **Step 3: Faire de même dans `PlaceDetail.tsx`**

Run: `grep -n "cuisine" components/place/PlaceDetail.tsx`
Pour chaque rendu **visible** de la cuisine (badge/ligne d'info), envelopper avec `frCuisine(...)`. Importer `frCuisine`. Ne pas toucher aux clés/valeurs utilisées pour le scoring ou les filtres.

- [ ] **Step 4: Vérifier**

Run: `npm run lint && npm run type-check`
Expected: PASS, aucune nouvelle erreur.

- [ ] **Step 5: Commit**

```bash
git add components/place/PlaceCard.tsx components/place/PlaceDetail.tsx
git commit -m "feat: affiche les cuisines en français (cartes + fiche)"
```

---

## Task 3 : Quick-wins i18n — LegalFooter FR + erreur contact FR

**Files:**
- Modify: `components/ui/LegalFooter.tsx`
- Modify: `lib/i18n/translations.ts`
- Modify: `app/api/contact/route.ts`

**Interfaces:**
- Consumes: `useLanguage().tr` (existant).

- [ ] **Step 1: Ajouter les clés FR dans `translations.ts`**

Run: `grep -n "TranslationKey" lib/i18n/translations.ts | head`
Ajouter les clés suivantes (valeur FR) dans le type `TranslationKey` et l'objet `fr` :
```ts
footerBackToMap: 'Carte',
footerPrivacy: 'Confidentialité',
footerTerms: 'Conditions',
footerAttribution: 'Sources des données',
```
(Respecter la structure existante du fichier — type + table `fr`.)

- [ ] **Step 2: Utiliser `tr()` dans `LegalFooter.tsx`**

Remplacer le tableau de liens codés en anglais par des libellés traduits :
```tsx
'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/useLanguage'

export function LegalFooter() {
  const { tr } = useLanguage()
  const links = [
    { href: '/', label: tr('footerBackToMap') },
    { href: '/privacy', label: tr('footerPrivacy') },
    { href: '/terms', label: tr('footerTerms') },
    { href: '/attribution', label: tr('footerAttribution') },
  ]
  return (
    <footer style={{
      borderTop: '1px solid rgba(28,25,23,0.07)',
      padding: '20px 24px',
      display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {links.map(({ href, label }) => (
        <Link key={href} href={href} style={{
          fontSize: 12, fontWeight: 600, color: 'var(--ink-60)',
          textDecoration: 'none', transition: 'color 120ms',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-60)')}
        >
          {label}
        </Link>
      ))}
      <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>
        © {new Date().getFullYear()} Forkmap
      </span>
    </footer>
  )
}
```

- [ ] **Step 3: Harmoniser l'erreur réseau du contact en FR**

Run: `grep -n "Failed to send\|Échec de l'envoi" app/api/contact/route.ts`
Remplacer le message anglais (« Failed to send message… ») par un message français cohérent, ex. : `"Échec de l'envoi du message. Réessayez plus tard."`. Ne pas toucher aux `console.*` déjà encadrés par eslint-disable.

- [ ] **Step 4: Vérifier**

Run: `npm run lint && npm run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/LegalFooter.tsx lib/i18n/translations.ts app/api/contact/route.ts
git commit -m "fix: i18n — LegalFooter et erreur contact en français"
```

---

## Task 4 : Hook `useIsNative()` SSR-safe

**Files:**
- Create: `lib/native/platform.ts`

**Interfaces:**
- Produces: `useIsNative(): boolean` — `false` au SSR et au premier paint, `true` après montage si `Capacitor.isNativePlatform()`. Évite tout mismatch d'hydratation.
- Produces: `isNativeRuntime(): boolean` — lecture synchrone hors-hook (pour code non-React), `false` si `window` indisponible.

- [ ] **Step 1: Écrire le hook**

`lib/native/platform.ts` :
```ts
'use client'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

// SSR-safe : false au premier rendu (serveur + hydratation), puis vrai après montage.
export function useIsNative(): boolean {
  const [native, setNative] = useState(false)
  useEffect(() => {
    setNative(isNativeRuntime())
  }, [])
  return native
}
```

- [ ] **Step 2: Vérifier le typage/lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/native/platform.ts
git commit -m "feat: hook useIsNative SSR-safe (détection plateforme)"
```

---

## Task 5 : CSS — helpers safe-area + classe `native-app` anti-tics-web

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: classe CSS `.native-app` (appliquée sur `<html>` en natif) ; variables `--safe-top/right/bottom/left` ; utilitaires `.safe-pt`, `.safe-pb`.

- [ ] **Step 1: Ajouter les variables safe-area et utilitaires**

Dans `app/globals.css`, dans `:root` ajouter :
```css
  /* ── Safe areas (encoche / home indicator) ── */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
```
Puis, hors `:root`, ajouter les utilitaires :
```css
.safe-pt { padding-top: var(--safe-top); }
.safe-pb { padding-bottom: var(--safe-bottom); }
.safe-px { padding-left: var(--safe-left); padding-right: var(--safe-right); }
```

- [ ] **Step 2: Ajouter la classe `native-app` (anti-tics-web), natif uniquement**

Toujours dans `app/globals.css` :
```css
/* ── Feel natif : appliqué sur <html> uniquement dans l'app installée ── */
.native-app, .native-app body {
  overscroll-behavior: none;          /* pas de rebond élastique de page */
  -webkit-tap-highlight-color: transparent;
}
.native-app * {
  -webkit-touch-callout: none;        /* pas de menu long-press */
}
/* Le chrome n'est pas sélectionnable ; les contenus lisibles le restent */
.native-app button,
.native-app nav,
.native-app [role='tab'],
.native-app [role='button'] {
  -webkit-user-select: none;
  user-select: none;
}
```

- [ ] **Step 3: Vérifier que le build web ne casse pas**

Run: `npm run build`
Expected: build OK (la classe n'est pas encore appliquée — aucun effet web).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: helpers CSS safe-area + classe native-app (anti-tics-web)"
```

---

## Task 6 : Status bar crème + classe `native-app` + masquage splash

**Files:**
- Modify: `components/native/CapacitorInit.tsx`
- Modify: `capacitor.config.ts`

**Interfaces:**
- Consumes: `.native-app` (Task 5).
- Dépendance plugin : `@capacitor/splash-screen` (déjà présent dans le projet — vérifier ; sinon `npm i @capacitor/splash-screen`).

- [ ] **Step 1: Vérifier la présence du plugin splash-screen**

Run: `grep -n "splash-screen" package.json`
Si absent : `npm i @capacitor/splash-screen` puis `npx cap sync ios`.

- [ ] **Step 2: Status bar crème + style sombre + classe native + hide splash**

Dans `CapacitorInit.tsx`, remplacer le corps de `initNative()` :
```ts
    async function initNative() {
      document.documentElement.classList.add('native-app')
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      // Fond crème (papier) + contenu sombre (texte foncé sur fond clair)
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#fffdf8' })
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch {
        // plugin absent — ignore
      }
    }
```
> Note iOS : `Style.Light` = **contenu clair**, `Style.Dark` = **contenu sombre**. Sur fond crème il faut du **contenu sombre** → utiliser `Style.Dark`. Vérifier visuellement au runtime et ajuster (`Light`/`Dark`) selon le rendu réel : l'heure/les icônes système doivent être **foncées et lisibles** sur le crème.

(Corriger l'appel ci-dessus en `Style.Dark` si le rendu simulateur montre des icônes système claires illisibles.)

- [ ] **Step 3: Config splash dans `capacitor.config.ts`**

Ajouter (ou compléter) la section `plugins.SplashScreen` :
```ts
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,          // on masque manuellement après init
      backgroundColor: '#f6efe1',     // papier crème
      showSpinner: false,
      launchAutoHide: false,
    },
  },
```
Conserver le reste de la config (`appId`, `webDir`, etc.).

- [ ] **Step 4: Build mobile + sync + run simulateur**

Run:
```bash
npm run build:mobile && npx cap sync ios && \
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build && cd ../.. && \
xcrun simctl boot "iPhone 17 Pro" 2>/dev/null; open -a Simulator; \
xcrun simctl install booted ios/App/build/Build/Products/Debug-iphonesimulator/App.app && \
xcrun simctl launch booted com.forkmap.app
```
Attendre ~7 s puis : `xcrun simctl io booted screenshot /tmp/native-statusbar.png`
Expected: pas de flash blanc au lancement ; status bar lisible (icônes système foncées sur crème).

- [ ] **Step 5: Commit**

```bash
git add components/native/CapacitorInit.tsx capacitor.config.ts package.json
git commit -m "feat: status bar crème + classe native-app + splash marque"
```

---

## Task 7 : `AppTabBar` — tab bar native 4 onglets

**Files:**
- Create: `components/ui/AppTabBar.tsx`

**Interfaces:**
- Produces: `export default function AppTabBar()` — barre fixe en bas, 4 onglets : Carte (`/`), Surprends-moi (`/?surprise=1`), Favoris (`/favorites`), Compte (`/account`). Onglet actif en `--accent`. Haptique légère au tap. Respecte `safe-area-inset-bottom`.
- Consumes: `lightTap` de `lib/native/haptics.ts` (vérifier le nom exporté — sinon utiliser l'export équivalent), `frCuisine` non requis ici.

- [ ] **Step 1: Vérifier l'export haptique disponible**

Run: `grep -n "export" lib/native/haptics.ts`
Noter le nom de la fonction de tap léger (ex. `lightTap`, `hapticLight`, `tapLight`). L'utiliser à l'étape suivante (remplacer `lightTap` si le nom diffère).

- [ ] **Step 2: Écrire `AppTabBar.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Heart, User } from 'lucide-react'
import { Sparkle } from '@/components/icons' // icône étincelle signature ; sinon lucide `Sparkles`
import { lightTap } from '@/lib/native/haptics'

type Tab = { href: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string; match: (p: string) => boolean }

const TABS: Tab[] = [
  { href: '/', Icon: Map, label: 'Carte', match: (p) => p === '/' },
  { href: '/?surprise=1', Icon: Sparkle, label: 'Surprends-moi', match: () => false },
  { href: '/favorites', Icon: Heart, label: 'Favoris', match: (p) => p.startsWith('/favorites') },
  { href: '/account', Icon: User, label: 'Compte', match: (p) => p.startsWith('/account') },
]

export default function AppTabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        display: 'flex', zIndex: 200,
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: 'var(--s2)',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.label}
            href={tab.href}
            onClick={() => lightTap()}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              textDecoration: 'none', minHeight: 56,
              color: active ? 'var(--accent)' : 'var(--text-3)',
            }}
          >
            <tab.Icon size={22} strokeWidth={active ? 2 : 1.75} />
            <span style={{
              fontSize: 10, fontWeight: active ? 600 : 400,
              fontFamily: 'var(--font-body)', letterSpacing: 0,
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```
> Si `@/components/icons` n'exporte pas `Sparkle`, utiliser `import { Sparkles as Sparkle } from 'lucide-react'`. Vérifier via `grep -n "export" components/icons/index.tsx`.

- [ ] **Step 3: Vérifier typage/lint**

Run: `npm run type-check && npm run lint`
Expected: PASS (le composant n'est pas encore monté — pas d'effet runtime).

- [ ] **Step 4: Commit**

```bash
git add components/ui/AppTabBar.tsx
git commit -m "feat: AppTabBar (tab bar native 4 onglets)"
```

---

## Task 8 : `AppChrome` — branchement natif vs web + montage dans le layout

**Files:**
- Create: `components/ui/AppChrome.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `useIsNative()` (Task 4), `AppTabBar` (Task 7), `NavWrapper` (existant).
- Produces: en natif rend `AppTabBar` ; en web rend `NavWrapper`. Le décalage de contenu (`.main-content-offset`) doit fonctionner dans les deux cas (marge basse de 56 px sur mobile, déjà gérée pour `<768px`).

- [ ] **Step 1: Écrire `AppChrome.tsx`**

```tsx
'use client'
import { useIsNative } from '@/lib/native/platform'
import NavWrapper from './NavWrapper'
import AppTabBar from './AppTabBar'

export default function AppChrome() {
  const native = useIsNative()
  // Web (et premier paint SSR) : nav web inchangée. Natif : tab bar app.
  return native ? <AppTabBar /> : <NavWrapper />
}
```

- [ ] **Step 2: Monter `AppChrome` dans le layout à la place de `NavWrapper`**

Dans `app/layout.tsx` : remplacer l'import et le rendu de `NavWrapper` par `AppChrome`.
```tsx
import AppChrome from '@/components/ui/AppChrome'
// ...
        <CapacitorInit />
        <AppChrome />
        <div className="main-content-offset">{children}</div>
```
Conserver `.main-content-offset` tel quel : en natif la tab bar fait 56 px + safe-area, et la règle `@media (max-width:767px){ margin-bottom:56px }` s'applique déjà (la WebView native est < 768px). Aucune autre modif nécessaire.

- [ ] **Step 3: Vérifier que le web reste identique**

Run: `npm run dev` puis ouvrir `http://localhost:3000` (desktop et fenêtre réduite < 768px).
Expected: nav identique à avant (NavRail desktop / BottomNav mobile). Aucune `AppTabBar` en web.

- [ ] **Step 4: Vérifier dans le simulateur (la tab bar app apparaît)**

Run: recette build:mobile + cap sync + xcodebuild + install/launch (cf. Task 6 Step 4), puis screenshot.
Expected: l'app native affiche la tab bar 4 onglets (Carte · Surprends-moi · Favoris · Compte), **pas** le BottomNav « Carte/Compte/Plus ».

- [ ] **Step 5: Commit**

```bash
git add components/ui/AppChrome.tsx app/layout.tsx
git commit -m "feat: AppChrome — coquille native vs nav web (SSR-safe)"
```

---

## Task 9 : Onglet Surprends-moi → ouvre le deck via `?surprise=1`

**Files:**
- Modify: `lib/hooks/useHomeState.ts`

**Interfaces:**
- Consumes: `setShowSurprise` (existant dans `useHomeState`), `useSearchParams`/`useRouter` (next/navigation).
- Produces: à l'arrivée sur `/?surprise=1`, le deck Surprends-moi s'ouvre puis le param est nettoyé de l'URL.

- [ ] **Step 1: Lire le param et ouvrir le deck**

Dans `lib/hooks/useHomeState.ts`, près de la déclaration de `showSurprise` (ligne ~42), ajouter :
```ts
import { useSearchParams, useRouter } from 'next/navigation'
// ... dans le hook :
const searchParams = useSearchParams()
const router = useRouter()
useEffect(() => {
  if (searchParams.get('surprise') === '1') {
    setShowSurprise(true)
    // nettoie l'URL pour que re-tap fonctionne et que back ne rouvre pas
    router.replace('/')
  }
}, [searchParams, router])
```
> Vérifier que `useEffect` est importé. Si la page est rendue sans Suspense autour de `useSearchParams`, suivre le pattern déjà en place dans le repo (la page accueil lit peut-être déjà des params — `grep -n "useSearchParams" app/page.tsx lib/hooks/useHomeState.ts`). Si un wrapper Suspense est requis pour l'export statique, l'ajouter autour du consommateur dans `app/page.tsx`.

- [ ] **Step 2: Vérifier l'export statique (build:mobile)**

Run: `npm run build:mobile`
Expected: build OK. Si erreur `useSearchParams() should be wrapped in a suspense boundary`, envelopper le composant consommateur dans `<Suspense>` dans `app/page.tsx`.

- [ ] **Step 3: Vérifier en natif**

Build + sync + run simulateur (recette Task 6 Step 4). Taper l'onglet **Surprends-moi** depuis un autre onglet et depuis la carte.
Expected: le deck plein écran s'ouvre ; à la fermeture, l'onglet Carte est actif et re-taper Surprends-moi rouvre le deck.

- [ ] **Step 4: Vérifier lint/type/web**

Run: `npm run lint && npm run type-check && npm run build`
Expected: PASS (web : `/?surprise=1` ouvre aussi le deck — comportement acceptable, non exposé en nav web).

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useHomeState.ts app/page.tsx
git commit -m "feat: onglet Surprends-moi ouvre le deck via ?surprise=1"
```

---

## Task 10 : Compte absorbe « Plus » en natif

**Files:**
- Modify: `app/(pages)/account/page.tsx`

**Interfaces:**
- Consumes: `useIsNative()` (Task 4).
- Produces: en natif, l'écran Compte affiche une section « réglages » listant Paramètres, Aide, À propos, Contact, Attribution + déconnexion (équivalent du menu « Plus » du BottomNav web, qui n'existe pas en natif).

- [ ] **Step 1: Repérer un point d'insertion en bas de l'écran Compte**

Run: `grep -n "return\|Se déconnecter\|signOut\|export default" app/(pages)/account/page.tsx | head`
Identifier la fin du contenu principal (avant le `</div>` racine) pour y insérer la section.

- [ ] **Step 2: Ajouter une section réglages conditionnée natif**

En tête : `import { useIsNative } from '@/lib/native/platform'` et `import Link from 'next/link'` (si absent), `import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'`.
Dans le composant : `const isNative = useIsNative()`.
Insérer en bas du rendu :
```tsx
{isNative && (
  <section style={{
    margin: '24px 16px calc(var(--safe-bottom) + 80px)',
    background: 'var(--bg)', borderRadius: 'var(--r-lg)',
    border: '1px solid var(--border)', overflow: 'hidden',
  }}>
    {[
      { href: '/settings', label: 'Paramètres' },
      { href: '/help', label: 'Aide' },
      { href: '/about', label: 'À propos' },
      { href: '/contact', label: 'Contact' },
      { href: '/attribution', label: 'Attribution' },
    ].map((l, i) => (
      <Link key={l.href} href={l.href} style={{
        display: 'block', padding: '15px 18px', fontSize: 15,
        color: 'var(--text)', textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        borderTop: i === 0 ? 'none' : '1px solid var(--border)',
      }}>
        {l.label}
      </Link>
    ))}
    <button
      onClick={async () => {
        try { await getSupabaseBrowserClient().auth.signOut() } catch { /* ignore */ }
      }}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '15px 18px', fontSize: 15, color: 'var(--coral)',
        background: 'none', border: 'none',
        borderTop: '1px solid var(--border)', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      Se déconnecter
    </button>
  </section>
)}
```
> Si l'écran Compte affiche déjà un bouton de déconnexion, ne pas dupliquer : n'ajouter ici que les liens « Plus » et réutiliser le bouton existant. Vérifier d'abord (`grep -n "déconnect" app/(pages)/account/page.tsx`).

- [ ] **Step 3: Vérifier lint/type**

Run: `npm run lint && npm run type-check`
Expected: PASS.

- [ ] **Step 4: Vérifier en natif**

Build + run simulateur. Aller dans l'onglet Compte, scroller en bas.
Expected: la liste réglages + déconnexion apparaît en natif ; **absente** en web (vérifier `npm run dev`).

- [ ] **Step 5: Commit**

```bash
git add "app/(pages)/account/page.tsx"
git commit -m "feat: l'écran Compte absorbe le menu Plus en natif"
```

---

## Task 11 : Itinéraire → Plans natif en natif

**Files:**
- Modify: `components/place/PlaceDetail.tsx`

**Interfaces:**
- Consumes: `isNativeRuntime()` (Task 4).
- Produces: helper local `openDirections(lat, lon, mode)` — en natif ouvre Apple Maps (`maps://?daddr=…&dirflg=…`) ; en web garde l'URL Google Maps existante.

- [ ] **Step 1: Ajouter le helper d'ouverture d'itinéraire**

En tête de `PlaceDetail.tsx` : `import { isNativeRuntime } from '@/lib/native/platform'`.
Ajouter (hors composant) :
```ts
// dirflg Apple Maps : w=marche, b=vélo (fallback voiture), d=voiture
const APPLE_FLAG: Record<string, string> = { walking: 'w', bicycling: 'd', driving: 'd' }

function openDirections(lat: number, lon: number, gmapsMode: string) {
  if (isNativeRuntime()) {
    const flag = APPLE_FLAG[gmapsMode] ?? 'd'
    // Apple Maps (iOS). Android : géré par geo: dans une itération ultérieure.
    window.open(`maps://?daddr=${lat},${lon}&dirflg=${flag}`, '_system')
    return
  }
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${gmapsMode}`,
    '_blank',
  )
}
```

- [ ] **Step 2: Brancher les deux liens Google Maps existants**

Remplacer le `<a href="https://www.google.com/maps/dir/...">` de la **ligne ~584** et celui de la **ligne ~1034** par un `<button>` (ou garder `<a>` avec `onClick` + `preventDefault`) appelant `openDirections(place.lat, place.lon, 'walking')` (ligne 584, mode marche par défaut) et `openDirections(place.lat, place.lon, currentMode.gmaps)` (ligne 1034). Conserver le style/contenu visuel (`<IcoRoute /> Itinéraire`). Exemple :
```tsx
<button
  type="button"
  onClick={() => openDirections(place.lat, place.lon, currentMode.gmaps)}
  style={{ /* reprendre le style du <a> remplacé */ }}
>
  <IcoRoute /> Itinéraire
</button>
```

- [ ] **Step 3: Vérifier lint/type/build**

Run: `npm run lint && npm run type-check && npm run build && npm run build:mobile`
Expected: PASS.

- [ ] **Step 4: Vérifier en natif**

Build + run simulateur. Ouvrir une fiche resto → « Itinéraire ».
Expected: ouvre l'app **Plans** du système (pas Safari/Google Maps web). En web (`npm run dev`), ouvre toujours Google Maps.

- [ ] **Step 5: Commit**

```bash
git add components/place/PlaceDetail.tsx
git commit -m "feat: itinéraire ouvre Plans natif en natif (Google Maps en web)"
```

---

## Task 12 : Haptique sur ajout/retrait favori + vérif partage natif & OAuth

**Files:**
- Modify: le composant qui toggle le favori (probablement `components/place/PlaceCard.tsx` et/ou `PlaceDetail.tsx` ; trouver via grep)
- Verify: `components/place/PlaceDetail.tsx` (partage), `components/native/CapacitorInit.tsx` (OAuth)

**Interfaces:**
- Consumes: export haptique de `lib/native/haptics.ts` (cf. Task 7 Step 1).

- [ ] **Step 1: Trouver les points de toggle favori**

Run: `grep -rn "favorite\|toggleFavorite\|is_favorite\|onToggleFav\|Heart" components/place/PlaceCard.tsx components/place/PlaceDetail.tsx | head`
Repérer le handler appelé au clic sur le cœur.

- [ ] **Step 2: Ajouter un retour haptique au toggle**

Importer la fonction de tap (ex. `import { lightTap } from '@/lib/native/haptics'`) et l'appeler au début du handler de toggle favori (les deux emplacements si présents). `lib/native/haptics.ts` est déjà no-op en web — aucun risque côté web.

- [ ] **Step 3: Vérifier le partage natif**

Run: `grep -n "isNativePlatform\|Share\|ShareModal" components/place/PlaceDetail.tsx`
Confirmer qu'en natif (`isNativePlatform()`) le partage passe par le plugin Share natif et **pas** la `ShareModal` web. Si le wrapper natif manque, l'ajouter via `lib/native/*` (ne pas importer `@capacitor/share` directement dans le composant — créer `lib/native/share.ts` no-op web si nécessaire). Tester l'ouverture de la feuille de partage système en simulateur.

- [ ] **Step 4: Vérifier le deep link OAuth Google de bout en bout**

Build + run simulateur. Lancer la connexion Google → autoriser → retour à l'app.
Expected: le listener `appUrlOpen` (`CapacitorInit.tsx`) capte `com.forkmap.app://auth/callback?code=…`, échange le code, et la session est établie (l'app revient sur `/` connectée). Si le retour échoue, vérifier le schéma d'URL configuré côté iOS (`ios/App/App/Info.plist` → `CFBundleURLSchemes` contient `com.forkmap.app`) et la `redirectTo` passée à Supabase dans `useAuth.ts`.

- [ ] **Step 5: Vérifier lint/type/builds + commit**

Run: `npm run test:run && npm run lint && npm run type-check && npm run build && npm run build:mobile`
Expected: PASS.
```bash
git add -A
git commit -m "feat: haptique favori + vérif partage natif & deep link OAuth"
```

---

## Self-Review — couverture du spec

- **Coquille / nav 4 onglets** → Tasks 7, 8 (AppTabBar + AppChrome branchement SSR-safe).
- **Surprends-moi = onglet overlay** → Tasks 7 (lien `?surprise=1`) + 9 (ouverture du deck).
- **Compte absorbe « Plus »** → Task 10.
- **Status bar crème / style** → Task 6.
- **Safe areas** → Task 5 (vars + utilitaires) + 7 (tab bar `--safe-bottom`).
- **Splash** → Task 6.
- **Tics web tués en natif** → Tasks 5 (classe) + 6 (application de la classe).
- **Plans natif** → Task 11.
- **Partage natif** → Task 12.
- **Haptique onglet + favori** → Tasks 7 (onglet) + 12 (favori).
- **Deep link OAuth** → Task 12 (vérification de bout en bout).
- **i18n cuisines** → Tasks 1 + 2 ; **LegalFooter + contact** → Task 3.
- **Web inchangé** → garanti par le branchement `useIsNative()` (web = chemin par défaut) ; vérifié à chaque task touchant l'UI (Steps « npm run dev »).
- **Builds web + mobile** → vérifiés dans les tasks 6, 9, 11, 12.

**Note verification :** seule la Task 1 est unit-testable (Vitest, conforme à « tests pour la logique `lib/` »). Le reste est UI/natif → vérification par `lint` + `type-check` + `build`/`build:mobile` + capture simulateur. C'est cohérent avec l'état actuel du repo (tests limités à `lib/`).

**Ordre recommandé d'exécution :** 1 → 2 → 3 (quick-wins i18n, sans risque) ; 4 → 5 → 6 (fondation plateforme/CSS/chrome) ; 7 → 8 → 9 (coquille + onglets) ; 10 (Compte) ; 11 → 12 (comportements natifs). Chaque task est commit-able indépendamment.
