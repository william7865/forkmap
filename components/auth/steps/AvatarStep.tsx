'use client'
import StepShell from '@/components/auth/StepShell'
import { ErrorText } from '@/components/auth/steps/WelcomeStep'
import { Spinner } from '@/components/auth/steps/Spinner'
import { Avatar } from '@/components/social/Avatar'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

export default function AvatarStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  return (
    <StepShell
      progress={flow.progress}
      onBack={flow.back}
      title="Mets un visage."
      subtitle="Optionnel — tu pourras le changer plus tard."
      cta={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary" disabled={flow.busy} onClick={flow.submitAvatar}>
            {flow.busy ? <Spinner light /> : 'Continuer'}
          </button>
          <button
            onClick={flow.submitAvatar}
            disabled={flow.busy}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Passer pour l&apos;instant
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <Avatar
          name={flow.displayName || flow.username || '?'}
          src={flow.avatarUrl}
          id={flow.auth.user?.id ?? 'me'}
          size={108}
        />
      </div>
      <button
        className="btn-secondary"
        style={{ width: 'auto', alignSelf: 'center', marginTop: 16 }}
        disabled={flow.avatarBusy}
        onClick={flow.pickAvatar}
      >
        {flow.avatarBusy ? <Spinner /> : 'Choisir une photo'}
      </button>
      {flow.error && <ErrorText msg={flow.error} />}
    </StepShell>
  )
}
