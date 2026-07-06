// ============================================================
// components/settings/SettingsHub.tsx
// Native settings hub — grouped list (BeReal/Instagram-style)
// in Forkmap cream palette. Shown in native only via isNative
// branch in app/(pages)/settings/page.tsx.
// ============================================================
'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { nativeShare } from '@/lib/native/share'
import TasteEditor from '@/components/settings/TasteEditor'
import { getThemePref, setThemePref, type ThemePref } from '@/lib/theme'
import { refreshTheme } from '@/components/native/CapacitorInit'

// ── Sub-components ────────────────────────────────────────────

function HubRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 14px',
        background: 'none',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--r-md)',
          background: 'var(--bone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        <Icon size={17} strokeWidth={1.9} />
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      <ChevronRight size={18} color="var(--text-3)" />
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--b1)', margin: '0 14px' }} />
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--text-3)',
          margin: '0 0 8px 6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--s2)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

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
    <div style={{ display: 'flex', gap: 4, padding: 4 }}>
      {options.map((o) => {
        const active = pref === o.key
        return (
          <button
            key={o.key}
            onClick={() => choose(o.key)}
            aria-pressed={active}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'var(--surface-2)',
              color: active ? 'var(--on-accent)' : 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
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
        paddingBottom: 'calc(var(--safe-bottom) + 40px)',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 'calc(var(--safe-top) + 10px) 16px 8px',
        }}
      >
        <button
          onClick={() => history.back()}
          aria-label="Retour"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            color: 'var(--ink)',
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            Réglages
          </span>
        </div>
        <div style={{ width: 24 }} />
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 16px 0' }}>
        {/* Profile card */}
        {profile && (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--b2)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s2)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              marginBottom: 24,
              fontFamily: 'inherit',
            }}
          >
            <Avatar
              name={profile.display_name}
              src={profile.avatar_url}
              id={profile.id}
              size={52}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {profile.display_name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>@{profile.username}</div>
            </div>
            <ChevronRight
              size={20}
              color="var(--text-3)"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            />
          </button>
        )}

        {/* Section: APPARENCE */}
        <Section label="APPARENCE">
          <ThemeControl />
        </Section>

        {/* Section: PRÉFÉRENCES */}
        <Section label="PRÉFÉRENCES">
          <HubRow icon={Utensils} label="Tes goûts" onClick={() => setEditingTaste(true)} />
        </Section>

        {/* Section: PARTAGER */}
        <Section label="PARTAGER">
          <HubRow icon={UserPlus} label="Inviter des amis" onClick={inviteFriends} />
        </Section>

        {/* Section: COMPTE */}
        <Section label="COMPTE">
          <HubRow
            icon={Settings}
            label="Identité & accès"
            onClick={() => router.push('/settings/compte')}
          />
        </Section>

        {/* Section: AIDE */}
        <Section label="AIDE">
          <HubRow icon={HelpCircle} label="Aide & FAQ" onClick={() => router.push('/help')} />
          <Divider />
          <HubRow icon={Mail} label="Contact" onClick={() => router.push('/contact')} />
          <Divider />
          <HubRow icon={Info} label="À propos" onClick={() => router.push('/about')} />
        </Section>

        {/* Section: LÉGAL */}
        <Section label="LÉGAL">
          <HubRow icon={Shield} label="Confidentialité" onClick={() => router.push('/privacy')} />
          <Divider />
          <HubRow
            icon={FileText}
            label="Conditions d'utilisation"
            onClick={() => router.push('/terms')}
          />
          <Divider />
          <HubRow
            icon={Map}
            label="Attribution des données"
            onClick={() => router.push('/attribution')}
          />
        </Section>

        {/* Sign out */}
        <button
          onClick={signOut}
          disabled={signingOut}
          style={{
            display: 'block',
            margin: '12px auto 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--coral)',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            padding: 12,
          }}
        >
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </div>

      {editing && <ProfileEdit onClose={() => setEditing(false)} allowUsername />}
      {editingTaste && <TasteEditor onClose={() => setEditingTaste(false)} />}
    </div>
  )
}
