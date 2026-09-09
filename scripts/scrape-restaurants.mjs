#!/usr/bin/env node
// ============================================================
// scripts/scrape-restaurants.mjs — l'inventaire des restaurants d'une zone.
//
// Pilote un vrai navigateur sur la recherche Google Maps, fait défiler le
// panneau de résultats jusqu'au bout, et lit chaque fiche : nom, identifiant
// Google durable, coordonnées, note, NOMBRE D'AVIS, catégorie, prix, adresse,
// état d'ouverture avec l'heure de réouverture.
//
// POURQUOI UN NAVIGATEUR : ces données n'existent qu'après exécution du
// JavaScript de la page. Le point d'entrée compact utilisé par l'app rend une
// poignée de résultats sans nombre d'avis. Vérifié aussi sans succès :
// `preview/place`, `photometa/v1`, `async/lcl_akp`, recherche par `ludocid`.
//
// POURQUOI DES TUILES : une recherche Google plafonne autour de 120 résultats,
// quelle que soit la taille de la zone. Couvrir une ville demande donc de
// découper en carrés et de chercher dans chacun, puis de dédoublonner sur
// l'identifiant de fiche — le même restaurant apparaît dans les tuiles
// voisines.
//
//   node scripts/scrape-restaurants.mjs --bbox 48.845,2.33,48.87,2.37
//   node scripts/scrape-restaurants.mjs --bbox … --step 0.006 --out paris.json
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { parseListing } from './lib/maps-listing.mjs'

const args = process.argv.slice(2)
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const HEADFUL = args.includes('--headful')
const QUERY = arg('query', 'restaurant')
const OUT = arg('out', 'restaurants.json')
// 0.006° ≈ 650 m : assez petit pour rester sous le plafond de résultats dans
// un quartier dense comme le centre de Paris.
const STEP = Number(arg('step', '0.006'))
const BBOX = (arg('bbox', '48.845,2.33,48.87,2.37') || '').split(',').map(Number)
if (BBOX.length !== 4 || BBOX.some((n) => !Number.isFinite(n))) {
  console.error('--bbox attend : latMin,lonMin,latMax,lonMax')
  process.exit(1)
}
const [LAT_MIN, LON_MIN, LAT_MAX, LON_MAX] = BBOX

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** Les centres des tuiles couvrant la zone. */
function tiles() {
  const out = []
  for (let lat = LAT_MIN; lat < LAT_MAX; lat += STEP) {
    for (let lon = LON_MIN; lon < LON_MAX; lon += STEP) {
      out.push([lat + STEP / 2, lon + STEP / 2])
    }
  }
  return out
}

