import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── Why this test exists ───────────────────────────────────────────────────
// Two separate production bugs came from `animation-fill-mode: forwards` (which
// `both` includes) on animations of `opacity` / `transform`:
//
//  1. STACKING. An element whose opacity/transform is animated carries a
//     STACKING CONTEXT for as long as the animation applies — `forwards` makes
//     that permanent. `app/(pages)/template.tsx` wraps every secondary page in
//     such an element, which clamped the z-index of every full-screen overlay
//     inside it: the chat sheet (z 1500) ended up under the tab bar (z 200) and
//     swallowed the message composer.
//  2. CENTRING. An animated `transform` REPLACES an inline one, so a pill
//     centred with `left:50%; transform:translateX(-50%)` lost its centring for
//     good — measured 30px off-centre. Hence the *Centered keyframe variants.
//
// Every entry animation here ends at the element's natural state (opacity 1,
// identity transform), so `forwards` buys nothing and only leaves the trap.
// The exceptions below genuinely need their final frame to persist.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Keyframes whose last frame is NOT the natural state, so the fill MUST persist:
 * heartParticle ends at scale(0), toastOut at opacity 0, bootSplashOut at
 * opacity 0 + visibility hidden (sans quoi le splash de démarrage réapparaîtrait
 * à la fin de son propre fondu).
 */
const FILL_REQUIRED = ['heartParticle', 'toastOut', 'bootSplashOut']

const ROOTS = ['app', 'components']
const EXTS = ['.ts', '.tsx', '.css']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXTS.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

const FILES = ROOTS.flatMap((r) => walk(r))

/** Every `animation:` declaration, as [file, line number, declaration text]. */
function animationDeclarations(): [string, number, string][] {
  const found: [string, number, string][] = []
  for (const f of FILES) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        // Skip comments — several explain this very rule.
        const t = line.trim()
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
        if (/animation:/.test(line) || /^\s*\?\s*['"`]/.test(line) || /^\s*:\s*['"`]/.test(line)) {
          found.push([f, i + 1, line])
        }
      })
  }
  return found
}

describe('animation-fill-mode', () => {
  it('never uses `both`/`forwards` except where the final frame must persist', () => {
    const offenders = animationDeclarations()
      .filter(([, , line]) => /\b(both|forwards)\b/.test(line))
      .filter(([, , line]) => !FILL_REQUIRED.some((kf) => line.includes(kf)))
      .map(([f, n, line]) => `${f}:${n} → ${line.trim()}`)

    expect(offenders).toEqual([])
  })

  it('still allows the exceptions that need their final frame', () => {
    const kept = animationDeclarations().filter(([, , line]) =>
      FILL_REQUIRED.some((kf) => line.includes(kf) && /\bboth\b/.test(line))
    )
    // toastOut ends at opacity 0, heartParticle at scale(0): both must stay put.
    expect(kept.length).toBeGreaterThan(0)
  })

  it('never animates a transform-keyframe on a transform-centred element', () => {
    // `left:50%; transform:translateX(-50%)` + an animation that animates
    // `transform` = the centring is dropped mid-flight. Use the *Centered variants.
    const NON_CENTRED = ['fadeUp', 'fadeDown', 'slideUp', 'slideDown', 'cardIn', 'slideInRight']
    const offenders: string[] = []

    for (const f of FILES.filter((p) => p.endsWith('.tsx'))) {
      const src = readFileSync(f, 'utf8')
      // Look at each style object that centres via transform.
      const blocks = src.split(/style=\{\{|style: /)
      for (const b of blocks) {
        const block = b.slice(0, 1200)
        if (!block.includes('translateX(-50%)')) continue
        for (const kf of NON_CENTRED) {
          const re = new RegExp(`animation:\\s*[\`'"]?${kf}\\b`)
          if (re.test(block)) offenders.push(`${f} → ${kf} on a translateX(-50%) element`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
