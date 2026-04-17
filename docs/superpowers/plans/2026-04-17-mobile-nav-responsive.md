# Mobile Navigation & Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web-based SPA bottom nav bar for mobile, simplify the mobile header, and fix responsive layouts on favorites, account, and shared layout components.

**Architecture:** A new `MobileNav` component uses Next.js `Link` (no page reload → session stays in memory → auth guard never fires incorrectly). It is added to `app/layout.tsx` so it renders on all pages. The main page BottomSheet gets a `bottomOffset` prop to sit above the nav. All responsive fixes use the existing `useIsMobile()` hook with inline conditional styles.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Tailwind CSS (minimal, design system via CSS vars in `globals.css`) · `useIsMobile()` from `lib/hooks/useMediaQuery.ts` · `usePathname()` from `next/navigation`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/ui/MobileNav.tsx` | **Create** | Fixed bottom nav, 3 SPA tabs, active state |
| `app/layout.tsx` | **Modify** | Add `<MobileNav />` after children |
| `components/ui/BottomSheet.tsx` | **Modify** | Add `bottomOffset` prop for nav clearance |
| `app/page.tsx` | **Modify** | Simplify header on mobile, pass `bottomOffset` to BottomSheet |
| `app/(pages)/favorites/page.tsx` | **Modify** | Horizontal scroll controls + 1-col grid on mobile |
| `app/(pages)/account/page.tsx` | **Modify** | 2×2 stats grid + stacked charts on mobile |
| `components/ui/PageLayout.tsx` | **Modify** | Mobile PageHeader (compact) + stacked GlobalFooter |

---

## Task 1: Create MobileNav component

**Files:**
- Create: `components/ui/MobileNav.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ui/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

const IcoMap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IcoBookmark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </svg>
);

const IcoUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const TABS = [
  { href: "/",          label: "Carte",   icon: <IcoMap /> },
  { href: "/favorites", label: "Favoris", icon: <IcoBookmark /> },
  { href: "/account",   label: "Compte",  icon: <IcoUser /> },
] as const;

