// Resize an image Blob to fit within `max`px (longest side), output JPEG.
// Uses an <img> element to decode (the iOS WebView decodes HEIC/JPEG via the
// system here, unlike createImageBitmap which can fail on HEIC).
export async function resizeImage(blob: Blob, max = 512, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('image_decode_failed'))
      im.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', quality)
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
