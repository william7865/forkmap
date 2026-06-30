'use client'
import StepShell from '@/components/auth/StepShell'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

export default function DoneStep({
  flow,
  onClose,
}: {
  flow: ReturnType<typeof useAuthFlow>
  onClose: () => void
}) {
  const first = (flow.displayName || flow.username || '').split(' ')[0]
  return (
    <StepShell
      title={first ? `Bienvenue, ${first} !` : 'Bienvenue !'}
      subtitle="Ton compte est prêt. On t'emmène découvrir."
      cta={
        <button className="btn-primary" onClick={onClose}>
          Commencer
        </button>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'var(--open-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--open)',
            fontSize: 38,
          }}
        >
          ✓
        </div>
      </div>
    </StepShell>
  )
}
