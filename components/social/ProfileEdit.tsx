// ============================================================
// components/social/ProfileEdit.tsx
// Edit profile screen — display name, avatar, @username (once/year)
// ============================================================
'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import { Avatar } from '@/components/social/Avatar'
import { canChangeUsername } from '@/lib/username'

interface Props {
  onClose: () => void
}

// ── Inline icons ──────────────────────────────────────────────
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

// ── Small spinner (dark variant) ──────────────────────────────
function Spinner() {
  return (
    <span
      style={{
        width: 13,
        height: 13,
        border: '2px solid var(--b2)',
        borderTop: '2px solid var(--ink)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

// ── Shared error banner ───────────────────────────────────────
function ErrorBanner({ msg }: { msg: string }) {
  return (
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
      {msg}
    </p>
  )
}

// ── Success chip ─────────────────────────────────────────────
function SuccessChip({ msg }: { msg: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12,
        color: '#1b7f4f',
        fontWeight: 600,
        padding: '5px 10px',
        background: 'rgba(27,127,79,0.06)',
        borderRadius: 'var(--r-sm)',
        border: '1px solid rgba(27,127,79,0.18)',
      }}
    >
      {msg}
    </p>
  )
}

export default function ProfileEdit({ onClose }: Props) {
  const { profile, updateProfile, pickAndUploadAvatar } = useProfile()

  // ── Name section state ────────────────────────────────────
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameErr, setNameErr] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Username section state ────────────────────────────────
  const gate = canChangeUsername(profile?.username_changed_at ?? null, Date.now())
  const [username, setUsername] = useState(profile?.username ?? '')
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [usernameErr, setUsernameErr] = useState<string | null>(null)
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Avatar section state ──────────────────────────────────
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (nameTimerRef.current !== null) clearTimeout(nameTimerRef.current)
      if (usernameTimerRef.current !== null) clearTimeout(usernameTimerRef.current)
    }
  }, [])

  // Guard: component is only rendered when profile exists
  if (!profile) return null

  // ── Handlers ─────────────────────────────────────────────

  const handlePickAvatar = async () => {
    setAvatarErr(null)
    setAvatarBusy(true)
    try {
      const url = await pickAndUploadAvatar()
      if (!url) return
      const result = await updateProfile({ avatar_url: url })
      if (!result.ok) {
        setAvatarErr(result.error ?? 'Impossible de mettre à jour la photo.')
      }
    } finally {
      setAvatarBusy(false)
    }
  }

  const showNameSuccess = () => {
    setNameSuccess(true)
    if (nameTimerRef.current !== null) clearTimeout(nameTimerRef.current)
    nameTimerRef.current = setTimeout(() => {
      setNameSuccess(false)
      nameTimerRef.current = null
    }, 2500)
  }

  const handleSaveName = async () => {
    if (nameBusy) return
    setNameErr(null)
    setNameSuccess(false)
    const trimmed = displayName.trim()
    if (!trimmed) {
      setNameErr('Le nom ne peut pas être vide.')
      return
    }
    setNameBusy(true)
    const result = await updateProfile({ display_name: trimmed })
    setNameBusy(false)
    if (result.ok) {
      showNameSuccess()
    } else {
      setNameErr(result.error ?? 'Une erreur est survenue.')
    }
  }

  const showUsernameSuccess = () => {
    setUsernameSuccess(true)
    if (usernameTimerRef.current !== null) clearTimeout(usernameTimerRef.current)
    usernameTimerRef.current = setTimeout(() => {
      setUsernameSuccess(false)
      usernameTimerRef.current = null
    }, 2500)
  }

  const handleSaveUsername = async () => {
    if (usernameBusy) return
    setUsernameErr(null)
    setUsernameSuccess(false)
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      setUsernameErr('Le pseudo ne peut pas être vide.')
      return
    }
    setUsernameBusy(true)
    const result = await updateProfile({ username: trimmed })
    setUsernameBusy(false)
    if (result.ok) {
      showUsernameSuccess()
    } else {
      if (result.error === 'username_taken') {
        setUsernameErr('Ce pseudo est déjà pris.')
      } else if (result.error === 'username_locked') {
        const date = result.nextChangeAt
          ? new Date(result.nextChangeAt).toLocaleDateString('fr-FR')
          : ''
        setUsernameErr(`Tu pourras le changer le ${date}.`)
      } else {
        setUsernameErr(result.error ?? 'Une erreur est survenue.')
      }
    }
  }

  // ── Render ────────────────────────────────────────────────
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
              Mon profil
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-60)' }}>
              Modifie ton nom, ta photo et ton pseudo.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
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
        <div
          style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* ── Avatar ──────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar
              name={profile.display_name || profile.username || '?'}
              src={profile.avatar_url}
              id={profile.id}
              size={88}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePickAvatar}
                disabled={avatarBusy}
                style={{ fontSize: 13, padding: '8px 14px', height: 'auto' }}
              >
                {avatarBusy ? <Spinner /> : 'Changer la photo'}
              </button>
              {avatarErr && <ErrorBanner msg={avatarErr} />}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--b2)' }} />

          {/* ── Nom affiché ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="display_name"
                className="input-field"
                type="text"
                placeholder="Ton nom"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setNameErr(null)
                  setNameSuccess(false)
                }}
                autoComplete="name"
                aria-label="Nom affiché"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveName}
                disabled={nameBusy}
                style={{ fontSize: 13, padding: '8px 14px', height: 'auto', flexShrink: 0 }}
              >
                {nameBusy ? <Spinner /> : 'Enregistrer'}
              </button>
            </div>
            {nameErr && <ErrorBanner msg={nameErr} />}
            {nameSuccess && <SuccessChip msg="Enregistré ✓" />}
          </div>

          {/* ── @pseudo ──────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

            {gate.ok ? (
              /* Editable */
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
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
                      onChange={(e) => {
                        // Strip leading @ if user types it
                        const v = e.target.value
                        setUsername(v.startsWith('@') ? v.slice(1) : v)
                        setUsernameErr(null)
                        setUsernameSuccess(false)
                      }}
                      autoComplete="username"
                      aria-label="Pseudo"
                      style={{ paddingLeft: 26 }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSaveUsername}
                    disabled={usernameBusy}
                    style={{ fontSize: 13, padding: '8px 14px', height: 'auto', flexShrink: 0 }}
                  >
                    {usernameBusy ? <Spinner /> : 'Enregistrer'}
                  </button>
                </div>
                {usernameErr && <ErrorBanner msg={usernameErr} />}
                {usernameSuccess && <SuccessChip msg="Enregistré ✓" />}
              </>
            ) : (
              /* Locked */
              <>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--ink-40, var(--ink-60))',
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
                    value={profile.username}
                    disabled
                    aria-label="Pseudo"
                    style={{
                      paddingLeft: 26,
                      opacity: 0.5,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)' }}>
                  Tu pourras changer ton pseudo le{' '}
                  {new Date(gate.nextChangeAt).toLocaleDateString('fr-FR')}.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
