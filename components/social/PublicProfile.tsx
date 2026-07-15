// ============================================================
// components/social/PublicProfile.tsx
// Public profile of any user (the screen you see when tapping a
// friend). Layout « bibliothèque » (palette Forkmap
// conservée) — jumeau de ProfileScreen : masthead avatar + grand
// titre serif + @username + bio, action (Suivre / Ami / Message),
// chiffres éditoriaux inline, puis « Ses listes » en lignes-
// collections séparées par des filets fins.
// Web reste app-only (message d'invitation).
// ============================================================
'use client'
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MessageSquare, MoreHorizontal, Share2 } from 'lucide-react'
import { Avatar } from '@/components/social/Avatar'
import FriendButton from '@/components/social/FriendButton'
import FollowButton from '@/components/social/FollowButton'
import VerifiedBadge from '@/components/social/VerifiedBadge'
import ChatThread from '@/components/social/ChatThread'
import PublicListSheet from '@/components/social/PublicListSheet'
import ShareProfileSheet from '@/components/social/ShareProfileSheet'
import { useIsNative } from '@/lib/native/platform'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import { listGradient } from '@/lib/gradients'
import type { PublicProfileBundle, PublicListCard } from '@/types'

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
  const [sharing, setSharing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const toggleBlock = async () => {
    if (!bundle) return
    const nowBlocked = !bundle.blocked
    setBundle({ ...bundle, blocked: nowBlocked, status: nowBlocked ? 'none' : bundle.status })
    setShowMenu(false)
    try {
      await apiFetch(`/api/blocks/${bundle.profile.id}`, {
        method: nowBlocked ? 'POST' : 'DELETE',
        headers: await getAuthHeaders(),
      })
    } catch {
      /* noop */
    }
  }

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
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }
    : {
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
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
  const figures: { value: number; label: string }[] = [
    { value: bundle.friends_count, label: 'Amis' },
    { value: bundle.stats.lists, label: 'Listes' },
    { value: bundle.stats.places, label: 'Lieux' },
    { value: bundle.stats.cuisines, label: 'Cuisines' },
  ]

  return (
    <div style={rootStyle}>
      {/* Menu (bloquer / débloquer) */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1600,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--bg)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '8px 8px calc(var(--safe-bottom) + 10px)',
              animation: 'slideUp 200ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <button
              onClick={toggleBlock}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '15px 16px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 15.5,
                fontWeight: 600,
                color: bundle.blocked ? 'var(--text)' : 'var(--closed)',
              }}
            >
              {bundle.blocked ? `Débloquer ${p.display_name}` : `Bloquer ${p.display_name}`}
            </button>
            <button
              onClick={() => setShowMenu(false)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '15px 16px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 15.5,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: 660,
          margin: '0 auto',
          padding: 'calc(var(--safe-top) + 10px) 20px calc(var(--safe-bottom) + 88px)',
        }}
      >
        {/* ── Barre du haut : retour à gauche, partager + options à droite ── */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <button
            onClick={back}
            aria-label="Retour"
            style={{
              ...iconBtnStyle,
              marginRight: 'auto',
            }}
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSharing(true)}
              aria-label="Partager le profil"
              style={iconBtnStyle}
            >
              <Share2 size={18} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              aria-label="Options"
              style={iconBtnStyle}
            >
              <MoreHorizontal size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Masthead : avatar puis grand titre serif (pile, éditorial) ── */}
        <header style={{ animation: 'fadeUp 280ms var(--ease-out) both' }}>
          <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size={72} />
          <h1
            style={{
              margin: '16px 0 0',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--text)',
              overflowWrap: 'anywhere',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {p.display_name}
            <VerifiedBadge verified={p.verified} size={18} />
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-3)' }}>@{p.username}</p>
          {p.bio && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 14,
                lineHeight: 1.45,
                color: 'var(--text-2)',
                maxWidth: 420,
              }}
            >
              {p.bio}
            </p>
          )}

          {/* Action prominente : suivre / ami / message (ou état bloqué) */}
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {bundle.blocked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 999,
                  background: 'var(--closed-bg)',
                  color: 'var(--closed)',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                Utilisateur bloqué
              </span>
            ) : (
              <>
                <FollowButton
                  userId={p.id}
                  initialFollowing={bundle.is_following}
                  onChange={(f) =>
                    setBundle((b) =>
                      b
                        ? {
                            ...b,
                            is_following: f,
                            followers_count: b.followers_count + (f ? 1 : -1),
                          }
                        : b
                    )
                  }
                />
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
              </>
            )}
          </div>

          {/* Abonnés / abonnements — ligne discrète, */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 18,
              fontSize: 13,
              color: 'var(--text-2)',
            }}
          >
            <span>
              <b style={{ color: 'var(--text)', fontWeight: 700 }}>{bundle.followers_count}</b>{' '}
              abonné{bundle.followers_count > 1 ? 's' : ''}
            </span>
            <span>
              <b style={{ color: 'var(--text)', fontWeight: 700 }}>{bundle.following_count}</b>{' '}
              abonnement{bundle.following_count > 1 ? 's' : ''}
            </span>
            {bundle.mutuals > 0 && (
              <span>
                <b style={{ color: 'var(--text)', fontWeight: 700 }}>{bundle.mutuals}</b> en commun
              </span>
            )}
          </div>
        </header>

        {/* ── Chiffres de tête — inline serif, sans cadre ── */}
        <section
          style={{
            ...sectionStyle,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px 26px',
            animation: 'fadeUp 320ms var(--ease-out) 60ms both',
          }}
        >
          {figures.map((f) => (
            <div key={f.label}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {f.value}
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                }}
              >
                {f.label}
              </div>
            </div>
          ))}
        </section>

        {/* ── Ses listes — lignes-collections ── */}
        <section style={sectionStyle}>
          <SecHead title="Ses listes" />
          {bundle.lists.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-3)' }}>
              Aucune liste publique.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {bundle.lists.map((l) => (
                <ListRowItem
                  key={l.id}
                  list={l}
                  onOpen={() => setOpenList({ id: l.id, name: l.name })}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {openList && (
        <PublicListSheet
          listId={openList.id}
          listName={openList.name}
          onClose={() => setOpenList(null)}
        />
      )}
      {sharing && <ShareProfileSheet username={p.username} onClose={() => setSharing(false)} />}
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

// ── En-tête de section serif ───────────────────────
function SecHead({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 13,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 21,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-3)',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ── Ligne-collection « bibliothèque » (cover 56 + nom serif + N lieux) ──
function ListRowItem({ list, onOpen }: { list: PublicListCard; onOpen: () => void }) {
  const [from, to] = listGradient(list.id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0' }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir la liste ${list.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: 'var(--s1)',
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 24,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {(list.name.trim()[0] ?? '•').toUpperCase()}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: '-0.01em',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {list.name}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {list.item_count} lieu{list.item_count > 1 ? 'x' : ''}
          </span>
        </span>
      </button>
    </div>
  )
}

// Bouton-icône rond (barre du haut) —
const iconBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  flexShrink: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-2)',
  cursor: 'pointer',
  padding: 0,
}

// Section calme séparée par un filet fin
const sectionStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 28,
  borderTop: '1px solid var(--border)',
}

function TopBar({ onBack, onMenu }: { onBack: () => void; onMenu?: () => void }) {
  return (
    <div
      style={{
        padding: 'calc(var(--safe-top) + 10px) 20px 0',
        maxWidth: 660,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <button onClick={onBack} aria-label="Retour" style={iconBtnStyle}>
        <ChevronLeft size={20} strokeWidth={1.8} />
      </button>
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Options"
          style={{ ...iconBtnStyle, marginLeft: 'auto' }}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
        </button>
      )}
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
