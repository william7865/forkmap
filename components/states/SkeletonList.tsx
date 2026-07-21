// ============================================================
// components/states/SkeletonList.tsx — shimmer skeleton rows
// ============================================================
'use client'

import { ITEM_HEIGHT } from '@/components/place/PlaceCard'

interface Props {
  count?: number
}

export default function SkeletonList({ count = 7 }: Props) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '0 16px 0 13px',
            borderBottom: '1px solid rgba(28,25,23,0.05)',
            display: 'flex',
            gap: 11,
            alignItems: 'center',
            height: ITEM_HEIGHT,
            boxSizing: 'border-box',
            opacity: 1 - i * 0.1,
          }}
        >
          {/* Badge */}
          <div
            className="skeleton"
            style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }}
          />
          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              className="skeleton"
              style={{ height: 12, width: `${55 + (i % 3) * 15}%`, borderRadius: 5 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <div className="skeleton" style={{ height: 9, width: 52, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 9, width: 36, borderRadius: 12 }} />
            </div>
          </div>
          {/* Distance */}
          <div
            className="skeleton"
            style={{ width: 32, height: 9, borderRadius: 5, flexShrink: 0 }}
          />
        </div>
      ))}
    </div>
  )
}
