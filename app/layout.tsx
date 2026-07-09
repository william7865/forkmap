import type { Metadata, Viewport } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/states/ErrorBoundary'
import { LanguageProvider } from '@/lib/i18n/useLanguage'
import AppChrome from '@/components/ui/AppChrome'
import CapacitorInit from '@/components/native/CapacitorInit'

export const viewport: Viewport = {
  // Static <meta name="theme-color">, emitted at build time — can't reference a CSS var().
  // Kept in sync with --surface.
  themeColor: '#f8f9fa',
}

export const metadata: Metadata = {
  title: 'Forkmap · Trouver un restaurant près de chez soi',
  description:
    'Trouvez où manger près de chez vous. Vraies données, carte interactive, itinéraires.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ height: '100%', colorScheme: 'light' }} suppressHydrationWarning>
      <body style={{ height: '100%', margin: 0, padding: 0 }}>
        <LanguageProvider>
          <ErrorBoundary>
            <CapacitorInit />
            <AppChrome />
            {/* Push content right on desktop, up on mobile */}
            <div className="main-content-offset">{children}</div>
            <style>{`
              @media (min-width: 768px) { .main-content-offset { margin-left: 52px; } }
              @media (max-width: 767px) { .main-content-offset { margin-bottom: 56px; } }
            `}</style>
          </ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  )
}