/** Fait défiler le panneau jusqu'à ce qu'il cesse de grandir, puis extrait. */
async function scrapeTile(page, lat, lon) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(QUERY)}/@${lat},${lon},16z?hl=fr&gl=fr`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForSelector('div[role="feed"]', { timeout: 20000 }).catch(() => null)

  return page.evaluate(async () => {
    const feed = document.querySelector('div[role="feed"]')
    if (!feed) return []
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    // On s'arrête quand le compte ne bouge plus trois tours d'affilée : Google
    // charge par paquets, un seul palier ne veut pas dire la fin.
    let last = 0
    let stable = 0
    for (let i = 0; i < 40 && stable < 3; i++) {
      feed.scrollTo(0, feed.scrollHeight)
      await sleep(850)
      const n = feed.querySelectorAll('a[href*="/maps/place/"]').length
      if (n === last) stable++
      else {
        stable = 0
        last = n
      }
    }
    // La CARTE d'un résultat est le plus grand ancêtre qui ne contient qu'un
    // seul lien de lieu. Les noms de classes de Google sont obfusqués et
    // changent ; `a.parentElement` n'est qu'un mince emballage, et lire son
    // texte donnait le nom et l'adresse mais PAS la note — 0 note lue sur 163
    // restaurants, sans la moindre erreur.
    const cardOf = (a) => {
      let el = a
      let best = a
      for (let i = 0; i < 6 && el.parentElement; i++) {
        el = el.parentElement
        if (el.querySelectorAll('a[href*="/maps/place/"]').length !== 1) break
        best = el
      }
      return best
    }
    // Les lignes d'une carte, SANS passer par `innerText`.
    //
    // ⚠️ `innerText` dépend du rendu : en navigateur invisible, le texte des
    // fiches sorties du champ n'est pas considéré comme rendu et disparaît.
    // Mesuré : 0 note sur 163 restaurants, alors que le même code donnait la
    // note dans un navigateur visible. On regroupe donc les nœuds texte sous
    // leur premier ancêtre de bloc, ce qui reconstitue les mêmes lignes sans
    // rien devoir au rendu.
    const linesOf = (card) => {
      const groups = new Map()
      const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
      while (walk.nextNode()) {
        const n = walk.currentNode
        const t = n.textContent.replace(/\s+/g, ' ').trim()
        if (!t) continue
        let el = n.parentElement
        while (el && el !== card && getComputedStyle(el).display.startsWith('inline')) {
          el = el.parentElement
        }
        const key = el || card
        groups.set(key, ((groups.get(key) || '') + ' ' + t).trim())
      }
      return [...groups.values()].map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
    }

    const out = []
    for (const a of feed.querySelectorAll('a[href*="/maps/place/"]')) {
      const fid = (a.href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/) || [])[1] || null
      const ll = a.href.match(/!8m2!3d(-?[\d.]+)!4d(-?[\d.]+)/)
      out.push({
        name: a.getAttribute('aria-label'),
        fid,
        lat: ll ? Number(ll[1]) : null,
        lon: ll ? Number(ll[2]) : null,
        lines: linesOf(cardOf(a)),
        // L'étoile porte la note dans son étiquette d'accessibilité, quelle
        // que soit la version du panneau servie par Google.
        ratingLabel:
          cardOf(a)
            .querySelector('[role="img"][aria-label*="toile"]')
            ?.getAttribute('aria-label') ?? null,
      })
    }
    return out
  })
}

const grid = tiles()
console.log(`${grid.length} tuile(s) de ${Math.round(STEP * 111000)} m sur « ${QUERY} »\n`)

const browser = await chromium.launch({ executablePath: CHROME, headless: !HEADFUL })
const ctx = await browser.newContext({
  locale: 'fr-FR',
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
})
// Sans ces cookies, le mur de consentement européen remplace la page.
await ctx.addCookies([
  {
    name: 'SOCS',
    value: 'CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LymBg',
    domain: '.google.com',
    path: '/',
  },
  { name: 'CONSENT', value: 'YES+cb.20210328-17-p0.en+FX+', domain: '.google.com', path: '/' },
])
const page = await ctx.newPage()

// Dédoublonnage sur l'identifiant de fiche : le même restaurant apparaît dans
// plusieurs tuiles voisines.
const byFid = new Map()
let done = 0
for (const [lat, lon] of grid) {
  try {
    const raw = await scrapeTile(page, lat, lon)
    let added = 0
    for (const r of raw) {
      if (!r.fid || !r.name || r.lat == null) continue
      if (byFid.has(r.fid)) continue
      byFid.set(r.fid, parseListing(r))
      added++
    }
    done++
    console.log(
      `  [${String(done).padStart(3)}/${grid.length}] ${lat.toFixed(4)},${lon.toFixed(4)} — ` +
        `${String(raw.length).padStart(3)} vus, +${String(added).padStart(3)} nouveaux ` +
        `(total ${byFid.size})`
    )
  } catch (e) {
    done++
    console.warn(`  [${done}/${grid.length}] ${lat.toFixed(4)},${lon.toFixed(4)} — ${String(e.message).slice(0, 50)}`)
  }
  // On ne martèle pas Google.
  await page.waitForTimeout(1000)
}

await browser.close()

const results = [...byFid.values()].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(results, null, 2))

const withReviews = results.filter((r) => r.reviews != null).length
console.log(`\n${results.length} restaurants distincts → ${OUT}`)
console.log(`  ${withReviews} avec un nombre d'avis, ${results.filter((r) => r.address).length} avec une adresse`)
