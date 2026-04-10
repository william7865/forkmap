// ── Forkmap i18n — hook + context ───────────────────────────
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { t, Lang, LANGUAGES, TranslationKey } from "./translations";

const STORAGE_KEY = "forkmap_lang_v1";

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: TranslationKey) => string;
  languages: typeof LANGUAGES;
}

const Ctx = createContext<LangContext>({
  lang: "fr",
  setLang: () => {},
  tr: (k) => k,
  languages: LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && LANGUAGES.find(l => l.code === stored)) setLangState(stored);
      else {
        // Auto-detect from browser
        const browser = navigator.language.split("-")[0] as Lang;
        if (LANGUAGES.find(l => l.code === browser)) setLangState(browser);
      }
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const tr = useCallback((key: TranslationKey): string => {
    return t[lang]?.[key] ?? t["en"]?.[key] ?? key;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, tr, languages: LANGUAGES }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}
