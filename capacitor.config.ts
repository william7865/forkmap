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
      backgroundColor: '#fffdf8',
      // Edge-to-edge: the WebView fills the whole screen (under the status bar).
      // Required so the dark splash covers the status-bar area instead of leaving
      // a white band above it and shoving the splash down. The app's top controls
      // pad by var(--safe-top) so nothing hides behind the status bar.
      overlaysWebView: true,
    },
    SplashScreen: {
      // Show the branded splash immediately on launch and keep it covering the
      // WebView until the app is ready — CapacitorInit calls hide() after a
      // short minimum (no grey WebView flash between launch and first paint).
      launchShowDuration: 3000,
      launchAutoHide: false,
      // Matches the dark splash image so no light band shows around it.
      backgroundColor: '#16150f',
      showSpinner: false,
    },
  },
}

export default config
