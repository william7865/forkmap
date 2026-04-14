// lib/native/haptics.ts
// Safe wrappers around @capacitor/haptics — no-ops on web.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/** Light tap — use on map marker click */
export async function lightTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

/** Heavy tap — use on favorite add/remove */
export async function heavyTap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Heavy });
}
