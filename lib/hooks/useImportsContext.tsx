'use client'
// ============================================================
// lib/hooks/useImportsContext.tsx — ONE `useImports` for the whole app.
//
// Why this exists: `useImports` owns a background resolver that scrapes Google
// once per pending row. Its guards (`resolving`, `attempted`) are refs, i.e.
// per hook instance — so mounting the hook twice (the tab-bar badge AND the
// Favoris row, then again on the import detail) would run two resolvers side by
// side over the same rows. Google blocks a device that hammers it, so the
// second resolver doesn't just waste work: it poisons the first one.
//
// The provider mounts the hook exactly once (root layout). Every screen reads
// the same list, the same counts, and a `patch` from one screen updates them
// all — no refetch, no second resolver.
// ============================================================
import React, { createContext, useContext } from 'react'
import { useImports } from '@/lib/hooks/useImports'

type ImportsApi = ReturnType<typeof useImports>

/** Inert default: consumers rendered outside the provider (tests, isolated
 *  stories) get an empty list instead of a crash — and, crucially, no resolver. */
const FALLBACK: ImportsApi = {
  imports: [],
  loading: false,
  pendingCount: 0,
  needsAttentionCount: 0,
  reload: async () => {},
  patch: async () => {},
}

const Ctx = createContext<ImportsApi>(FALLBACK)

export function ImportsProvider({ children }: { children: React.ReactNode }) {
  // `null` centre: the resolver falls back to Paris (see lib/import/resolve.ts).
  // The map centre lives in useHomeState, which is mounted below this provider —
  // wiring it up would make the whole app re-render on every pan for no gain.
  const api = useImports(null)
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** The app's single imports store. Use this everywhere — never `useImports` directly. */
export function useImportsStore(): ImportsApi {
  return useContext(Ctx)
}
