'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useIsNative } from '@/lib/native/platform'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import { Avatar } from '@/components/social/Avatar'
import ProfileOnboarding from '@/components/social/ProfileOnboarding'
import ProfileEdit from '@/components/social/ProfileEdit'

const AuthModal = dynamic(() => import('@/components/ui/AuthModal'), { ssr: false })

export default function FriendsPage() {
  const native = useIsNative()
  const auth = useAuth()
  const { profile, ready } = useProfile()
  const [editing, setEditing] = useState(false)

  // Web: social features are app-only.
  if (!native) return <CenteredMsg>Disponible dans l&apos;application Forkmap.</CenteredMsg>

  // Not signed in → show auth modal.
  if (!auth.user)
    return (
      <AuthModal
        auth={auth}
        onClose={() => history.back()}
        onSuccess={() => {}}
        onError={() => {}}
      />
    )

  // Loading profile.
  if (!ready) return <CenteredMsg>Chargement…</CenteredMsg>

  // No profile yet → onboarding.
  if (!profile) return <ProfileOnboarding onDone={() => {}} />

  return (
    <main style={{ padding: '16px', paddingBottom: 'calc(var(--safe-bottom) + 72px)' }}>
      <button
        onClick={() => setEditing(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Avatar name={profile.display_name} src={profile.avatar_url} id={profile.id} size={56} />
        <span style={{ textAlign: 'left' }}>
          <strong style={{ display: 'block', fontFamily: 'var(--font-display)' }}>
            {profile.display_name}
          </strong>
          <span style={{ color: 'var(--text-3)' }}>@{profile.username}</span>
        </span>
      </button>
      <p style={{ marginTop: 24, color: 'var(--text-3)' }}>Tes amis arrivent bientôt.</p>
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
