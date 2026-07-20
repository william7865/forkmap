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
const DARK_BG = '#0f0f10' // --surface (thème sombre) = StatusBar sombre
const LIGHT_BG = '#ffffff' // StatusBar clair
const GOLD = '#f5a623' // --star : la SEULE chroma du système

/** Le logotype « forkmap » (Playfair) extrait du splash d'origine : la police
 *  n'est pas dans le repo, donc on garde le tracé rendu et on le TEINTE. */
const WORDMARK = join(ASSETS, 'wordmark-forkmap.png')
const WORDMARK_RATIO = 543 / 157 // largeur / hauteur du sprite

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
 * Splash : marque + logotype verrouillés, le bloc optiquement centré.
 *
 * @capacitor/assets recadre ce carré au centre pour chaque écran, donc tout ce
 * qui compte doit rester près du milieu — d'où un bloc compact plutôt que deux
 * éléments repoussés aux extrémités (l'ancien logotype, à 91 % de la hauteur,
 * frôlait le bord une fois recadré).
 */
async function splash(px, { bg, ink }, out) {
  const MARK = px * 0.15 // largeur (et hauteur) de la marque
  const WORD = px * 0.3 // largeur du logotype
  const wordH = WORD / WORDMARK_RATIO
  const GAP = px * 0.05 // respiration entre marque et logotype

  const blockH = MARK + GAP + wordH
  // Centre optique : un bloc géométriquement centré paraît tomber vers le bas.
  const top = (px - blockH) / 2 - px * 0.02

  const s = MARK / 64
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <rect width="${px}" height="${px}" fill="${bg}"/>
    <g transform="translate(${(px - MARK) / 2} ${top}) scale(${s})">${mark(ink, GOLD)}</g>
  </svg>`

  const w = Math.round(WORD)
  const h = Math.round(wordH)
  // Le sprite porte le logotype dans son canal alpha : on s'en sert comme
  // masque (`dest-in`) sur un aplat `ink` pour le teinter proprement.
  const alpha = await sharp(WORDMARK).resize(w, h).ensureAlpha().toBuffer()
  const tinted = await sharp({
    create: { width: w, height: h, channels: 4, background: ink },
  })
    .composite([{ input: alpha, blend: 'dest-in' }])
    .png()
    .toBuffer()

  await sharp(Buffer.from(svg))
    .composite([
      { input: tinted, left: Math.round((px - WORD) / 2), top: Math.round(top + MARK + GAP) },
    ])
    .png()
    .toFile(join(ASSETS, out))
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

  await splash(2732, { bg: LIGHT_BG, ink: INK }, 'splash.png')
  await splash(2732, { bg: DARK_BG, ink: OFF_WHITE }, 'splash-dark.png')

  console.warn('✓ sources splash écrites dans assets/ — génération @capacitor/assets…')
  execSync(
    'npx --yes @capacitor/assets generate --ios --android' +
      ` --iconBackgroundColor '${INK}' --iconBackgroundColorDark '${INK}'` +
      ` --splashBackgroundColor '${LIGHT_BG}' --splashBackgroundColorDark '${DARK_BG}'`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  console.warn('✓ splash + icônes (inchangées) générés (ios/ et android/).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
