// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forkmap.app',
  appName: 'Forkmap',
  webDir: 'out',
  // Fond de la WebView, identique au splash. iOS empile DEUX splashs (le
  // lancement natif, puis le plugin qui ré-instancie le même storyboard) et,
  // entre les deux, la WebView vide apparaît une frame : avec le fond par
  // défaut elle flashait en NOIR, ce qui se lit comme un splash qui bascule
  // vers un autre. En lui donnant la couleur du splash, la couture disparaît
  // et le lancement se lit comme un seul écran continu.
  backgroundColor: '#0f0f10',
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
      // Valeur de départ ; CapacitorInit la repasse à #0f0f10 ou #ffffff selon
      // le thème résolu. Le crème #fffdf8 d'avant venait du thème papier du
      // site et ne correspondait à aucun token de l'app.
      backgroundColor: '#ffffff',
      // Edge-to-edge: the WebView fills the whole screen (under the status bar).
      // Required so the dark splash covers the status-bar area instead of leaving
      // a white band above it and shoving the splash down. The app's top controls
      // pad by var(--safe-top) so nothing hides behind the status bar.
      overlaysWebView: true,
    },
    SplashScreen: {
      // Le splash du plugin sert de PONT, rien de plus.
      //
      // iOS retire son écran de lancement dès que la fenêtre est prête, donc
      // AVANT que la WebView ait peint : sans ce pont, on voyait le logo, puis
      // un écran sombre sans logo, puis le logo revenir avec le splash web.
      // Le plugin ré-affiche le même storyboard pendant ce trou, et
      // CapacitorInit le retire dès que BootSplash est peint (markup statique,
      // donc déjà à l'écran quand le premier effet React s'exécute).
      //
      // `launchAutoHide: false` : c'est nous qui décidons du moment, pas un
      // minuteur — sinon il disparaît avant que la WebView soit prête.
      launchShowDuration: 3000,
      launchAutoHide: false,
      // Même valeur que le fond du storyboard ET de l'image : iOS empile DEUX
      // splashs (le lancement natif, puis ce plugin qui ré-instancie le même
      // storyboard). Toute divergence entre les deux se voit comme un splash
      // qui bascule vers un autre — d'où une couleur unique, pas de variante
      // claire/sombre. L'olive #16150f d'avant était un reste du thème
      // papier/terracotta du site.
      backgroundColor: '#0f0f10',
      showSpinner: false,
    },
  },
}

export default config
