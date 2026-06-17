// ============================================================
// ShareModal.tsx — Partage restaurant (lien, WhatsApp, SMS, email)
// Brandbook canonique : Fraunces + Geist + tokens CSS
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import type { PlaceCard } from '@/types'

interface Props {
  place: PlaceCard
  onClose: () => void
}

// ── Icons ─────────────────────────────────────────────────
const IcoX = () => (
  <svg
    width="13"
    height="13"
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
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoCopy = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const IcoMap = () => (
  <svg
    width="16"
    height="16"
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

// ── Bouton de canal de partage ─────────────────────────────
function ShareChannel({
  icon,
  label,
  sublabel,
  onClick,
  color = 'var(--ink)',
  bg = 'var(--off-white)',
  border = 'var(--ink-10)',
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
  color?: string
  bg?: string
  border?: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '14px 10px 12px',
        borderRadius: 'var(--r-xl)',
        border: `1px solid ${hovered ? border : 'var(--ink-10)'}`,
        background: hovered ? bg : 'var(--white)',
        cursor: 'pointer',
        color: hovered ? color : 'var(--ink-60)',
        transition: 'all 180ms var(--ease-out)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--s2)' : 'none',
        fontFamily: 'var(--font-body)',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--r-md)',
          background: hovered ? bg : 'var(--off-white)',
          border: `1px solid ${hovered ? border : 'var(--ink-10)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 180ms ease',
          color: hovered ? color : 'var(--ink-60)',
        }}
      >
        {icon}
      </div>
      <span
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      {sublabel && (
        <span
          style={{
            fontSize: 9,
            color: 'var(--ink-40)',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {sublabel}
        </span>
      )}
    </button>
  )
}

// ── WhatsApp SVG ──────────────────────────────────────────
const IcoWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
)
const IcoSMS = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IcoMail = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)
const IcoTwitter = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.859L1.254 2.25H8.08l4.263 5.633L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const IcoNativeShare = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)

// ── Cuisine gradient (reprise de PlaceCard) ───────────────
const CUISINE_GRADIENTS: Record<string, string> = {
  japonais: 'linear-gradient(120deg,#0c2d3a 0%,#1a5468 50%,#2980a0 100%)',
  sushi: 'linear-gradient(120deg,#0c2d3a 0%,#1a5468 50%,#2980a0 100%)',
  italien: 'linear-gradient(160deg,#2d1a0e 0%,#7c4422 100%)',
  pizza: 'linear-gradient(160deg,#2d1a0e 0%,#7c4422 100%)',
  français: 'linear-gradient(135deg,#1a2e1a 0%,#2d5a2d 60%,#3d7e3d 100%)',
  burger: 'linear-gradient(135deg,#1a1200 0%,#7c5a00 100%)',
  chinois: 'linear-gradient(120deg,#1a0a0a 0%,#8b1a1a 100%)',
  indien: 'linear-gradient(120deg,#2d1400 0%,#c45c00 100%)',
}

function getCuisineGradient(cuisine?: string) {
  if (!cuisine) return 'linear-gradient(135deg,#1a2e1a 0%,#2d4a2d 60%,#3d6e3d 100%)'
  const key = cuisine.toLowerCase()
  for (const [k, v] of Object.entries(CUISINE_GRADIENTS)) {
    if (key.includes(k)) return v
  }
  return 'linear-gradient(135deg,#1a2e1a 0%,#2d4a2d 60%,#3d6e3d 100%)'
}

export default function ShareModal({ place, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name
  const rating = place.fsq?.rating
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.lat},${place.lon}`

  const shareText = rating
    ? `🍴 ${place.name}${cuisine ? ` · ${cuisine}` : ''}, noté ${rating.toFixed(1)}/10 sur Forkmap`
    : `🍴 Je t'ai trouvé ce restaurant sur Forkmap : ${place.name}${cuisine ? ` (${cuisine})` : ''}`

  const fullShareText = `${shareText}\n${mapsUrl}`

  useEffect(() => {
    setHasNativeShare(!!navigator.share)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${mapsUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // fallback
    }
  }

  const handleNativeShare = () => {
    navigator.share?.({
      title: place.name,
      text: shareText,
      url: mapsUrl,
    })
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullShareText)}`, '_blank')
  }

  const handleSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(fullShareText)}`, '_blank')
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Restaurant recommandé : ${place.name}`)
    const body = encodeURIComponent(
      `Salut !\n\nJe t'ai trouvé un resto sympa :\n\n${place.name}${cuisine ? ` (${cuisine})` : ''}${rating ? `, ${rating.toFixed(1)}/10` : ''}\n\nVoir sur Google Maps : ${mapsUrl}\n\nTrouvé avec Forkmap 🗺️`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleTwitter = () => {
    const tweet = encodeURIComponent(`${shareText} ${mapsUrl} #forkmap`)
    window.open(`https://x.com/intent/tweet?text=${tweet}`, '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,14,13,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--white)',
          borderRadius: 'var(--r-xl)',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 32px 80px rgba(14,14,13,0.24), 0 0 0 1px rgba(14,14,13,0.07)',
          overflow: 'hidden',
          animation: 'scaleIn 220ms var(--ease-spring) both',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header visuel — gradient cuisine */}
        <div
          style={{
            height: 80,
            background: getCuisineGradient(cuisine),
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Watermark fork */}
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: -20,
              width: 56,
              height: 56,
              borderRadius: 'var(--r-lg)',
              background: 'var(--white)',
              boxShadow: '0 4px 16px rgba(14,14,13,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--off-white)',
            }}
          >
            <IcoMap />
          </div>
          {/* Nom + fermer */}
          <div
            style={{
              padding: '14px 16px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
              <h2
                style={{
                  margin: '0 0 3px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                  color: 'white',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {place.name}
              </h2>
              {cuisine && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {cuisine}
                  {rating && ` · ★ ${rating.toFixed(1)}`}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            >
              <IcoX />
            </button>
          </div>
        </div>

        {/* Corps du modal */}
        <div style={{ padding: '28px 20px 24px' }}>
          {/* Titre section */}
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--ink-40)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Partager avec
          </p>

          {/* Canaux de partage */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <ShareChannel
              icon={<IcoWhatsApp />}
              label="WhatsApp"
              onClick={handleWhatsApp}
              color="#25D366"
              bg="rgba(37,211,102,0.08)"
              border="rgba(37,211,102,0.3)"
            />
            <ShareChannel
              icon={<IcoSMS />}
              label="SMS"
              onClick={handleSMS}
              color="var(--sky)"
              bg="var(--sky-pale)"
              border="rgba(36,89,168,0.3)"
            />
            <ShareChannel
              icon={<IcoMail />}
              label="Email"
              onClick={handleEmail}
              color="var(--ink-80)"
              bg="var(--cream)"
              border="var(--bone)"
            />
            <ShareChannel
              icon={<IcoTwitter />}
              label="X / Twitter"
              onClick={handleTwitter}
              color="var(--ink)"
              bg="var(--cream)"
              border="var(--bone)"
            />
            {hasNativeShare && (
              <ShareChannel
                icon={<IcoNativeShare />}
                label="Plus…"
                onClick={handleNativeShare}
                color="var(--forest-mid)"
                bg="var(--forest-pale)"
                border="rgba(45,122,85,0.3)"
              />
            )}
          </div>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--ink-10)' }} />
            <span
              style={{
                fontSize: 10,
                color: 'var(--ink-40)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              ou copier le lien
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--ink-10)' }} />
          </div>

          {/* Copie lien */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 10px 10px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--off-white)',
              border: `1px solid ${copied ? 'rgba(45,122,85,0.4)' : 'var(--ink-10)'}`,
              transition: 'border-color 200ms ease',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 11,
                color: 'var(--ink-60)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {mapsUrl.replace('https://', '')}
            </span>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 'var(--r-sm)',
                background: copied ? 'var(--forest-pale)' : 'var(--white)',
                border: `1px solid ${copied ? 'rgba(45,122,85,0.4)' : 'var(--ink-10)'}`,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                color: copied ? 'var(--green)' : 'var(--ink-60)',
                transition: 'all 200ms ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              {copied ? <IcoCheck /> : <IcoCopy />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {/* Google Maps direct */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              background: 'transparent',
              border: '1px solid var(--ink-10)',
              color: 'var(--ink-60)',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--off-white)'
              e.currentTarget.style.color = 'var(--ink)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--ink-60)'
            }}
          >
            <IcoMap />
            Ouvrir dans Google Maps
          </a>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.93) translateY(8px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
