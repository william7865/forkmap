// ============================================================
// lib/hooks/useMediaQuery.ts
// SSR-safe media query hook.
// Returns false on server (no window) — avoids hydration mismatch.
// ============================================================
"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Convenience: true when screen is mobile (< 768px) */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

/** Convenience: true when screen is tablet (768px–1023px) */
export function useIsTablet() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}
