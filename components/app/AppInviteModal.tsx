'use client'
// AppInviteModal — the one-time, higher-intent app pitch.
//
// Shown once, when a signed-out mobile-web visitor first tries to save a place:
// the moment they clearly want to keep something, which is exactly what the app
// is for. It never replaces the sign-in flow — "Continuer sur le web" proceeds
// to it — and it fires at most once (see lib/app-invite.interstitialAllowed).
import { useEffect, useState } from 'react'
import { detectPlatform, type DevicePlatform } from '@/lib/app-invite'
import { StoreCTA, AppTile } from '@/components/app/StoreBadges'

export default function AppInviteModal({
  open,
  onClose,
  onContinue,
}: {
  open: boolean
  /** Just close (X / backdrop). The save intent is dropped, as with any dismiss. */
  onClose: () => void
  /** Proceed to the normal web sign-in flow. */
  onContinue: () => void
}) {
  const [platform, setPlatform] = useState<DevicePlatform>('unknown')
  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Installer l'application Forkmap"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(15,17,18,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg)',
          borderTopLeftRadius: 'var(--r-2xl)',
          borderTopRightRadius: 'var(--r-2xl)',
          padding: '10px 22px calc(26px + var(--safe-bottom, 0px))',
          boxShadow: 'var(--s4)',
          animation: 'sheetUp 280ms var(--ease-out) backwards',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 4,
            borderRadius: 'var(--r-pill)',
            background: 'var(--border-strong)',
            margin: '0 auto 22px',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <AppTile size={56} />
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                margin: '0 0 8px',
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: 'var(--text)',
              }}
            >
              Gardez vos adresses dans l&apos;app
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--text-2)',
                lineHeight: 1.65,
                maxWidth: 340,
              }}
            >
              Enregistrez vos lieux, retrouvez-les partout et soyez prévenu quand vos amis
              découvrent une bonne adresse. Forkmap donne le meilleur sur téléphone.
            </p>
          </div>

          <div style={{ width: '100%', marginTop: 4 }}>
            <StoreCTA platform={platform} full />
          </div>

          <button
            type="button"
            onClick={onContinue}
            style={{
              margin: '2px 0 0',
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Continuer sur le web
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] > div { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
