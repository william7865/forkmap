// ── SuggestionsPanel — personnalisé basé sur favoris + goûts ─
"use client";
import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { getNotes } from "@/components/place/NoteModal";
import type { PlaceCard, FavoriteRow } from "@/types";

interface Props {
  places: PlaceCard[];
  favoriteIds: Set<string>;
  favoritesData?: FavoriteRow[];
  onSelect: (p: PlaceCard) => void;
  onToggleFavorite: (p: PlaceCard) => void;
}

const IcoStar   = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoHeart  = ({ f }: { f?: boolean }) => <svg width="13" height="13" viewBox="0 0 24 24" fill={f?"var(--forest-mid)":"none"} stroke={f?"var(--forest-mid)":"currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoMap    = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoSparkle = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
const IcoX      = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;

const CUISINE_GRADIENTS: Record<string,string> = {
  japonais:"linear-gradient(135deg,#0c2d3a,#1a6a9a)",sushi:"linear-gradient(135deg,#0c2d3a,#1a6a9a)",
  italien:"linear-gradient(135deg,#2d0e0e,#7c2222)",pizza:"linear-gradient(135deg,#2d0e0e,#7c2222)",
  français:"linear-gradient(135deg,#0e1e14,#2d6e3d)",french:"linear-gradient(135deg,#0e1e14,#2d6e3d)",
  burger:"linear-gradient(135deg,#1a0e00,#7c4800)",chinois:"linear-gradient(135deg,#1a0505,#7a1515)",
  indian:"linear-gradient(135deg,#1a0800,#b34d00)",mexicain:"linear-gradient(135deg,#0a1a06,#3a7a0a)",
};

function getGradient(cuisine?: string) {
  if (!cuisine) return "linear-gradient(135deg,#1a2e1a,#3d6e3d)";
  const k = cuisine.toLowerCase();
  return Object.entries(CUISINE_GRADIENTS).find(([c]) => k.includes(c))?.[1] ?? "linear-gradient(135deg,#1a2e1a,#3d6e3d)";
}

function fmtDist(m: number) { return m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`; }

export default function SuggestionsPanel({ places, favoriteIds, favoritesData = [], onSelect, onToggleFavorite }: Props) {
  const { tr } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string|null>(null);

  // Compute preferred cuisines from favorites
  const preferred = useMemo(() => {
    const counts: Record<string, number> = {};
    favoritesData.forEach(f => {
      const c = f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name;
      if (c) counts[c.toLowerCase()] = (counts[c.toLowerCase()] ?? 0) + 1;
    });
    // Also count from favoriteIds in current places
    places.filter(p => favoriteIds.has(p.osm_id)).forEach(p => {
      if (p.cuisine) counts[p.cuisine.toLowerCase()] = (counts[p.cuisine.toLowerCase()] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([c]) => c);
  }, [favoritesData, places, favoriteIds]);

  // Score places: prefer matching cuisines, high rating, not already favorite
  const suggestions = useMemo(() => {
    if (places.length === 0) return [];
    return places
      .filter(p => !favoriteIds.has(p.osm_id))
      .map(p => {
        const cuisine = p.cuisine?.toLowerCase() ?? "";
        const cuisineScore = preferred.findIndex(c => cuisine.includes(c));
        const matchScore   = cuisineScore >= 0 ? (3 - Math.min(cuisineScore, 2)) * 30 : 0;
        const ratingScore  = (p.fsq_rating ?? 0) * 5;
        const distPenalty  = p.distance ? Math.min(p.distance / 200, 15) : 0;
        return { place: p, score: matchScore + ratingScore - distPenalty };
      })
      .sort((a,b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.place);
  }, [places, favoriteIds, preferred]);

  if (dismissed || suggestions.length === 0) return null;

  const topCuisine = preferred[0];

  return (
    <div style={{
      background: "var(--white)",
      borderTop: "1px solid var(--ink-10)",
      animation: "slideUp 280ms var(--ease-out) both",
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ color: "var(--amber)", display: "flex", alignItems: "center" }}><IcoSparkle /></span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-60)" }}>
            {tr("suggestions_title")}
          </span>
          {topCuisine && (
            <span style={{ fontSize: 9.5, color: "var(--ink-40)", marginLeft: 6 }}>
              · {tr("based_on_favorites")}
            </span>
          )}
        </div>
        <button onClick={() => setDismissed(true)} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--ink-10)", background: "var(--off-white)", color: "var(--ink-40)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IcoX />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div style={{ display: "flex", gap: 10, padding: "0 14px 14px", overflowX: "auto", scrollbarWidth: "none" }}>
        {suggestions.map(p => {
          const isFav = favoriteIds.has(p.osm_id);
          const hovered = hoveredId === p.osm_id;
          const grad = getGradient(p.cuisine);
          return (
            <div key={p.osm_id}
              onMouseEnter={() => setHoveredId(p.osm_id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                flexShrink: 0, width: 148,
                background: "var(--white)",
                border: `1px solid ${hovered ? "var(--ink-20)" : "var(--ink-10)"}`,
                borderRadius: "var(--r-xl)", overflow: "hidden",
                boxShadow: hovered ? "var(--s3)" : "var(--s1)",
                transform: hovered ? "translateY(-2px)" : "none",
                transition: "all 180ms var(--ease-out)",
                cursor: "pointer",
              }}
            >
              {/* Thumb */}
              <div onClick={() => onSelect(p)} style={{ height: 72, background: grad, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.2">
                  <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {p.fsq_rating != null && (
                  <span style={{ position: "absolute", bottom: 6, right: 6, display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 6px", borderRadius: 999, fontSize: 9, fontWeight: 700, background: "rgba(255,255,255,0.18)", color: "white", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <IcoStar /> {p.fsq_rating.toFixed(1)}
                  </span>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: "9px 10px" }}>
                <p onClick={() => onSelect(p)} style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </p>
                {p.cuisine && <p style={{ margin: "0 0 7px", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--forest-mid)" }}>{p.cuisine}</p>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {p.distance != null && <span style={{ fontSize: 10, color: "var(--ink-40)", display: "flex", alignItems: "center", gap: 3 }}><IcoMap /> {fmtDist(p.distance)}</span>}
                  <button onClick={e => { e.stopPropagation(); onToggleFavorite(p); }} style={{ width: 24, height: 24, borderRadius: "var(--r-sm)", border: `1px solid ${isFav?"rgba(45,122,85,0.3)":"var(--ink-10)"}`, background: isFav ? "var(--forest-pale)" : "var(--off-white)", color: isFav ? "var(--forest-mid)" : "var(--ink-40)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 140ms", marginLeft: "auto", flexShrink: 0 }}>
                    <IcoHeart f={isFav} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
