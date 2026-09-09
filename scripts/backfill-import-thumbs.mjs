#!/usr/bin/env node
// ============================================================
// scripts/backfill-import-thumbs.mjs — rattrape les vignettes perdues.
//
// À exécuter UNE FOIS après avoir créé le bucket (sql/import-thumbs-storage.sql).
//
// Les imports déjà en base portent l'URL signée d'un CDN, expirée : toutes
// répondent 403. On ne peut donc pas les recopier telles quelles. En revanche
// le lien du post, lui, est toujours valide : on redemande une vignette
// FRAÎCHE à la plateforme, et c'est elle qu'on range.
//
//   node scripts/backfill-import-thumbs.mjs            # simulation
//   node scripts/backfill-import-thumbs.mjs --write    # écrit vraiment
// ============================================================
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WRITE = process.argv.includes('--write')
const BUCKET = 'import-thumbs'

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ALLOWED = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Redemande une vignette fraîche à la plateforme, à partir du lien du post. */
async function freshThumb(url, platform) {
  const endpoints = {
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  }
  const oembed = endpoints[platform]
  if (oembed) {
    try {
      const r = await fetch(oembed)
      if (r.ok) {
        const j = await r.json()
        if (j.thumbnail_url) return j.thumbnail_url
      }
    } catch {
      /* on tente la page */
    }
  }
  // Repli : l'image Open Graph de la page du post.
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0' },
    })
    if (!r.ok) return null
    const html = await r.text()
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    return m ? m[1].replace(/&amp;/g, '&') : null
  } catch {
    return null
  }
}

const { data: rows, error } = await db
  .from('imports')
  .select('id,user_id,url,platform,post_thumb')
  .order('created_at', { ascending: true })
if (error) {
  console.error('lecture impossible :', error.message)
  process.exit(1)
}

const supaOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
const todo = rows.filter((r) => {
  if (!r.post_thumb) return true
  try {
    return new URL(r.post_thumb).origin !== supaOrigin
  } catch {
    return true
  }
})

console.log(`${rows.length} imports, ${todo.length} à rattraper${WRITE ? '' : ' (simulation)'}\n`)

let ok = 0
let ko = 0
for (const r of todo) {
  const src = await freshThumb(r.url, r.platform)
  if (!src) {
    console.log(`  ✗ ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — pas de vignette fraîche`)
    ko++
    continue
  }
  const res = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Forkmap/1.0)' } })
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const ext = ALLOWED[type]
  if (!res.ok || !ext) {
    console.log(`  ✗ ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — HTTP ${res.status} ${type}`)
    ko++
    continue
  }
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (!WRITE) {
    console.log(`  · ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — ${Math.round(bytes.length / 1024)} Ko prêts`)
    ok++
    continue
  }
  const path = `${r.user_id}/${r.id}.${ext}`
  const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true })
  if (up.error) {
    console.log(`  ✗ ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — envoi : ${up.error.message}`)
    ko++
    continue
  }
  const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  const upd = await db.from('imports').update({ post_thumb: publicUrl }).eq('id', r.id)
  if (upd.error) {
    console.log(`  ✗ ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — écriture : ${upd.error.message}`)
    ko++
    continue
  }
  console.log(`  ✓ ${r.platform.padEnd(10)} ${r.id.slice(0, 8)} — ${Math.round(bytes.length / 1024)} Ko`)
  ok++
}

console.log(`\n${ok} récupérées, ${ko} en échec.`)
if (!WRITE) console.log('Simulation. Relancer avec --write pour appliquer.')
