'use client'
// ============================================================
// lib/hooks/useToastContext.tsx — ONE toast stack for the whole app.
//
// Why this exists: `useToast` keeps its toasts in local state, so a component
// that calls the hook can only ever raise a toast that IT renders. Before this
// provider, the only <ToastStack> lived in app/page.tsx — which meant every
// screen mounted elsewhere (Favoris, Compte, and every modal they render) had
// no way to acknowledge anything. That is why logging a visit, saving to a list
// and posting a review all succeeded in silence: not an oversight, just no
// stack to render into.
//
// The provider mounts the hook once (root layout) and renders the single stack,
// so any component at any depth can confirm an action without prop-drilling.
// ============================================================
import React, { createContext, useContext } from 'react'
import { useToast, type UseToast } from '@/lib/hooks/useToast'
import ToastStack from '@/components/ui/ToastStack'

/** Inert default: consumers rendered outside the provider (tests, isolated
 *  stories) no-op instead of crashing. */
const FALLBACK: UseToast = {
  toasts: [],
  show: () => '',
  success: () => '',
  error: () => '',
  info: () => '',
  dismiss: () => {},
}

const Ctx = createContext<UseToast>(FALLBACK)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const api = useToast()
  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastStack toasts={api.toasts} onDismiss={api.dismiss} />
    </Ctx.Provider>
  )
}

/** The app-wide toast API. Safe to call from any client component. */
export function useToastApi(): UseToast {
  return useContext(Ctx)
}
