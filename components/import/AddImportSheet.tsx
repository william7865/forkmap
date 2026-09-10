'use client'
// « Ajouter une vidéo » — la feuille qui ouvre la fonction phare de Forkmap.
//
// Le vrai geste d'import démarre HORS de l'app : depuis la feuille de partage
// de TikTok ou d'Instagram, via la Share Extension iOS. Un bouton dans l'app ne
// peut pas le déclencher. Cette feuille fait donc les trois choses qu'elle
// peut faire, par friction croissante :
//
//   1. Le presse-papier. Beaucoup de gens COPIENT le lien au lieu d'utiliser
//      Partager ; l'app ne captait pas ces gens-là du tout. S'il contient un
//      lien reconnu, on le propose directement.
//   2. Un champ pour coller. `POST /api/imports` n'attend qu'une `url`.
//   3. Apprendre le geste de partage. Ce n'est pas un lot de consolation :
//      c'est le seul chemin qui reste dans le flux naturel (on ne quitte pas
//      TikTok), et une fonction que personne ne sait qu'elle existe vaut zéro.
//
// La lecture du presse-papier passe par navigator.clipboard, disponible dans la
// WKWebView sur geste utilisateur — pas de plugin natif à ajouter. iOS affiche
// sa bannière « collé depuis … » : acceptable ici, l'utilisateur vient de taper
// « Ajouter », donc la lecture est attendue. Toute erreur retombe simplement
// sur le champ manuel.
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Share, ClipboardPaste } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { friendlyError } from '@/lib/api-errors'
import { platformFromUrl } from '@/lib/import/parse'
import { lightTap } from '@/lib/native/haptics'

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

/** Un lien n'est proposé que si on sait de quelle plateforme il vient. */
function recognised(raw: string): { url: string; label: string } | null {
  const url = raw.trim()
  if (!/^https?:\/\//i.test(url)) return null
  const platform = platformFromUrl(url)
  const label = PLATFORM_LABEL[platform]
  return label ? { url, label } : null
}

export default function AddImportSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pasted, setPasted] = useState('')
  const [fromClipboard, setFromClipboard] = useState<{ url: string; label: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Lecture du presse-papier, sur DEMANDE.
   *
   * ⚠️ Jamais à l'ouverture. iOS impose une bannière « Coller » que
   * l'utilisateur doit confirmer : la déclencher sans qu'il ait rien demandé
   * donne l'impression que l'app fouille son presse-papier. Derrière un bouton
   * qu'il vient de toucher, la même bannière devient attendue.
   */
  const readClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard?.readText()
      if (!text) return
      setPasted(text.trim())
      setFromClipboard(recognised(text))
    } catch {
      // Permission refusée, presse-papier vide ou non textuel : le champ
      // manuel reste le chemin de repli.
    }
  }, [])

  const submit = async (url: string) => {
    setBusy(true)
    setError(null)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
      const res = await apiFetch('/api/imports', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? String(res.status))
      lightTap()
      onClose()
      // L'app résout le lieu en tâche de fond ; on emmène l'utilisateur sur la
      // fiche pour qu'il voie le travail se faire plutôt qu'un écran figé.
      const id = body?.data?.id
      router.push(id ? `/import?id=${encodeURIComponent(id)}` : '/')
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  const typed = recognised(pasted)

  return (
    <Sheet ariaLabel="Ajouter une vidéo" onClose={onClose}>
      <div style={{ padding: '4px 20px 24px' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}
        >
          Ajouter une vidéo
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text-2)',
          }}
        >
          Colle le lien d’une vidéo — Forkmap retrouve le restaurant et le range.
        </p>

        {/* 1. Le presse-papier, quand il contient déjà un lien reconnu. */}
        {fromClipboard && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(fromClipboard.url)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              width: '100%',
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: 14,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              cursor: busy ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
              textAlign: 'left',
            }}
          >
            <ClipboardPaste size={19} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>
                Importer ce lien {fromClipboard.label}
              </span>
              <span
                className="truncate-1"
                style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 1 }}
              >
                {fromClipboard.url}
              </span>
            </span>
          </button>
        )}

        {/* 2. Le champ manuel. */}
        <label
          style={{
            display: 'block',
            margin: '18px 0 6px',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-3)',
          }}
        >
          {fromClipboard ? 'Ou colle un autre lien' : 'Colle le lien'}
        </label>
        {/* Le champ et le bouton « Coller » côte à côte : c'est CE bouton qui
            déclenche la bannière d'iOS, au moment où on la comprend. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <input
            className="input-field"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://www.tiktok.com/@…"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            aria-label="Lien de la vidéo"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            type="button"
            onClick={() => void readClipboard()}
            aria-label="Coller le lien copié"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <ClipboardPaste size={16} strokeWidth={1.9} />
            Coller
          </button>
        </div>
        <button
          type="button"
          disabled={!typed || busy}
          onClick={() => typed && submit(typed.url)}
          className="btn-primary"
          style={{
            width: '100%',
            marginTop: 10,
            opacity: !typed || busy ? 0.45 : 1,
            cursor: !typed || busy ? 'default' : 'pointer',
          }}
        >
          <Sparkles size={16} />
          {busy ? 'Import en cours…' : 'Importer'}
        </button>

        {error && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--closed)', fontWeight: 600 }}>
            {error}
          </p>
        )}

        {/* 3. Le geste, celui qui ne fait pas sortir de TikTok. */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Share size={17} strokeWidth={1.9} />
            </span>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Plus rapide : partage depuis l’app
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text-2)',
                }}
              >
                Sur TikTok ou Instagram, touche <strong>Partager</strong>, puis{' '}
                <strong>Forkmap</strong>. Tu n’as même pas besoin d’ouvrir l’app — le resto est
                rangé tout seul.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
