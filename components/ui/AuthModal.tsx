// ============================================================
// components/ui/AuthModal.tsx
// Sign in / Sign up modal — email+password + Google OAuth
// Design: matches the Warm Paper system, no external UI libs
// ============================================================
'use client'

import { useState, useRef, useEffect } from 'react'
import type { AuthState } from '@/lib/hooks/useAuth'

interface Props {
  onClose: () => void
  auth: AuthState
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

// ── SVG icons ─────────────────────────────────────────────
const IcoGoogle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)
const IcoEye = ({ show }: { show: boolean }) =>
  show ? (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
const IcoX = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const IcoMail = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)
const IcoLock = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IcoUser = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

type Mode = 'signin' | 'signup' | 'forgot'

function InputRow({
  icon,
  type,
  placeholder,
  value,
  onChange,
  right,
}: {
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  right?: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-60)',
          display: 'flex',
          pointerEvents: 'none',
        }}
      >
        {icon}
      </span>
      <input
        className="input-field"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: 34, paddingRight: right ? 36 : 14 }}
        autoComplete={
          type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'name'
        }
        aria-label={placeholder}
      />
      {right && (
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            cursor: 'pointer',
          }}
        >
          {right}
        </span>
      )}
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
      <span
        style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-60)', letterSpacing: '0.04em' }}
      >
        OU
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
    </div>
  )
}

export default function AuthModal({ onClose, auth, onSuccess, onError }: Props) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on overlay click
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }
  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const switchMode = (m: Mode) => {
    setMode(m)
    setFieldErr(null)
    setEmail('')
    setPassword('')
    setName('')
    setResetSent(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErr(null)
    if (!email.trim()) {
      setFieldErr('Veuillez saisir votre adresse e-mail.')
      return
    }
    setBusy(true)
    const err = await auth.resetPassword(email)
    setBusy(false)
    if (err) {
      setFieldErr(err)
    } else {
      setResetSent(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErr(null)
    if (!email.trim() || !password.trim()) {
      setFieldErr("L'adresse e-mail et le mot de passe sont requis.")
      return
    }
    if (password.length < 6) {
      setFieldErr('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setBusy(true)
    let err: string | null = null

    if (mode === 'signin') {
      err = await auth.signInWithEmail(email, password)
    } else {
      err = await auth.signUpWithEmail(email, password, name)
      if (!err) {
        onSuccess?.('Compte créé ! Vérifiez votre e-mail pour confirmer.')
        onClose()
        setBusy(false)
        return
      }
    }

    if (err) {
      setFieldErr(err)
      onError?.(err)
    } else {
      onSuccess?.(mode === 'signin' ? 'Bienvenue !' : 'Compte créé !')
      onClose()
    }
    setBusy(false)
  }

  const handleGoogle = async () => {
    setBusy(true)
    const err = await auth.signInWithGoogle()
    if (err) {
      setFieldErr(err)
      onError?.(err)
    }
    setBusy(false)
    // Page will redirect for OAuth
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(28,25,23,0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'overlayIn 200ms ease both',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--white)',
          borderRadius: 'var(--r-2xl)',
          boxShadow: 'var(--s4), 0 0 0 1px var(--b2)',
          overflow: 'hidden',
          animation: 'modalIn 260ms var(--ease-out) both',
        }}
      >
        {/* Top brand bar */}
        <div style={{ height: 3, background: 'var(--forest-mid)' }} />

        {/* Header */}
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 300,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.04em',
                color: 'var(--ink)',
              }}
            >
              {mode === 'signin'
                ? 'Bienvenue'
                : mode === 'signup'
                  ? 'Créer un compte'
                  : 'Réinitialiser le mot de passe'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-60)' }}>
              {mode === 'signin'
                ? 'Connectez-vous pour synchroniser vos favoris'
                : mode === 'signup'
                  ? 'Sauvegardez vos adresses préférées'
                  : 'Nous vous enverrons un lien de réinitialisation'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-60)',
              padding: 4,
              display: 'flex',
              marginTop: 2,
            }}
          >
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={mode === 'forgot' ? handleForgotPassword : handleSubmit}
          style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* ── FORGOT PASSWORD VIEW ── */}
          {mode === 'forgot' && (
            <>
              {resetSent ? (
                <div
                  style={{
                    padding: '20px 16px',
                    borderRadius: 12,
                    background: 'rgba(27,127,79,0.06)',
                    border: '1px solid rgba(27,127,79,0.18)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📬</div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1b7f4f' }}>
                    Vérifiez votre boîte mail
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.6 }}>
                    Nous avons envoyé un lien à <strong>{email}</strong>.<br />
                    Cela peut prendre une minute.
                  </p>
                </div>
              ) : (
                <>
                  <InputRow
                    icon={<IcoMail />}
                    type="email"
                    placeholder="Adresse e-mail"
                    value={email}
                    onChange={setEmail}
                  />
                  {fieldErr && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--coral)',
                        fontWeight: 600,
                        padding: '6px 10px',
                        background: 'var(--coral-pale)',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid rgba(197,48,48,0.2)',
                      }}
                    >
                      {fieldErr}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy}
                    style={{ marginTop: 4 }}
                  >
                    {busy ? (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                    ) : (
                      'Envoyer le lien'
                    )}
                  </button>
                </>
              )}
              <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--ink-60)' }}>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest-mid)',
                    fontWeight: 700,
                    fontSize: 'inherit',
                    padding: 0,
                  }}
                >
                  ← Retour à la connexion
                </button>
              </p>
            </>
          )}

          {/* ── SIGN IN / SIGN UP VIEW ── */}
          {mode !== 'forgot' && (
            <>
              {/* Google */}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGoogle}
                disabled={busy}
              >
                <IcoGoogle />
                Continuer avec Google
              </button>

              <Divider />

              {/* Name (signup only) */}
              {mode === 'signup' && (
                <InputRow
                  icon={<IcoUser />}
                  type="text"
                  placeholder="Nom complet (optionnel)"
                  value={name}
                  onChange={setName}
                />
              )}

              <InputRow
                icon={<IcoMail />}
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={setEmail}
              />

              <InputRow
                icon={<IcoLock />}
                type={showPw ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={setPassword}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--ink-60)',
                      display: 'flex',
                      padding: 0,
                    }}
                  >
                    <IcoEye show={showPw} />
                  </button>
                }
              />

              {/* Forgot password link — only in sign-in mode */}
              {mode === 'signin' && (
                <div style={{ textAlign: 'right', marginTop: -4 }}>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--ink-60)',
                      fontWeight: 600,
                      fontSize: 11,
                      padding: 0,
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {/* Error */}
              {fieldErr && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'var(--coral)',
                    fontWeight: 600,
                    padding: '6px 10px',
                    background: 'var(--coral-pale)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid rgba(197,48,48,0.2)',
                  }}
                >
                  {fieldErr}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                style={{ marginTop: 4 }}
              >
                {busy ? (
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                ) : mode === 'signin' ? (
                  'Se connecter'
                ) : (
                  'Créer un compte'
                )}
              </button>

              {/* Switch mode */}
              <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--ink-60)' }}>
                {mode === 'signin' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--forest-mid)',
                    fontWeight: 700,
                    fontSize: 'inherit',
                    padding: 0,
                  }}
                >
                  {mode === 'signin' ? "S'inscrire" : 'Se connecter'}
                </button>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
