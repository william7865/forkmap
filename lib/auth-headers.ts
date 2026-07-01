import { getSupabaseBrowserClient } from '@/lib/hooks/useAuth'

/**
 * Bearer auth headers built from the current Supabase browser session.
 * Returns an empty object when signed out (caller sends an unauthenticated request).
 * Shared helper — prefer this over re-declaring the snippet per file.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
