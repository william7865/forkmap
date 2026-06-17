// components/icons/signature.tsx
// ────────────────────────────────────────────────────────────
// Icônes SIGNATURE Forkmap — dessinées à la main (pas lucide).
// Style éditorial chaleureux : grille 24×24, trait 1.75 arrondi
// pour cohabiter avec la base lucide, formes plus caractérielles.
// Monochrome : héritent de la couleur via `currentColor`.
// Typées LucideProps pour s'interchanger avec la base lucide.
// ────────────────────────────────────────────────────────────
import type { LucideProps } from 'lucide-react'
import type { ReactNode } from 'react'

function Svg({
  size = 20,
  color = 'currentColor',
  fill = 'none',
  children,
  ...rest
}: LucideProps & { children: ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? color : 'none'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

// ── Étincelle « Surprends-moi » — twinkle éditorial (rempli) ──
export const SigSparkle = (p: LucideProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M12 3 C12.5 9.5 14.5 11.5 21 12 C14.5 12.5 12.5 14.5 12 21 C11.5 14.5 9.5 12.5 3 12 C9.5 11.5 11.5 9.5 12 3 Z" />
    <path d="M18.6 2.8 C18.8 4.3 18.9 4.4 20.4 4.6 C18.9 4.8 18.8 4.9 18.6 6.4 C18.4 4.9 18.3 4.8 16.8 4.6 C18.3 4.4 18.4 4.3 18.6 2.8 Z" />
  </Svg>
)

// ── Couvert — fourchette + couteau (resto / visite) ──
export const SigFork = (p: LucideProps) => (
  <Svg {...p}>
    <path d="M6 3v4.5a2.5 2.5 0 0 0 2.5 2.5h0V21" />
    <path d="M8.5 3v4.2" />
    <path d="M11 3v4.5a2.5 2.5 0 0 1-2.5 2.5" />
    <path d="M17 3c-1.6 1-2.6 3-2.6 5.4 0 1.8 1 3 2.6 3.4V21" />
  </Svg>
)

// ── « Tout près » — repère rayonnant ──
export const SigNear = (p: LucideProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" opacity="0.5" />
    <circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none" />
    <path d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3" />
  </Svg>
)

// ── Humeurs de visite — silhouettes têtes + épaules ──
export const SigMoodSolo = (p: LucideProps) => (
  <Svg {...p}>
    <circle cx="12" cy="7.5" r="3.4" />
    <path d="M5.5 19.5c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3" />
  </Svg>
)

export const SigMoodCouple = (p: LucideProps) => (
  <Svg {...p}>
    <circle cx="8.2" cy="9" r="2.6" />
    <circle cx="15.8" cy="9" r="2.6" />
    <path d="M3.4 19.5c0-2.8 2.1-4.9 4.8-4.9 1.2 0 2.3.4 3.1 1.1" />
    <path d="M20.6 19.5c0-2.8-2.1-4.9-4.8-4.9-1.2 0-2.3.4-3.1 1.1" />
    <path
      d="M12 2.6c.9-1 2.5-.6 2.5.7 0 1-1.2 1.9-2.5 2.8-1.3-.9-2.5-1.8-2.5-2.8 0-1.3 1.6-1.7 2.5-.7Z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
)

export const SigMoodFriends = (p: LucideProps) => (
  <Svg {...p}>
    <circle cx="7" cy="9" r="2.2" />
    <circle cx="17" cy="9" r="2.2" />
    <circle cx="12" cy="7.6" r="2.4" />
    <path d="M3 19.5c0-2.3 1.8-4 4-4 .9 0 1.7.3 2.4.8" />
    <path d="M21 19.5c0-2.3-1.8-4-4-4-.9 0-1.7.3-2.4.8" />
    <path d="M8.4 19.5c0-2.4 1.6-4.2 3.6-4.2s3.6 1.8 3.6 4.2" />
  </Svg>
)

export const SigMoodFamily = (p: LucideProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="7.5" r="2.7" />
    <circle cx="16.5" cy="8.2" r="2.4" />
    <circle cx="12" cy="13.4" r="1.9" />
    <path d="M3.6 20c0-2.5 1.7-4.4 3.9-4.4 1 0 2 .4 2.7 1.1" />
    <path d="M20.4 20.2c0-2.5-1.6-4.3-3.7-4.3-.8 0-1.6.3-2.2.8" />
    <path d="M9.3 20.6c0-1.7 1.2-3 2.7-3s2.7 1.3 2.7 3" />
  </Svg>
)

export const SigMoodWork = (p: LucideProps) => (
  <Svg {...p}>
    <rect x="3.3" y="8" width="17.4" height="11.2" rx="2.2" />
    <path d="M8.5 8V6.4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V8" />
    <path d="M3.3 13.2h17.4" />
  </Svg>
)

// ── Trophée — distinction « top resto » ──
export const SigTrophy = (p: LucideProps) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4" />
    <path d="M17 6h2.5a2.5 2.5 0 0 1-2.5 4" />
    <path d="M12 14v3" />
    <path d="M8.5 21h7M9.5 21c0-1.6 1.1-2.6 2.5-2.6s2.5 1 2.5 2.6" />
  </Svg>
)
