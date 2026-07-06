// ============================================================
// lib/taste-quiz.ts — Onboarding taste-quiz options.
//   Each `key` is a lowercase English cuisine label aligned with
//   `normalizeCuisine` (lib/overpass.ts) so a seeded key actually
//   matches `place.cuisine` / `cuisineKeys()` at ranking time.
// ============================================================

export interface TasteOption {
  /** lowercase English cuisine key — MUST match normalizeCuisine output */
  key: string
  /** French display label */
  label: string
  emoji: string
}

export const TASTE_OPTIONS: TasteOption[] = [
  { key: 'italian', label: 'Italien', emoji: '🍝' },
  { key: 'pizza', label: 'Pizza', emoji: '🍕' },
  { key: 'french', label: 'Français', emoji: '🥐' },
  { key: 'japanese', label: 'Japonais', emoji: '🍣' },
  { key: 'sushi', label: 'Sushi', emoji: '🍱' },
  { key: 'burger', label: 'Burger', emoji: '🍔' },
  { key: 'chinese', label: 'Chinois', emoji: '🥡' },
  { key: 'indian', label: 'Indien', emoji: '🍛' },
  { key: 'thai', label: 'Thaï', emoji: '🍜' },
  { key: 'mexican', label: 'Mexicain', emoji: '🌮' },
  { key: 'korean', label: 'Coréen', emoji: '🍲' },
  { key: 'vietnamese', label: 'Vietnamien', emoji: '🥢' },
  { key: 'lebanese', label: 'Libanais', emoji: '🧆' },
  { key: 'greek', label: 'Grec', emoji: '🫒' },
  { key: 'kebab', label: 'Kebab', emoji: '🥙' },
  { key: 'seafood', label: 'Fruits de mer', emoji: '🦞' },
  { key: 'vegetarian', label: 'Végétarien', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
]

/** Distinct keys of all quiz options (for setDeclaredCuisines reconciliation). */
export const TASTE_OPTION_KEYS = TASTE_OPTIONS.map((o) => o.key)
