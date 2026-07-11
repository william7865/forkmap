// ============================================================
// lib/app-invite.ts — "Get the Forkmap app" invitation config
//
// Drives the web banner that nudges visitors toward the native app. Everything
// is env-configurable so the invitation is dormant until the stores are live:
// set the two URLs at launch and it activates. Until then it falls back to the
// placeholder links below so the UI can be seen and iterated on (no real users
// yet — the site isn't public either).
//
// SSR-safe: platform detection reads navigator, so it returns 'unknown' on the
// server and resolves after mount.
// ============================================================

// Fake links, on purpose, so the banner renders before launch. Replace at launch
// via NEXT_PUBLIC_IOS_APP_URL / NEXT_PUBLIC_ANDROID_APP_URL (real store URLs).
const PLACEHOLDER_IOS = 'https://apps.apple.com/app/forkmap/id000000000'
const PLACEHOLDER_ANDROID = 'https://play.google.com/store/apps/details?id=com.forkmap.app'

export interface StoreLinks {
  ios: string
  android: string
}

export function storeLinks(): StoreLinks {
  return {
    ios: process.env.NEXT_PUBLIC_IOS_APP_URL || PLACEHOLDER_IOS,
    android: process.env.NEXT_PUBLIC_ANDROID_APP_URL || PLACEHOLDER_ANDROID,
  }
}

export type DevicePlatform = 'ios' | 'android' | 'desktop' | 'unknown'

/** Coarse platform from the user agent. Client-only; 'unknown' before mount. */
export function detectPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  // iPadOS 13+ reports as desktop Safari; the touch check catches it.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export const INVITE_DISMISS_KEY = 'forkmap_app_invite_dismissed'
export const INTERSTITIAL_SHOWN_KEY = 'forkmap_app_interstitial_shown'

/**
 * Whether the one-time interstitial may fire. It appears at most once ever, and
 * not if the visitor already dismissed the persistent banner (they've seen the
 * pitch). Platform/native/mobile gating is the caller's job. SSR-safe.
 */
export function interstitialAllowed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(INTERSTITIAL_SHOWN_KEY) === '1') return false
    if (localStorage.getItem(INVITE_DISMISS_KEY) === '1') return false
  } catch {
    return false
  }
  return true
}

/** Record that the interstitial has been shown, so it never fires again. */
export function markInterstitialShown(): void {
  try {
    localStorage.setItem(INTERSTITIAL_SHOWN_KEY, '1')
  } catch {
    /* storage disabled — worst case it shows again next session */
  }
}
