import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Couleurs de l'ancienne palette « Éditorial Chaleureux ». Aucune ne doit subsister. */
const FORBIDDEN = [
  '#bb5e2e', // terracotta (accent)
  '#9f4d22', // terracotta hover
  '#f6e7da', // terracotta light
  '#a8521f', // terracotta text
  '#fffdf8', // papier crème (bg)
  '#f6efe1', // papier (surface)
  '#ece1cd', // papier (surface-2)
  '#241f18', // encre chaude (text)
  '#1a2e1a', // vert forêt résiduel
]

/** PlaceThumb porte des rampes de dégradé volontaires : elles ne sont pas des tokens. */
const EXEMPT = ['components/place/PlaceThumb.tsx']

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p)
  }
  return out
}

describe('palette monochrome', () => {
  it("ne laisse aucune couleur de l'ancienne palette dans les sources", () => {
    const files = [...walk('components'), ...walk('app')].filter(
      (f) => !EXEMPT.some((e) => f.endsWith(e))
    )
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8').toLowerCase()
      for (const hex of FORBIDDEN) if (src.includes(hex)) offenders.push(`${f} - ${hex}`)
    }
    expect(offenders).toEqual([])
  })

  it("définit :root sur les valeurs exactes de l'app native", () => {
    const css = readFileSync('app/globals.css', 'utf8')
    const root = css.slice(css.indexOf(':root {'), css.indexOf('html.native-app {')).toLowerCase()
    const expected: Record<string, string> = {
      '--accent': '#1a1a1a',
      '--accent-hover': '#000000',
      '--bg': '#ffffff',
      '--surface': '#f8f9fa',
      '--surface-2': '#e7e8e9',
      '--text': '#191c1d',
      '--text-2': '#444748',
      // diverge volontairement de l'app : #747878 échoue au contraste AA
      '--text-3': '#6b6f6f',
      '--text-4': '#b7bbbb',
      // sémantique : valeurs web conservées, celles de l'app échouent en AA
      '--open': '#1d7a4e',
      '--closed': '#b0432f',
      '--star': '#f5a623',
    }
    for (const [token, value] of Object.entries(expected)) {
      expect(root, `${token} doit valoir ${value}`).toContain(`${token}: ${value}`)
    }
  })
})
