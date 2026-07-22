import type { Metadata, Viewport } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/states/ErrorBoundary'
import { LanguageProvider } from '@/lib/i18n/useLanguage'
import AppShell from '@/components/ui/AppShell'
import CapacitorInit from '@/components/native/CapacitorInit'
import { ImportsProvider } from '@/lib/hooks/useImportsContext'
import { ToastProvider } from '@/lib/hooks/useToastContext'
import BootSplash from '@/components/native/BootSplash'

export const viewport: Viewport = {
  // Static <meta name="theme-color">, emitted at build time — can't reference a CSS var().
  // Kept in sync with --surface.
  themeColor: '#f8f9fa',
  // Ship `viewport-fit=cover` in the FIRST frame. Without it the native WebView
  // starts inset (env(safe-area-inset-*) = 0), then CapacitorInit switches to
  // cover and the insets jump 0 → 47px — shoving the top UI down right as the
  // splash lifts (the "screen shifts down on open" glitch). Setting it here means
  // the insets are correct from frame one, so nothing moves.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Forkmap · Trouver un restaurant près de chez soi',
  description:
    'Trouvez où manger près de chez vous. Vraies données, carte interactive, itinéraires.',
}

// The native shell loads the bundle from disk, so there is no HTTP response and
// `headers()` in next.config.ts never runs — the app shipped with no CSP at all.
// A <meta> element is the only way to carry one there. Emitted for the static
// export only; on the web the real headers do the job (and a meta would just
// duplicate them). `frame-ancestors` is ignored in meta form, hence omitted.
const isExport = process.env.NEXT_EXPORT === 'true'
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? ''

const NATIVE_CSP = [
  "default-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `script-src 'self' 'unsafe-inline' https://unpkg.com`,
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  // Les vignettes des posts importés viennent des CDN des réseaux (TikTok,
  // Instagram, YouTube) — sans ces hôtes, la rangée « Vus sur les réseaux »
  // n'affiche que des dégradés.
  `img-src 'self' data: blob: ${API_ORIGIN} https://*.supabase.co https://fastly.4sqi.net https://*.4sqi.net https://*.googleusercontent.com https://*.basemaps.cartocdn.com https://unpkg.com https://upload.wikimedia.org https://commons.wikimedia.org https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.cdninstagram.com https://*.fbcdn.net https://i.ytimg.com`,
  `connect-src 'self' ${API_ORIGIN} https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://api.foursquare.com https://router.project-osrm.org https://overpass.kumi.systems https://overpass.openstreetmap.ru https://maps.mail.ru https://nominatim.openstreetmap.org`,
  "font-src 'self' https://fonts.gstatic.com",
]
  .join('; ')
  .replace(/\s+/g, ' ')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={isExport ? 'native-app' : undefined}
      style={{ height: '100%', colorScheme: 'light' }}
      suppressHydrationWarning
    >
      {isExport && (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={NATIVE_CSP} />
        </head>
      )}
      <body style={{ height: '100%', margin: 0, padding: 0 }}>
        <LanguageProvider>
          {/* One imports store for the whole app: the tab-bar badge, the Favoris
              row and the import detail all read it — and only ONE background
              resolver ever runs (see lib/hooks/useImportsContext.tsx). */}
          <ImportsProvider>
            {/* One toast stack for the whole app — every screen and modal can
                acknowledge an action without prop-drilling (useToastContext.tsx). */}
            <ToastProvider>
              <ErrorBoundary>
                {/* Prolonge l'écran de lancement natif avec la MÊME marque, au
                    même endroit — le relais est invisible. Statique et rendu
                    avant tout le reste : peint dès la première frame, sans
                    attendre React. Build natif uniquement. */}
                {isExport && <BootSplash />}
                <CapacitorInit />
                {/* Route-aware chrome: nav rail / tab bar everywhere, except the
                    web marketing landing at `/` which owns its full-bleed layout. */}
                <AppShell forceNative={isExport}>{children}</AppShell>
              </ErrorBoundary>
            </ToastProvider>
          </ImportsProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
