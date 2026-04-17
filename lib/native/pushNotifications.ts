// lib/native/pushNotifications.ts
// Requests push permission and registers the device token with the backend.
// Called once after user signs in on a native platform.
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { apiFetch } from '@/lib/api'

export async function registerPushNotifications(accessToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  // Listen for the token once — remove listener after first registration
  const listener = await PushNotifications.addListener('registration', async ({ value: token }) => {
    await listener.remove()
    await apiFetch('/api/push-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    })
  })
}
