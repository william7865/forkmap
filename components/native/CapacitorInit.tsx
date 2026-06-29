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
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      // Cream paper background + dark content (dark text/icons on light bg)
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#fffdf8' })
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
