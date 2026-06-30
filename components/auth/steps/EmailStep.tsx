'use client'
import { useState } from 'react'
import StepShell from '@/components/auth/StepShell'
import { ErrorText } from '@/components/auth/steps/WelcomeStep'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'
import { Spinner } from '@/components/auth/steps/Spinner'

export default function EmailStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [showPw, setShowPw] = useState(false)
  return (
    <StepShell
      progress={flow.progress}
      onBack={flow.back}
      title="Ton adresse email"
      subtitle="Pour sécuriser ton compte et te reconnecter."
      cta={
        <button className="btn-primary" disabled={flow.busy} onClick={flow.submitEmail}>
          {flow.busy ? <Spinner light /> : 'Continuer'}
        </button>
      }
    >
      <input
        className="input-field"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        placeholder="toi@email.com"
        value={flow.email}
        onChange={(e) => flow.setEmail(e.target.value)}
        aria-label="Adresse e-mail"
        style={{ marginBottom: 10 }}
      />
      <input
        className="input-field"
        type={showPw ? 'text' : 'password'}
        placeholder="Mot de passe (6 caractères min.)"
        value={flow.password}
        onChange={(e) => flow.setPassword(e.target.value)}
        aria-label="Mot de passe"
      />
      <button
        type="button"
        onClick={() => setShowPw((v) => !v)}
        style={{
          alignSelf: 'flex-end',
          marginTop: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: 12,
          fontWeight: 600,
          padding: 0,
        }}
      >
        {showPw ? 'Masquer' : 'Afficher'} le mot de passe
      </button>
      {flow.error && <ErrorText msg={flow.error} />}
    </StepShell>
  )
}
