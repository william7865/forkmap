'use client'
import Image from 'next/image'
import { placeGradient } from '@/lib/gradients'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({
  name,
  src,
  id,
  size = 44,
}: {
  name: string
  src?: string | null
  id: string
  size?: number
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
  }
  if (src)
    return <Image src={src} alt={name} width={size} height={size} style={style} unoptimized />
  return (
    <div
      style={{
        ...style,
        background: placeGradient(id),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </div>
  )
}
