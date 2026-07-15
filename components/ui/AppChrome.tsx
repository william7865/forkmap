'use client'
import { useIsNative } from '@/lib/native/platform'
import NavWrapper from './NavWrapper'
import AppTabBar from './AppTabBar'

// `forceNative` comes from the server layout (true only for the Capacitor static
// export). Without it, useIsNative() is false on first paint and flips true after
// mount — the web BottomNav renders first, then swaps to the taller AppTabBar, so
// the bar visibly jumps on app open. Rendering AppTabBar straight into the static
// HTML removes the swap: same markup on the server and the first client paint.
export default function AppChrome({ forceNative = false }: { forceNative?: boolean }) {
  const native = useIsNative()
  return native || forceNative ? <AppTabBar /> : <NavWrapper />
}
