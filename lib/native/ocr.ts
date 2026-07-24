// lib/native/ocr.ts — on-device text recognition for the app shell.
// A tiny native plugin (Ocr, see ios AppDelegate.swift) downloads an image on the
// DEVICE (residential IP, like RawHttp) and runs Apple's Vision text recogniser —
// free, offline, no server round-trip. Used to read a restaurant's name off a
// reel's thumbnail when the caption never spells it out. Returns null on web,
// where the native bridge is unavailable and callers just skip the OCR signal.
import { registerPlugin } from '@capacitor/core'
import { isNativeRuntime } from './platform'

interface OcrPlugin {
  recognize(options: { imageUrl: string }): Promise<{ lines: string[] }>
}

const Ocr = registerPlugin<OcrPlugin>('Ocr')

/**
 * Recognise text in the image at `imageUrl`, top-to-bottom.
 * Returns the recognised lines, `[]` when the image has no text, or `null` on web
 * / when the native call fails (so callers treat OCR as an optional signal).
 */
export async function nativeOcrRecognize(imageUrl: string): Promise<string[] | null> {
  if (!isNativeRuntime() || !imageUrl) return null
  try {
    const res = await Ocr.recognize({ imageUrl })
    return Array.isArray(res?.lines) ? res.lines : []
  } catch {
    return null
  }
}
