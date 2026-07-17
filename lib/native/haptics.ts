// lib/native/haptics.ts
// Safe wrappers around @capacitor/haptics — no-ops on web.
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** Light tap — use on map marker click */
export async function lightTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

/** Heavy tap — use on favorite add/remove */
export async function heavyTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.impact({ style: ImpactStyle.Heavy })
}

/**
 * Success notification — use when a user action COMMITS something (visit logged,
 * saved to a list, review posted). Distinct from `heavyTap`: iOS plays a
 * two-beat pattern the OS reserves for "it worked", so it reads as confirmation
 * rather than as another tap.
 */
export async function successTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.notification({ type: NotificationType.Success })
}

/** Error notification — use when an action the user committed to has failed. */
export async function errorTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await Haptics.notification({ type: NotificationType.Error })
}
