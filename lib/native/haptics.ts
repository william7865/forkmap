// lib/native/haptics.ts
// Safe wrappers around @capacitor/haptics — no-ops on web.
// Uses isNativeRuntime() (not Capacitor.isNativePlatform() directly) so the
// dev native preview exercises the same code path; in production the two are
// identical. Calls are try/catch'd: haptics must never break a tap handler.
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNativeRuntime } from '@/lib/native/platform'

/** Light tap — use on map marker click */
export async function lightTap(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* noop */
  }
}

/** Heavy tap — use on favorite add/remove */
export async function heavyTap(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    /* noop */
  }
}

/**
 * Success notification — use when a user action COMMITS something (visit logged,
 * saved to a list, review posted). Distinct from `heavyTap`: iOS plays a
 * two-beat pattern the OS reserves for "it worked", so it reads as confirmation
 * rather than as another tap.
 */
export async function successTap(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    /* noop */
  }
}

/** Error notification — use when an action the user committed to has failed. */
export async function errorTap(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    /* noop */
  }
}
