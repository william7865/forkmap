'use client'
import { useIsNative } from '@/lib/native/platform'
import NavWrapper from './NavWrapper'
import AppTabBar from './AppTabBar'

export default function AppChrome() {
  const native = useIsNative()
  // Web (and SSR first paint): unchanged web nav. Native: app tab bar.
  return native ? <AppTabBar /> : <NavWrapper />
}
