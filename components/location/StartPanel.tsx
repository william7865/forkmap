// ============================================================
// StartPanel — departure address input + geolocation
// Sits in the sidebar, above the restaurant list.
// ============================================================
'use client'

import { useState, useRef, useCallback } from 'react'
import { useGeocoder } from '@/lib/hooks/useGeocoder'

interface Props {
  userLocation: [number, number] | null
  locationLabel: string | null
  onLocationChange: (lat: number, lon: number, label: string) => void
  onLocateMe: () => void
  locating: boolean
  locateError: boolean
}

// ── Inline SVG icons ──────────────────────────────────────
const IcoGps = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="9" strokeWidth="1.4" opacity="0.35" />
  </svg>
)
const IcoPin = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoX = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const IcoCheck = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function StartPanel({
  userLocation,
  locationLabel,
  onLocationChange,
  onLocateMe,
  locating,
  locateError,
}: Props) {
  const [query, setQuery] = useState('')
  const [showSugg, setShowSugg] = useState(false)
  const { suggestions, loading: geoLoading, search, clear } = useGeocoder()
  const inputRef = useRef<HTMLInputElement>(null)

  const hasGpsLocation = !!userLocation && !locationLabel // GPS-located, no typed label
  const hasLocation = !!userLocation

  const handleInput = (val: string) => {
    setQuery(val)
    if (val.length < 3) {
      setShowSugg(false)
      clear()
      return
    }
    search(val)
    setShowSugg(true)
  }

  const pickSuggestion = useCallback(
    (s: (typeof suggestions)[0]) => {
      const name = s.display_name.split(',')[0]
      setQuery(name)
      setShowSugg(false)
      clear()
      onLocationChange(parseFloat(s.lat), parseFloat(s.lon), name)
    },
    [clear, onLocationChange]
  )

  const clearAll = () => {
    setQuery('')
    setShowSugg(false)
    clear()
  }

  return (
    <div
      style={{
        padding: '11px 14px 12px',
        borderBottom: '1px solid var(--b1)',
        background: 'var(--white)',
        flexShrink: 0,
      }}
    >
      {/* Row label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--ink-60)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <IcoPin /> Point de départ
        </span>
        {hasLocation && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: 'var(--green)',
            }}
          >
            <IcoCheck /> Défini
          </span>
        )}
      </div>

      {/* Input + GPS button */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Left icon */}
          <span
            style={{
              position: 'absolute',
              left: 9,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-60)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {geoLoading ? (
              <span
                style={{
                  width: 12,
                  height: 12,
                  border: '1.5px solid var(--ink-60)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }}
              />
            ) : (
              <IcoPin />
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            placeholder={hasGpsLocation ? 'Position actuelle (GPS)' : 'Rechercher une adresse…'}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 160)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSugg(false)
                clearAll()
              }
            }}
            style={{
              width: '100%',
              padding: '7px 26px 7px 28px',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${hasLocation ? 'rgba(27,127,79,0.3)' : 'var(--b2)'}`,
              background: hasGpsLocation ? 'var(--open-bg)' : 'var(--off-white)',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 500,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 120ms ease',
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = 'var(--forest-mid)'
              e.currentTarget.style.background = 'var(--white)'
              e.currentTarget.style.boxShadow = 'var(--s-focus)'
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = hasLocation ? 'rgba(27,127,79,0.3)' : 'var(--b2)'
              e.currentTarget.style.background = hasGpsLocation
                ? 'var(--open-bg)'
                : 'var(--off-white)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          {/* Right clear */}
          {query && (
            <button
              onClick={clearAll}
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-60)',
                padding: 3,
                display: 'flex',
              }}
            >
              <IcoX />
            </button>
          )}

          {/* Suggestions */}
          {showSugg && suggestions.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 600,
                background: 'var(--white)',
                border: '1px solid var(--b2)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--s3)',
                margin: 0,
                padding: '4px 0',
                listStyle: 'none',
                animation: 'fadeUp 160ms var(--ease-out) both',
              }}
            >
              {suggestions.slice(0, 5).map((s) => {
                const [primary, ...rest] = s.display_name.split(',')
                return (
                  <li
                    key={s.place_id}
                    onMouseDown={() => pickSuggestion(s)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--off-white)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ flexShrink: 0, marginTop: 3, color: 'var(--ink-60)' }}>
                      <IcoPin />
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {primary.trim()}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                        {rest
                          .slice(0, 2)
                          .map((p) => p.trim())
                          .join(', ')}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* GPS button */}
        <button
          onClick={onLocateMe}
          title={
            locateError
              ? 'Localisation refusée, saisissez une adresse'
              : 'Utiliser ma position actuelle'
          }
          aria-label="Utiliser ma position actuelle"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 'var(--r-md)',
            border: `1px solid ${locateError ? 'rgba(197,48,48,0.3)' : hasGpsLocation ? 'rgba(27,127,79,0.3)' : 'var(--b2)'}`,
            background: locateError
              ? 'var(--coral-pale)'
              : hasGpsLocation
                ? 'var(--open-bg)'
                : 'var(--off-white)',
            color: locateError ? 'var(--coral)' : hasGpsLocation ? 'var(--green)' : 'var(--ink-80)',
            cursor: locating ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
            boxShadow: 'var(--s1)',
          }}
        >
          {locating ? (
            <span
              style={{
                width: 13,
                height: 13,
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                display: 'inline-block',
              }}
            />
          ) : (
            <IcoGps />
          )}
        </button>
      </div>

      {/* Status line */}
      {hasLocation && (
        <p
          style={{
            margin: '5px 0 0',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <IcoCheck />
          {locationLabel ?? 'Position GPS'} · distances à jour
        </p>
      )}
      {locateError && !hasLocation && (
        <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--coral)' }}>
          Location denied. Enter an address manually.
        </p>
      )}
    </div>
  )
}
