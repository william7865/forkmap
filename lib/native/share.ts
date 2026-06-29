import { isNativeRuntime } from './platform'

// Web-safe wrapper around @capacitor/share. Returns true if it handled the
// share natively, false on web (caller should fall back to its web UI).
export async function nativeShare(data: {
  title?: string
  text?: string
  url?: string
  dialogTitle?: string
}): Promise<boolean> {
  if (!isNativeRuntime()) return false
  const { Share } = await import('@capacitor/share')
  await Share.share(data)
  return true
}
