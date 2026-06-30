'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import { useIsNative } from '@/lib/native/platform'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import { Avatar } from '@/components/social/Avatar'
import ProfileEdit from '@/components/social/ProfileEdit'

const AuthFlow = dynamic(() => import('@/components/auth/AuthFlow'), { ssr: false })

export default function FriendsPage() {
  const native = useIsNative()
  const auth = useAuth()
  const { profile, ready } = useProfile()
  const [editing, setEditing] = useState(false)

  // Web: social features are app-only.
  if (!native) return <CenteredMsg>Disponible dans l&apos;application Forkmap.</CenteredMsg>

  // Auth session not yet resolved — avoid flashing AuthModal on native cold start.
  if (auth.loading) return <CenteredMsg>Chargement…</CenteredMsg>

  // Not signed in → show auth flow.
  if (!auth.user) return <AuthFlow onClose={() => history.back()} />

  // Loading profile.
  if (!ready) return <CenteredMsg>Chargement…</CenteredMsg>

  // No profile yet → auth flow resumes at handle step.
  if (!profile) return <AuthFlow onClose={() => history.back()} />

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: 'calc(var(--safe-top) + 12px) 18px calc(var(--safe-bottom) + 80px)',
      }}
    >
      {/* Editorial title */}
      <h1
        style={{
          margin: '6px 0 18px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          fontSize: 30,
          color: 'var(--ink)',
        }}
      >
        Amis
      </h1>

      {/* Profile card — tap to edit */}
      <button
        onClick={() => setEditing(true)}
        aria-label="Modifier mon profil"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'var(--white)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--s2)',
          padding: '14px 16px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} id={profile.id} size={56} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <strong
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {profile.display_name}
          </strong>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>@{profile.username}</span>
        </span>
        <ChevronRight
          size={20}
          strokeWidth={1.9}
          style={{ marginLeft: 'auto', color: 'var(--text-3)', flexShrink: 0 }}
        />
      </button>

      {/* Empty state — friends coming soon */}
      <div
        style={{
          marginTop: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          padding: '0 16px',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--bone)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
          }}
        >
          <Users size={26} strokeWidth={1.8} />
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink)',
          }}
        >
          Tes amis arrivent bientôt
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--text-3)',
            maxWidth: 260,
            lineHeight: 1.45,
          }}
        >
          Bientôt, tu pourras ajouter des amis et découvrir leurs restaurants préférés.
        </p>
      </div>

      {editing && <ProfileEdit onClose={() => setEditing(false)} />}
    </main>
  )
}

function CenteredMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '70vh',
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
