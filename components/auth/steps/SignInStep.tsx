'use client'
import { useState } from 'react'
import StepShell from '@/components/auth/StepShell'
import { ErrorText, linkBtn } from '@/components/auth/steps/WelcomeStep'
import { Spinner } from '@/components/auth/steps/Spinner'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

export default function SignInStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [forgot, setForgot] = useState(false)
  const [showPw, setShowPw] = useState(false)

  if (forgot) {
    return (
      <StepShell
        onBack={() => {
          setForgot(false)
          flow.setError(null)
        }}
        title="Mot de passe oublié"
        subtitle="On t'envoie un lien de réinitialisation."
        cta={
          !flow.resetSent && (
            <button className="btn-primary" disabled={flow.busy} onClick={flow.sendReset}>
              {flow.busy ? <Spinner light /> : 'Envoyer le lien'}
            </button>
          )
        }
      >
        {flow.resetSent ? (
          <p style={{ fontSize: 14, color: 'var(--open)', fontWeight: 600 }}>
            Lien envoyé à {flow.email}. Vérifie ta boîte mail.
          </p>
        ) : (
          <>
            <input
              className="input-field"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="toi@email.com"
              value={flow.email}
              onChange={(e) => flow.setEmail(e.target.value)}
              aria-label="Adresse e-mail"
            />
            {flow.error && <ErrorText msg={flow.error} />}
          </>
        )}
      </StepShell>
    )
  }

  return (
    <StepShell
      onBack={flow.goWelcome}
      title="Content de te revoir."
      subtitle="Connecte-toi pour retrouver tes spots."
      cta={
        <button className="btn-primary" disabled={flow.busy} onClick={flow.submitSignin}>
          {flow.busy ? <Spinner light /> : 'Se connecter'}
        </button>
      }
    >
      <button
        className="btn-secondary"
        style={{ width: '100%', marginBottom: 12 }}
        disabled={flow.busy}
        onClick={flow.startGoogle}
      >
        Continuer avec Google
      </button>
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
        placeholder="Mot de passe"
        value={flow.password}
        onChange={(e) => flow.setPassword(e.target.value)}
        aria-label="Mot de passe"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          style={{ ...linkBtn, color: 'var(--text-3)', fontWeight: 600, fontSize: 12 }}
        >
          {showPw ? 'Masquer' : 'Afficher'}
        </button>
        <button
          type="button"
          onClick={() => {
            setForgot(true)
            flow.setError(null)
          }}
          style={{ ...linkBtn, color: 'var(--text-3)', fontWeight: 600, fontSize: 12 }}
        >
          Mot de passe oublié ?
        </button>
      </div>
      {flow.error && <ErrorText msg={flow.error} />}
    </StepShell>
  )
}
