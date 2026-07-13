// lib/native/app-group.ts
// Bridge to the iOS App Group shared container (group.com.forkmap.app).
//
// The Share Extension runs in a SEPARATE process: it can't read the WebView's
// localStorage nor the Supabase session. The App Group is the only channel —
// the app writes its auth token there, the extension reads it; the extension
// queues shares it couldn't POST, the app drains that queue at launch.
//
// Web-safe like the other lib/native wrappers: every call is a no-op (or an
// empty result) when the Capacitor plugin isn't there.
import { registerPlugin } from '@capacitor/core'
import { isNativeRuntime } from './platform'

export interface PendingShare {
  url: string
  note?: string
}

interface AppGroupPlugin {
  setAuthToken(options: { token: string | null }): Promise<void>
  getPendingShares(): Promise<{ shares: PendingShare[] }>
  clearPendingShares(): Promise<void>
}

const AppGroup = registerPlugin<AppGroupPlugin>('AppGroup')

/**
 * Publish (or clear) the Supabase access token in the shared container so the
 * Share Extension can authenticate its POST /api/imports.
 */
export async function setSharedAuthToken(token: string | null): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await AppGroup.setAuthToken({ token })
  } catch (err) {
    // Plugin missing / App Group not provisioned — the extension will just fall
    // back to its offline queue. Never let this break sign-in.
    console.warn('[app-group] setAuthToken failed', err)
  }
}

/** Shares the extension couldn't POST (no token, no network). Empty on web. */
export async function readPendingShares(): Promise<PendingShare[]> {
  if (!isNativeRuntime()) return []
  try {
    const res = await AppGroup.getPendingShares()
    const shares = Array.isArray(res?.shares) ? res.shares : []
    return shares.filter((s): s is PendingShare => typeof s?.url === 'string' && s.url.length > 0)
  } catch (err) {
    console.warn('[app-group] getPendingShares failed', err)
    return []
  }
}

/** Empty the queue. Only call once every entry has been posted. */
export async function clearPendingShares(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await AppGroup.clearPendingShares()
  } catch (err) {
    console.warn('[app-group] clearPendingShares failed', err)
  }
}
