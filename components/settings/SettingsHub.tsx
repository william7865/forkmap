// ============================================================
// components/settings/SettingsHub.tsx
// Native settings hub — layout « bibliothèque »
// (palette Forkmap conservée) : grand titre serif « Réglages »,
// une ligne-profil calme, puis des sections à en-têtes serif
// séparées par des filets fins — lignes de réglage aérées
// (icône discrète + libellé + valeur/chevron). Web /settings reste
// inchangé (rendu par AccountSettingsContent).
// ============================================================
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProfile } from '@/lib/hooks/useProfile'
import { Avatar } from '@/components/social/Avatar'
import ProfileEdit from '@/components/social/ProfileEdit'
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  Mail,
  Info,
  Shield,
  FileText,
  Map,
  UserPlus,
  Utensils,
  BadgeCheck,
  ShieldCheck,
  Bell,
} from 'lucide-react'
import { nativeShare } from '@/lib/native/share'
import { apiFetch } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth-headers'
import TasteEditor from '@/components/settings/TasteEditor'
import VerificationSheet from '@/components/settings/VerificationSheet'
import NotifyPrefSheet from '@/components/settings/NotifyPrefSheet'
import AdminVerificationsSheet from '@/components/settings/AdminVerificationsSheet'
import { getThemePref, setThemePref, type ThemePref } from '@/lib/theme'
import { refreshTheme } from '@/components/native/CapacitorInit'

