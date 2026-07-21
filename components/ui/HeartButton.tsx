'use client'

import { useState, useEffect, useRef } from 'react'
import { SaveToListPopup } from '@/components/lists/SaveToListPopup'

interface Props {
  isFavorite: boolean
  size?: number
  onClick: (e: React.MouseEvent) => void
  ariaLabel?: string
  osmId?: string
  placeSnapshot?: Record<string, unknown>
  colorOverride?: string
}

function Particles({ active }: { active: boolean }) {
  if (!active) return null

  const particles = [
    { tx: '-18px', ty: '-16px' },
    { tx: '18px', ty: '-16px' },
    { tx: '20px', ty: '2px' },
    { tx: '-20px', ty: '2px' },
    { tx: '10px', ty: '16px' },
    { tx: '-10px', ty: '16px' },
  ]

  const colors = ['var(--accent)', 'var(--accent-hover)', 'var(--accent-text)', 'var(--accent)']

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: colors[i % colors.length],
            marginTop: -2.5,
            marginLeft: -2.5,
            // @ts-expect-error CSS vars
            '--tx': p.tx,
            '--ty': p.ty,
            animation: `heartParticle 500ms ${i * 40}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}
        />
      ))}
    </div>
  )
}

export default function HeartButton({
  isFavorite,
  size = 15,
  onClick,
  ariaLabel,
  osmId,
  placeSnapshot,
  colorOverride,
}: Props) {
  const [animState, setAnimState] = useState<'idle' | 'adding' | 'removing'>('idle')
  const prevFav = useRef(isFavorite)
  const [showParticles, setShowParticles] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (prevFav.current === isFavorite) return
    prevFav.current = isFavorite

    if (isFavorite) {
      setAnimState('adding')
      setShowParticles(true)
      const t1 = setTimeout(() => setAnimState('idle'), 600)
      const t2 = setTimeout(() => setShowParticles(false), 700)
      if (osmId && placeSnapshot) {
        const t3 = setTimeout(() => setShowPopup(true), 200)
        return () => {
          clearTimeout(t1)
          clearTimeout(t2)
          clearTimeout(t3)
        }
      }
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else {
      setAnimState('removing')
      setShowPopup(false)
      const t = setTimeout(() => setAnimState('idle'), 400)
      return () => clearTimeout(t)
    }
  }, [isFavorite, osmId, placeSnapshot])

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation:
      animState === 'adding'
        ? 'heartBeat 550ms cubic-bezier(0.16, 1, 0.3, 1) backwards'
        : animState === 'removing'
          ? 'heartUnbeat 350ms ease backwards'
          : 'none',
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick(e)
        }}
        aria-label={ariaLabel ?? (isFavorite ? 'Retirer des enregistrements' : 'Enregistrer')}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '3px',
          color: colorOverride ?? (isFavorite ? 'var(--accent)' : 'var(--text-3)'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 150ms ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Particles active={showParticles} />
        <div style={iconStyle}>
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block', transition: 'fill 150ms ease' }}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </button>

      {showPopup && osmId && placeSnapshot && (
        <SaveToListPopup
          osmId={osmId}
          placeSnapshot={placeSnapshot}
          anchorRef={btnRef}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  )
}
