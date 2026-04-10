#!/usr/bin/env node
// scripts/claude-audit.mjs
// Generates a structured audit file for the latest commit using Claude.
// Run via GitHub Actions after each push.

import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set — skipping audit.')
  process.exit(0)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Git context ──────────────────────────────────────────────────────────────

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const sha       = git('git rev-parse HEAD')
const shortSha  = sha.slice(0, 7)
const author    = git('git log -1 --format="%an"')
const message   = git('git log -1 --format="%s"')
const dateStr   = git('git log -1 --format="%ci"')
const stat      = git('git diff HEAD~1 HEAD --stat')
const diff      = git('git diff HEAD~1 HEAD -- "*.ts" "*.tsx" "*.js"')

if (!diff && !stat) {
  console.log('No code changes detected — skipping audit.')
  process.exit(0)
}

// ── Claude analysis ──────────────────────────────────────────────────────────

const prompt = `You are a senior code reviewer. Analyze this Git commit and produce a concise audit report in Markdown.

## Commit metadata
- SHA: ${shortSha}
- Author: ${author}
- Message: ${message}
- Date: ${dateStr}

## Files changed (stat)
\`\`\`
${stat || '(no stat)'}
\`\`\`

## Diff (TypeScript / JavaScript only)
\`\`\`diff
${diff.slice(0, 12000) || '(no diff)'}
\`\`\`

Produce a Markdown audit with these sections (omit sections with nothing to report):

### Summary
One sentence describing what this commit does.

### Bugs / Risks
List concrete bugs or regressions introduced. If none, write "None detected."

### Security
List any security issues (injections, exposed secrets, missing auth). If none, write "None detected."

### Code Quality
List specific improvements (naming, complexity, duplication). Be precise (file:line when possible).

### Missing Tests
List functions or branches added with no corresponding tests.

### Score
Rate this commit X/10 with a one-line justification.

Be direct and specific. Skip generic advice.`

console.log('Calling Claude API…')

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1500,
  messages: [{ role: 'user', content: prompt }],
})

const analysis = response.content[0].type === 'text' ? response.content[0].text : ''

// ── Write audit file ─────────────────────────────────────────────────────────

const now     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
const outDir  = join(process.cwd(), 'audits')
const outFile = join(outDir, `${now}-${shortSha}.md`)

const content = `---
sha: ${sha}
author: ${author}
date: ${dateStr}
message: "${message.replace(/"/g, "'")}"
---

# Audit — ${now.replace('T', ' ').replace(/-/g, ':')} · \`${shortSha}\`

> **${message}** — ${author}

${analysis}
`

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, content, 'utf8')

console.log(`Audit written → ${outFile}`)
