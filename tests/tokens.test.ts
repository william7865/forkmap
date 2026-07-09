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

/** Formes non-hex de l'ancienne palette : le decimal rgba echappe a une liste de hex. */
const FORBIDDEN_PATTERNS = [
  'rgba(36, 31, 24', // #241f18 en decimal — encre chaude
  'rgba(36,31,24',
  'rgba(61, 44, 24', // teinte brune des bordures/ombres
  'rgba(61,44,24',
  '#ffd9b8', // peche terracotta clair
  '#c47c52', // bruns de l'ancienne palette de graphique
  '#7a3a1a',
  '#8a7253',
  '#6b5d4a',
  '#d4a07a',
  '#e9a06a',
  '#e3d8c4',
  '#cdbfa8',
  '#3f372c',
  'rgba(187, 94, 46', // #bb5e2e terracotta, forme decimale
  'rgba(187,94,46',
  'rgba(196, 124, 43', // terracotta clair, forme decimale
  'rgba(196,124,43',
  'rgba(255, 253, 248', // #fffdf8 blanc creme, forme decimale
  'rgba(255,253,248',
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

/** Isole le bloc :root de globals.css, en excluant html.native-app qui a sa propre palette légitime. */
function extractRootBlock(css: string): string {
  return css.slice(css.indexOf(':root {'), css.indexOf('html.native-app {')).toLowerCase()
}

describe('palette monochrome', () => {
  it("ne laisse aucune couleur de l'ancienne palette dans les sources", () => {
    const files = [...walk('components'), ...walk('app')].filter(
      (f) => !EXEMPT.some((e) => f.endsWith(e))
    )
    const offenders: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8').toLowerCase()
      for (const value of [...FORBIDDEN, ...FORBIDDEN_PATTERNS])
        if (src.includes(value.toLowerCase())) offenders.push(`${f} - ${value}`)
    }
    expect(offenders).toEqual([])
  })

  it("définit :root sur les valeurs exactes de l'app native", () => {
    const css = readFileSync('app/globals.css', 'utf8')
    const root = extractRootBlock(css)
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
      // diverge volontairement de l'app : #b7bbbb échoue meme au seuil UI (3:1)
      '--text-4': '#8a8e8e',
      // sémantique : valeurs web conservées, celles de l'app échouent en AA
      '--open': '#1d7a4e',
      '--closed': '#b0432f',
      '--star': '#f5a623',
    }
    for (const [token, value] of Object.entries(expected)) {
      expect(root, `${token} doit valoir ${value}`).toContain(`${token}: ${value}`)
    }
  })

  it("ne laisse aucune couleur de l'ancienne palette dans le bloc :root de globals.css", () => {
    const css = readFileSync('app/globals.css', 'utf8')
    const root = extractRootBlock(css)
    const forbiddenValues = [...FORBIDDEN, ...FORBIDDEN_PATTERNS]
    const offenders = [...new Set(forbiddenValues)].filter((value) =>
      root.includes(value.toLowerCase())
    )
    expect(
      offenders,
      `valeurs de l'ancienne palette trouvées dans :root : ${offenders.join(', ')}`
    ).toEqual([])
  })
})
