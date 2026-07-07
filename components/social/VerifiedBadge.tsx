// VerifiedBadge — the tastemaker verification checkmark shown next to a name.
// Renders nothing unless `verified` is true, so callers can pass it inline.
import { Check } from 'lucide-react'

export default function VerifiedBadge({
  verified,
  size = 14,
}: {
  verified?: boolean
  size?: number
}) {
  if (!verified) return null
  return (
    <span
      title="Compte vérifié"
      aria-label="Compte vérifié"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: 'var(--on-accent, #fff)',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      <Check size={Math.round(size * 0.66)} strokeWidth={3} />
    </span>
  )
}
