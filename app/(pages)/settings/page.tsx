'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { InfoPage } from '@/components/ui/PageLayout'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Check, Eye, EyeOff, LogOut, Trash2, Mail } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SettingsPage() {
  const { isReady, auth } = useAuthGuard()
  const router = useRouter()
  const sb = getSupabaseBrowserClient()

  const [displayName, setDisplayName] = useState('')
  const [nameState, setNameState] = useState<SaveState>('idle')

  const [_currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const initialised = useRef(false)
  if (isReady && !initialised.current) {
    initialised.current = true
    const name = auth.user?.user_metadata?.full_name ?? auth.user?.email?.split('@')[0] ?? ''
    setDisplayName(name)
  }

  if (!isReady) {
    return (
      <InfoPage headerLabel="Paramètres">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid var(--surface-2)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </InfoPage>
    )
  }

  const user = auth.user!
  const avatarUrl = user.user_metadata?.avatar_url
  const currentName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''
  const initials = currentName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const isGoogleUser = user.app_metadata?.provider === 'google'

  const saveName = async () => {
    if (!displayName.trim() || displayName === currentName) return
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
      setCurrentPw('')
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
      const sb = getSupabaseBrowserClient()
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

  return (
    <InfoPage headerLabel="Paramètres" maxWidth={640}>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: 'var(--text)',
        }}
      >
        Paramètres
      </h1>
      <p style={{ margin: '0 0 36px', fontSize: 14, color: 'var(--text-3)' }}>
        Gérez votre profil et les préférences de votre compte.
      </p>

      {/* Photo de profil */}
      <Card title="Photo de profil">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--accent-hover), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(45,122,85,0.15)',
            }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={currentName}
                width={72}
                height={72}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 600, color: 'white' }}>{initials}</span>
            )}
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {currentName}
            </p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-3)' }}>
              {isGoogleUser ? 'Photo gérée par Google' : 'Avatar généré depuis vos initiales'}
            </p>
            {isGoogleUser && (
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Compte Google
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Nom affiché */}
      <Card title="Nom affiché">
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Votre nom"
            aria-label="Nom affiché"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
          />
          <button
            onClick={saveName}
            disabled={!displayName.trim() || displayName === currentName || nameState === 'saving'}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: nameState === 'saved' ? 'var(--open)' : 'var(--accent)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
              transition: 'background 150ms',
              opacity: !displayName.trim() || displayName === currentName ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {nameState === 'saved' ? (
              <>
                <Check size={13} strokeWidth={2.5} /> Enregistré
              </>
            ) : nameState === 'saving' ? (
              'Enregistrement…'
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
        {nameState === 'error' && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--coral)' }}>
            Échec de l&apos;enregistrement. Réessayez.
          </p>
        )}
      </Card>

      {/* Adresse e-mail */}
      <Card title="Adresse e-mail">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'var(--surface)',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          <Mail size={14} strokeWidth={2} color="var(--text-3)" />
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{user.email}</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
          {isGoogleUser
            ? "L'adresse e-mail est gérée par votre compte Google et ne peut pas être modifiée ici."
            : 'Pour changer votre e-mail, contactez le support.'}
        </p>
      </Card>

      {/* Mot de passe */}
      {!isGoogleUser && (
        <Card title="Changer le mot de passe">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PwField
              label="Nouveau mot de passe"
              value={newPw}
              onChange={setNewPw}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
              placeholder="Min. 8 caractères"
            />
            <PwField
              label="Confirmer le nouveau mot de passe"
              value={confirmPw}
              onChange={setConfirmPw}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
              placeholder="Répétez le nouveau mot de passe"
            />
            {pwError && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--coral)', fontWeight: 600 }}>
                {pwError}
              </p>
            )}
            <button
              onClick={changePassword}
              disabled={!newPw || !confirmPw || pwState === 'saving'}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: pwState === 'saved' ? 'var(--open)' : 'var(--accent)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: !newPw || !confirmPw ? 0.4 : 1,
                transition: 'background 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {pwState === 'saved' ? (
                <>
                  <Check size={13} strokeWidth={2.5} /> Mot de passe mis à jour
                </>
              ) : pwState === 'saving' ? (
                'Mise à jour…'
              ) : (
                'Mettre à jour'
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Actions du compte */}
      <Card title="Actions du compte" danger>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={signOut}
            disabled={signingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 16px',
              background: 'transparent',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={14} strokeWidth={2} color="var(--text-2)" />
            <div>
              <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>
                Se déconnecter sur cet appareil
              </p>
            </div>
          </button>

          <button
            onClick={() => setDeleteModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 16px',
              background: 'transparent',
              border: '1.5px solid rgba(197,48,48,0.2)',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-pale)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={14} strokeWidth={2} color="var(--coral)" />
            <div>
              <p
                style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 600, color: 'var(--coral)' }}
              >
                Supprimer le compte
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>
                Supprimer définitivement votre compte et toutes vos données
              </p>
            </div>
          </button>
        </div>
      </Card>

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
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: 'var(--bg)',
              borderRadius: 20,
              padding: '28px 28px 24px',
              maxWidth: 380,
              width: '100%',
              boxShadow: 'var(--s4)',
              animation: 'scaleIn 200ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--coral-pale)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Trash2 size={20} strokeWidth={2} color="var(--coral)" />
            </div>
            <h3
              style={{
                margin: '0 0 6px',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: 'var(--text)',
              }}
            >
              Supprimer votre compte ?
            </h3>
            <p
              style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}
            >
              Cette action supprime définitivement votre compte et tous vos lieux enregistrés. Elle
              est irréversible. Tapez votre e-mail pour confirmer :
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user.email ?? 'votre@email.com'}
              aria-label="Confirmer l'e-mail pour supprimer le compte"
              style={{ ...inputStyle, marginBottom: 14 }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
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
                  borderRadius: 10,
                  border: '1.5px solid var(--border-strong)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
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
                  borderRadius: 10,
                  border: 'none',
                  background: deleteEmail === user.email ? 'var(--coral)' : 'var(--surface-2)',
                  color: deleteEmail === user.email ? 'white' : 'var(--text-3)',
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
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </InfoPage>
  )
}

function Card({
  title,
  children,
  danger,
}: {
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: danger ? 'var(--coral)' : 'var(--text-3)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: 'var(--bg)',
          border: `1px solid ${danger ? 'rgba(197,48,48,0.12)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: 'var(--s1)',
        }}
      >
        {children}
      </div>
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
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-3)',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          style={{ ...inputStyle, paddingRight: 38 }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
        />
        <button
          onClick={onToggle}
          type="button"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={{
            position: 'absolute',
            right: 10,
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
          {show ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--border-strong)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 120ms, box-shadow 120ms',
}
const focusStyle: React.CSSProperties = {
  borderColor: 'var(--accent)',
  boxShadow: 'var(--s-focus)',
}
const blurStyle: React.CSSProperties = { borderColor: 'var(--border-strong)', boxShadow: 'none' }
