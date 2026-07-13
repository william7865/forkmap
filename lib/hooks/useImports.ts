'use client'
// ============================================================
// lib/hooks/useImports.ts — the user's social imports + the background resolver.
//
// On mount (app launch), every `pending` import is resolved on the device, one
// at a time, so the scrape isn't hammered. The UI updates as each lands.
//
// Native only, deliberately: `fetchPostMetadata` and the Google scrape both go
// through the native HTTP bridge (residential IP). On the web they return
// nothing, so running the resolver there would mark every pending import as
// `failed` — burning rows the device could have resolved. The web lists the
// imports and leaves them `pending`; the app resolves them at next launch.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ImportRow } from '@/types'
import { apiFetch } from '@/lib/api'
import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'
import { isNativeRuntime } from '@/lib/native/platform'
import { resolveImport } from '@/lib/import/resolve'

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}

export function useImports(center: [number, number] | null) {
  const [imports, setImports] = useState<ImportRow[]>([])
  /** True until the first list lands. The import detail needs it: without it, an
   *  empty list is indistinguishable from a list still in flight, and the screen
   *  would flash "Import introuvable" on every cold open. */
  const [loading, setLoading] = useState(true)
  const resolving = useRef(false)
  /** Ids already attempted this session. The resolver effect depends on
   *  `imports`, which `patch` mutates — without this, a row whose PATCH fails
   *  (offline, 400…) would be picked up again on the next state change and could
   *  loop. One attempt per row per session; the next launch retries. */
  const attempted = useRef<Set<string>>(new Set())
  /** The map centre moves constantly. Read it at resolve time instead of making
   *  it an effect dependency, or every pan would restart the resolver. */
  const centerRef = useRef(center)
  centerRef.current = center

  const reload = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      if (!headers.Authorization) return
      const res = await apiFetch('/api/imports', { headers })
      if (!res.ok) return
      const { data } = (await res.json()) as { data: ImportRow[] }
      setImports(data)
    } finally {
      // Settled either way — a signed-out visitor or a dead API must not leave
      // the UI spinning forever.
      setLoading(false)
    }
  }, [])

  /** Persist a patch. Throws on failure so callers (and the resolver loop) can
   *  react — a silently dropped write would leave the row `pending` with no trace. */
  const patch = useCallback(async (id: string, p: Partial<ImportRow>) => {
    const headers = await getAuthHeaders()
    if (!headers.Authorization) throw new Error('Connectez-vous pour modifier un import.')
    const res = await apiFetch(`/api/imports/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? "Impossible de mettre à jour l'import.")
    }
    const { data } = (await res.json()) as { data: ImportRow }
    setImports((prev) => prev.map((i) => (i.id === id ? data : i)))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Resolve pending imports in the background, sequentially (the Google scrape
  // gets blocked if hammered).
  useEffect(() => {
    if (!isNativeRuntime()) return
    if (resolving.current) return
    const pending = imports.filter((i) => i.status === 'pending' && !attempted.current.has(i.id))
    if (pending.length === 0) return

    resolving.current = true
    void (async () => {
      try {
        for (const row of pending) {
          attempted.current.add(row.id)
          try {
            // resolveImport never rejects and never returns `pending`: whatever
            // happens, the row leaves the spinner.
            const p = await resolveImport(row, centerRef.current)
            await patch(row.id, p)
          } catch (err) {
            // The write failed (offline, 400). The row stays `pending` in the DB
            // and is retried at the next launch — never silently lost.
            console.warn('[useImports] resolve failed', row.id, err)
          }
        }
      } finally {
        resolving.current = false
      }
    })()
  }, [imports, patch])

  return {
    imports,
    loading,
    pendingCount: imports.filter((i) => i.status === 'pending').length,
    /** Imports the user must act on — drives the Favoris tab badge. */
    needsAttentionCount: imports.filter((i) => i.status === 'ambiguous' || i.status === 'failed')
      .length,
    reload,
    patch,
  }
}
