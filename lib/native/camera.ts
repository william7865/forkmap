'use client'
import { isNativeRuntime } from './platform'

// Pick an image. Native: Capacitor Camera (gallery/photo prompt). Web: file input.
export async function pickAvatarPhoto(): Promise<Blob | null> {
  if (isNativeRuntime()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 90,
        width: 512,
        height: 512,
      })
      if (!photo.webPath) return null
      const res = await fetch(photo.webPath)
      return await res.blob()
    } catch {
      return null // user cancelled
    }
  }
  // Web fallback
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
