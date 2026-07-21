// scripts/build-mobile.mjs
// Builds the static export consumed by Capacitor (the embedded mobile app).
//
// WHY THIS SCRIPT EXISTS:
// `output: 'export'` turns the whole app into static files, but the
// `app/api/*` routes are server-only (they run on Vercel and bypass RLS via
// the service-role client). Next.js cannot statically export them, so a plain
// `next build` with NEXT_EXPORT=true fails while collecting their page data.
//
// The mobile bundle does not need those routes: it reaches the hosted API
// remotely through NEXT_PUBLIC_API_URL (see lib/api.ts). So we temporarily
// move `app/api` aside, run the export, then always restore it — even if the
// build throws — so the working tree is never left mangled.

import { rename, rm, access, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()
const API_DIR = join(ROOT, 'app', 'api')
const STASH_DIR = join(ROOT, '.api-stash')

// The hosted API the embedded app talks to. Override by exporting
// NEXT_PUBLIC_API_URL before running this script.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forkmap.vercel.app'

function exists(p) {
  return access(p).then(
    () => true,
    () => false
  )
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    )
  })
}

async function restore() {
  if (await exists(STASH_DIR)) {
    if (await exists(API_DIR)) {
      // Both exist (shouldn't normally happen) — drop the stash, keep app/api.
      await rm(STASH_DIR, { recursive: true, force: true })
    } else {
      await rename(STASH_DIR, API_DIR)
    }
  }
}

async function main() {
  // Recover from a previous interrupted run before doing anything else.
  await restore()

  const hasApi = await exists(API_DIR)
  if (hasApi) {
    await mkdir(join(ROOT), { recursive: true })
    await rename(API_DIR, STASH_DIR)
  }

  try {
    await run('next', ['build'], {
      NEXT_EXPORT: 'true',
      NEXT_PUBLIC_API_URL: API_URL,
    })
  } finally {
    await restore()
  }
}

main().catch((err) => {
  console.error('\n[build-mobile] failed:', err.message)
  process.exitCode = 1
})
