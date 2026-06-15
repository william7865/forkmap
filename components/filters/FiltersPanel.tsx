// FiltersPanel — vertical (sidebar) + horizontal (header drawer)
'use client'
import type { FilterState, PlaceCard } from '@/types'
import { extractCuisines } from '@/lib/scoring'
import { extractDistricts } from '@/lib/districts'

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
  horizontal?: boolean // mode pleine largeur sous le header
}

export default function FiltersPanel({ filters, onChange, places = [], horizontal }: Props) {
  const u = (p: Partial<FilterState>) => onChange({ ...filters, ...p })
  const hasActive = Object.keys(filters).some(
    (k) => k !== 'sortBy' && filters[k as keyof FilterState] != null
  )
  const cuisines = places.length > 0 ? extractCuisines(places) : FALLBACK_CUISINES
  const districts = extractDistricts(places)

  const selectStyle: React.CSSProperties = {
    background: 'var(--off-white)',
    color: 'var(--ink)',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 'var(--r-md)',
    padding: '7px 10px',
    border: '1px solid var(--ink-10)',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    appearance: 'none' as const,
    minWidth: 130,
  }

  if (horizontal) {
    // ── Mode drawer horizontal : une ligne compacte ──────
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0',
          flexWrap: 'wrap',
        }}
      >
        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-40)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              whiteSpace: 'nowrap',
            }}
          >
            Trier
          </span>
          <select
            value={filters.sortBy}
            onChange={(e) => u({ sortBy: e.target.value as FilterState['sortBy'] })}
            style={selectStyle}
          >
            <option value="score">Meilleur match</option>
            <option value="rating">Mieux noté</option>
            <option value="distance">Le plus proche</option>
            <option value="name">A → Z</option>
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--ink-10)' }} />

        {/* Cuisine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-40)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              whiteSpace: 'nowrap',
            }}
          >
            Cuisine
          </span>
          <select
            value={filters.cuisine ?? ''}
            onChange={(e) => u({ cuisine: e.target.value || undefined })}
            style={selectStyle}
          >
            <option value="">Toutes</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {districts.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: 'var(--ink-10)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--ink-40)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  whiteSpace: 'nowrap',
                }}
              >
                Zone
              </span>
              <select
                value={filters.district ?? ''}
                onChange={(e) => u({ district: e.target.value || undefined })}
                style={selectStyle}
              >
                <option value="">Toutes</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div style={{ width: 1, height: 24, background: 'var(--ink-10)' }} />

        {/* Prix */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-40)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              whiteSpace: 'nowrap',
            }}
          >
            Prix
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {([undefined, 1, 2, 3, 4] as const).map((p) => (
              <button
                key={p ?? 'any'}
                onClick={() => u({ maxPrice: p })}
                style={{
                  padding: '5px 8px',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${filters.maxPrice === p ? 'var(--forest-mid)' : 'var(--ink-10)'}`,
                  background: filters.maxPrice === p ? 'var(--forest-pale)' : 'var(--off-white)',
                  color: filters.maxPrice === p ? 'var(--forest)' : 'var(--ink-60)',
                  transition: 'all 100ms ease',
                }}
              >
                {p == null ? 'Tous' : '€'.repeat(p)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--ink-10)' }} />

        {/* Open now */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <div
            role="switch"
            aria-checked={!!filters.openNow}
            onClick={() => u({ openNow: filters.openNow ? undefined : true })}
            style={{
              width: 34,
              height: 20,
              borderRadius: 10,
              cursor: 'pointer',
              background: filters.openNow ? 'var(--forest-mid)' : 'var(--bone)',
              position: 'relative',
              transition: 'background 150ms ease',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: filters.openNow ? 16 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'white',
                boxShadow: 'var(--s1)',
                transition: 'left 150ms var(--ease-out)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-80)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvert maintenant
          </span>
        </label>

        <div style={{ flex: 1 }} />

        {/* Clear */}
        {hasActive && (
          <button
            onClick={() => onChange({ sortBy: 'score' })}
            style={{
              background: 'none',
              border: '1px solid var(--coral-pale)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--coral)',
              padding: '5px 12px',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-pale)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            Réinitialiser
          </button>
        )}
      </div>
    )
  }

  // ── Mode vertical (mobile / bottom sheet) ────────────
  return (
    <div
      style={{
        padding: '14px 14px 16px',
        background: 'var(--white)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-80)' }}
        >
          Filtres
        </span>
        {hasActive && (
          <button
            onClick={() => onChange({ sortBy: 'score' })}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--forest-mid)',
              padding: 0,
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-40)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Trier par
        </span>
        <select
          value={filters.sortBy}
          onChange={(e) => u({ sortBy: e.target.value as FilterState['sortBy'] })}
          style={{ ...selectStyle, width: '100%' }}
        >
          <option value="score">Meilleur match</option>
          <option value="rating">Mieux noté</option>
          <option value="distance">Le plus proche</option>
          <option value="name">A → Z</option>
        </select>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-40)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Note min.
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest-mid)' }}>
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
          style={{ width: '100%', accentColor: 'var(--forest-mid)', cursor: 'pointer', height: 4 }}
        />
      </div>

      <div>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-40)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Prix max
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {([undefined, 1, 2, 3, 4] as const).map((p) => (
            <button
              key={p ?? 'any'}
              onClick={() => u({ maxPrice: p })}
              style={{
                flex: 1,
                padding: '7px 2px',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${filters.maxPrice === p ? 'var(--forest-mid)' : 'var(--ink-10)'}`,
                background: filters.maxPrice === p ? 'var(--forest-pale)' : 'var(--off-white)',
                color: filters.maxPrice === p ? 'var(--forest)' : 'var(--ink-60)',
                transition: 'all 100ms ease',
              }}
            >
              {p == null ? 'Tous' : '€'.repeat(p)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-40)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Cuisine
        </span>
        <select
          value={filters.cuisine ?? ''}
          onChange={(e) => u({ cuisine: e.target.value || undefined })}
          style={{ ...selectStyle, width: '100%' }}
        >
          <option value="">Toutes les cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {districts.length > 0 && (
        <div>
          <span
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-40)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Arrondissement / quartier
          </span>
          <select
            value={filters.district ?? ''}
            onChange={(e) => u({ district: e.target.value || undefined })}
            style={{ ...selectStyle, width: '100%' }}
          >
            <option value="">Toutes les zones</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div
          role="switch"
          aria-checked={!!filters.openNow}
          onClick={() => u({ openNow: filters.openNow ? undefined : true })}
          style={{
            width: 38,
            height: 22,
            borderRadius: 11,
            cursor: 'pointer',
            background: filters.openNow ? 'var(--forest-mid)' : 'var(--bone)',
            position: 'relative',
            transition: 'background 150ms ease',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: filters.openNow ? 18 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'white',
              boxShadow: 'var(--s1)',
              transition: 'left 150ms var(--ease-out)',
            }}
          />
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-80)', userSelect: 'none' }}>
          Ouvert maintenant
        </span>
      </label>
    </div>
  )
}
