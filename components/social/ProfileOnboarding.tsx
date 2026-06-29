// ============================================================
// components/social/ProfileOnboarding.tsx
// Onboarding screen — create your Forkmap profile
// Shown after first sign-in when no profile exists yet
// ============================================================
'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import { useAuth } from '@/lib/hooks/useAuth'
import { Avatar } from '@/components/social/Avatar'

interface Props {
  onDone: () => void
}

type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'unavailable'; reason: string }

// Simple spinner inline
function Spinner() {
  return (
    <span
      style={{
        width: 13,
        height: 13,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

export default function ProfileOnboarding({ onDone }: Props) {
  const { createProfile, checkUsername, pickAndUploadAvatar } = useProfile()
  const auth = useAuth()

  const meta = auth.user?.user_metadata ?? {}
  const defaultAvatar: string | null =
    (meta.avatar_url as string | null) ?? (meta.picture as string | null) ?? null
  const defaultDisplayName: string =
    (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? ''

  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaultAvatar)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState(defaultDisplayName)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Generation counter — each new check bumps this; stale async results are discarded
  const checkGenRef = useRef(0)

  // Clean up debounce timer on unmount and invalidate any in-flight check
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
      // Intentional: we always want to increment the CURRENT counter at unmount,
      // not a snapshot captured when the effect ran. Rule targets DOM node refs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      checkGenRef.current++
    }
  }, [])

  const handleUsernameChange = (value: string) => {
    // Strip leading @ if user types it
    const stripped = value.startsWith('@') ? value.slice(1) : value
    setUsername(stripped)
    setFieldErr(null)

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }

    if (!stripped.trim()) {
      setUsernameStatus({ state: 'idle' })
      return
    }

    // Capture generation before scheduling — any earlier in-flight call becomes stale
    const gen = ++checkGenRef.current
    setUsernameStatus({ state: 'checking' })
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(stripped)
        if (checkGenRef.current !== gen) return
        if (result.available) {
          setUsernameStatus({ state: 'available' })
        } else {
          setUsernameStatus({
            state: 'unavailable',
            reason: result.reason ?? 'Ce pseudo est déjà pris.',
          })
        }
      } catch {
        if (checkGenRef.current !== gen) return
        setUsernameStatus({ state: 'unavailable', reason: 'Erreur lors de la vérification.' })
      }
    }, 400)
  }

  const handlePickAvatar = async () => {
    setAvatarBusy(true)
    try {
      const url = await pickAndUploadAvatar()
      if (url) setAvatarUrl(url)
    } finally {
      setAvatarBusy(false)
    }
  }

  const isSubmitDisabled = busy || usernameStatus.state !== 'available' || !displayName.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) return
    setFieldErr(null)
    setBusy(true)
    try {
      const result = await createProfile({
        username,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      })
      if (result.ok) {
        onDone()
      } else {
        const msg =
          result.error === 'username_taken'
            ? 'Ce pseudo est déjà pris.'
            : (result.error ?? 'Une erreur est survenue.')
        setFieldErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const userId = auth.user?.id ?? 'default'

  return (
    <div
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
          maxWidth: 400,
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
        <div style={{ padding: '20px 24px 0' }}>
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
            Crée ton profil
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-60)' }}>
            Choisis un pseudo et personnalise ton apparence.
          </p>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {/* Avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 0 4px',
            }}
          >
            <Avatar name={displayName || '?'} src={avatarUrl} id={userId} size={88} />
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePickAvatar}
              disabled={avatarBusy}
              style={{ fontSize: 13, padding: '8px 14px', height: 'auto' }}
            >
              {avatarBusy ? (
                <span
                  style={{
                    width: 13,
                    height: 13,
                    border: '2px solid var(--ink-60)',
                    borderTop: '2px solid var(--ink)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
              ) : (
                'Changer la photo'
              )}
            </button>
          </div>

          {/* @pseudo input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="username"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-60)',
                letterSpacing: '0.03em',
              }}
            >
              Pseudo
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-60)',
                  fontSize: 14,
                  fontWeight: 600,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  lineHeight: 1,
                }}
              >
                @
              </span>
              <input
                id="username"
                className="input-field"
                type="text"
                placeholder="ton_pseudo"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                autoComplete="username"
                aria-label="Pseudo"
                style={{ paddingLeft: 26, paddingRight: 34 }}
              />
              {/* Status indicator */}
              {username.trim() && (
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {usernameStatus.state === 'checking' && (
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        border: '2px solid var(--b2)',
                        borderTop: '2px solid var(--ink-60)',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {usernameStatus.state === 'available' && (
                    <span style={{ color: '#1b7f4f', fontWeight: 700 }}>✓</span>
                  )}
                  {usernameStatus.state === 'unavailable' && (
                    <span style={{ color: 'var(--coral)', fontWeight: 700 }}>✗</span>
                  )}
                </span>
              )}
            </div>
            {/* Username feedback */}
            {usernameStatus.state === 'unavailable' && (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--coral)',
                  fontWeight: 600,
                  padding: '5px 10px',
                  background: 'var(--coral-pale)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid rgba(197,48,48,0.2)',
                }}
              >
                {usernameStatus.reason}
              </p>
            )}
            {usernameStatus.state === 'available' && (
              <p style={{ margin: 0, fontSize: 12, color: '#1b7f4f', fontWeight: 600 }}>
                Ce pseudo est disponible.
              </p>
            )}
          </div>

          {/* Display name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="display_name"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-60)',
                letterSpacing: '0.03em',
              }}
            >
              Nom affiché
            </label>
            <input
              id="display_name"
              className="input-field"
              type="text"
              placeholder="Ton nom"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              aria-label="Nom affiché"
            />
          </div>

          {/* Form-level error */}
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
            disabled={isSubmitDisabled}
            style={{ marginTop: 4 }}
          >
            {busy ? <Spinner /> : 'Créer mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}
