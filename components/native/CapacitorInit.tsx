// components/native/CapacitorInit.tsx
// Client component — runs on every page mount on native.
// Initialises StatusBar and listens for OAuth deep links.
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
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      // Indigo Éditorial: white background + dark content (dark text/icons on light bg)
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#ffffff' })
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        // Keep the logo splash visible briefly so it reads even on fast cold
        // starts (Insta/YouTube-style), then reveal the app.
        await new Promise((r) => setTimeout(r, 800))
        await SplashScreen.hide()
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
