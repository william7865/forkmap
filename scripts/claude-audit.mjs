#!/usr/bin/env node
// scripts/claude-audit.mjs
// Generates a static audit report using ESLint, TypeScript, and npm audit.
// No API key required — runs entirely with local tools.

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ── Git context ──────────────────────────────────────────────────────────────

function git(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim() } catch { return '' }
}

function run(cmd) {
  try {
    return { output: execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), ok: true }
  } catch (e) {
    return { output: (e.stdout ?? '') + (e.stderr ?? ''), ok: false }
  }
}

const sha      = git('git rev-parse HEAD')
const shortSha = sha.slice(0, 7)
const author   = git('git log -1 --format="%an"')
const message  = git('git log -1 --format="%s"')
const dateStr  = git('git log -1 --format="%ci"')
const stat     = git('git diff HEAD~1 HEAD --stat')

// ── Run checks ───────────────────────────────────────────────────────────────

console.warn('Running lint…')
const lint = run('npm run lint 2>&1')

console.warn('Running type-check…')
const types = run('npm run type-check 2>&1')

console.warn('Running npm audit…')
const audit = run('npm audit --audit-level=info 2>&1')

// ── Parse summaries ──────────────────────────────────────────────────────────

function lintSummary(output) {
  const match = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/)
  if (!match) return output.includes('0 problems') ? '✅ No problems' : '✅ Clean'
  const [, , errors, warnings] = match
  const icon = errors === '0' ? '✅' : '❌'
  return `${icon} ${errors} error(s), ${warnings} warning(s)`
}

function typesSummary(output, ok) {
  if (ok) return '✅ No errors'
  const lines = output.split('\n').filter(l => l.includes('error TS'))
  return `❌ ${lines.length} error(s)`
}

function auditSummary(output, ok) {
  if (ok) return '✅ No vulnerabilities'
  const match = output.match(/(\d+) vulnerabilit/)
  return match ? `⚠️ ${match[1]} vulnerabilit(ies) found` : '⚠️ Issues found'
}

// ── Build report ─────────────────────────────────────────────────────────────

const now     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
const outDir  = join(process.cwd(), 'audits')
const outFile = join(outDir, `${now}-${shortSha}.md`)

const report = `---
sha: ${sha}
author: ${author}
date: ${dateStr}
message: "${message.replace(/"/g, "'")}"
---

# Audit — ${now.replace('T', ' ').replace(/-/g, (m, i) => i < 10 ? '-' : ':')} · \`${shortSha}\`

> **${message}** — ${author}

## Files changed

\`\`\`
${stat || '(no changes)'}
\`\`\`

## ESLint — ${lintSummary(lint.output)}

<details><summary>Full output</summary>

\`\`\`
${lint.output.slice(0, 4000) || '(none)'}
\`\`\`

</details>

## TypeScript — ${typesSummary(types.output, types.ok)}

<details><summary>Full output</summary>

\`\`\`
${types.output.slice(0, 4000) || '(none)'}
\`\`\`

</details>

## Security (npm audit) — ${auditSummary(audit.output, audit.ok)}

<details><summary>Full output</summary>

\`\`\`
${audit.output.slice(0, 4000) || '(none)'}
\`\`\`

</details>
`

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, report, 'utf8')
console.warn(`Audit written → ${outFile}`)
