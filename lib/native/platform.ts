'use client'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

// Dev-only : `localStorage.forkmap_dev_native = '1'` prévisualise l'app native
// (chrome AppTabBar, tokens html.native-app, dark via data-theme) dans un
// navigateur de bureau, sans simulateur. La branche entière est éliminée du
// build de production par le check NODE_ENV — le web réel est inchangé.
function devForcedNative(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  try {
    if (window.localStorage.getItem('forkmap_dev_native') !== '1') return false
  } catch {
    return false
  }
  // CapacitorInit ne tourne pas hors device : on pose ici la classe + des
  // safe-areas simulées (idempotent) pour que le CSS natif s'applique.
  const html = document.documentElement
  if (!html.classList.contains('native-app')) {
    html.classList.add('native-app')
    html.style.setProperty('--safe-top', '54px')
    html.style.setProperty('--safe-bottom', '28px')
  }
  return true
}

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false
  if (devForcedNative()) return true
  return Capacitor.isNativePlatform()
}

// Dev-only : vrai quand la preview navigateur (flag ci-dessus) est active —
// permet aux écrans app-only de sauter leurs gardes d'auth pour itérer sur le
// design sans session. Toujours false en production.
export function isDevNativePreview(): boolean {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('forkmap_dev_native') === '1'
  } catch {
    return false
  }
}

// SSR-safe : false au premier rendu (serveur + hydratation), puis vrai après montage.
export function useIsNative(): boolean {
  const [native, setNative] = useState(false)
  useEffect(() => {
    setNative(isNativeRuntime())
  }, [])
  return native
}
