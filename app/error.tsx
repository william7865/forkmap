// ============================================================
// app/error.tsx — Next.js 13+ route-level error boundary
//
// This is the "last resort" for server component errors and
// any error that slips past the React ErrorBoundary. It renders
// when Next.js itself catches an error in a segment.
//
// NOTE: This file must be "use client" — Next.js requires it.
// ============================================================
'use client'

import { useEffect } from 'react'
import { IcoAlert } from '@/components/icons'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // In production you'd forward this to Sentry:
    // Sentry.captureException(error);
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          padding: 0,
          height: '100%',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 420,
            width: '100%',
            margin: '0 24px',
            background: 'var(--bg)',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(28,25,23,0.14), 0 0 0 1px rgba(28,25,23,0.07)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg,var(--accent),var(--accent-hover))',
            }}
          />
          <div style={{ padding: '28px 28px 24px' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'rgba(224,90,30,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                color: 'var(--accent)',
              }}
            >
              <IcoAlert size={24} />
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#1c1917',
              }}
            >
              Un problème est survenu
            </h2>

            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#78716c', lineHeight: 1.65 }}>
              Une erreur inattendue s’est produite. Recharger la page suffit le plus souvent. Vos
              lieux enregistrés sont en sécurité.
            </p>

            {error?.message && (
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#a8a29e',
                  background: 'rgba(28,25,23,0.04)',
                  border: '1px solid rgba(28,25,23,0.08)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  wordBreak: 'break-all',
                }}
              >
                {error.message.slice(0, 140)}
                {error.message.length > 140 ? '…' : ''}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(224,90,30,0.25)',
                }}
              >
                Recharger la page
              </button>

              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(28,25,23,0.12)',
                  background: 'transparent',
                  color: '#44403c',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Réessayer
              </button>
            </div>

            {error?.digest && (
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 10,
                  color: '#a8a29e',
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                }}
              >
                Code d’erreur : {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
