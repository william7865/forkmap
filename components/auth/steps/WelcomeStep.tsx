'use client'
import StepShell from '@/components/auth/StepShell'
import { LogoMark } from '@/components/icons/Logo'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

export default function WelcomeStep({
  flow,
  onClose,
}: {
  flow: ReturnType<typeof useAuthFlow>
  onClose: () => void
}) {
  return (
    <StepShell
      onClose={onClose}
      title="Trouve où manger, sans te prendre la tête."
      subtitle="Enregistre tes spots, suis tes amis, et laisse Forkmap décider."
    >
      <div style={{ marginTop: 4, marginBottom: 'auto' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogoMark size={24} color="#fffdf8" />
        </div>
      </div>
      {flow.error && <ErrorText msg={flow.error} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <button className="btn-primary" disabled={flow.busy} onClick={flow.startGoogle}>
          Continuer avec Google
        </button>
        <button className="btn-secondary" style={{ width: '100%' }} onClick={flow.startEmailSignup}>
          Continuer avec un email
        </button>
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 16 }}>
        Déjà un compte ?{' '}
        <button onClick={flow.startSignin} style={linkBtn}>
          Se connecter
        </button>
      </p>
    </StepShell>
  )
}

export function ErrorText({ msg }: { msg: string }) {
  return (
    <p
      style={{
        margin: '10px 0 0',
        fontSize: 12,
        color: 'var(--coral)',
        fontWeight: 600,
        padding: '6px 10px',
        background: 'var(--coral-pale)',
        borderRadius: 'var(--r-sm)',
        border: '1px solid rgba(197,48,48,0.2)',
      }}
    >
      {msg}
    </p>
  )
}
export const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--accent)',
  fontWeight: 700,
  fontSize: 'inherit',
  padding: 0,
}
