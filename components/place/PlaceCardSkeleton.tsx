import { ITEM_HEIGHT } from '@/components/place/PlaceCard'

export default function PlaceCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement..."
      style={{
        height: ITEM_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        margin: '0 12px 8px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 12,
      }}
    >
      {/* Icon square */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--surface-2)',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="shimmer-bar" style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Text lines */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            height: 13,
            borderRadius: 6,
            background: 'var(--surface-2)',
            width: '65%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="shimmer-bar" style={{ position: 'absolute', inset: 0 }} />
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 6,
            background: 'var(--surface-2)',
            width: '40%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="shimmer-bar" style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>
    </div>
  )
}
