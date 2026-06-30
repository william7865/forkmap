// ============================================================
// components/social/ProfileEdit.tsx
// Edit profile — APP format (full-screen native StepShell).
// App-only surface (mounted from /friends, which is gated to native).
// display name, avatar (saved live), @username (once/year).
// ============================================================
'use client'

import { useState, useRef, useEffect } from 'react'
import StepShell from '@/components/auth/StepShell'
import { Spinner } from '@/components/auth/steps/Spinner'
import { useProfile } from '@/lib/hooks/useProfile'
import { Avatar } from '@/components/social/Avatar'
import { canChangeUsername, validateUsername } from '@/lib/username'

interface Props {
  onClose: () => void
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

// ── Success chip ─────────────────────────────────────────────
function SuccessChip({ msg }: { msg: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12,
        color: '#1b7f4f',
        fontWeight: 600,
        padding: '6px 10px',
        background: 'rgba(27,127,79,0.06)',
        borderRadius: 'var(--r-sm)',
        border: '1px solid rgba(27,127,79,0.18)',
      }}
    >
      {msg}
    </p>
  )
}

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-2)',
  letterSpacing: '0.03em',
  margin: '18px 0 6px',
}

// ── Safe date formatter — falls back to "bientôt" ────────────
function formatNextChangeDate(value: string | number | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR')
}

export default function ProfileEdit({ onClose }: Props) {
  const { profile, updateProfile, pickAndUploadAvatar } = useProfile()

  // ── Mount guard (post-unmount setState protection) ────────
  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

  // ── Avatar section state (saved live on pick) ─────────────
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Name + username (saved together via the bottom CTA) ───
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  const gate = canChangeUsername(profile?.username_changed_at ?? null, Date.now())

  useEffect(() => {
    return () => {
      if (avatarTimerRef.current !== null) clearTimeout(avatarTimerRef.current)
    }
  }, [])

  // Pre-fill once the (shared) profile is available — in case it loads
  // after this component mounts (useState initialisers only run once).
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setUsername(profile.username)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Guard: component is only rendered when profile exists
  if (!profile) return null

  // ── Avatar handler (immediate save) ──────────────────────
  const showAvatarSuccess = () => {
    setAvatarSuccess(true)
    if (avatarTimerRef.current !== null) clearTimeout(avatarTimerRef.current)
    avatarTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setAvatarSuccess(false)
      avatarTimerRef.current = null
    }, 2500)
  }

  const handlePickAvatar = async () => {
    setAvatarErr(null)
    setAvatarBusy(true)
    try {
      const url = await pickAndUploadAvatar()
      if (!mountedRef.current) return
      if (!url) return
      const result = await updateProfile({ avatar_url: url })
      if (!mountedRef.current) return
      if (!result.ok) {
        setAvatarErr(result.error ?? 'Impossible de mettre à jour la photo.')
      } else {
        showAvatarSuccess()
      }
    } catch {
      if (mountedRef.current) setAvatarErr('Échec de la mise à jour de la photo. Réessaie.')
    } finally {
      if (mountedRef.current) setAvatarBusy(false)
    }
  }

  // ── Save name + pseudo (only changed fields) ─────────────
  const nameChanged = displayName.trim() !== profile.display_name
  const usernameChanged = gate.ok && username.trim().toLowerCase() !== profile.username
  const dirty = nameChanged || usernameChanged

  const handleSave = async () => {
    if (busy) return
    setFormErr(null)
    const name = displayName.trim()
    if (!name) {
      setFormErr('Le nom ne peut pas être vide.')
      return
    }
    const patch: { display_name?: string; username?: string } = {}
    if (name !== profile.display_name) patch.display_name = name
    if (gate.ok) {
      const uname = username.trim().toLowerCase()
      if (uname !== profile.username) {
        const v = validateUsername(uname)
        if (!v.ok) {
          setFormErr(v.reason)
          return
        }
        patch.username = v.username
      }
    }
    // Nothing left to persist (e.g. only the avatar changed) → just close.
    if (!patch.display_name && !patch.username) {
      onClose()
      return
    }
    setBusy(true)
    try {
      const result = await updateProfile(patch)
      if (!mountedRef.current) return
      if (result.ok) {
        onClose()
        return
      }
      if (result.error === 'username_taken') {
        setFormErr('Ce pseudo est déjà pris.')
      } else if (result.error === 'username_locked') {
        const date = formatNextChangeDate(result.nextChangeAt)
        setFormErr(date ? `Tu pourras le changer le ${date}.` : 'Tu pourras le changer bientôt.')
      } else {
        setFormErr(result.error ?? 'Une erreur est survenue.')
      }
    } catch {
      if (mountedRef.current) setFormErr('Connexion impossible. Réessaie.')
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const lockedDateLabel = !gate.ok ? formatNextChangeDate(gate.nextChangeAt) : null

  return (
    <StepShell
      onClose={onClose}
      title="Mon profil"
      subtitle="Modifie ton nom, ta photo et ton pseudo."
      cta={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {formErr && <ErrorBanner msg={formErr} />}
          <button className="btn-primary" disabled={!dirty || busy} onClick={handleSave}>
            {busy ? <Spinner light /> : 'Enregistrer'}
          </button>
        </div>
      }
    >
      {/* ── Avatar (centered, saved live) ─────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Avatar
          name={profile.display_name || profile.username || '?'}
          src={profile.avatar_url}
          id={profile.id}
          size={104}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={handlePickAvatar}
          disabled={avatarBusy}
          style={{ width: 'auto' }}
        >
          {avatarBusy ? <Spinner /> : 'Changer la photo'}
        </button>
        {avatarErr && <ErrorBanner msg={avatarErr} />}
        {avatarSuccess && <SuccessChip msg="Photo mise à jour ✓" />}
      </div>

      {/* ── Nom ───────────────────────────────────────────── */}
      <label htmlFor="display_name" style={fieldLabel}>
        Ton nom
      </label>
      <input
        id="display_name"
        className="input-field"
        type="text"
        placeholder="Ton nom"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value)
          setFormErr(null)
        }}
        autoComplete="name"
        aria-label="Nom affiché"
      />

      {/* ── @pseudo ───────────────────────────────────────── */}
      <label htmlFor="username" style={fieldLabel}>
        Pseudo
      </label>
      {gate.ok ? (
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
              userSelect: 'none',
            }}
          >
            @
          </span>
          <input
            id="username"
            className="input-field"
            type="text"
            autoCapitalize="none"
            placeholder="ton_pseudo"
            value={username}
            onChange={(e) => {
              const v = e.target.value
              setUsername(v.startsWith('@') ? v.slice(1) : v)
              setFormErr(null)
            }}
            autoComplete="username"
            aria-label="Pseudo"
            style={{ paddingLeft: 28 }}
          />
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                fontWeight: 700,
                pointerEvents: 'none',
                userSelect: 'none',
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
              style={{ paddingLeft: 28, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            {lockedDateLabel
              ? `Tu pourras changer ton pseudo le ${lockedDateLabel}.`
              : 'Tu pourras changer ton pseudo bientôt.'}
          </p>
        </>
      )}
    </StepShell>
  )
}
