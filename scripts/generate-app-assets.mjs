// scripts/generate-app-assets.mjs
// ────────────────────────────────────────────────────────────
// Génère les icônes d'app + splash (iOS & Android) à partir de la
// marque Forkmap (« la vapeur »), sans dépendre d'un fichier image
// externe : on rasterise le SVG en PNG via `sharp`, puis on laisse
// `@capacitor/assets` fan-out vers ios/ et android/.
//
//   npm run assets      (puis: npx cap sync)
//
// Sources écrites dans assets/ :
//   icon-only.png       1024  fond terracotta + marque crème
//   icon-foreground.png 1024  marque crème centrée (zone de sécurité Android)
//   icon-background.png 1024  aplat terracotta
//   splash.png          2732  fond crème + marque terracotta (SANS texte)
//   splash-dark.png     2732  idem (pas de variante sombre dédiée)
// ────────────────────────────────────────────────────────────
import { execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'assets')

const TERRACOTTA = '#bb5e2e'
const CREAM = '#fffdf8'

// Le symbole (grille 0..64), `color` appliqué au stroke (volutes) ET au fill (bol).
const mark = (color) => `
  <g fill="none" stroke="${color}" stroke-width="4.4" stroke-linecap="round">
    <path d="M24 9c-3.4 3.8 3.4 6 0 9.8"/>
    <path d="M32 6c-3.4 3.8 3.4 6 0 9.8"/>
    <path d="M40 9c-3.4 3.8 3.4 6 0 9.8"/>
  </g>
  <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill="${color}"/>
  <path d="M15 34h34a17 17 0 0 1-34 0Z" fill="${color}"/>`

// Compose une toile carrée : fond optionnel + marque centrée à `pct` de la largeur.
function canvas(px, { bg = null, markColor = null, pct = 0.6 } = {}) {
  const m = px * pct
  const off = (px - m) / 2
  const s = m / 64
  const bgRect = bg ? `<rect width="${px}" height="${px}" fill="${bg}"/>` : ''
  const g = markColor
    ? `<g transform="translate(${off} ${off}) scale(${s})">${mark(markColor)}</g>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${bgRect}${g}</svg>`
}

const png = (svg, out) => sharp(Buffer.from(svg)).png().toFile(join(ASSETS, out))

async function main() {
  await mkdir(ASSETS, { recursive: true })

  await png(canvas(1024, { bg: TERRACOTTA, markColor: CREAM, pct: 0.6 }), 'icon-only.png')
  await png(canvas(1024, { markColor: CREAM, pct: 0.46 }), 'icon-foreground.png')
  await png(canvas(1024, { bg: TERRACOTTA }), 'icon-background.png')
  await png(canvas(2732, { bg: CREAM, markColor: TERRACOTTA, pct: 0.2 }), 'splash.png')
  await png(canvas(2732, { bg: CREAM, markColor: TERRACOTTA, pct: 0.2 }), 'splash-dark.png')

  console.warn('✓ sources PNG écrites dans assets/ — génération @capacitor/assets…')
  execSync(
    'npx --yes @capacitor/assets generate --ios --android' +
      ` --iconBackgroundColor '${TERRACOTTA}' --iconBackgroundColorDark '${TERRACOTTA}'` +
      ` --splashBackgroundColor '${CREAM}' --splashBackgroundColorDark '${CREAM}'`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  console.warn('✓ icônes + splash générés (ios/ et android/).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
