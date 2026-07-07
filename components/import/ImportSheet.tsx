'use client'
// ImportSheet — paste a TikTok/Instagram/… link; we read the post's caption,
// resolve the restaurant via Google, and let the user open its card (from which
// they can favorite / add to a list). Native-only (device fetch = residential IP).
import { useEffect, useState } from 'react'
import { X, Link2, MapPin, Star } from 'lucide-react'
import type { PlaceSearchResult } from '@/lib/hooks/usePlaceSearch'
import { searchPlacesOnce } from '@/lib/hooks/usePlaceSearch'
import { fetchPostMetadata } from '@/lib/import/metadata'
import { buildImportCandidate } from '@/lib/import/parse'
import { useIsNative } from '@/lib/native/platform'

interface Props {
  center: [number, number] | null
  onPick: (r: PlaceSearchResult) => void
  onClose: () => void
  initialUrl?: string
}

type Phase = 'input' | 'loading' | 'results' | 'error'

export default function ImportSheet({ center, onPick, onClose, initialUrl }: Props) {
  const native = useIsNative()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [phase, setPhase] = useState<Phase>('input')
  const [blurb, setBlurb] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [errMsg, setErrMsg] = useState('')

  const analyze = async (raw: string) => {
    const link = raw.trim()
    if (!/^https?:\/\//i.test(link)) {
      setErrMsg('Colle un lien valide (TikTok, Instagram, YouTube…).')
      setPhase('error')
      return
    }
    setPhase('loading')
    setErrMsg('')
    try {
      const og = await fetchPostMetadata(link)
      if (!og) {
        setErrMsg(
          native
            ? 'Impossible de lire ce lien. Réessaie, ou ouvre le resto à la main.'
            : "L'import n'est disponible que dans l'application."
        )
        setPhase('error')
        return
      }
      const candidate = buildImportCandidate(og, link)
      setBlurb(candidate.description || candidate.title)
      // searchGoogleNearby needs a center; mapCenter can still be null right
      // after launch. Fall back to Paris so the resolve never silently no-ops.
      const found = await searchPlacesOnce(candidate.query, center ?? [48.8566, 2.3522])
      if (found.length === 0) {
        setErrMsg(`Aucun resto trouvé pour « ${candidate.query} ». Essaie un autre lien.`)
        setPhase('error')
        return
      }
      setResults(found)
      setPhase('results')
    } catch {
      setErrMsg("L'analyse a échoué. Réessaie.")
      setPhase('error')
    }
  }

  // Auto-analyze when opened from a shared link.
  useEffect(() => {
    if (initialUrl) void analyze(initialUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-slide-up"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px calc(20px + env(safe-area-inset-bottom))',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            <Link2 size={19} color="var(--accent)" /> Importer un lien
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              border: 'none',
              background: 'var(--surface)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-2)',
            }}
          >
            <X size={17} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45, margin: '10px 0 14px' }}>
          Vu un resto dans une vidéo ? Colle le lien du post — on retrouve
          l&apos;établissement pour toi.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze(url)}
            placeholder="https://tiktok.com/…"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            style={{
              flex: 1,
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '11px 13px',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text)',
              background: 'var(--surface)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => analyze(url)}
            disabled={phase === 'loading' || url.trim().length === 0}
            style={{
              border: 'none',
              borderRadius: 'var(--r-lg)',
              padding: '0 16px',
              background: url.trim() ? 'var(--accent)' : 'var(--border)',
              color: 'var(--on-accent, #fff)',
              fontSize: 14,
              fontWeight: 700,
              cursor: url.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            {phase === 'loading' ? '…' : 'Analyser'}
          </button>
        </div>

        {phase === 'error' && (
          <p style={{ color: 'var(--closed)', fontSize: 12.5, marginTop: 12 }}>{errMsg}</p>
        )}

        {phase === 'results' && (
          <div style={{ marginTop: 16 }}>
            {blurb && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: 12.5,
                  color: 'var(--text-2)',
                  lineHeight: 1.4,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--text-3)' }}>Le post : </span>
                {blurb.slice(0, 180)}
              </div>
            )}
            <div style={{ ...EYEBROW, marginBottom: 8 }}>Résultats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onPick(r)
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 12px',
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <MapPin size={15} strokeWidth={1.75} color="var(--accent)" />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                    {r.name}
                  </span>
                  {r.rating != null && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text)',
                      }}
                    >
                      <Star size={12} strokeWidth={0} fill="var(--accent)" />
                      {r.rating.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const EYEBROW = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-3)',
}
