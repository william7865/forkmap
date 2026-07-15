// components/native/CapacitorInit.tsx
// Client component — runs on every page mount on native.
// Initialises StatusBar, listens for OAuth deep links, and drains the shares
// the iOS Share Extension couldn't post itself (offline / signed out).
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { registerPushNotifications } from '@/lib/native/pushNotifications'
import { readPendingShares, clearPendingShares } from '@/lib/native/app-group'
import { platformFromUrl } from '@/lib/import/parse'
import { apiFetch } from '@/lib/api'
import { resolveTheme, getThemePref, applyTheme, systemPrefersDark } from '@/lib/theme'

/** Resolve + apply the theme and sync the native status bar to match. */
async function syncTheme() {
  // Web is never themed here — leave <html> without data-theme (the dark CSS is
  // scoped to html.native-app[data-theme='dark'] and never matches on web).
  if (!Capacitor.isNativePlatform()) return
  const theme = resolveTheme(getThemePref(), systemPrefersDark(), true)
  applyTheme(theme)
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0f0f10' : '#ffffff' })
  } catch {
    /* plugin absent — ignore */
  }
}

/** Recompute the theme (e.g. after the settings toggle or an OS change). */
export function refreshTheme() {
  void syncTheme()
}

/**
 * Measure the device safe-area insets once and pin them as constant pixels on
 * :root, overriding the env()-based defaults. A full-screen fixed probe reads
 * the true inset regardless of the current route's scroll context, so the fixed
 * tab bar keeps the same height on every tab. Only overwrites when the reading
 * is sane (0–120px) — a stale 0 on the first frame is corrected by the second
 * call after the splash hides.
 */
function freezeSafeAreaInsets() {
  if (typeof document === 'undefined' || !document.body) return
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;z-index:-1'
  const top = document.createElement('div')
  top.style.cssText = 'position:absolute;top:0;left:0;width:0;height:env(safe-area-inset-top,0px)'
  const bottom = document.createElement('div')
  bottom.style.cssText =
    'position:absolute;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom,0px)'
  probe.appendChild(top)
  probe.appendChild(bottom)
  document.body.appendChild(probe)
  requestAnimationFrame(() => {
    const t = Math.round(top.getBoundingClientRect().height)
    const b = Math.round(bottom.getBoundingClientRect().height)
    const root = document.documentElement.style
    if (t >= 0 && t <= 120) root.setProperty('--safe-top', `${t}px`)
    if (b >= 0 && b <= 120) root.setProperty('--safe-bottom', `${b}px`)
    probe.remove()
  })
}

export default function CapacitorInit() {
  const router = useRouter()

  // StatusBar + deep link listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    async function initNative() {
      document.documentElement.classList.add('native-app')
      // App native : bloque le zoom auto d'iOS au focus des champs (feel natif).
      // Scopé au natif — le viewport du site web reste inchangé.
      let vp = document.querySelector('meta[name="viewport"]')
      if (!vp) {
        vp = document.createElement('meta')
        vp.setAttribute('name', 'viewport')
        document.head.appendChild(vp)
      }
      vp.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
      // Freeze the safe-area insets to constant pixels. In WKWebView,
      // env(safe-area-inset-*) is route-dependent: it reports the full inset on a
      // full-height page (the map, 100dvh) but collapses toward 0 on scrolling
      // document pages (Favoris, Social) — so the fixed tab bar lost its bottom
      // padding and appeared to jump when switching tabs. A full-screen fixed
      // probe reads the true inset once; writing it as px makes every route pad
      // identically. Re-measured after the splash hides in case the runtime
      // viewport change hadn't settled on the first frame.
      freezeSafeAreaInsets()
      // Filet fiable WebKit : bloque le pincement (gesture*) — le viewport ne suffit
      // pas toujours dans la WKWebView. Leaflet gère son propre zoom via touch events,
      // donc la carte reste zoomable.
      ;['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
        document.addEventListener(t, (e: Event) => e.preventDefault(), { passive: false })
      )
      // Apply the theme (light/dark) while the splash still covers the app → no flash.
      await syncTheme()
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        // Keep the logo splash visible briefly so it reads even on fast cold
        // starts (Insta/YouTube-style), then reveal the app.
        await new Promise((r) => setTimeout(r, 800))
        await SplashScreen.hide()
        // Viewport has fully settled by now — re-freeze in case the first
        // measurement (before layout) read a stale 0.
        freezeSafeAreaInsets()
      } catch {
        // plugin absent — ignore
      }
    }

    initNative()

    let listenerHandle: { remove: () => Promise<void> } | null = null

    async function setupDeepLinks() {
      const { App: CapApp } = await import('@capacitor/app')
      const sb = getSupabaseBrowserClient()

      listenerHandle = await CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url)
          // Matches: com.forkmap.app://auth/callback?code=…
          if (parsed.hostname === 'auth' && parsed.pathname === '/callback') {
            const code = parsed.searchParams.get('code')
            if (code) {
              await sb.auth.exchangeCodeForSession(code)
              router.replace('/')
            }
          }
          // NB: no `import` deep link any more — the Share Extension posts the
          // import itself and never wakes the app (the user stays in TikTok).
        } catch {
          // Malformed URL — ignore
        }
      })
    }

    setupDeepLinks()

    return () => {
      listenerHandle?.remove()
    }
  }, [router])

  // Re-apply the theme when the OS light/dark setting changes (auto mode).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => refreshTheme()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  // Drain the Share Extension's offline queue.
  // The extension posts its imports itself; it only queues when it had no token
  // (signed out) or no network. Nothing is ever lost: we post each entry here
  // and clear the queue only once the server has taken them all.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    let draining = false

    async function drain(token: string) {
      if (draining || cancelled) return
      draining = true
      try {
        const shares = await readPendingShares()
        if (shares.length === 0) return
        let allPosted = true
        for (const share of shares) {
          try {
            const res = await apiFetch('/api/imports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                url: share.url,
                platform: platformFromUrl(share.url),
                ...(share.note ? { note: share.note } : {}),
              }),
            })
            if (!res.ok) allPosted = false
          } catch {
            allPosted = false
          }
        }
        // POST /api/imports upserts on (user_id, url), so a retried entry never
        // duplicates — we can safely keep the queue until everything lands.
        if (allPosted && !cancelled) await clearPendingShares()
      } catch (err) {
        console.warn('[CapacitorInit] pending shares drain failed', err)
      } finally {
        draining = false
      }
    }

    const sb = getSupabaseBrowserClient()
    void sb.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) void drain(data.session.access_token)
    })
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      // Shares queued while signed out go up as soon as the user signs in.
      if (event === 'SIGNED_IN' && session?.access_token) void drain(session.access_token)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

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
