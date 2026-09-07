'use client'
// AppGate — the shared guard chain for app-only screens (Découvrir, Messages…):
// web → "available in the app" notice · native → auth flow until a signed-in
// profile exists. Previously copy-pasted per page. The dev browser preview
// (forkmap_dev_native) skips auth so design work needs no session — dev-only,
// never in production builds.
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useIsNative, isDevNativePreview } from '@/lib/native/platform'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'

const AuthFlow = dynamic(() => import('@/components/auth/AuthFlow'), { ssr: false })

function CenteredMsg({ children }: { children: ReactNode }) {
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

export default function AppGate({ children }: { children: ReactNode }) {
  const native = useIsNative()
  const auth = useAuth()
  const { profile, ready } = useProfile()

  // Web: social features are app-only.
  if (!native) return <CenteredMsg>Disponible dans l&apos;application Forkmap.</CenteredMsg>

  if (!isDevNativePreview()) {
    // Auth session not yet resolved — avoid flashing AuthModal on native cold start.
    if (auth.loading) return <CenteredMsg>Chargement…</CenteredMsg>

    // Not signed in → show auth flow.
    if (!auth.user) return <AuthFlow onClose={() => history.back()} />

    // Loading profile.
    if (!ready) return <CenteredMsg>Chargement…</CenteredMsg>

    // No profile yet → auth flow resumes at handle step.
    if (!profile) return <AuthFlow onClose={() => history.back()} />
  }

  return <>{children}</>
}
