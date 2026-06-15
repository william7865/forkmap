// ============================================================
// components/states/ErrorBoundary.tsx
//
// WHY THIS EXISTS:
//   Leaflet (and any other imperative DOM library) can throw
//   uncaught errors during render or event handling. Without an
//   ErrorBoundary the entire React tree unmounts → blank screen
//   with zero user feedback. This component catches those errors,
//   displays a friendly recovery UI, and logs to console.
//
//   React ErrorBoundaries must be class components — hooks cannot
//   catch render errors.
//
// Usage:
//   <ErrorBoundary>
//     <MapView ... />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<p>Custom fallback</p>}>
//     ...
//   </ErrorBoundary>
// ============================================================

'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback UI. Defaults to the built-in recovery card. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      // Generate a short ID so the user can quote it in a bug report
      errorId: Math.random().toString(36).slice(2, 8).toUpperCase(),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log full stack trace in dev; in production you'd send this to Sentry
    console.error('[ErrorBoundary] Uncaught error:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    // Allow caller to supply their own fallback
    if (this.props.fallback) {
      return this.props.fallback
    }

    const { error, errorId } = this.state
    const isLeafletError =
      error?.message?.includes('map') ||
      error?.stack?.includes('leaflet') ||
      error?.message?.includes('L.map') ||
      error?.message?.includes('_leaflet')

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--white)',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: 24,
          zIndex: 9999,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: 'var(--white)',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(28,25,23,0.14), 0 0 0 1px rgba(28,25,23,0.07)',
            overflow: 'hidden',
            animation: 'scaleIn 280ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Top accent */}
          <div
            style={{ height: 3, background: 'linear-gradient(90deg,var(--forest-mid),#c47c2b)' }}
          />

          <div style={{ padding: '28px 28px 24px' }}>
            {/* Icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'rgba(45,122,85,0.08)',
                border: '1px solid rgba(45,122,85,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                fontSize: 24,
              }}
            >
              🗺️
            </div>

            {/* Heading */}
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: 'var(--ink-1, #1c1917)',
              }}
            >
              {isLeafletError ? 'Échec du chargement de la carte' : 'Une erreur est survenue'}
            </h2>

            {/* Body */}
            <p
              style={{
                margin: '0 0 20px',
                fontSize: 13,
                color: 'var(--ink-3, #78716c)',
                lineHeight: 1.65,
              }}
            >
              {isLeafletError
                ? 'La carte a rencontré une erreur. Cela arrive parfois après une coupure réseau ou un conflit avec une extension de navigateur.'
                : "Une erreur inattendue s'est produite. Recharger la page suffit généralement à la corriger."}
            </p>

            {/* Error detail (collapsible feel via small mono text) */}
            {error?.message && (
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: 'var(--ink-4, #a8a29e)',
                  background: 'rgba(28,25,23,0.04)',
                  border: '1px solid rgba(28,25,23,0.08)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  wordBreak: 'break-all',
                }}
              >
                {error.message.slice(0, 120)}
                {error.message.length > 120 ? '…' : ''}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--forest-mid)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(29,74,53,0.25)',
                  transition: 'transform 80ms ease, box-shadow 80ms ease',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                Recharger la page
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(28,25,23,0.12)',
                  background: 'transparent',
                  color: 'var(--ink-2, #44403c)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(28,25,23,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Réessayer
              </button>
            </div>

            {/* Error reference */}
            {errorId && (
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 10,
                  color: 'var(--ink-4, #a8a29e)',
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                }}
              >
                Réf. erreur : {errorId}
              </p>
            )}
          </div>
        </div>

        <style>{`
          @keyframes scaleIn {
            from { opacity:0; transform:scale(0.93) translateY(8px); }
            to   { opacity:1; transform:scale(1)    translateY(0);   }
          }
        `}</style>
      </div>
    )
  }
}

export default ErrorBoundary
