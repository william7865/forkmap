#!/usr/bin/env node
// ============================================================
// scripts/scrape-place-photos.mjs — le scraper photos maison.
//
// POURQUOI UN NAVIGATEUR. Le scraper embarqué de l'app interroge le point
// d'entrée compact de Google Maps : il rend UNE image par lieu, presque
// toujours le logo. La galerie déposée par les clients (plats, salle,
// devanture) n'existe qu'après exécution du JavaScript de la page. Vérifié en
// `fetch` simple, tous à une seule image : URL canonique `/maps/place/…`,
// `preview/place`, `photometa/v1`, `async/lcl_akp`, recherche par `ludocid`.
//
// D'où ce script, HORS de l'application : il pilote Chrome, lit la galerie,
// télécharge les photos et les range dans notre propre stockage. Les photos
// d'un restaurant ne changent pas d'un jour à l'autre — les récupérer une
// fois puis les servir depuis chez nous est plus rapide, plus stable, et ne
// dépend plus de Google à l'affichage.
//
//   node scripts/scrape-place-photos.mjs --limit 5          # simulation
//   node scripts/scrape-place-photos.mjs --limit 5 --write  # écrit vraiment
//   node scripts/scrape-place-photos.mjs --headful          # voir le navigateur
// ============================================================
import fs from 'node:fs'
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const HEADFUL = args.includes('--headful')
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 20
const PER_PLACE = 6
const BUCKET = 'place-photos'

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Chrome installé sur la machine : playwright-core ne télécharge aucun
// navigateur, on se branche sur celui qui est déjà là.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** `node/123` contient un « / », interdit comme nom de dossier : on l'aplatit. */
const storageKey = (osmId) => osmId.replace(/\//g, '_')

/** Les lieux enregistrés de l'utilisateur, dédoublonnés par osm_id. */
async function placesToDo() {
  const seen = new Map()
  const add = (osm_id, snap) => {
    if (!osm_id || seen.has(osm_id)) return
    if (!snap?.name || snap.lat == null || snap.lon == null) return
    seen.set(osm_id, { osm_id, name: snap.name, lat: snap.lat, lon: snap.lon })
  }
  const { data: favs } = await db.from('favorites').select('osm_id,snapshot')
  for (const r of favs ?? []) add(r.osm_id, r.snapshot)
  const { data: imps } = await db.from('imports').select('osm_id,place_snapshot')
  for (const r of imps ?? []) add(r.osm_id, r.place_snapshot)

  // Ceux qu'on a déjà faits ne sont pas refaits : le script est relançable.
  // La source de vérité est le STOCKAGE lui-même — un dossier par lieu — et
  // non une table à part : une pièce de moins, et aucune migration SQL à
  // exécuter avant de pouvoir s'en servir.
  const { data: dirs } = await db.storage.from(BUCKET).list('', { limit: 1000 })
  for (const d of dirs ?? []) {
    for (const [osm_id] of seen) if (storageKey(osm_id) === d.name) seen.delete(osm_id)
  }
  return [...seen.values()]
}

/** Ouvre la fiche Google du lieu et lit les URL de sa galerie. */
async function photosFor(page, place) {
  const q = `${place.name} ${place.lat.toFixed(5)},${place.lon.toFixed(5)}`
  const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=fr&gl=fr`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // Le panneau de la fiche se remplit après le chargement du document ; sans
  // cette attente on lit une page encore vide.
  await page.waitForTimeout(3500)
  return page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('img')) if (el.src) out.push(el.src)
    for (const el of document.querySelectorAll('[style*="googleusercontent"]')) {
      const m = el.getAttribute('style').match(/https:\/\/[^"')]+googleusercontent[^"')]+/)
      if (m) out.push(m[0])
    }
    return out
  })
}

// Mêmes règles que lib/place-photos.ts, recopiées ici parce qu'un script .mjs
// ne peut pas importer un module TypeScript du projet.
const isGooglePhotoUrl = (u) => typeof u === 'string' && /^https:\/\/lh\d+\.googleusercontent\.com\//.test(u)
const atSize = (u, w, h) => `${u.split('=')[0]}=w${w}-h${h}-k-no`
const thumbOnly = (u) => {
  const s = u.split('=')[1]
  if (!s) return false
  const sizes = [...s.matchAll(/[swh](\d+)/g)].map((m) => Number(m[1]))
  return sizes.length > 0 && Math.max(...sizes) <= 80
}
function pick(urls) {
  const seen = new Set()
  const out = []
  for (const u of urls) {
    if (!isGooglePhotoUrl(u) || thumbOnly(u)) continue
    const id = u.split('=')[0]
    if (seen.has(id)) continue
    seen.add(id)
    out.push(atSize(u, 1200, 900))
  }
  return out.slice(0, PER_PLACE)
}

const todo = (await placesToDo()).slice(0, LIMIT)
console.log(`${todo.length} lieu(x) à traiter${WRITE ? '' : ' (simulation)'}\n`)

const browser = await chromium.launch({ executablePath: CHROME, headless: !HEADFUL })
const ctx = await browser.newContext({
  locale: 'fr-FR',
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
})
// Le mur de consentement européen bloque tout tant qu'il n'est pas passé.
await ctx.addCookies([
  { name: 'SOCS', value: 'CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LymBg', domain: '.google.com', path: '/' },
  { name: 'CONSENT', value: 'YES+cb.20210328-17-p0.en+FX+', domain: '.google.com', path: '/' },
])
const page = await ctx.newPage()

let ok = 0
let ko = 0
for (const place of todo) {
  try {
    const found = pick(await photosFor(page, place))
    if (found.length === 0) {
      console.log(`  ✗ ${place.name.slice(0, 34).padEnd(34)} aucune photo`)
      ko++
      continue
    }
    if (!WRITE) {
      console.log(`  · ${place.name.slice(0, 34).padEnd(34)} ${found.length} photo(s)`)
      ok++
      continue
    }
    const stored = []
    for (const [i, src] of found.entries()) {
      const res = await fetch(src)
      const type = (res.headers.get('content-type') || '').split(';')[0].trim()
      if (!res.ok || !type.startsWith('image/')) continue
      const bytes = new Uint8Array(await res.arrayBuffer())
      const path = `${storageKey(place.osm_id)}/${i + 1}.jpg`
      const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true })
      if (up.error) continue
      stored.push(db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
    }
    if (stored.length === 0) {
      console.log(`  ✗ ${place.name.slice(0, 34).padEnd(34)} téléchargement en échec`)
      ko++
      continue
    }
    console.log(`  ✓ ${place.name.slice(0, 34).padEnd(34)} ${stored.length} photo(s)`)
    ok++
  } catch (e) {
    console.log(`  ✗ ${place.name.slice(0, 34).padEnd(34)} ${String(e.message).slice(0, 46)}`)
    ko++
  }
  // Une pause entre deux fiches : on ne martèle pas Google.
  await page.waitForTimeout(1200)
}

await browser.close()
console.log(`\n${ok} lieu(x) avec photos, ${ko} sans.`)
if (!WRITE) console.log('Simulation. Relancer avec --write pour appliquer.')
