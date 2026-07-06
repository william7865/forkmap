// lib/native/http.ts — native HTTP for the app shell.
// Uses a tiny custom native plugin (RawHttp, see ios AppDelegate.swift) that
// returns the RAW response body as text. This is required because:
//  1) the request exits through the DEVICE's residential IP (Google blocks the
//     single Vercel datacenter IP, not thousands of individual devices), and
//  2) stock CapacitorHttp force-parses `application/json` responses — Google's
//     map endpoint serves an XSSI-prefixed (`)]}'`) blob AS application/json
//     that isn't valid JSON, so CapacitorHttp errors ("data couldn't be read").
// On web it returns null so callers fall back to the server route.
import { registerPlugin } from '@capacitor/core'
import { isNativeRuntime } from './platform'

interface RawHttpPlugin {
  get(options: {
    url: string
    headers?: Record<string, string>
  }): Promise<{ status: number; data: string }>
}

const RawHttp = registerPlugin<RawHttpPlugin>('RawHttp')

export interface NativeHttpResult {
  status: number
  data: string
}

/** GET a URL through the native RawHttp plugin. Returns null on web. */
export async function nativeHttpGetText(
  url: string,
  headers: Record<string, string> = {}
): Promise<NativeHttpResult | null> {
  if (!isNativeRuntime()) return null
  try {
    const res = await RawHttp.get({ url, headers })
    return { status: res.status, data: res.data ?? '' }
  } catch {
    return null
  }
}
