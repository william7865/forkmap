// FiltersPanel — horizontal (drawer sous la recherche) + vertical (mobile)
'use client'
import type { FilterState, PlaceCard } from '@/types'
import { extractCuisines } from '@/lib/scoring'
import { extractDistricts } from '@/lib/districts'
import { frCuisine } from '@/lib/cuisine'

const FALLBACK_CUISINES = [
  'Italian',
  'French',
  'Japanese',
  'Chinese',
  'Indian',
  'Mexican',
  'Pizza',
  'Burger',
  'Thai',
  'Sushi',
  'Mediterranean',
  'Korean',
  'Vegan',
  'Seafood',
]

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
  places?: PlaceCard[]
  horizontal?: boolean
}

// ── Reusable bits ───────────────────────────────────────────
function Chevron({ active }: { active?: boolean }) {
  return (
    <span
      style={{
        position: 'absolute',
        right: 11,
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        display: 'flex',
        color: active ? 'var(--accent-text)' : 'var(--text-3)',
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-3)',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function PillSelect({
  label,
  value,
  onChange,
  children,
  full,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  full?: boolean
}) {
  const active = value !== ''
  return (
    <label
      style={{
        display: full ? 'flex' : 'inline-flex',
        flexDirection: full ? 'column' : 'row',
        alignItems: full ? 'stretch' : 'center',
        gap: full ? 6 : 8,
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      <span
        style={{
          position: 'relative',
          display: full ? 'block' : 'inline-flex',
          flex: full ? 1 : undefined,
        }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: full ? '100%' : undefined,
            background: active ? 'var(--accent-light)' : 'var(--surface)',
            color: active ? 'var(--accent-text)' : 'var(--text)',
            border: `1px solid ${active ? 'rgba(187,94,46,0.35)' : 'var(--border)'}`,
            borderRadius: 'var(--r-pill)',
            padding: '9px 32px 9px 14px',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {children}
        </select>
        <Chevron active={active} />
      </span>
    </label>
  )
}

function PriceSegments({
  value,
  onChange,
  full,
}: {
  value: 1 | 2 | 3 | 4 | undefined
  onChange: (v: 1 | 2 | 3 | 4 | undefined) => void
  full?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        background: 'var(--surface)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        border: '1px solid var(--border)',
        width: full ? '100%' : undefined,
      }}
    >
      {([undefined, 1, 2, 3, 4] as const).map((p) => {
        const active = value === p
        return (
          <button
            key={p ?? 'any'}
            onClick={() => onChange(p)}
            aria-pressed={active}
            style={{
              flex: full ? 1 : undefined,
              padding: '5px 12px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--text-2)',
              transition: 'background 120ms ease, color 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {p == null ? 'Tous' : '€'.repeat(p)}
          </button>
        )
      })}
    </div>
  )
}

function OpenToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
      <span
        role="switch"
        aria-checked={on}
        onClick={onChange}
        style={{
          width: 38,
          height: 22,
          borderRadius: 'var(--r-pill)',
          background: on ? 'var(--accent)' : 'var(--surface-2)',
          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
          position: 'relative',
          transition: 'background 160ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 17 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--s1)',
            transition: 'left 160ms var(--ease-out)',
          }}
        />
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Ouvert maintenant
      </span>
    </label>
  )
}

function ResetButton({ onClick, subtle }: { onClick: () => void; subtle?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: subtle ? 'none' : '1px solid var(--coral-pale)',
        borderRadius: 'var(--r-pill)',
        cursor: 'pointer',
        fontSize: 11.5,
        fontWeight: 700,
        color: 'var(--coral)',
        padding: subtle ? 0 : '6px 13px',
        fontFamily: 'var(--font-body)',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => !subtle && (e.currentTarget.style.background = 'var(--coral-pale)')}
      onMouseLeave={(e) => !subtle && (e.currentTarget.style.background = 'none')}
    >
      Réinitialiser
    </button>
  )
}

const SORT_OPTIONS = (
  <>
    <option value="score">Meilleur match</option>
    <option value="rating">Mieux noté</option>
    <option value="distance">Le plus proche</option>
    <option value="name">A → Z</option>
  </>
)

export default function FiltersPanel({ filters, onChange, places = [], horizontal }: Props) {
  const u = (p: Partial<FilterState>) => onChange({ ...filters, ...p })
  const hasActive = Object.keys(filters).some(
    (k) => k !== 'sortBy' && filters[k as keyof FilterState] != null
  )
  const cuisines = places.length > 0 ? extractCuisines(places) : FALLBACK_CUISINES
  const districts = extractDistricts(places)

  const cuisineOptions = (
    <>
      <option value="">Toutes</option>
      {cuisines.map((c) => (
        <option key={c} value={c}>
          {frCuisine(c)}
        </option>
      ))}
    </>
  )
  const zoneOptions = (
    <>
      <option value="">Toutes</option>
      {districts.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </>
  )

  if (horizontal) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 0',
          flexWrap: 'wrap',
        }}
      >
        <PillSelect
          label="Trier"
          value={filters.sortBy}
          onChange={(v) => u({ sortBy: v as FilterState['sortBy'] })}
        >
          {SORT_OPTIONS}
        </PillSelect>
        <PillSelect
          label="Cuisine"
          value={filters.cuisine ?? ''}
          onChange={(v) => u({ cuisine: v || undefined })}
        >
          {cuisineOptions}
        </PillSelect>
        {districts.length > 0 && (
          <PillSelect
            label="Zone"
            value={filters.district ?? ''}
            onChange={(v) => u({ district: v || undefined })}
          >
            {zoneOptions}
          </PillSelect>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FieldLabel>Prix</FieldLabel>
          <PriceSegments value={filters.maxPrice} onChange={(v) => u({ maxPrice: v })} />
        </div>
        <OpenToggle
          on={!!filters.openNow}
          onChange={() => u({ openNow: filters.openNow ? undefined : true })}
        />
        <div style={{ flex: 1 }} />
        {hasActive && <ResetButton onClick={() => onChange({ sortBy: 'score' })} />}
      </div>
    )
  }

  // ── Vertical (mobile / bottom sheet) ──
  return (
    <div
      style={{
        padding: '14px 14px 16px',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Filtres
        </span>
        {hasActive && <ResetButton onClick={() => onChange({ sortBy: 'score' })} subtle />}
      </div>

      <PillSelect
        label="Trier par"
        value={filters.sortBy}
        onChange={(v) => u({ sortBy: v as FilterState['sortBy'] })}
        full
      >
        {SORT_OPTIONS}
      </PillSelect>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <FieldLabel>Note min.</FieldLabel>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-text)' }}>
            {filters.minRating ? `${filters.minRating}/10` : 'Toutes'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={filters.minRating ?? 0}
          onChange={(e) => u({ minRating: +e.target.value > 0 ? +e.target.value : undefined })}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FieldLabel>Prix max</FieldLabel>
        <PriceSegments value={filters.maxPrice} onChange={(v) => u({ maxPrice: v })} full />
      </div>

      <PillSelect
        label="Cuisine"
        value={filters.cuisine ?? ''}
        onChange={(v) => u({ cuisine: v || undefined })}
        full
      >
        <option value="">Toutes les cuisines</option>
        {cuisines.map((c) => (
          <option key={c} value={c}>
            {frCuisine(c)}
          </option>
        ))}
      </PillSelect>

      {districts.length > 0 && (
        <PillSelect
          label="Arrondissement / quartier"
          value={filters.district ?? ''}
          onChange={(v) => u({ district: v || undefined })}
          full
        >
          <option value="">Toutes les zones</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </PillSelect>
      )}

      <OpenToggle
        on={!!filters.openNow}
        onChange={() => u({ openNow: filters.openNow ? undefined : true })}
      />
    </div>
  )
}
