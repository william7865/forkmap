// components/icons/Logo.tsx
// ────────────────────────────────────────────────────────────
// Marque Forkmap — « la vapeur » : un bol fumant.
// Symbole autonome (indépendant du nom de l'app). Monochrome :
// hérite de la couleur via currentColor. viewBox 24-compatible
// (dessiné sur grille 64 ; les volutes sont des stroke, le bol
// est rempli). Vapeur volontairement épaissie pour rester nette
// en très petit (icône notification).
// ────────────────────────────────────────────────────────────
import type { LucideProps } from 'lucide-react'

export const LogoMark = ({ size = 24, color = 'currentColor', ...rest }: LucideProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" {...rest}>
    <g fill="none" stroke={color} strokeWidth={4.4} strokeLinecap="round">
      <path d="M24 9c-3.4 3.8 3.4 6 0 9.8" />
      <path d="M32 6c-3.4 3.8 3.4 6 0 9.8" />
      <path d="M40 9c-3.4 3.8 3.4 6 0 9.8" />
    </g>
    <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill={color} />
    <path d="M15 34h34a17 17 0 0 1-34 0Z" fill={color} />
  </svg>
)
