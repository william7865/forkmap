'use client'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

// SSR-safe : false au premier rendu (serveur + hydratation), puis vrai après montage.
export function useIsNative(): boolean {
  const [native, setNative] = useState(false)
  useEffect(() => {
    setNative(isNativeRuntime())
  }, [])
  return native
}
