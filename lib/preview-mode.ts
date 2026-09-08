// ════════════════════════════════════════════════════════════
// lib/preview-mode.ts — bascule d'APERÇU, temporaire.
//
// Sert à comparer deux traitements du Carnet sur l'appareil,
// sans réinstaller entre les deux. À SUPPRIMER une fois la
// direction tranchée, avec la variante perdante.
//
// Volontairement en localStorage et non dans le profil : c'est
// un réglage de conception, pas une préférence utilisateur, et
// il ne doit rien écrire côté serveur.
// ════════════════════════════════════════════════════════════

export type PreviewMode = 'sections' | 'actuel' | 'feed' | 'notes'

export const PREVIEW_MODES: { id: PreviewMode; label: string; hint: string }[] = [
  {
    id: 'sections',
    label: 'Sections',
    hint: 'Vidéos, listes, puis le mur — sans segment ni filtres',
  },
  { id: 'actuel', label: 'Actuel', hint: 'La liste telle qu’elle est aujourd’hui' },
  { id: 'feed', label: 'Photos en grand', hint: 'Chaque adresse est une image' },
  { id: 'notes', label: 'Notes en héros', hint: 'Le classement devient le sujet' },
]

const KEY = 'forkmap_preview_carnet'

export function readPreviewMode(): PreviewMode {
  if (typeof window === 'undefined') return 'sections'
  try {
    const v = window.localStorage.getItem(KEY)
    // 'sections' est le traitement retenu : il est le défaut, pas une option.
    return v === 'feed' || v === 'notes' || v === 'actuel' ? v : 'sections'
  } catch {
    // Navigation privée, stockage bloqué : on retombe sur l'écran actuel.
    return 'actuel'
  }
}

export function writePreviewMode(mode: PreviewMode): void {
  try {
    window.localStorage.setItem(KEY, mode)
  } catch {
    /* noop */
  }
}
