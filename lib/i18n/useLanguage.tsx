// ── Forkmap i18n — hook + context ───────────────────────────
'use client'
import React, { createContext, useContext, useCallback } from 'react'
import { t, Lang, LANGUAGES, TranslationKey } from './translations'

interface LangContext {
  lang: Lang
  setLang: (l: Lang) => void
  tr: (key: TranslationKey) => string
  languages: typeof LANGUAGES
}

const Ctx = createContext<LangContext>({
  lang: 'fr',
  setLang: () => {},
  tr: (k) => k,
  languages: LANGUAGES,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Forkmap is French-only: the language is locked to "fr". No browser
  // auto-detection and no persisted choice — every visitor sees French.
  const lang: Lang = 'fr'

  const setLang = useCallback((_l: Lang) => {
    // No-op: language switching is disabled (French-only site).
  }, [])

  const tr = useCallback((key: TranslationKey): string => {
    return t['fr']?.[key] ?? key
  }, [])

  return <Ctx.Provider value={{ lang, setLang, tr, languages: LANGUAGES }}>{children}</Ctx.Provider>
}

export function useLanguage() {
  return useContext(Ctx)
}
