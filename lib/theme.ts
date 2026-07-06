// ============================================================
// lib/theme.ts — Native dark-mode controller.
//   Pure resolution (testable) + thin DOM/localStorage helpers.
//   The web is NEVER dark: resolveTheme forces 'light' off-native,
//   and the dark CSS lives under html.native-app[data-theme='dark'].
// ============================================================

export type ThemePref = 'light' | 'dark' | 'auto'
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'forkmap_theme'

/**
 * Resolve the effective theme. Off-native it is always 'light' so the website
 * keeps its paper look. 'auto' follows the OS; otherwise the explicit pref wins.
 */
export function resolveTheme(pref: ThemePref, systemDark: boolean, isNative: boolean): Theme {
  if (!isNative) return 'light'
  if (pref === 'auto') return systemDark ? 'dark' : 'light'
  return pref
}

export function getThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'auto'
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function setThemePref(pref: ThemePref): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    /* storage disabled — non-fatal */
  }
}

/** Reflect the effective theme onto <html data-theme>. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

/** True when the OS currently prefers a dark UI. */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
