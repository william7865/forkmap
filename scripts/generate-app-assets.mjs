// scripts/generate-app-assets.mjs
// ────────────────────────────────────────────────────────────
// Génère les icônes d'app + splash (iOS & Android) à partir de la
// marque Forkmap (« la vapeur »), sans dépendre d'un fichier image
// externe : on rasterise le SVG en PNG via `sharp`, puis on laisse
// `@capacitor/assets` fan-out vers ios/ et android/.
//
//   npm run assets      (puis: npx cap sync)
//
// ⚠️ Ce script EST la source de vérité du splash. Il l'a été, puis le
// splash livré a été refait à la main : le script est resté sur
// l'ancienne identité (terracotta #bb5e2e sur crème) et le relancer
// aurait effacé le design en place. Toute retouche passe par ici.
//
// ── Palette : Monochrome Premium ────────────────────────────
// Une seule vraie couleur, l'or de la vapeur (--star). Le reste est
// NEUTRE : l'ancien splash utilisait un noir olive chaud (#16150f) et
// un crème (#f7f4ec) hérités du thème papier/terracotta du site, qui
// juraient avec l'app. Les valeurs ci-dessous sont celles que l'app
// affiche vraiment (cf. CapacitorInit : StatusBar #0f0f10 / #ffffff).
//
// ── Composition ─────────────────────────────────────────────
// Marque et logotype forment UN bloc, optiquement centré. Avant, la
// marque flottait à 39 % de la hauteur et le logotype à 91 % : 44 %
// de vide entre les deux, deux éléments sans rapport plutôt qu'un
// verrouillage de marque.
//
// Sources écrites dans assets/ :
//   icon-only.png       1024  fond encre + marque claire
//   icon-foreground.png 1024  marque claire centrée (zone de sécurité Android)
//   icon-background.png 1024  aplat encre
//   splash.png          2732  clair : fond blanc + encre
//   splash-dark.png     2732  sombre : fond #0f0f10 + off-white
// ────────────────────────────────────────────────────────────
import { execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'assets')

// Alignés sur app/globals.css + CapacitorInit.
const INK = '#1a1a1a' // --accent
const OFF_WHITE = '#f2f2f3' // --text (thème sombre)
// Le splash est sombre dans les DEUX thèmes (voir le commentaire dans main()) :
// pas de LIGHT_BG ici, ce serait rouvrir la faille des deux apparences.
const DARK_BG = '#0f0f10' // --surface (thème sombre) = StatusBar sombre
const GOLD = '#f5a623' // --star : la SEULE chroma du système

/** Le symbole seul (grille 0..64). `steam` sépare la vapeur du bol pour que
 *  l'or reste la seule couleur — c'est lui qui réchauffe un écran neutre. */
const mark = (color, steam = color) => `
  <g fill="none" stroke="${steam}" stroke-width="4.4" stroke-linecap="round">
    <path d="M24 9c-3.4 3.8 3.4 6 0 9.8"/>
    <path d="M32 6c-3.4 3.8 3.4 6 0 9.8"/>
    <path d="M40 9c-3.4 3.8 3.4 6 0 9.8"/>
  </g>
  <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill="${color}"/>
  <path d="M15 34h34a17 17 0 0 1-34 0Z" fill="${color}"/>`

/**
 * Splash : la marque SEULE, centrée. Pas de logotype — l'app s'ouvre sur son
 * symbole, le nom est déjà sous l'icône de l'écran d'accueil.
 *
 * @capacitor/assets recadre ce carré au centre pour chaque écran : sur un
 * téléphone portrait, seule la bande centrale (~46 % de la largeur) reste
 * visible. La marque est dimensionnée pour tenir largement dedans.
 */
async function splash(px, { bg, ink }, out) {
  const MARK = px * 0.2
  const s = MARK / 64
  const x = (px - MARK) / 2
  // Centre optique : un élément géométriquement centré paraît tomber vers le bas.
  const y = (px - MARK) / 2 - px * 0.015

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <rect width="${px}" height="${px}" fill="${bg}"/>
    <g transform="translate(${x} ${y}) scale(${s})">${mark(ink, GOLD)}</g>
  </svg>`

  await sharp(Buffer.from(svg)).png().toFile(join(ASSETS, out))
}

async function main() {
  await mkdir(ASSETS, { recursive: true })

  // ⚠️ Les ICÔNES ne sont PAS régénérées depuis le SVG.
  // `@capacitor/assets` n'a aucun mode « splash seulement » : il refabrique tout
  // ce qu'il trouve dans assets/. Or l'icône livrée a été retouchée à la main et
  // vaut mieux que la sortie du tracé — vapeur plus épaisse (donc lisible à 60px
  // sur l'écran d'accueil), bol mieux proportionné. assets/icon-*.png sont donc
  // désormais des COPIES de l'icône livrée : la régénération est idempotente au
  // lieu de la dégrader à chaque passage sur le splash.
  // Pour retoucher l'icône : modifier assets/icon-*.png, pas ce script.

  // ⚠️ UNE SEULE apparence, volontairement : le même visuel en clair et en sombre.
  // iOS affiche DEUX splashs successifs — l'écran de lancement natif, puis le
  // plugin Capacitor qui ré-instancie le MÊME storyboard (SplashScreen.swift).
  // Avec des variantes clair/sombre distinctes, ces deux calques peuvent résoudre
  // des apparences DIFFÉRENTES (le natif suit le système, le plugin suit le thème
  // appliqué par l'app) : on voit alors un splash basculer vers l'autre au
  // lancement. Un visuel unique rend la superposition invisible.
  await splash(2732, { bg: DARK_BG, ink: OFF_WHITE }, 'splash.png')
  await splash(2732, { bg: DARK_BG, ink: OFF_WHITE }, 'splash-dark.png')

  console.warn('✓ sources splash écrites dans assets/ — génération @capacitor/assets…')
  execSync(
    'npx --yes @capacitor/assets generate --ios --android' +
      ` --iconBackgroundColor '${INK}' --iconBackgroundColorDark '${INK}'` +
      ` --splashBackgroundColor '${DARK_BG}' --splashBackgroundColorDark '${DARK_BG}'`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  console.warn('✓ splash + icônes (inchangées) générés (ios/ et android/).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
