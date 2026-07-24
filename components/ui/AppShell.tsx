'use client'
import { usePathname } from 'next/navigation'
import { useIsNative } from '@/lib/native/platform'
import AppChrome from './AppChrome'
import GetAppBanner from '@/components/app/GetAppBanner'

// Route-aware chrome. Everywhere in the web APP (and the whole native app) the
// content is framed by AppChrome — the desktop NavRail / mobile BottomNav — and
// offset to clear it. The exception is the public marketing SITE: the landing at
// `/` plus its content/legal pages. Those own the full-bleed SiteHeader/GlobalFooter
// layout (no NavRail, no offset, no get-app banner), so the whole public web reads
// as one site rather than the app rail bleeding into marketing pages.
//
// `forceNative` is true only for the Capacitor static export, where `/` is the
// map, not the landing — so the exception never applies there and the chrome
// always shows. On the web, useIsNative() is false and pathname decides.
const SITE_ROUTES = new Set([
  '/',
  '/about',
  '/help',
  '/contact',
  '/privacy',
  '/terms',
  '/attribution',
])

export default function AppShell({
  children,
  forceNative = false,
}: {
  children: React.ReactNode
  forceNative?: boolean
}) {
  const pathname = usePathname()
  const native = useIsNative() || forceNative
  const bareSite = SITE_ROUTES.has(pathname) && !native

  if (bareSite) return <>{children}</>

  return (
    <>
      <AppChrome forceNative={forceNative} />
      {/* Nudge web visitors to the native app (self-hides in the app). */}
      <GetAppBanner />
      {/* Push content right on desktop, up on mobile */}
      <div className="main-content-offset">{children}</div>
      <style>{`
        /* Sole reservation for the fixed web chrome: the 52px NavRail on desktop,
           the 56px + 1px border BottomNav on mobile. Pages must not add their own.
           html.native-app renders AppTabBar instead, which reserves nothing here. */
        @media (min-width: 768px) { .main-content-offset { margin-left: 52px; } }
        @media (max-width: 767px) {
          .main-content-offset { margin-bottom: calc(57px + var(--safe-bottom)); }
        }
        html.native-app .main-content-offset { margin-left: 0; margin-bottom: 0; }
      `}</style>
    </>
  )
}
