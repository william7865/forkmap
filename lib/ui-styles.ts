import type { CSSProperties } from 'react'

/**
 * Bouton icône rond des mastheads (Découvrir, Messages, Profil, profil public).
 * Filet + surface, jamais de remplissage accent : l'accent est réservé à
 * l'action principale de l'écran. `position: relative` porte les pastilles
 * de badge. Passer `size` pour la variante compacte (38).
 */
export function iconButtonStyle(size = 44): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-2)',
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
  }
}
