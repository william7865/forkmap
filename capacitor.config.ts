import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.forkmap.app",
  appName: "Forkmap",
  webDir: "mobile-web",
  server: {
    ...(serverUrl ? { url: serverUrl } : {}),
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    StatusBar: { style: "Default", backgroundColor: "#ffffff", overlaysWebView: false },
    SplashScreen: { launchShowDuration: 0 },
  },
};

export default config;
