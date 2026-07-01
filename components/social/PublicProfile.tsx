'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import FriendButton from '@/components/social/FriendButton'
import ChatThread from '@/components/social/ChatThread'
import PublicListSheet from '@/components/social/PublicListSheet'
import { useIsNative } from '@/lib/native/platform'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { placeGradient } from '@/lib/gradients'
import type { PublicProfileBundle } from '@/types'

/**
 * Public profile of any user. Used two ways:
 *  - As a web page (route /u/[username]) → no props, reads `username` from the URL,
 *    back = router.back(). Works on Vercel (SSR/dynamic).
 *  - As an in-app overlay (native) → `username` + `onBack` props + `overlay`, rendered
 *    on top of the current screen. Avoids static-export dynamic-route routing entirely.
 */
export default function PublicProfile({
  username: usernameProp,
  onBack,
  overlay,
}: {
  username?: string
  onBack?: () => void
  overlay?: boolean
}) {
  const native = useIsNative()
  const router = useRouter()
  const params = useParams<{ username: string }>()
  const username = usernameProp ?? params?.username ?? ''
  const back = onBack ?? (() => router.back())
  const [bundle, setBundle] = useState<PublicProfileBundle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [openList, setOpenList] = useState<{ id: string; name: string } | null>(null)
  const [chatting, setChatting] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiFetch(`/api/users/${encodeURIComponent(username)}/profile`, {
          headers: await getAuthHeaders(),
        })
        if (!alive) return
        if (!res.ok) {
          setState('notfound')
          return
        }
        setBundle(((await res.json()).data as PublicProfileBundle) ?? null)
        setState('ready')
      } catch {
        if (alive) setState('notfound')
      }
    })()
    return () => {
      alive = false
    }
  }, [username])

  const rootStyle: React.CSSProperties = overlay
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        overflowY: 'auto',
        background: 'var(--bg)',
        paddingBottom: 'calc(var(--safe-bottom) + 40px)',
      }
    : {
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingBottom: 'calc(var(--safe-bottom) + 80px)',
      }

  // On the web (non-native), the social area is app-only.
  if (!native) {
    return (
      <div style={rootStyle}>
        <Centered>Disponible dans l&apos;application Forkmap.</Centered>
      </div>
    )
  }
  if (state === 'loading') {
    return (
      <div style={rootStyle}>
        <TopBar onBack={back} />
        <Centered>Chargement…</Centered>
      </div>
    )
  }
  if (state === 'notfound' || !bundle) {
    return (
      <div style={rootStyle}>
        <TopBar onBack={back} />
        <Centered>Profil introuvable.</Centered>
      </div>
    )
  }

  const p = bundle.profile
  return (
    <div style={rootStyle}>
      <TopBar onBack={back} />

      {/* Identity */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '8px 20px 0',
        }}
      >
        <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={96} />
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {p.display_name}
        </h1>
        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>@{p.username}</span>
        {p.bio && (
          <p
            style={{
              margin: '4px 0 0',
              maxWidth: 320,
              textAlign: 'center',
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--text-2)',
            }}
          >
            {p.bio}
          </p>
        )}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FriendButton userId={p.id} status={bundle.status} />
          {bundle.status === 'friends' && (
            <button
              onClick={() => setChatting(true)}
              className="btn-secondary"
              style={{
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MessageSquare size={16} />
              Message
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          margin: '24px 16px 0',
          padding: '16px 8px',
          background: 'var(--white)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--s2)',
        }}
      >
        <Stat n={bundle.friends_count} label="Amis" />
        <Stat n={bundle.stats.lists} label="Listes" border />
        <Stat n={bundle.stats.places} label="Lieux" border />
        <Stat n={bundle.stats.cuisines} label="Cuisines" border />
      </div>

      {/* Amis en commun */}
      {bundle.mutuals > 0 && (
        <p
          style={{
            margin: '12px 16px 0',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-2)',
          }}
        >
          {bundle.mutuals} ami{bundle.mutuals > 1 ? 's' : ''} en commun
        </p>
      )}

      {/* Public lists */}
      <div style={{ margin: '28px 16px 0' }}>
        <p
          style={{
            margin: '0 0 8px 4px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--text-2)',
          }}
        >
          Listes publiques
        </p>
        {bundle.lists.length === 0 ? (
          <p style={{ margin: '4px', fontSize: 13.5, color: 'var(--text-3)' }}>
            Aucune liste publique.
          </p>
        ) : (
          bundle.lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setOpenList({ id: l.id, name: l.name })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                marginBottom: 8,
                background: 'var(--white)',
                border: '1px solid var(--b2)',
                borderRadius: 'var(--r-md)',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--r-md)',
                  background: placeGradient(l.id),
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {l.name}
                </strong>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {l.item_count} lieu{l.item_count > 1 ? 'x' : ''}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
      {openList && (
        <PublicListSheet
          listId={openList.id}
          listName={openList.name}
          onClose={() => setOpenList(null)}
        />
      )}
      {chatting && (
        <ChatThread
          user={{
            id: p.id,
            display_name: p.display_name,
            username: p.username,
            avatar_url: p.avatar_url,
          }}
          onClose={() => setChatting(false)}
        />
      )}
    </div>
  )
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ padding: 'calc(var(--safe-top) + 10px) 16px 0', display: 'flex' }}>
      <button
        onClick={onBack}
        aria-label="Retour"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink)',
          padding: 0,
        }}
      >
        <ChevronLeft size={24} />
      </button>
    </div>
  )
}

function Stat({ n, label, border }: { n: number; label: string; border?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderLeft: border ? '1px solid var(--b1)' : 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--ink)',
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</span>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-2)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
