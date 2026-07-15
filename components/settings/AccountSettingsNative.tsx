// ============================================================
// components/settings/AccountSettingsNative.tsx
// Native « Identité & accès » screen — layout « bibliothèque »
// (palette Forkmap conservée) : sections à en-têtes serif séparées
// par des filets fins, lignes calmes et aérées (libellé + valeur/
// chevron) avec édition inline. Comportement inchangé : nom, e-mail,
// mot de passe, déconnexion, suppression du compte.
// ============================================================
'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { ChevronRight, Check, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ── Section « bibliothèque » : en-tête serif + filet fin ──────
function Section({
  title,
  first,
  children,
}: {
  title: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        marginTop: first ? 4 : 28,
        paddingTop: first ? 0 : 28,
        borderTop: first ? 'none' : '1px solid var(--border)',
      }}
    >
      <h2
        style={{
          margin: '0 0 4px',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 21,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}

// Filet fin entre lignes d'une même section
function RowDivider() {
  return <div style={{ height: 1, background: 'var(--border)' }} />
}

export default function AccountSettingsNative({ isMobile: _isMobile }: { isMobile: boolean }) {
  const auth = useAuth()
  const router = useRouter()
  const sb = getSupabaseBrowserClient()

  // ── identity ──
  const [displayName, setDisplayName] = useState('')
  const [nameState, setNameState] = useState<SaveState>('idle')

  // ── password ──
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState('')
  const [showPw, setShowPw] = useState(false)

  // ── session / delete ──
  const [signingOut, setSigningOut] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── inline open row ──
  const [openRow, setOpenRow] = useState<'name' | 'password' | null>(null)

  // seed display name once
  const initialised = useRef(false)
  const user = auth.user
  if (user && !initialised.current) {
    initialised.current = true
    const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''
    setDisplayName(name)
  }

  if (!user) return null

  const currentName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''
  const isGoogleUser = user.app_metadata?.provider === 'google'
  const nameChanged = displayName.trim() !== '' && displayName !== currentName

  // ── handlers ──
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

  // ── save button (small accent action) ──
  const saveBtn = (state: SaveState, label: string, onClick: () => void, disabled: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '11px 20px',
        borderRadius: 999,
        border: 'none',
        background: state === 'saved' ? 'var(--open)' : 'var(--accent)',
        color: 'var(--on-accent)',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.4 : 1,
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

  // ── render ──
  return (
    <>
      {/* ── Identité ── */}
      <Section title="Identité" first>
        {/* Nom row (expandable) */}
        <button onClick={() => setOpenRow(openRow === 'name' ? null : 'name')} style={rowBtn}>
          <span style={rowLabel}>Nom</span>
          {openRow !== 'name' && (
            <span
              style={{
                ...rowValue,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                maxWidth: 180,
              }}
            >
              {currentName}
            </span>
          )}
          <ChevronRight
            size={18}
            strokeWidth={1.9}
            color="var(--text-4)"
            style={{
              flexShrink: 0,
              transition: 'transform 200ms',
              transform: openRow === 'name' ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </button>
        {openRow === 'name' && (
          <div style={{ padding: '2px 0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input-field"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              aria-label="Nom affiché"
            />
            <div>{saveBtn(nameState, 'Enregistrer', saveName, !nameChanged)}</div>
            {nameState === 'error' && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--closed)', fontWeight: 600 }}>
                {"Échec de l'enregistrement. Réessayez."}
              </p>
            )}
          </div>
        )}

        <RowDivider />

        {/* E-mail row (non-interactive) */}
        <div style={{ ...rowBase, cursor: 'default' }}>
          <span style={rowLabel}>E-mail</span>
          <span
            style={{
              ...rowValue,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
              maxWidth: 150,
            }}
          >
            {user.email}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-4)',
            }}
          >
            {isGoogleUser ? 'Google' : 'Vérifiée'}
          </span>
        </div>
      </Section>

      {/* ── Sécurité ── */}
      <Section title="Sécurité">
        {!isGoogleUser ? (
          <>
            <button
              onClick={() => setOpenRow(openRow === 'password' ? null : 'password')}
              style={rowBtn}
            >
              <span style={rowLabel}>Mot de passe</span>
              {openRow !== 'password' && <span style={rowValue}>Modifier</span>}
              <ChevronRight
                size={18}
                strokeWidth={1.9}
                color="var(--text-4)"
                style={{
                  flexShrink: 0,
                  transition: 'transform 200ms',
                  transform: openRow === 'password' ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            </button>
            {openRow === 'password' && (
              <div
                style={{ padding: '2px 0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}
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
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--closed)', fontWeight: 600 }}>
                    {pwError}
                  </p>
                )}
                <div>{saveBtn(pwState, 'Mettre à jour', changePassword, !newPw || !confirmPw)}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ ...rowBase, cursor: 'default' }}>
            <span style={rowLabel}>Mot de passe</span>
            <span style={rowValue}>Géré par Google</span>
          </div>
        )}
      </Section>

      {/* ── Session ── */}
      <Section title="Session">
        <button
          onClick={signOut}
          disabled={signingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '15px 0',
            background: 'none',
            border: 'none',
            width: '100%',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontSize: 15.5,
            fontWeight: 500,
            color: 'var(--text)',
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          <LogOut size={19} strokeWidth={1.7} color="var(--text-3)" style={{ flexShrink: 0 }} />
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </Section>

      {/* Supprimer le compte — lien discret */}
      <button
        onClick={() => setDeleteModal(true)}
        style={{
          display: 'block',
          margin: '34px auto 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          padding: 8,
        }}
      >
        Supprimer le compte
      </button>

      {/* Delete confirm modal */}
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
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
              }}
            >
              Supprimer votre compte ?
            </h3>
            <p
              style={{
                margin: '0 0 18px',
                fontSize: 13.5,
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              Action irréversible — votre compte et tous vos lieux enregistrés seront supprimés.
            </p>
            <p
              style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-80)' }}
            >
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
                padding: '11px 14px',
                borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--border-strong)',
                background: 'var(--surface)',
                fontSize: 16,
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
                  padding: '11px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13.5,
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
                  padding: '11px',
                  borderRadius: 'var(--r-md)',
                  border: 'none',
                  background: deleteEmail === user.email ? 'var(--closed)' : 'var(--surface-2)',
                  color: deleteEmail === user.email ? 'var(--on-accent)' : 'var(--text-3)',
                  cursor: deleteEmail === user.email ? 'pointer' : 'not-allowed',
                  fontSize: 13.5,
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
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  )
}

// ── PwField ──
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
          className="input-field"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          style={{ paddingRight: 42 }}
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
          {show ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

// ── Style consts ──
const rowBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '15px 0',
  width: '100%',
}
const rowBtn: React.CSSProperties = {
  ...rowBase,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
}
const rowLabel: React.CSSProperties = {
  flex: 1,
  fontSize: 15.5,
  fontWeight: 500,
  color: 'var(--text)',
  letterSpacing: '-0.005em',
}
const rowValue: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--text-3)',
  flexShrink: 0,
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
