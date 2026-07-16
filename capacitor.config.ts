// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forkmap.app',
  appName: 'Forkmap',
  webDir: 'out',
  // Embedded mode: the app loads the bundled `out/` build from the device
  // (instant launch, native feel) instead of fetching the hosted website.
  // Data still comes from the hosted API via NEXT_PUBLIC_API_URL (see lib/api.ts).
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'Light',
      backgroundColor: '#fbfaf7',
      overlaysWebView: false,
    },
    SplashScreen: {
      // Show the branded splash immediately on launch and keep it covering the
      // WebView until the app is ready — CapacitorInit calls hide() after a
      // short minimum (no grey WebView flash between launch and first paint).
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#fbfaf7',
      showSpinner: false,
    },
  },
}

export default config
