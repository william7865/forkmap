'use client'
import { useEffect, useRef, useState } from 'react'
import StepShell from '@/components/auth/StepShell'
import { ErrorText } from '@/components/auth/steps/WelcomeStep'
import { Spinner } from '@/components/auth/steps/Spinner'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

type Status =
  | { state: 'idle' | 'checking' | 'available' }
  | { state: 'unavailable'; reason: string }

export default function HandleStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gen = useRef(0)
  useEffect(
    () => () => {
      gen.current++
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const onUsername = (raw: string) => {
    const v = raw.startsWith('@') ? raw.slice(1) : raw
    flow.setUsername(v)
    flow.setError(null)
    if (timer.current) clearTimeout(timer.current)
    if (!v.trim()) {
      // Invalidate any in-flight check so a late response can't overwrite 'idle'.
      gen.current++
      setStatus({ state: 'idle' })
      return
    }
    const g = ++gen.current
    setStatus({ state: 'checking' })
    timer.current = setTimeout(async () => {
      try {
        const r = await flow.checkUsername(v)
        if (gen.current !== g) return
        setStatus(
          r.available
            ? { state: 'available' }
            : { state: 'unavailable', reason: r.reason ?? 'Ce pseudo est déjà pris.' }
        )
      } catch {
        if (gen.current !== g) return
        setStatus({ state: 'unavailable', reason: 'Erreur lors de la vérification.' })
      }
    }, 400)
  }

  const canContinue =
    status.state === 'available' && flow.displayName.trim().length > 0 && !flow.busy

  return (
    <StepShell
      progress={flow.progress}
      onBack={flow.back}
      title="Choisis ton pseudo"
      subtitle="C'est comme ça que tes amis te trouveront."
      cta={
        <button className="btn-primary" disabled={!canContinue} onClick={flow.submitHandle}>
          Continuer
        </button>
      }
    >
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--accent)',
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          @
        </span>
        <input
          className="input-field"
          type="text"
          autoCapitalize="none"
          placeholder="ton_pseudo"
          value={flow.username}
          onChange={(e) => onUsername(e.target.value)}
          aria-label="Pseudo"
          style={{ paddingLeft: 28, paddingRight: 36 }}
        />
        <span
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
          }}
        >
          {status.state === 'checking' && <Spinner />}
          {status.state === 'available' && (
            <span style={{ color: '#1b7f4f', fontWeight: 700 }}>✓</span>
          )}
          {status.state === 'unavailable' && (
            <span style={{ color: 'var(--coral)', fontWeight: 700 }}>✗</span>
          )}
        </span>
      </div>
      {status.state === 'available' && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#1b7f4f', fontWeight: 600 }}>
          Disponible
        </p>
      )}
      {status.state === 'unavailable' && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}>
          {status.reason}
        </p>
      )}

      <label
        htmlFor="handle-name"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-2)',
          letterSpacing: '0.03em',
          margin: '16px 0 6px',
        }}
      >
        Ton nom
      </label>
      <input
        id="handle-name"
        className="input-field"
        type="text"
        placeholder="Ton nom"
        value={flow.displayName}
        onChange={(e) => flow.setDisplayName(e.target.value)}
        aria-label="Nom affiché"
      />
      {flow.error && <ErrorText msg={flow.error} />}
    </StepShell>
  )
}
