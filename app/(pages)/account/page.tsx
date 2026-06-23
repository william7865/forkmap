// ============================================================
// app/(pages)/account/page.tsx — Mon compte
// Parti pris éditorial « à plat » : une seule colonne sur papier,
// pas de cartes, pas de grille de stats, pas d'onglets. Identité
// typographique, chiffres en gros titres, rubriques en registre.
// ============================================================
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/lib/hooks/useAuthGuard'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import type { FavoriteRow, PlaceCard } from '@/types'
import { PageHeader, GlobalFooter } from '@/components/ui/PageLayout'
import VisitModal from '@/components/place/VisitModal'
import Image from 'next/image'
import { apiFetch } from '@/lib/api'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import {
  IcoFork,
  IcoStats,
  IcoMoodSolo,
  IcoMoodCouple,
  IcoMoodFriends,
  IcoMoodFamily,
  IcoMoodWork,
} from '@/components/icons'
import type { LucideProps } from 'lucide-react'

const MOOD_ICONS: Record<string, (p: LucideProps) => React.ReactElement> = {
  solo: IcoMoodSolo,
  couple: IcoMoodCouple,
  friends: IcoMoodFriends,
  family: IcoMoodFamily,
  work: IcoMoodWork,
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}

const IcoLogOut = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const IcoCalendar = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const IcoShield = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IcoTrash = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)
const IcoArrow = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)
const IcoPencil = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcoGoogle = () => (
  <svg width="13" height="13" viewBox="0 0 24 24">
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

interface VisitStats {
  total_visits: number
  unique_restaurants: number
  total_spent: number
  avg_spent_per_meal: number
  avg_personal_rating: number
  top_restaurants: {
    osm_id: string
    name: string
    count: number
    total_spent: number
    avg_rating: number
  }[]
  visits_by_month: { month: string; count: number; spent: number }[]
  mood_breakdown: { mood: string; count: number }[]
  cuisine_breakdown: { cuisine: string; count: number; spent: number }[]
}

interface VisitRow {
  id: string
  osm_id: string
  name: string
  visited_at: string
  amount_spent?: number
  people_count: number
  personal_rating?: number
  mood?: string
  note?: string
  snapshot?: Record<string, unknown>
}

// Gamme chaude monochrome (camaïeu terracotta → neutres) — pas de bariolage
const CUISINE_COLORS = [
  '#bb5e2e',
  '#9f4d22',
  '#c47c52',
  '#7a3a1a',
  '#8a7253',
  '#a8521f',
  '#6b5d4a',
  '#d4a07a',
]
const MOOD_LABELS: Record<string, string> = {
  solo: 'Solo',
  couple: 'En couple',
  friends: 'Entre amis',
  family: 'En famille',
  work: 'Travail',
}
function DeleteModal({
  email,
  onConfirm,
  onCancel,
}: {
  email: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [input, setInput] = useState('')
  return (
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
      onClick={onCancel}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(36,31,24,0.5)',
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
          fontFamily: 'var(--font-body)',
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
          <IcoTrash />
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
          Supprimer le compte ?
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Action irréversible. Toutes vos données seront supprimées.
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--ink-80)' }}>
          Tapez <strong>{email}</strong> pour confirmer :
        </p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={email}
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
            onClick={onCancel}
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
            onClick={onConfirm}
            disabled={input !== email}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: input === email ? 'var(--closed)' : 'var(--surface-2)',
              cursor: input === email ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              color: input === email ? '#fff' : 'var(--text-3)',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

function BarChart({
  data,
  color = 'var(--accent)',
  valueSuffix = '',
  labelWidth = 88,
}: {
  data: { label: string; value: number; sublabel?: string }[]
  color?: string
  valueSuffix?: string
  labelWidth?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: labelWidth,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-80)',
              textAlign: 'right' as const,
              flexShrink: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }}
            title={d.label}
          >
            {d.label}
          </div>
          <div
            style={{
              flex: 1,
              height: 24,
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-sm)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${(d.value / max) * 100}%`,
                background: color,
                borderRadius: 'var(--r-sm)',
                transition: 'width 600ms var(--ease-out)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10,
                fontWeight: 700,
                color: 'white',
                zIndex: 1,
                whiteSpace: 'nowrap' as const,
              }}
            >
              {d.value > 0 ? `${d.value}${valueSuffix}` : ''}
            </span>
          </div>
          {d.sublabel && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-3)',
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
              }}
            >
              {d.sublabel}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function MonthlyChart({ data }: { data: { month: string; count: number; spent: number }[] }) {
  const [tab, setTab] = useState<'visits' | 'spent'>('visits')
  const values = data.map((d) => (tab === 'visits' ? d.count : d.spent))
  const max = Math.max(...values, 1)
  const W = 320,
    H = 80,
    PAD = 10
  const pts = values.map((v, i) => ({
    x: PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - (v / max) * (H - PAD * 2),
    v,
    month: data[i].month,
  }))
  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`
  const [hov, setHov] = useState<number | null>(null)
  const color = 'var(--accent)'
  const fmtM = (m: string) => {
    const [y, mo] = m.split('-')
    return new Date(+y, +mo - 1).toLocaleDateString('fr-FR', { month: 'short' })
  }
  if (!data.length)
    return (
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
        Pas encore de données
      </p>
    )
  return (
    <div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
        {(
          [
            ['visits', 'Visites'],
            ['spent', 'Dépenses'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '0 0 4px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: tab === k ? 'var(--text)' : 'var(--text-3)',
              fontFamily: 'var(--font-body)',
              transition: 'color 120ms, border-color 120ms',
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + 12}`}
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHov(null)}
      >
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#g1)" />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHov(i)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hov === i ? 5 : 3}
              fill={hov === i ? color : 'var(--bg)'}
              stroke={color}
              strokeWidth="2"
            />
            {hov === i && (
              <>
                <rect
                  x={p.x - 30}
                  y={p.y - 34}
                  width={60}
                  height={20}
                  rx={5}
                  fill="var(--text)"
                  opacity="0.9"
                />
                <text
                  x={p.x}
                  y={p.y - 20}
                  textAnchor="middle"
                  fontSize="9"
                  fill="white"
                  fontWeight="700"
                  fontFamily="var(--font-body)"
                >
                  {tab === 'spent' ? `${p.v.toFixed(0)}€` : `${p.v} visite${p.v > 1 ? 's' : ''}`}
                </text>
              </>
            )}
          </g>
        ))}
        {pts
          .filter(
            (_, i) =>
              i === 0 || i === pts.length - 1 || i % Math.max(Math.ceil(pts.length / 5), 1) === 0
          )
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={H + 10}
              textAnchor="middle"
              fontSize="8"
              fill="var(--text-3)"
              fontFamily="var(--font-body)"
            >
              {fmtM(p.month)}
            </text>
          ))}
      </svg>
    </div>
  )
}

// Empreinte de goût — barre camaïeu horizontale + légende en chips
function TasteBar({ data }: { data: { label: string; value: number }[] }) {
  const [hov, setHov] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const top = data.slice(0, 7)
  const total = top.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 22,
          borderRadius: 'var(--r-pill)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px var(--border)',
          background: 'var(--surface-2)',
        }}
        onMouseLeave={() => setHov(null)}
      >
        {top.map((d, i) => (
          <div
            key={i}
            title={`${d.label} · ${d.value}`}
            onMouseEnter={() => setHov(i)}
            style={{
              width: mounted ? `${(d.value / total) * 100}%` : '0%',
              background: CUISINE_COLORS[i % CUISINE_COLORS.length],
              opacity: hov !== null && hov !== i ? 0.42 : 1,
              transition: 'width 800ms var(--ease-out), opacity 150ms',
              transitionDelay: `${i * 70}ms`,
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap' as const, gap: '10px 20px' }}>
        {top.map((d, i) => (
          <span
            key={i}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              opacity: hov !== null && hov !== i ? 0.42 : 1,
              transition: 'opacity 150ms',
              cursor: 'default',
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: CUISINE_COLORS[i % CUISINE_COLORS.length],
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{d.label}</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// « Avec qui » — rangées icône + barre proportionnelle
function MoodStrip({ data }: { data: { mood: string; count: number }[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count)
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rows.map((m, i) => {
        const Icon = MOOD_ICONS[m.mood]
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span
              style={{ color: 'var(--accent)', flexShrink: 0, display: 'inline-flex' }}
              aria-hidden="true"
            >
              {Icon ? <Icon size={15} /> : null}
            </span>
            <span
              style={{
                width: 78,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              {MOOD_LABELS[m.mood] ?? m.mood}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: 'var(--surface-2)',
                borderRadius: 'var(--r-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(m.count / max) * 100}%`,
                  background: 'var(--accent)',
                  borderRadius: 'var(--r-pill)',
                  transition: 'width 700ms var(--ease-out)',
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0 }}>
              {m.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Spinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

// ── Briques éditoriales partagées ──
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

// Compteur animé (0 → valeur) — donne vie aux chiffres au chargement
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (value <= 0) {
      setN(0)
      return
    }
    let raf = 0
    let startedAt = 0
    const dur = 900
    const tick = (t: number) => {
      if (!startedAt) startedAt = t
      const p = Math.min((t - startedAt) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <>
      {n}
      {suffix}
    </>
  )
}

// Cuisine OSM → libellé court pour le chapô « palais »
const CUISINE_SHORT: Record<string, string> = {
  italian: 'Italien',
  french: 'Français',
  japanese: 'Japonais',
  chinese: 'Chinois',
  indian: 'Indien',
  thai: 'Thaï',
  mexican: 'Mexicain',
  korean: 'Coréen',
  vietnamese: 'Vietnamien',
  lebanese: 'Libanais',
  spanish: 'Espagnol',
  greek: 'Grec',
  turkish: 'Turc',
  american: 'Américain',
  mediterranean: 'Méditerranéen',
  asian: 'Asiatique',
  pizza: 'Pizza',
  burger: 'Burger',
  sushi: 'Sushi',
  kebab: 'Kebab',
  seafood: 'Fruits de mer',
  vegetarian: 'Végétarien',
  vegan: 'Vegan',
  regional: 'Régional',
}
function cuisineShort(raw: string): string {
  const k = raw.trim().toLowerCase()
  return CUISINE_SHORT[k] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

// Barres mensuelles verticales (dépenses)
function MonthBars({ data }: { data: { month: string; value: number }[] }) {
  const [hov, setHov] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value), 1)
  const fmt = (m: string) => {
    const [y, mo] = m.split('-')
    return new Date(+y, +mo - 1).toLocaleDateString('fr-FR', { month: 'short' })
  }
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 8 ? 4 : 9 }}
      onMouseLeave={() => setHov(null)}
    >
      {data.map((d, i) => (
        <div
          key={i}
          onMouseEnter={() => setHov(i)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'default',
          }}
        >
          <div
            style={{
              height: 130,
              width: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {hov === i && d.value > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: 'translateY(-100%)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap' as const,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(d.value)}€
              </span>
            )}
            <div
              style={{
                width: '100%',
                maxWidth: 32,
                height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1.5)}%`,
                background:
                  d.value > 0
                    ? hov === i
                      ? 'var(--accent-hover)'
                      : 'var(--accent)'
                    : 'var(--surface-2)',
                borderRadius: '5px 5px 0 0',
                transition: 'height 600ms var(--ease-out), background 150ms',
              }}
            />
          </div>
          <span
            style={{
              marginTop: 8,
              fontSize: 9,
              fontWeight: hov === i ? 700 : 500,
              color: hov === i ? 'var(--text)' : 'var(--text-3)',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {fmt(d.month)}
          </span>
        </div>
      ))}
    </div>
  )
}

type Period = '6m' | '12m' | '24m' | 'all'

// Explorateur de dépenses — choisir le restaurant + la période → total + courbe mensuelle
function SpendingExplorer({ visits }: { visits: VisitRow[] }) {
  const [period, setPeriod] = useState<Period>('12m')
  const [resto, setResto] = useState<string>('all')

  const spentVisits = useMemo(
    () => visits.filter((v) => v.amount_spent != null && v.amount_spent > 0),
    [visits]
  )

  const restos = useMemo(() => {
    const m = new Map<string, string>()
    spentVisits.forEach((v) => {
      if (!m.has(v.osm_id)) m.set(v.osm_id, v.name)
    })
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [spentVisits])

  const { months, total, count } = useMemo(() => {
    const now = new Date()
    const back = period === '6m' ? 6 : period === '12m' ? 12 : period === '24m' ? 24 : null
    const cutoff = back ? new Date(now.getFullYear(), now.getMonth() - (back - 1), 1) : null
    const filtered = spentVisits.filter((v) => {
      if (resto !== 'all' && v.osm_id !== resto) return false
      if (cutoff && new Date(v.visited_at) < cutoff) return false
      return true
    })
    const bucket = new Map<string, number>()
    filtered.forEach((v) => {
      const d = new Date(v.visited_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      bucket.set(key, (bucket.get(key) ?? 0) + (v.amount_spent ?? 0))
    })
    let start: Date
    if (cutoff) {
      start = cutoff
    } else {
      const earliest = filtered.reduce<Date>((min, v) => {
        const d = new Date(v.visited_at)
        return d < min ? d : min
      }, now)
      start = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    }
    const list: { month: string; value: number }[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    let guard = 0
    while (cur <= end && guard < 48) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      list.push({ month: key, value: bucket.get(key) ?? 0 })
      cur.setMonth(cur.getMonth() + 1)
      guard++
    }
    return {
      months: list,
      total: filtered.reduce((s, v) => s + (v.amount_spent ?? 0), 0),
      count: filtered.length,
    }
  }, [spentVisits, period, resto])

  const periods: [Period, string][] = [
    ['6m', '6 mois'],
    ['12m', '12 mois'],
    ['24m', '24 mois'],
    ['all', 'Tout'],
  ]

  const ctrl: React.CSSProperties = {
    padding: '7px 2px',
    border: 'none',
    borderBottom: '1.5px solid var(--border)',
    background: 'transparent',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
    outline: 'none',
  }

  return (
    <div>
      {/* Contrôles */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          gap: '12px 18px',
          marginBottom: 4,
        }}
      >
        <select
          value={resto}
          onChange={(e) => setResto(e.target.value)}
          aria-label="Restaurant"
          style={{ ...ctrl, cursor: 'pointer', maxWidth: 200 }}
        >
          <option value="all">Tous les restaurants</option>
          {restos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
          {periods.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              style={{
                padding: '0 0 3px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${period === k ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 700,
                color: period === k ? 'var(--text)' : 'var(--text-3)',
                fontFamily: 'var(--font-body)',
                transition: 'color 120ms, border-color 120ms',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '20px 0 22px' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.04em',
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(total)} €
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          {count} visite{count !== 1 ? 's' : ''}
          {count > 0 ? ` · ${Math.round(total / count)} € en moyenne` : ''}
        </span>
      </div>

      {count > 0 ? (
        <MonthBars data={months} />
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-3)', padding: '10px 0' }}>
          Aucune dépense sur cette période.
        </p>
      )}
    </div>
  )
}

export default function AccountPage() {
  const { isReady, auth } = useAuthGuard()
  if (!isReady) return <Spinner />
  return <AccountPageInner auth={auth} />
}

function AccountPageInner({ auth }: { auth: ReturnType<typeof useAuthGuard>['auth'] }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [favLoading, setFavLoading] = useState(true)
  const [favError, setFavError] = useState(false)
  const [stats, setStats] = useState<VisitStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [visitsLoading, setVisitsLoading] = useState(true)
  const [visitsError, setVisitsError] = useState(false)
  const [editingVisit, setEditingVisit] = useState<{ visit: VisitRow; place: PlaceCard } | null>(
    null
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [visitSort, setVisitSort] = useState<'date' | 'rating' | 'amount'>('date')
  const [visitSearch, setVisitSearch] = useState('')

  const fetchVisits = async () => {
    setVisitsError(false)
    const h = await getAuthHeaders()
    try {
      const r = await apiFetch('/api/visits', { headers: h })
      if (r.ok) {
        const d = await r.json()
        setVisits(d.data ?? [])
      } else {
        setVisitsError(true)
      }
    } catch {
      setVisitsError(true)
    } finally {
      setVisitsLoading(false)
    }
  }

  const loadData = async () => {
    setFavError(false)
    setStatsError(false)
    const h = await getAuthHeaders()
    try {
      const r = await apiFetch('/api/favorites', { headers: h })
      if (r.ok) {
        const d = await r.json()
        setFavorites(d.data ?? [])
      } else {
        setFavError(true)
      }
    } catch {
      setFavError(true)
    } finally {
      setFavLoading(false)
    }
    try {
      const r = await apiFetch('/api/visits/stats', { headers: h })
      if (r.ok) {
        const d = await r.json()
        setStats(d.data)
      } else {
        setStatsError(true)
      }
    } catch {
      setStatsError(true)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    fetchVisits()
  }, [])

  if (auth.loading) return <Spinner />
  const user = auth.user
  if (!user) return null

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Utilisateur'
  const avatarUrl = user.user_metadata?.avatar_url
  const showAvatar = avatarUrl && !avatarBroken
  const isGoogle = (user.app_metadata?.provider ?? 'email') === 'google'
  const joinedShort = new Date(user.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  const cuisines = [...new Set(favorites.map((f) => f.snapshot?.cuisine).filter(Boolean))]
  const recentFavs = [...favorites]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const hasStats = !statsLoading && !statsError && stats && stats.total_visits > 0
  const hasSpending = visits.some((v) => v.amount_spent != null && v.amount_spent > 0)

  const sortedVisits = [...visits]
    .filter((v) => !visitSearch || v.name.toLowerCase().includes(visitSearch.toLowerCase()))
    .sort((a, b) => {
      if (visitSort === 'rating') return (b.personal_rating ?? 0) - (a.personal_rating ?? 0)
      if (visitSort === 'amount') return (b.amount_spent ?? 0) - (a.amount_spent ?? 0)
      return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    })

  // Chiffres de tête
  const figures: {
    num: number
    suffix?: string
    label: string
    loading: boolean
    error: boolean
    zeroDash?: boolean
  }[] = [
    { num: stats?.total_visits ?? 0, label: 'Visites', loading: statsLoading, error: statsError },
    { num: favorites.length, label: 'Favoris', loading: favLoading, error: favError },
    {
      num: stats?.total_spent ? Math.round(stats.total_spent) : 0,
      suffix: '€',
      label: 'Dépensé',
      loading: statsLoading,
      error: statsError,
    },
    {
      num: cuisines.length,
      label: 'Cuisines',
      loading: favLoading,
      error: favError,
      zeroDash: true,
    },
  ]

  // Rubriques statistiques disponibles → registre numéroté sans trou
  type StatSection = { title: string; sub?: string; node: React.ReactNode }
  const statSections: StatSection[] = []
  if (hasStats && stats!.visits_by_month.length > 1) {
    statSections.push({
      title: 'Votre rythme',
      sub: `${stats!.avg_spent_per_meal.toFixed(0)} € en moyenne par repas`,
      node: <MonthlyChart data={stats!.visits_by_month} />,
    })
  }
  if (hasSpending) {
    statSections.push({
      title: 'Vos dépenses',
      sub: 'Choisissez un restaurant et une période',
      node: <SpendingExplorer visits={visits} />,
    })
  }
  if (hasStats && stats!.top_restaurants.length > 0) {
    statSections.push({
      title: 'Vos tables',
      sub: 'les plus revisitées',
      node: (
        <BarChart
          data={stats!.top_restaurants.slice(0, 7).map((r) => ({
            label: r.name,
            value: r.count,
            sublabel: r.total_spent > 0 ? `${r.total_spent.toFixed(0)}€` : undefined,
          }))}
          color="var(--accent)"
          valueSuffix=" fois"
          labelWidth={isMobile ? 70 : 96}
        />
      ),
    })
  }
  if (hasStats && stats!.mood_breakdown.length > 0) {
    statSections.push({ title: 'Avec qui', node: <MoodStrip data={stats!.mood_breakdown} /> })
  }

  // Registre : label (gauche) + contenu (droite), séparés par un filet
  const Ledger = ({
    n,
    title,
    sub,
    control,
    children,
    delay = 0,
  }: {
    n?: string
    title: string
    sub?: string
    control?: React.ReactNode
    children: React.ReactNode
    delay?: number
  }) => (
    <section
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 14 : 32,
        paddingTop: isMobile ? 28 : 34,
        borderTop: '1px solid var(--border)',
        animation: `fadeUp 360ms var(--ease-out) ${delay}ms both`,
      }}
    >
      <div style={{ width: isMobile ? 'auto' : 180, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          {n && (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.04em',
              }}
            >
              {n}
            </span>
          )}
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            {title}
          </h2>
        </div>
        {sub && (
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {sub}
          </p>
        )}
        {control}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </section>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Grain papier — texture tactile très discrète */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.05,
          mixBlendMode: 'multiply' as const,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <PageHeader
        current="Mon compte"
        actions={
          <button
            onClick={async () => {
              setSigningOut(true)
              await auth.signOut()
              router.replace('/')
            }}
            disabled={signingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--coral-pale)',
              background: 'var(--coral-pale)',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--coral)',
              fontFamily: 'inherit',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--closed-bg)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--coral-pale)'
            }}
          >
            <IcoLogOut /> {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        }
      />

      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: isMobile ? '20px 20px 100px' : '44px 40px 90px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Masthead : identité typographique ── */}
        <header style={{ position: 'relative', animation: 'fadeUp 360ms var(--ease-out) both' }}>
          {/* lueur chaude discrète */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -70,
              left: -90,
              width: 320,
              height: 320,
              background: 'radial-gradient(circle, rgba(187,94,46,0.07), transparent 68%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap' as const,
                  marginBottom: 14,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <IcoCalendar /> Membre depuis {joinedShort}
                </span>
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: 'var(--text-4)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: 'var(--text-2)',
                  }}
                >
                  {isGoogle ? <IcoGoogle /> : <IcoShield />} {isGoogle ? 'Google' : 'Email'}
                </span>
              </div>
              <h1
                style={{
                  margin: '0 0 5px',
                  fontFamily: 'var(--font-display)',
                  fontSize: isMobile ? 32 : 44,
                  fontWeight: 600,
                  letterSpacing: '-0.035em',
                  lineHeight: 1,
                  color: 'var(--text)',
                  overflowWrap: 'anywhere' as const,
                }}
              >
                {displayName}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {user.email}
              </p>
            </div>
            {showAvatar && (
              <div
                style={{
                  flexShrink: 0,
                  width: isMobile ? 46 : 54,
                  height: isMobile ? 46 : 54,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 1px var(--border), var(--s1)',
                }}
              >
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={54}
                  height={54}
                  onError={() => setAvatarBroken(true)}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            )}
          </div>
        </header>

        {/* ── Chiffres de tête (sans cadre, baseline alignée) ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: isMobile ? '22px 32px' : '0 52px',
            margin: isMobile ? '28px 0 36px' : '40px 0 8px',
            animation: 'fadeUp 360ms var(--ease-out) 60ms both',
          }}
        >
          {figures.map((f, i) => (
            <div key={i} style={{ minWidth: isMobile ? 64 : 'auto' }}>
              {f.loading ? (
                <div
                  className="shimmer-bar"
                  style={{
                    height: 34,
                    width: 52,
                    marginBottom: 7,
                    borderRadius: 'var(--r-xs)',
                    background: 'var(--surface-2)',
                  }}
                />
              ) : (
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isMobile ? 34 : 42,
                    fontWeight: 600,
                    letterSpacing: '-0.045em',
                    lineHeight: 0.95,
                    color: f.error ? 'var(--text-4)' : 'var(--text)',
                    fontVariantNumeric: 'tabular-nums',
                    marginBottom: 7,
                  }}
                >
                  {f.error ? (
                    '—'
                  ) : f.zeroDash && f.num === 0 ? (
                    '—'
                  ) : (
                    <CountUp value={f.num} suffix={f.suffix} />
                  )}
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                }}
              >
                {f.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Empreinte de goût ── */}
        {hasStats && stats!.cuisine_breakdown.length > 0 && (
          <section
            style={{
              marginTop: isMobile ? 8 : 24,
              paddingTop: isMobile ? 28 : 34,
              borderTop: '1px solid var(--border)',
              animation: 'fadeUp 360ms var(--ease-out) 90ms both',
            }}
          >
            <Eyebrow>Votre palais</Eyebrow>
            {(() => {
              const sorted = [...stats!.cuisine_breakdown].sort((a, b) => b.count - a.count)
              const dom = sorted[0]
              const total = sorted.reduce((s, c) => s + c.count, 0)
              const pct = total ? Math.round((dom.count / total) * 100) : 0
              return (
                <div
                  style={{
                    margin: '16px 0 20px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    flexWrap: 'wrap' as const,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: isMobile ? 24 : 28,
                      fontWeight: 600,
                      letterSpacing: '-0.03em',
                      color: 'var(--text)',
                    }}
                  >
                    {cuisineShort(dom.cuisine)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
                    {pct}% de vos sorties
                  </span>
                </div>
              )
            })()}
            <TasteBar
              data={stats!.cuisine_breakdown.map((c) => ({ label: c.cuisine, value: c.count }))}
            />
          </section>
        )}

        {/* ── États stats (chargement / erreur / vide) ── */}
        {statsLoading && (
          <div
            style={{
              marginTop: 34,
              paddingTop: 34,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shimmer-bar"
                style={{ height: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)' }}
              />
            ))}
          </div>
        )}
        {!statsLoading && statsError && (
          <div style={{ marginTop: 34, paddingTop: 34, borderTop: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-2)' }}>
              Impossible de charger vos statistiques.
            </p>
            <button
              onClick={loadData}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent)',
                fontFamily: 'inherit',
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        {!statsLoading && !statsError && !hasStats && (
          <div
            style={{
              marginTop: isMobile ? 32 : 40,
              paddingTop: isMobile ? 36 : 48,
              borderTop: '1px solid var(--border)',
              textAlign: 'center' as const,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                color: 'var(--text-4)',
                marginBottom: 16,
              }}
            >
              <IcoStats size={38} />
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
              Vos statistiques s’écriront ici
            </h3>
            <p
              style={{
                margin: '0 auto 22px',
                fontSize: 13,
                color: 'var(--text-2)',
                lineHeight: 1.65,
                maxWidth: 360,
              }}
            >
              Consignez une visite depuis la fiche d’un restaurant et cette page prend vie.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '12px 22px',
                borderRadius: 'var(--r-lg)',
                background: 'var(--accent)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: 'var(--s-accent)',
              }}
            >
              Explorer les restaurants <IcoArrow />
            </Link>
          </div>
        )}

        {/* ── Registre des rubriques stats ── */}
        {statSections.map((s, i) => (
          <Ledger
            key={s.title}
            n={String(i + 1).padStart(2, '0')}
            title={s.title}
            sub={s.sub}
            delay={120 + i * 40}
          >
            {s.node}
          </Ledger>
        ))}

        {/* ── Mes visites ── */}
        <section
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 14 : 32,
            paddingTop: isMobile ? 28 : 34,
            marginTop: isMobile ? 28 : 34,
            borderTop: '1px solid var(--border)',
            animation: 'fadeUp 360ms var(--ease-out) 260ms both',
          }}
        >
          <div style={{ width: isMobile ? 'auto' : 180, flexShrink: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
              }}
            >
              Mes visites
            </h2>
            {!visitsLoading && (
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-3)' }}>
                {sortedVisits.length} visite{sortedVisits.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 6, alignItems: 'center' }}>
              <input
                value={visitSearch}
                onChange={(e) => setVisitSearch(e.target.value)}
                placeholder="Rechercher une table…"
                style={{
                  flex: 1,
                  padding: '7px 2px',
                  border: 'none',
                  borderBottom: '1.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
              />
              <select
                value={visitSort}
                onChange={(e) => setVisitSort(e.target.value as typeof visitSort)}
                style={{
                  padding: '7px 2px',
                  border: 'none',
                  borderBottom: '1.5px solid var(--border)',
                  background: 'transparent',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="date">Par date</option>
                <option value="rating">Par note</option>
                <option value="amount">Par montant</option>
              </select>
            </div>

            {visitsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="shimmer-bar"
                    style={{
                      height: 40,
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--surface-2)',
                    }}
                  />
                ))}
              </div>
            ) : visitsError ? (
              <div style={{ padding: '20px 0' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-2)' }}>
                  Impossible de charger vos visites.
                </p>
                <button
                  onClick={fetchVisits}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border-strong)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    fontFamily: 'inherit',
                  }}
                >
                  Réessayer
                </button>
              </div>
            ) : sortedVisits.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center' as const }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    color: 'var(--text-4)',
                    marginBottom: 10,
                  }}
                >
                  <IcoFork size={30} />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
                  Aucune visite enregistrée
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                {sortedVisits.map((visit) => {
                  const dateStr = new Date(visit.visited_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                  const MoodIcon = visit.mood ? MOOD_ICONS[visit.mood] : null
                  const notePreview =
                    visit.note && visit.note.length > 60
                      ? visit.note.slice(0, 60) + '…'
                      : visit.note
                  return (
                    <div
                      key={visit.id}
                      className="acct-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="acct-row-name"
                          style={{
                            margin: '0 0 3px',
                            fontSize: 14,
                            fontWeight: 600,
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '-0.015em',
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {visit.name}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap' as const,
                          }}
                        >
                          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{dateStr}</span>
                          {visit.personal_rating && visit.personal_rating > 0 && (
                            <span style={{ display: 'flex', gap: 1 }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <span
                                  key={s}
                                  style={{
                                    fontSize: 11,
                                    color:
                                      s <= (visit.personal_rating ?? 0)
                                        ? 'var(--accent)'
                                        : 'var(--text-4)',
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </span>
                          )}
                          {MoodIcon && (
                            <span
                              style={{ display: 'inline-flex', color: 'var(--text-3)' }}
                              aria-hidden="true"
                            >
                              <MoodIcon size={12} />
                            </span>
                          )}
                          {visit.amount_spent != null && (
                            <span
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)' }}
                            >
                              {visit.amount_spent}€
                            </span>
                          )}
                          {visit.people_count > 1 && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              {visit.people_count} pers.
                            </span>
                          )}
                        </div>
                        {notePreview && (
                          <p
                            style={{
                              margin: '3px 0 0',
                              fontSize: 11,
                              color: 'var(--text-2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' as const,
                            }}
                          >
                            {notePreview}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const place = (visit.snapshot ?? {
                            osm_id: visit.osm_id,
                            name: visit.name,
                            lat: 0,
                            lon: 0,
                          }) as unknown as PlaceCard
                          setEditingVisit({ visit, place })
                        }}
                        aria-label="Modifier la visite"
                        title="Modifier la visite"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                        }}
                      >
                        <IcoPencil />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Favoris récents ── */}
        {!favLoading && recentFavs.length > 0 && (
          <section
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 14 : 32,
              paddingTop: isMobile ? 28 : 34,
              marginTop: isMobile ? 28 : 34,
              borderTop: '1px solid var(--border)',
              animation: 'fadeUp 360ms var(--ease-out) 300ms both',
            }}
          >
            <div style={{ width: isMobile ? 'auto' : 180, flexShrink: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text)',
                }}
              >
                Favoris récents
              </h2>
              <Link
                href="/favorites"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  margin: '8px 0 0',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                Tout voir <IcoArrow />
              </Link>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {recentFavs.map((fav, i) => (
                <Link
                  key={fav.id}
                  className="acct-row"
                  href={`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: i < recentFavs.length - 1 ? '1px solid var(--border)' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      className="acct-row-name"
                      style={{
                        margin: '0 0 2px',
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '-0.015em',
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {fav.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)' }}>
                      {fav.snapshot?.cuisine && (
                        <span style={{ marginRight: 6, color: 'var(--accent)', fontWeight: 600 }}>
                          {fav.snapshot.cuisine as string}
                        </span>
                      )}
                      {new Date(fav.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className="acct-row-arrow"
                    style={{ color: 'var(--text-4)', flexShrink: 0 }}
                  >
                    <IcoArrow />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Compte ── */}
        <section
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 14 : 32,
            paddingTop: isMobile ? 28 : 34,
            marginTop: isMobile ? 28 : 34,
            borderTop: '1px solid var(--border)',
            animation: 'fadeUp 360ms var(--ease-out) 340ms both',
          }}
        >
          <div style={{ width: isMobile ? 'auto' : 180, flexShrink: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
              }}
            >
              Compte
            </h2>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <p
                style={{
                  margin: '0 0 2px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                }}
              >
                Adresse email
              </p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--coral)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <IcoTrash /> Supprimer mon compte
            </button>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
              Suppression définitive de toutes vos données.
            </p>
          </div>
        </section>
      </div>

      {editingVisit && (
        <VisitModal
          place={editingVisit.place}
          existingVisit={editingVisit.visit}
          onClose={() => setEditingVisit(null)}
          onSaved={() => {
            setEditingVisit(null)
            fetchVisits()
          }}
        />
      )}
      {showDeleteModal && (
        <DeleteModal
          email={user.email ?? ''}
          onConfirm={async () => {
            setShowDeleteModal(false)
            await auth.signOut()
            router.replace('/')
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      <GlobalFooter />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} .acct-row{padding:13px 0;transition:padding-left 200ms var(--ease-out)} .acct-row:hover{padding-left:8px} .acct-row:hover .acct-row-name{color:var(--accent)} .acct-row-name{transition:color 160ms ease} .acct-row-arrow{transition:color 160ms ease,transform 160ms var(--ease-out)} .acct-row:hover .acct-row-arrow{color:var(--accent);transform:translateX(3px)} @media (prefers-reduced-motion: reduce){.acct-row,.acct-row:hover{padding-left:0}}`}</style>
    </div>
  )
}
