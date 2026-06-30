'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Share2, Check } from 'lucide-react'
import { nativeShare } from '@/lib/native/share'

export default function ShareProfileSheet({
  username,
  onClose,
}: {
  username: string
  onClose: () => void
}) {
  const url = `https://forkmap.vercel.app/u/${username}`
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: '#241f18', light: '#fffdf8' },
    })
      .then((d) => {
        if (alive) setQr(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url])

  const onShare = async () => {
    let ok = false
    try {
      // Throws if the user cancels/dismisses the native share sheet on iOS.
      ok = await nativeShare({ text: `Ajoute-moi sur Forkmap : ${url}`, url })
    } catch {
      return // user cancelled — do nothing
    }
    if (!ok) {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        /* noop */
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'calc(var(--safe-top) + 12px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: 4,
            }}
          >
            <X size={22} />
          </button>
        </div>

        <h1
          style={{
            margin: '8px 0 6px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--ink)',
            textAlign: 'center',
          }}
        >
          Partager mon profil
        </h1>

        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'var(--text-3)',
            textAlign: 'center',
          }}
        >
          Fais scanner ce QR code ou partage le lien.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="QR code du profil"
              width={240}
              height={240}
              style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--b2)' }}
            />
          ) : (
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: 'var(--r-lg)',
                background: 'var(--bone)',
              }}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            background: 'var(--white)',
            border: '1px solid var(--b2)',
            borderRadius: 'var(--r-md)',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13.5,
              color: 'var(--text-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {url}
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={onShare}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {copied ? (
            <>
              <Check size={17} /> Lien copié
            </>
          ) : (
            <>
              <Share2 size={17} /> Partager
            </>
          )}
        </button>
      </div>
    </div>
  )
}
