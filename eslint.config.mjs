import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  // Build artifacts & native shells — never lint generated output
  { ignores: ['.next/**', 'out/**', 'ios/**', 'android/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'prettier'),
  {
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Les scripts en ligne de commande PARLENT : `console.log` y est la sortie
  // attendue, pas une trace de débogage oubliée. La règle reste entière pour
  // le code applicatif, où un log traîne jusqu'en production.
  {
    files: ['scripts/**/*.{mjs,js,ts}'],
    rules: { 'no-console': 'off' },
  },
]

export default config
