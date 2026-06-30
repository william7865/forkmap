'use client'
export function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: `2px solid ${light ? 'rgba(255,255,255,0.4)' : 'var(--b2)'}`,
        borderTop: `2px solid ${light ? '#fff' : 'var(--ink)'}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}
