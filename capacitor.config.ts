// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forkmap.app',
  appName: 'Forkmap',
  webDir: 'out',
  server: {
    url: 'https://forkmap.vercel.app',
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config
