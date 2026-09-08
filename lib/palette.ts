// ════════════════════════════════════════════════════════════
// lib/palette.ts — essai de palettes, TEMPORAIRE.
//
// L'app est monochrome dans SES DEUX thèmes : en clair l'accent
// est noir, en sombre il devient blanc cassé. Le thème sombre
// existe déjà et suit le système, mais il n'apporte aucune
// couleur. C'est ce que ce module permet d'essayer.
//
// Chaque palette est un bloc CSS dans globals.css, appliqué via
// `data-palette` sur <html>. À SUPPRIMER avec les perdantes une
// fois la direction tranchée.
// ════════════════════════════════════════════════════════════

export type Palette =
  | 'actuel'
  | 'nuit-or'
  | 'nuit-vert'
  | 'nuit-violet'
  | 'nuit-corail'
  | 'clair-corail'

export const PALETTES: { id: Palette; label: string; hint: string }[] = [
  { id: 'actuel', label: 'Actuel', hint: 'Monochrome, suit ton réglage système' },
  {
    id: 'nuit-or',
    label: 'Nuit + or',
    hint: 'Sombre, l’or des notes devient la couleur de marque',
  },
  { id: 'nuit-vert', label: 'Nuit + vert', hint: 'Sombre, vert électrique — le plus « app »' },
  {
    id: 'nuit-violet',
    label: 'Nuit + violet',
    hint: 'Sombre, violet — quasi inutilisé dans la bouffe',
  },
  { id: 'nuit-corail', label: 'Nuit + corail', hint: 'Sombre, rouge-rosé chaleureux' },
  { id: 'clair-corail', label: 'Clair + corail', hint: 'Fond clair avec une vraie couleur' },
]

import { setThemePref, applyTheme, type Theme } from '@/lib/theme'

const KEY = 'forkmap_palette'

export function readPalette(): Palette {
  if (typeof window === 'undefined') return 'actuel'
  try {
    const v = window.localStorage.getItem(KEY) as Palette | null
    return v && PALETTES.some((p) => p.id === v) ? v : 'actuel'
  } catch {
    return 'actuel'
  }
}

/**
 * Pose l'attribut lu par les blocs CSS, ET aligne le THÈME.
 *
 * Les palettes « nuit » ne peuvent pas se contenter de surcharger des tokens :
 * le fond de carte sombre (tuiles Dark Matter) est choisi en JavaScript selon
 * `data-theme`. Sans ça on obtenait une interface sombre sur une carte claire
 * — constaté à l'écran. On passe donc par la vraie machinerie de thème plutôt
 * que d'écrire `data-theme` à la main, sinon theme.ts le réécrirait au premier
 * changement de réglage système.
 */
export function applyPalette(p: Palette): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (p === 'actuel') el.removeAttribute('data-palette')
  else el.setAttribute('data-palette', p)

  if (p === 'actuel') return // on laisse le réglage de thème de l'utilisateur
  const theme: Theme = p.startsWith('nuit') ? 'dark' : 'light'
  setThemePref(theme)
  applyTheme(theme)
}

export function writePalette(p: Palette): void {
  try {
    window.localStorage.setItem(KEY, p)
  } catch {
    /* noop */
  }
  applyPalette(p)
}