export default function MobileNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "calc(60px + env(safe-area-inset-bottom, 0px))",
      background: "var(--white)",
      borderTop: "1px solid var(--ink-10)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 1001,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: "0 -4px 24px rgba(14,14,13,0.08)",
      fontFamily: "var(--font-body)",
    }}>
      {TABS.map(({ href, label, icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              color: isActive ? "var(--forest-mid)" : "var(--ink-40)",
              transition: "color 150ms ease",
              position: "relative",
            }}
          >
            {isActive && (
              <span style={{
                position: "absolute",
                top: 6,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--forest-mid)",
              }}/>
            )}
            {icon}
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: "0.02em",
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors related to `MobileNav.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/MobileNav.tsx
git commit -m "feat: add MobileNav bottom bar component for mobile SPA navigation"
```

---

## Task 2: Add MobileNav to app layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add MobileNav import and render**

Replace the entire `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/states/ErrorBoundary";
import { LanguageProvider } from "@/lib/i18n/useLanguage";
import MobileNav from "@/components/ui/MobileNav";

export const metadata: Metadata = {
  title: "Forkmap — Find exceptional restaurants near you",
  description: "Discover the best restaurants near you. Real data, beautiful maps, smart routing.",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ height: "100%", colorScheme: "light" }}>
      <body style={{ height: "100%", margin: 0, padding: 0 }} suppressHydrationWarning>
        <LanguageProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </LanguageProvider>
        <MobileNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: render MobileNav in root layout for all pages"
```

---

## Task 3: Update BottomSheet to support bottom offset

**Files:**
- Modify: `components/ui/BottomSheet.tsx`

The BottomSheet sits at `bottom: 0` and `z-index: 900`. With MobileNav at `z-index: 1001` and `bottom: 0`, the nav overlaps the BottomSheet handle. Add a `bottomOffset` prop so the BottomSheet sits above the nav.

- [ ] **Step 1: Add `bottomOffset` prop to BottomSheet**

In `components/ui/BottomSheet.tsx`, update the `Props` interface and the outer `div` style.

Change the `Props` interface (around line 23):
```tsx
interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  defaultSnap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  /** Pixels from the bottom edge — use to clear a bottom nav bar */
  bottomOffset?: number;
}
```

Update the function signature (around line 40):
```tsx
export default function BottomSheet({
  children,
  title = "Restaurants",
  subtitle,
  defaultSnap = "half",
  onSnapChange,
  bottomOffset = 0,
}: Props) {
```

Update the outer `div` style (around line 127) — change `bottom: 0` to:
```tsx
bottom: bottomOffset,
```

So the style block becomes:
```tsx
style={{
  position: "fixed",
  bottom: bottomOffset,
  left: 0,
  right: 0,
  height: currentHeight,
  background: "var(--white)",
  borderRadius: "20px 20px 0 0",
  boxShadow: "0 -4px 32px rgba(28,25,23,0.14), 0 -1px 0 rgba(28,25,23,0.06)",
  zIndex: 900,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: dragging ? "none" : "height 320ms cubic-bezier(0.16, 1, 0.3, 1)",
  touchAction: "none",
}}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/BottomSheet.tsx
git commit -m "feat: add bottomOffset prop to BottomSheet for nav clearance"
```

---

## Task 4: Simplify mobile header and wire BottomSheet offset

**Files:**
- Modify: `app/page.tsx`

Two changes: (1) hide non-essential header items on mobile, (2) pass `bottomOffset={64}` to BottomSheet so it sits above the nav.

- [ ] **Step 1: Simplify the header**

In `app/page.tsx`, the `<header>` block starts around line 301. Replace it with a version that hides items on mobile:

```tsx
<header style={{
  height:56, flexShrink:0,
  display:"flex", alignItems:"center",
  padding:"0 20px", gap:10,
  background:"var(--white)",
  borderBottom:"1px solid var(--ink-10)",
  zIndex:1000, position:"relative",
}}>

  {/* Logo */}
  <Link href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none",flexShrink:0 }}>
    <div style={{ width:30,height:30,borderRadius:8,background:"var(--ink)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
          stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    {!isMobile && (
      <span style={{ fontFamily:"var(--font-display)",fontWeight:400,fontSize:20,letterSpacing:"-0.04em",color:"var(--ink)",lineHeight:1 }}>
        fork<em style={{ fontStyle:"italic",color:"var(--forest-mid)" }}>map</em>
      </span>
    )}
  </Link>

  {/* Séparateur — desktop only */}
  {!isMobile && <div style={{ width:1,height:22,background:"var(--ink-10)",flexShrink:0,margin:"0 2px" }}/>}

  {/* Search — desktop only */}
  {!isMobile && (
    <div style={{ flex:1, maxWidth:420, position:"relative" }}>
      <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-40)",pointerEvents:"none",display:"flex" }}>
        <IcoSearch />
      </span>
      <input
        type="text"
        placeholder={tr("search_placeholder")}
        value={nameQuery}
        onChange={e => setNameQuery(e.target.value)}
        style={{
          width:"100%", padding:"8px 32px 8px 34px",
          borderRadius:"var(--r-md)", border:"1px solid var(--ink-10)",
          background:"var(--off-white)", color:"var(--ink)",
          fontSize:13, fontWeight:400, outline:"none", fontFamily:"inherit",
          transition:"all 120ms ease",
        }}
        onFocus={e=>{ e.currentTarget.style.borderColor="var(--forest-mid)"; e.currentTarget.style.background="white"; e.currentTarget.style.boxShadow="var(--s-focus)"; }}
        onBlur={e=>{ e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.boxShadow="none"; }}
      />
      {nameQuery && (
        <button onClick={()=>setNameQuery("")} style={{ position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ink-40)",display:"flex",padding:2 }}>
          <IcoX />
        </button>
      )}
    </div>
  )}

  <div style={{ flex:1 }}/>

  {/* Loading subtle — desktop only */}
  {!isMobile && loading && !enriching && (
    <div style={{ display:"flex",alignItems:"center",gap:5,color:"var(--ink-40)",fontSize:11,fontWeight:500,flexShrink:0 }}>
      <div style={{ width:11,height:11,border:"1.5px solid var(--ink-10)",borderTop:"1.5px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      Chargement
    </div>
  )}

  {/* Filtres — desktop only */}
  {!isMobile && (
    <button onClick={()=>setShowFilters(v=>!v)} style={{
      display:"flex", alignItems:"center", gap:6,
      padding:"7px 13px", borderRadius:"var(--r-md)", cursor:"pointer",
      fontSize:12, fontWeight:500, fontFamily:"var(--font-body)",
      background: showFilters ? "var(--forest-mid)" : "var(--off-white)",
      border:`1px solid ${showFilters ? "var(--forest-mid)" : "var(--ink-10)"}`,
      color: showFilters ? "white" : "var(--ink-60)",
      transition:"all 150ms var(--ease-out)", flexShrink:0,
    }}>
      <IcoSliders />
      {tr("filters")}
      {activeCount > 0 && (
        <span style={{
          minWidth:16, height:16, borderRadius:"var(--r-pill)",
          background: showFilters ? "rgba(255,255,255,0.3)" : "var(--forest-mid)",
          color:"white", fontSize:9, fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px",
        }}>
          {activeCount}
        </span>
      )}
    </button>
  )}

  {/* Favoris — desktop only */}
  {!isMobile && (
    <a href="/favorites" style={{
      display:"flex", alignItems:"center", gap:6,
      padding:"7px 13px", borderRadius:"var(--r-md)",
      textDecoration:"none", fontSize:12, fontWeight:500,
      background:"var(--off-white)", color:"var(--ink-60)",
      border:"1px solid var(--ink-10)", flexShrink:0,
      transition:"all 120ms ease",
    }}
      onMouseEnter={e=>{ e.currentTarget.style.background="var(--cream)"; e.currentTarget.style.color="var(--ink)"; e.currentTarget.style.borderColor="var(--ink-20)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.color="var(--ink-60)"; e.currentTarget.style.borderColor="var(--ink-10)"; }}
    >
      <IcoBookmark />
      {tr("favorites")}
    </a>
  )}

  <AuthButton auth={auth} onOpenModal={() => setShowAuthModal(true)} />
  {!isMobile && <LanguagePicker />}

  <EnrichBar active={enriching} />
</header>
```

- [ ] **Step 2: Pass `bottomOffset` to BottomSheet**

Find the `<BottomSheet` usage (around line 661) and add the prop:

```tsx
{isMobile && (
  <BottomSheet
    title="Restaurants"
    subtitle={loading ? "Chargement…" : `${visiblePlaces.length} trouvés`}
    defaultSnap="half"
    bottomOffset={80}
  >
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: simplify mobile header and offset BottomSheet above nav"
```

---

## Task 5: Fix favorites page responsive layout

**Files:**
- Modify: `app/(pages)/favorites/page.tsx`

- [ ] **Step 1: Add `useIsMobile` import**

At the top of the file, add the import after the existing imports:

```tsx
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
```

- [ ] **Step 2: Add `isMobile` hook call**

Inside the `FavoritesPage` component body, after the existing `useState` declarations, add:

```tsx
const isMobile = useIsMobile();
```

- [ ] **Step 3: Make controls bar horizontally scrollable on mobile**

Find the controls bar `div` (around line 406 — the one with `display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"`):

Replace:
```tsx
<div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap",animation:"fadeUp 280ms var(--ease-out) 40ms both" }}>
```

With:
```tsx
<div style={{
  display:"flex", alignItems:"center", gap:8, marginBottom:16,
  animation:"fadeUp 280ms var(--ease-out) 40ms both",
  ...(isMobile ? { overflowX:"auto" as const, WebkitOverflowScrolling:"touch" as const, scrollbarWidth:"none" as const, paddingBottom:4, flexWrap:"nowrap" as const } : { flexWrap:"wrap" as const }),
}}>
```

- [ ] **Step 4: Make cuisine filter chips horizontally scrollable on mobile**

Find the cuisine filter bar `div` (around line 433 — the one with `display:"flex",alignItems:"center",gap:6,marginBottom:20,flexWrap:"wrap"`):

Replace:
```tsx
<div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:20,flexWrap:"wrap",animation:"fadeUp 280ms var(--ease-out) 60ms both" }}>
```

With:
```tsx
<div style={{
  display:"flex", alignItems:"center", gap:6, marginBottom:20,
  animation:"fadeUp 280ms var(--ease-out) 60ms both",
  ...(isMobile ? { overflowX:"auto" as const, WebkitOverflowScrolling:"touch" as const, scrollbarWidth:"none" as const, paddingBottom:4, flexWrap:"nowrap" as const } : { flexWrap:"wrap" as const }),
}}>
```

- [ ] **Step 5: Make grid view single column on mobile**

Find the grid container (around line 494):

Replace:
```tsx
<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
```

With:
```tsx
<div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
```

- [ ] **Step 6: Add bottom padding so content clears the MobileNav**

Find the `<main>` inner div (around line 392 — `maxWidth:660, margin:"0 auto", padding:"36px 20px 80px"`):

Replace:
```tsx
<div style={{ maxWidth:660, margin:"0 auto", padding:"36px 20px 80px" }}>
```

With:
```tsx
<div style={{ maxWidth:660, margin:"0 auto", padding: isMobile ? "24px 16px 100px" : "36px 20px 80px" }}>
```

- [ ] **Step 7: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/(pages)/favorites/page.tsx
git commit -m "feat: responsive layout for favorites page on mobile"
```

---

## Task 6: Fix account page responsive layout

**Files:**
- Modify: `app/(pages)/account/page.tsx`

- [ ] **Step 1: Add `useIsMobile` import**

Add at the top after existing imports:

```tsx
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
```

- [ ] **Step 2: Add `isMobile` hook call in `AccountPageInner`**

Inside `AccountPageInner`, at the top of the function body (after the `useState` calls):

```tsx
const isMobile = useIsMobile();
```

- [ ] **Step 3: Fix the 4-column stats grid → 2×2 on mobile**

Find the stats grid inside the Hero Card (around line 285 — `gridTemplateColumns:"repeat(4,1fr)"`):

Replace:
```tsx
<div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid var(--ink-10)",marginTop:16 }}>
```

With:
```tsx
<div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", borderTop:"1px solid var(--ink-10)", marginTop:16 }}>
```

Also update the border-right logic for the stats items. Find the `.map((s,i)=>` block and update the `borderRight` condition:

```tsx
{[
  { val:favLoading?"…":favorites.length, label:"Favoris", color:"var(--forest-mid)" },
  { val:statsLoading?"…":(stats?.total_visits??0), label:"Visites", color:"var(--amber)" },
  { val:statsLoading?"…":(stats?.total_spent?`${Math.round(stats.total_spent)}€`:"0€"), label:"Dépensé", color:"var(--coral)" },
  { val:favLoading?"…":(cuisines.length||"—"), label:"Cuisines", color:"#1d65c8" },
].map((s,i)=>(
  <div key={i} style={{
    padding:"12px 8px", textAlign:"center" as const,
    borderRight: isMobile
      ? (i % 2 === 0 ? "1px solid var(--ink-10)" : "none")
      : (i < 3 ? "1px solid var(--ink-10)" : "none"),
    borderBottom: isMobile && i < 2 ? "1px solid var(--ink-10)" : "none",
  }}>
    <div style={{ fontFamily:"var(--font-display)",fontSize:20,fontWeight:400,letterSpacing:"-0.04em",color:s.color,lineHeight:1,marginBottom:3 }}>{s.val}</div>
    <div style={{ fontSize:9.5,fontWeight:600,color:"var(--ink-40)",letterSpacing:"0.06em",textTransform:"uppercase" as const }}>{s.label}</div>
  </div>
))}
```

- [ ] **Step 4: Stack Cuisine + Mood cards on mobile**

Find the Cuisine + Mood grid (around line 336 — `gridTemplateColumns:"1fr 1fr"`):

Replace:
```tsx
<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,animation:"fadeUp 280ms var(--ease-out) 100ms both" }}>
```

With:
```tsx
<div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14, animation:"fadeUp 280ms var(--ease-out) 100ms both" }}>
```

- [ ] **Step 5: Reduce BarChart label width on mobile**

Find the `BarChart` component's label `div` (around line 101 — `width:88`):

Replace:
```tsx
<div style={{ width:88,fontSize:11,fontWeight:600,color:"var(--ink-80)",textAlign:"right" as const,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }} title={d.label}>{d.label}</div>
```

With (the `BarChart` component receives a new optional `labelWidth` prop):

First, update the `BarChart` signature:
```tsx
function BarChart({ data, color="var(--forest-mid)", valueSuffix="", labelWidth=88 }: {
  data: { label: string; value: number; sublabel?: string }[];
  color?: string; valueSuffix?: string; labelWidth?: number;
}) {
```

Then update the label div:
```tsx
<div style={{ width:labelWidth,fontSize:11,fontWeight:600,color:"var(--ink-80)",textAlign:"right" as const,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }} title={d.label}>{d.label}</div>
```

Then pass `labelWidth` at both BarChart call sites:
```tsx
<BarChart
  data={stats!.top_restaurants.slice(0,7).map(r=>({ label:r.name, value:r.count, sublabel:r.total_spent>0?`${r.total_spent.toFixed(0)}€`:undefined }))}
  color="var(--forest-mid)" valueSuffix=" fois"
  labelWidth={isMobile ? 64 : 88}
/>
```

```tsx
<BarChart
  data={stats!.top_restaurants.filter(r=>r.total_spent>0).slice(0,7).map(r=>({ label:r.name, value:Math.round(r.total_spent), sublabel:r.avg_rating>0?`⭐ ${r.avg_rating.toFixed(1)}`:undefined }))}
  color="var(--coral)" valueSuffix="€"
  labelWidth={isMobile ? 64 : 88}
/>
```

- [ ] **Step 6: Fix container padding and max-width on mobile**

Find the outer container div (around line 263 — `maxWidth:640,margin:"0 auto",padding:"32px 20px 80px"`):

Replace:
```tsx
<div style={{ maxWidth:640,margin:"0 auto",padding:"32px 20px 80px",display:"flex",flexDirection:"column",gap:14,width:"100%" }}>
```

With:
```tsx
<div style={{ maxWidth:640, margin:"0 auto", padding: isMobile ? "16px 16px 100px" : "32px 20px 80px", display:"flex", flexDirection:"column", gap:14, width:"100%" }}>
```

- [ ] **Step 7: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/(pages)/account/page.tsx
git commit -m "feat: responsive layout for account page on mobile"
```

---

## Task 7: Fix PageLayout — compact PageHeader and stacked GlobalFooter

**Files:**
- Modify: `components/ui/PageLayout.tsx`

- [ ] **Step 1: Add `useIsMobile` import**

At the top of the file, after the existing imports:

```tsx
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
```

- [ ] **Step 2: Add `isMobile` to `PageHeader`**

Inside `PageHeader`, add at the top of the function body:

```tsx
const isMobile = useIsMobile();
```

Then update the header to hide the wordmark text on mobile:

```tsx
export function PageHeader({
  current,
  actions,
}: {
  current: string;
  actions?: ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <header style={{
      height: 56, flexShrink: 0,
      display: "flex", alignItems: "center",
      padding: "0 16px", gap: 10,
      background: "var(--white)",
      borderBottom: "1px solid var(--ink-10)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Back to map */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 5,
        textDecoration: "none", color: "var(--ink-40)",
        fontSize: 12, fontWeight: 500,
        padding: "5px 9px 5px 6px",
        borderRadius: "var(--r-sm)",
        border: "1px solid transparent",
        transition: "all 120ms ease",
        fontFamily: "var(--font-body)",
        flexShrink: 0,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "var(--forest-mid)";
          e.currentTarget.style.background = "var(--forest-pale)";
          e.currentTarget.style.borderColor = "rgba(45,122,85,0.2)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "var(--ink-40)";
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        <IcoArrowLeft />
        {!isMobile && "Carte"}
      </Link>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: "var(--ink-10)", flexShrink: 0 }}/>

      {/* Logo — icon only on mobile, full wordmark on desktop */}
      {isMobile ? <ForkmapLogo size={28} /> : <ForkmapWordmark />}

      <div style={{ flex: 1 }}/>

      {/* Custom actions slot */}
      {actions}

      {/* Current page pill */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 10, fontWeight: 600,
        color: "var(--forest-mid)",
        letterSpacing: "0.12em", textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: "var(--r-pill)",
        background: "var(--forest-pale)",
        border: "1px solid rgba(45,122,85,0.18)",
        fontFamily: "var(--font-body)",
        flexShrink: 0,
        whiteSpace: "nowrap" as const,
      }}>
        <span style={{ display: "block", width: 10, height: 1.5, background: "var(--forest-mid)" }}/>
        {current}
      </span>
    </header>
  );
}
```

- [ ] **Step 3: Add `isMobile` to `GlobalFooter` and stack columns**

Inside `GlobalFooter`, add at the top:

```tsx
const isMobile = useIsMobile();
```

Then replace the inner grid div (around line 199 — `gridTemplateColumns: "1fr repeat(3, auto)"`):

```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr repeat(3, auto)",
  gap: isMobile ? 28 : 48,
  marginBottom: 40,
}}>
```

Also update the bottom bar (around line 250):

```tsx
<div style={{
  borderTop: "1px solid var(--ink-10)", paddingTop: 20,
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "center",
  flexWrap: "wrap", gap: 8,
}}>
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/PageLayout.tsx
git commit -m "feat: responsive PageHeader and GlobalFooter for mobile"
```

---

## Task 8: Final verification and push

- [ ] **Step 1: Run full type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 3: Manual test checklist**

Start dev server: `npm run dev`

On mobile (or DevTools mobile emulation at 390px width):
- [ ] Bottom nav bar appears with 3 tabs: Carte, Favoris, Compte
- [ ] Tapping "Carte" navigates to `/` — active dot shows
- [ ] Tapping "Favoris" navigates to `/favorites` using SPA (no page reload) — auth state preserved
- [ ] Tapping "Compte" navigates to `/account` using SPA (no page reload) — auth state preserved
- [ ] Main page header shows only logo + AuthButton (no search/filters/favorites link)
- [ ] BottomSheet sits above the nav bar (not hidden behind it)
- [ ] Favorites page controls scroll horizontally
- [ ] Favorites page grid view is single column
- [ ] Account stats show 2×2 on mobile
- [ ] Account cuisine+mood charts are stacked
- [ ] Footer is single-column on mobile
- [ ] PageHeader on favorites/account shows compact version

On desktop (1280px):
- [ ] Bottom nav is hidden
- [ ] Header shows all elements as before
- [ ] Footer shows multi-column layout
- [ ] Account stats show 4 columns

- [ ] **Step 4: Push**

```bash
git push origin claude/fix-ios-build-errors-XOUMa
```
