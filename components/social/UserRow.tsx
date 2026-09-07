'use client'
// UserRow — the app's single "person line" (avatar + display name + @handle +
// trailing action slot), shared by friends lists, pickers and collaborator
// sheets. One typography and spacing everywhere, like the big social apps.
import type { ReactNode } from 'react'
import { Avatar } from '@/components/social/Avatar'
import { staggerDelay } from '@/lib/motion'

export default function UserRow({
  name,
  username,
  src,
  id,
  onOpen,
  children,
  subtitle,
  size = 54,
  index,
}: {
  name: string
  username: string
  src: string | null
  id: string
  /** Tap on avatar+name — usually opens the public profile. */
  onOpen?: () => void
  /** Trailing actions (pill button, icon buttons…). */
  children?: ReactNode
  /** Overrides the default `@username` second line. */
  subtitle?: string
  /** Avatar size in px. */
  size?: number
  /** When set, the row cascades in on mount (stable lists only, not live search). */
  index?: number
}) {
  const identity = (
    <>
      <Avatar name={name} src={src} id={id} size={size} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <strong
          className="truncate-1"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 16.5,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
          }}
        >
          {name}
        </strong>
        <span className="truncate-1" style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 2 }}>
          {subtitle ?? `@${username}`}
        </span>
      </span>
    </>
  )
  return (
    <div
      className={index !== undefined ? 'anim-fade-up' : undefined}
      style={{
        animationDelay: index !== undefined ? staggerDelay(index) : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '11px 0',
      }}
    >
      {onOpen ? (
        // Avatar + nom : zone cliquable vers le profil, actions hors de cette zone.
        <button
          onClick={onOpen}
          className="tap-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          {identity}
        </button>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 }}>
          {identity}
        </span>
      )}
      {children != null && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {children}
        </span>
      )}
    </div>
  )
}
