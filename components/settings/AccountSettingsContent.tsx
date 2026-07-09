'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Check, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function AccountSettingsContent({ isMobile }: { isMobile: boolean }) {
  const auth = useAuth()
  const router = useRouter()
  const sb = getSupabaseBrowserClient()

  const [displayName, setDisplayName] = useState('')
  const [nameState, setNameState] = useState<SaveState>('idle')

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [avatarBroken, setAvatarBroken] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const initialised = useRef(false)
  const user = auth.user
  if (user && !initialised.current) {
    initialised.current = true
    const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''
    setDisplayName(name)
  }

  if (!user) return null

  const avatarUrl = user.user_metadata?.avatar_url
  const showAvatar = avatarUrl && !avatarBroken
  const currentName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''
  const initials =
    currentName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '·'
  const isGoogleUser = user.app_metadata?.provider === 'google'
  const nameChanged = displayName.trim() !== '' && displayName !== currentName
  const joinedShort = new Date(user.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  const saveName = async () => {
    if (!nameChanged) return
    setNameState('saving')
    const { error } = await sb.auth.updateUser({ data: { full_name: displayName.trim() } })
    setNameState(error ? 'error' : 'saved')
    setTimeout(() => setNameState('idle'), 2500)
  }

  const changePassword = async () => {
    setPwError('')
    if (newPw.length < 8) {
      setPwError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }
    setPwState('saving')
    const { error } = await sb.auth.updateUser({ password: newPw })
    if (error) {
      setPwError(error.message)
      setPwState('error')
    } else {
      setPwState('saved')
      setNewPw('')
      setConfirmPw('')
    }
    setTimeout(() => setPwState('idle'), 2500)
  }

  const signOut = async () => {
    setSigningOut(true)
    await auth.signOut()
    router.replace('/')
  }

  const deleteAccount = async () => {
    if (deleteEmail !== user.email) return
    setDeleting(true)
    try {
      const {
        data: { session },
      } = await sb.auth.getSession()
      const authHeader: HeadersInit = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
      const res = await apiFetch('/api/account', { method: 'DELETE', headers: authHeader })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Impossible de supprimer le compte. Contactez le support.')
        setDeleting(false)
        return
      }
      await auth.signOut()
      router.replace('/')
    } catch {
      alert("Une erreur inattendue s'est produite. Veuillez réessayer.")
      setDeleting(false)
    }
  }

  const saveBtn = (state: SaveState, label: string, onClick: () => void, disabled: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 18px',
        borderRadius: 'var(--r-md)',
        border: 'none',
        background: state === 'saved' ? 'var(--open)' : 'var(--accent)',
        color: 'var(--on-accent)',
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.4 : 1,
        boxShadow: state === 'saved' ? 'none' : 'var(--s-accent)',
        transition: 'background 150ms, opacity 150ms, transform 80ms',
        whiteSpace: 'nowrap' as const,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {state === 'saved' ? (
        <>
          <Check size={14} strokeWidth={2.5} /> Enregistré
        </>
      ) : state === 'saving' ? (
        'Enregistrement…'
      ) : (
        label
      )}
    </button>
  )

  return (
    <>
      {/* ── En-tête éditorial ── */}
      <header
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          animation: 'fadeUp 360ms var(--ease-out) both',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow>Réglages</Eyebrow>
          <h1
            style={{
              margin: '14px 0 7px',
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 32 : 44,
              fontWeight: 600,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              color: 'var(--text)',
            }}
          >
            Votre compte
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              flexWrap: 'wrap' as const,
            }}
          >
            <span>Membre depuis {joinedShort}</span>
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: 'var(--text-4)',
                flexShrink: 0,
              }}
            />
            <span>{isGoogleUser ? 'Connexion Google' : 'Connexion e-mail'}</span>
          </p>
        </div>
        <div
          style={{
            flexShrink: 0,
            width: isMobile ? 48 : 56,
            height: isMobile ? 48 : 56,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            boxShadow: '0 0 0 1px var(--border)',
          }}
        >
          {showAvatar ? (
            <Image
              src={avatarUrl}
              alt={currentName}
              width={56}
              height={56}
              onError={() => setAvatarBroken(true)}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isMobile ? 19 : 22,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              {initials}
            </span>
          )}
        </div>
      </header>

      {/* ── Registre ── */}
      <div style={{ marginTop: isMobile ? 36 : 52 }}>
        {/* 01 — Identité */}
        <Row
          n="01"
          title="Identité"
          sub="Le nom affiché dans l'app."
          isMobile={isMobile}
          delay={60}
        >
          <label style={fieldLabel}>Nom affiché</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              aria-label="Nom affiché"
              style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
            />
            {saveBtn(nameState, 'Enregistrer', saveName, !nameChanged)}
          </div>
          {nameState === 'error' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--coral)' }}>
              {"Échec de l'enregistrement. Réessayez."}
            </p>
          )}
        </Row>

        {/* 02 — Accès */}
        <Row n="02" title="Accès" sub="E-mail et mot de passe." isMobile={isMobile} delay={100}>
          <label style={fieldLabel}>Adresse e-mail</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '11px 14px',
              background: 'var(--surface)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontSize: 13.5,
                color: 'var(--text)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {user.email}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-4)',
              }}
            >
              {isGoogleUser ? 'Google' : 'Vérifiée'}
            </span>
          </div>
          <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            {isGoogleUser
              ? 'Gérée par votre compte Google — non modifiable ici.'
              : 'Pour changer votre e-mail, contactez le support.'}
          </p>

          {!isGoogleUser && (
            <div
              style={{
                marginTop: 22,
                paddingTop: 22,
                borderTop: '1px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <PwField
                label="Nouveau mot de passe"
                value={newPw}
                onChange={setNewPw}
                show={showPw}
                onToggle={() => setShowPw((v) => !v)}
                placeholder="Min. 8 caractères"
              />
              <PwField
                label="Confirmer le mot de passe"
                value={confirmPw}
                onChange={setConfirmPw}
                show={showPw}
                onToggle={() => setShowPw((v) => !v)}
                placeholder="Répétez le mot de passe"
              />
              {pwError && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}>
                  {pwError}
                </p>
              )}
              <div>{saveBtn(pwState, 'Mettre à jour', changePassword, !newPw || !confirmPw)}</div>
            </div>
          )}
        </Row>

        {/* 03 — Session */}
        <Row
          n="03"
          title="Session"
          sub="Fermer votre session sur cet appareil."
          isMobile={isMobile}
          delay={140}
        >
          <button onClick={signOut} disabled={signingOut} className="set-quiet" style={quietAction}>
            <LogOut size={16} strokeWidth={2} color="var(--text-2)" />
            <span style={{ fontWeight: 600 }}>
              {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </span>
          </button>
        </Row>

        {/* 04 — Zone sensible */}
        <Row
          n="04"
          title="Suppression"
          sub="Effacer définitivement votre compte et vos données."
          isMobile={isMobile}
          delay={180}
          danger
        >
          <button
            onClick={() => setDeleteModal(true)}
            className="set-danger"
            style={{ ...quietAction, borderColor: 'var(--coral-pale)' }}
          >
            <Trash2 size={16} strokeWidth={2} color="var(--coral)" />
            <span style={{ fontWeight: 600, color: 'var(--coral)' }}>Supprimer le compte</span>
          </button>
        </Row>
      </div>

      {/* Modal suppression */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setDeleteModal(false)}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(25,28,29,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: 'var(--bg)',
              borderRadius: 'var(--r-2xl)',
              padding: 28,
              maxWidth: 380,
              width: '100%',
              boxShadow: 'var(--s4)',
              border: '1px solid var(--border)',
              animation: 'scaleIn 200ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-lg)',
                background: 'var(--coral-pale)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: 'var(--coral)',
              }}
            >
              <Trash2 size={20} strokeWidth={2} />
            </div>
            <h3
              style={{
                margin: '0 0 8px',
                fontFamily: 'var(--font-display)',
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
              }}
            >
              Supprimer votre compte ?
            </h3>
            <p
              style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}
            >
              Action irréversible — votre compte et tous vos lieux enregistrés seront supprimés.
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--ink-80)' }}>
              Tapez <strong>{user.email}</strong> pour confirmer :
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user.email ?? 'votre@email.com'}
              aria-label="Confirmer l'e-mail pour supprimer le compte"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--border-strong)',
                background: 'var(--surface)',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                color: 'var(--text)',
                marginBottom: 16,
                boxSizing: 'border-box' as const,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setDeleteModal(false)
                  setDeleteEmail('')
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink-80)',
                  fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteEmail !== user.email || deleting}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--r-md)',
                  border: 'none',
                  background: deleteEmail === user.email ? 'var(--closed)' : 'var(--surface-2)',
                  color: deleteEmail === user.email ? 'var(--on-accent)' : 'var(--text-3)',
                  cursor: deleteEmail === user.email ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                }}
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .set-quiet { transition: background 140ms ease, border-color 140ms ease; }
        .set-quiet:hover:not(:disabled) { background: var(--surface); border-color: var(--border-strong); }
        .set-danger { transition: background 140ms ease, border-color 140ms ease; }
        .set-danger:hover { background: var(--coral-pale); }
      `}</style>
    </>
  )
}

// Filet de section + label numéroté à gauche, contenu à droite.
function Row({
  n,
  title,
  sub,
  danger,
  isMobile,
  delay = 0,
  children,
}: {
  n: string
  title: string
  sub?: string
  danger?: boolean
  isMobile: boolean
  delay?: number
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 14 : 36,
        paddingTop: isMobile ? 26 : 32,
        marginTop: isMobile ? 26 : 32,
        borderTop: '1px solid var(--border)',
        animation: `fadeUp 360ms var(--ease-out) ${delay}ms both`,
      }}
    >
      <div style={{ width: isMobile ? 'auto' : 188, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-4)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n}
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: danger ? 'var(--coral)' : 'var(--text)',
            }}
          >
            {title}
          </h2>
        </div>
        {sub && (
          <p
            style={{
              margin: '7px 0 0',
              paddingLeft: isMobile ? 0 : 22,
              fontSize: 12.5,
              color: 'var(--text-3)',
              lineHeight: 1.55,
              maxWidth: 170,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isMobile ? 2 : 6 }}>{children}</div>
    </section>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ width: 18, height: 1.5, background: 'var(--accent)', flexShrink: 0 }} />
      {children}
    </div>
  )
}

function PwField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          style={{ ...inputStyle, paddingRight: 40 }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
        />
        <button
          onClick={onToggle}
          type="button"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            display: 'flex',
            padding: 2,
          }}
        >
          {show ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
}
const focusStyle: React.CSSProperties = {
  borderColor: 'var(--accent)',
  background: 'var(--bg)',
  boxShadow: 'var(--s-focus)',
}
const blurStyle: React.CSSProperties = {
  borderColor: 'var(--border-strong)',
  background: 'var(--surface)',
  boxShadow: 'none',
}

const quietAction: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '11px 18px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--border)',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: 'var(--text)',
}
