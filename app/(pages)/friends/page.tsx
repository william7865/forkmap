'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useIsNative } from '@/lib/native/platform'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import FriendsView from '@/components/social/FriendsView'
import MessagesInbox from '@/components/social/MessagesInbox'

const AuthFlow = dynamic(() => import('@/components/auth/AuthFlow'), { ssr: false })

export default function FriendsPage() {
  const native = useIsNative()
  const auth = useAuth()
  const { profile, ready } = useProfile()
  const [addFriends, setAddFriends] = useState(false)

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

  // Onglet Social : les Messages d'abord ; « Ajouter » ouvre la gestion des amis.
  return (
    <>
      <MessagesInbox asPage onAddFriends={() => setAddFriends(true)} />
      {addFriends && <FriendsView onClose={() => setAddFriends(false)} />}
    </>
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
