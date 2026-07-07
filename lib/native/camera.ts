'use client'
import { isNativeRuntime } from './platform'

// Decode a data: URL into a Blob WITHOUT fetch(). The app's CSP `connect-src`
// does not allow data:/capacitor: schemes, so fetch(dataUrl) is blocked
// ("Load failed"). Manual base64 decode sidesteps that entirely.
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg'
  const binary = /;base64/i.test(header) ? atob(body) : decodeURIComponent(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// Pick an image. Native: Capacitor Camera (gallery/photo prompt). Web: file input.
export async function pickAvatarPhoto(): Promise<Blob | null> {
  if (isNativeRuntime()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    try {
      const photo = await Camera.getPhoto({
        // DataUrl forces a JPEG re-encode (HEIC iPhone photos become JPEG) and
        // returns base64 inline — no file read over capacitor:// needed.
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 90,
        width: 512,
        height: 512,
      })
      if (!photo.dataUrl) return null
      return dataUrlToBlob(photo.dataUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // User cancellation is normal → swallow. Real errors → surface to caller.
      if (/cancel/i.test(msg)) return null
      throw new Error(msg)
    }
  }
  // Web fallback
  return pickFromFileInput()
}

// Pick a full-frame photo (no square crop) — used for review photos.
export async function pickPhoto(): Promise<Blob | null> {
  if (isNativeRuntime()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 80,
      })
      if (!photo.dataUrl) return null
      return dataUrlToBlob(photo.dataUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/cancel/i.test(msg)) return null
      throw new Error(msg)
    }
  }
  return pickFromFileInput()
}

function pickFromFileInput(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