// ── Section « bibliothèque » : en-tête serif + filet fin ──────
const sectionStyle: React.CSSProperties = {
  marginTop: 26,
  paddingTop: 26,
  borderTop: '1px solid var(--border)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2
        style={{
          margin: '0 0 6px',
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

// ── Ligne de réglage aérée : icône discrète + libellé + valeur/chevron ──
function SettingRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 15,
        padding: '15px 0',
        background: 'none',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={19} strokeWidth={1.7} color="var(--text-3)" style={{ flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: 15.5,
          fontWeight: 500,
          color: 'var(--text)',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </span>
      {value && (
        <span style={{ fontSize: 13.5, color: 'var(--text-3)', flexShrink: 0 }}>{value}</span>
      )}
      <ChevronRight size={18} strokeWidth={1.9} color="var(--text-4)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// Filet fin entre lignes, aligné sous le libellé (inset)
function RowDivider() {
  return <div style={{ height: 1, background: 'var(--border)', marginLeft: 34 }} />
}

// ── Bascule de thème — segment calme (comportement inchangé) ───
function ThemeControl() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref())
  const options: { key: ThemePref; label: string }[] = [
    { key: 'light', label: 'Clair' },
    { key: 'dark', label: 'Sombre' },
    { key: 'auto', label: 'Auto' },
  ]
  const choose = (p: ThemePref) => {
    setPref(p)
    setThemePref(p)
    refreshTheme()
  }
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        marginTop: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
      }}
    >
      {options.map((o) => {
        const active = pref === o.key
        return (
          <button
            key={o.key}
            onClick={() => choose(o.key)}
            aria-pressed={active}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 600,
              transition: 'background 140ms, color 140ms',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function SettingsHub() {
  const router = useRouter()
  const auth = useAuth()
  const { profile } = useProfile()
  const [editing, setEditing] = useState(false)
  const [editingTaste, setEditingTaste] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [showNotifyPref, setShowNotifyPref] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Probe admin access once (route is admin-gated → hide the row for everyone else).
  useEffect(() => {
    let cancelled = false
    getAuthHeaders().then((headers) => {
      if (!headers.Authorization) return
      apiFetch('/api/admin/verifications', { headers })
        .then((r) => !cancelled && setIsAdmin(r.ok))
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    await auth.signOut()
    router.replace('/')
  }

  const inviteFriends = async () => {
    const base = 'https://forkmap.vercel.app'
    const url = profile?.username ? `${base}/u/${profile.username}` : base
    const text = 'Rejoins-moi sur Forkmap — l’app pour trouver où manger sans se prendre la tête 🍴'
    const handled = await nativeShare({
      title: 'Forkmap',
      text,
      url,
      dialogTitle: 'Inviter des amis',
    })
    if (!handled) {
      // Web fallback: Web Share API, else copy the link.
      try {
        if (navigator.share) await navigator.share({ title: 'Forkmap', text, url })
        else await navigator.clipboard.writeText(`${text} ${url}`)
      } catch {
        /* user cancelled */
      }
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 660,
          margin: '0 auto',
          padding: 'calc(var(--safe-top) + 12px) 20px calc(var(--safe-bottom) + 48px)',
        }}
      >
        {/* ── Retour — bouton-icône discret, ── */}
        <button
          onClick={() => history.back()}
          aria-label="Retour"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-2)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.9} />
        </button>

        {/* ── Titre d'écran — grand, serif ── */}
        <h1
          style={{
            margin: '18px 0 0',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 32,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: 'var(--text)',
          }}
        >
          Réglages
        </h1>

        {/* ── Ligne-profil — calme, éditoriale (avatar + nom serif + @) ── */}
        {profile && (
          <button
            onClick={() => setEditing(true)}
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'none',
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <Avatar
              name={profile.display_name}
              src={profile.avatar_url}
              id={profile.id}
              size={56}
            />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 18,
                  letterSpacing: '-0.01em',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.display_name}
              </span>
              <span
                style={{ display: 'block', marginTop: 3, fontSize: 13.5, color: 'var(--text-3)' }}
              >
                @{profile.username}
              </span>
            </span>
            <ChevronRight
              size={20}
              strokeWidth={1.9}
              color="var(--text-4)"
              style={{ flexShrink: 0 }}
            />
          </button>
        )}

        {/* ── Apparence ── */}
        <Section title="Apparence">
          <ThemeControl />
        </Section>

        {/* ── Préférences ── */}
        <Section title="Préférences">
          <SettingRow icon={Utensils} label="Tes goûts" onClick={() => setEditingTaste(true)} />
        </Section>

        {/* ── Tastemaker ── */}
        <Section title="Tastemaker">
          <SettingRow
            icon={BadgeCheck}
            label="Vérification"
            onClick={() => setShowVerification(true)}
          />
          {profile?.verified && (
            <>
              <RowDivider />
              <SettingRow
                icon={Bell}
                label="Prévenir mes abonnés"
                onClick={() => setShowNotifyPref(true)}
              />
            </>
          )}
          {isAdmin && (
            <>
              <RowDivider />
              <SettingRow
                icon={ShieldCheck}
                label="Demandes de vérification"
                onClick={() => setShowAdmin(true)}
              />
            </>
          )}
        </Section>

        {/* ── Partager ── */}
        <Section title="Partager">
          <SettingRow icon={UserPlus} label="Inviter des amis" onClick={inviteFriends} />
        </Section>

        {/* ── Compte ── */}
        <Section title="Compte">
          <SettingRow
            icon={Settings}
            label="Identité & accès"
            onClick={() => router.push('/settings/compte')}
          />
        </Section>

        {/* ── Aide ── */}
        <Section title="Aide">
          <SettingRow icon={HelpCircle} label="Aide & FAQ" onClick={() => router.push('/help')} />
          <RowDivider />
          <SettingRow icon={Mail} label="Contact" onClick={() => router.push('/contact')} />
          <RowDivider />
          <SettingRow icon={Info} label="À propos" onClick={() => router.push('/about')} />
        </Section>

        {/* ── Légal ── */}
        <Section title="Légal">
          <SettingRow
            icon={Shield}
            label="Confidentialité"
            onClick={() => router.push('/privacy')}
          />
          <RowDivider />
          <SettingRow
            icon={FileText}
            label="Conditions d'utilisation"
            onClick={() => router.push('/terms')}
          />
          <RowDivider />
          <SettingRow
            icon={Map}
            label="Attribution des données"
            onClick={() => router.push('/attribution')}
          />
        </Section>

        {/* ── Se déconnecter ── */}
        <button
          onClick={signOut}
          disabled={signingOut}
          style={{
            display: 'block',
            margin: '34px auto 0',
            background: 'none',
            border: 'none',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            color: 'var(--closed)',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            padding: 12,
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </div>

      {editing && <ProfileEdit onClose={() => setEditing(false)} allowUsername />}
      {editingTaste && <TasteEditor onClose={() => setEditingTaste(false)} />}
      {showVerification && <VerificationSheet onClose={() => setShowVerification(false)} />}
      {showNotifyPref && <NotifyPrefSheet onClose={() => setShowNotifyPref(false)} />}
      {showAdmin && <AdminVerificationsSheet onClose={() => setShowAdmin(false)} />}
    </div>
  )
}
