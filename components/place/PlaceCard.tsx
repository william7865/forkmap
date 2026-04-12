// PlaceCard — Design exact brandbook "Carte Blanche"
// Carte verticale : photo/gradient · badges overlay · Fraunces name · footer distance+heart
"use client";
import { memo, useState, useCallback, useEffect } from "react";
import { getNote } from "@/components/place/NoteModal";
import type { PlaceCard as T } from "@/types";

interface Props {
  place: T; isSelected: boolean; isHovered: boolean; index: number;
  onHover:()=>void; onLeave:()=>void; onClick:()=>void; onToggleFavorite:()=>void; onShare?:()=>void;
}

// ── Icônes brandbook stroke 1.7 ──────────────────────────
const IcoStar = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcoShare = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IcoPin = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
// Fourchette brandbook (placeholder photo)
const IcoFork = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
    <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21"
      stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Gradient backgrounds per cuisine (brandbook inspiration) ─
function getCuisineGradient(cuisine?: string, isFav?: boolean): string {
  if (isFav) return "linear-gradient(135deg,var(--forest) 0%,var(--forest-mid) 60%,var(--forest-bright) 100%)";
  const c = (cuisine ?? "").toLowerCase();
  if (c.includes("japan") || c.includes("sushi") || c.includes("ramen"))
    return "linear-gradient(120deg,#0c2d3a 0%,#1a5468 50%,#2980a0 100%)";
  if (c.includes("ital") || c.includes("pizza") || c.includes("pasta"))
    return "linear-gradient(160deg,#2d1a0e 0%,#7c4422 100%)";
  if (c.includes("french") || c.includes("franç") || c.includes("bistro") || c.includes("bistrot"))
    return "linear-gradient(135deg,var(--forest) 0%,var(--forest-mid) 60%,var(--forest-bright) 100%)";
  if (c.includes("indian") || c.includes("indien"))
    return "linear-gradient(135deg,#3d1c02 0%,#a0521e 100%)";
  if (c.includes("chinese") || c.includes("chinois") || c.includes("asian") || c.includes("asiatique"))
    return "linear-gradient(135deg,#1a0a0a 0%,#7c1414 100%)";
  if (c.includes("burger") || c.includes("american") || c.includes("américain"))
    return "linear-gradient(135deg,#1a1200 0%,#7c5a00 100%)";
  if (c.includes("seafood") || c.includes("poisson") || c.includes("mer"))
    return "linear-gradient(120deg,#0a1f2d 0%,#1a4a6a 100%)";
  if (c.includes("mexican") || c.includes("mexicain"))
    return "linear-gradient(135deg,#1f0a00 0%,#7a3010 100%)";
  if (c.includes("greek") || c.includes("grec"))
    return "linear-gradient(135deg,#0a1a3d 0%,#1a4080 100%)";
  // Default — forest
  return "linear-gradient(135deg,#1a2e1a 0%,#2d4a2d 60%,#3d6e3d 100%)";
}

// ── Walk time ────────────────────────────────────────────
function formatWalkTime(metres?: number): string {
  if (metres == null) return "";
  const mins = Math.round(metres / 80);
  if (mins < 1) return "À côté";
  return `${mins} min à pied`;
}

// ── Price label ──────────────────────────────────────────
function priceLabel(price?: number): string {
  if (price == null) return "";
  return "€".repeat(price);
}

// ── Card height — fixed for virtual list ────────────────
// Photo area 148px + body ~68px + footer 46px = 262px
export const ITEM_HEIGHT = 262;

const PlaceCard = memo(function PlaceCard({
  place, isSelected, isHovered, index, onHover, onLeave, onClick, onToggleFavorite, onShare
}: Props) {
  const [pressing, setPressing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hasNote,  setHasNote]  = useState(false);
  useEffect(() => { setHasNote(!!getNote(place.osm_id)); }, [place.osm_id]);

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name;
  const rating  = place.fsq?.rating;
  const price   = place.fsq?.price;
  const isFav   = !!place.is_favorite;
  const photo   = !imgError ? place.fsq?.photos?.[0] : undefined;
  const photoUrl = photo
    ? `${photo.prefix}400x300${photo.suffix}`
    : undefined;

  const ratingAmber = rating != null && rating >= 9;
  const ratingColor = rating == null ? undefined
    : rating >= 8 ? "var(--rating-high)"
    : rating >= 6 ? "var(--rating-mid)"
    : "var(--rating-low)";

  const handleClick = useCallback(() => {
    setPressing(true);
    setTimeout(() => setPressing(false), 160);
    onClick();
  }, [onClick]);

  const handleFavClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  }, [onToggleFavorite]);

  // Card-level visual state
  const cardBorder = isSelected
    ? "1.5px solid var(--forest-mid)"
    : isHovered
    ? "1px solid var(--ink-20)"
    : "1px solid var(--ink-10)";

  const cardShadow = isSelected
    ? "var(--s-forest)"
    : isHovered
    ? "var(--s4)"
    : "var(--s1)";

  const cardTransform = pressing
    ? "scale(0.985)"
    : isHovered && !pressing
    ? "translateY(-3px)"
    : isSelected
    ? "translateY(-2px)"
    : "translateZ(0)";

  const gradient = getCuisineGradient(cuisine, isFav);


  return (
    <button
      type="button"
      className="anim-card-in"
      aria-label={`Voir ${place.name}`}
      style={{
        height: ITEM_HEIGHT,
        boxSizing: "border-box",
        margin: "0 12px 12px",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        background: "var(--white)",
        border: cardBorder,
        boxShadow: cardShadow,
        cursor: "pointer",
        transform: cardTransform,
        transition: "box-shadow 180ms ease, transform 180ms ease",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        textAlign: "left",
        fontFamily: "inherit",
        width: "100%",
      }}
      onMouseEnter={e => {
        onHover();
        if (!isSelected) {
          e.currentTarget.style.boxShadow = "var(--s3)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        onLeave();
        if (!isSelected) {
          e.currentTarget.style.boxShadow = "var(--s2)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
    >

      {/* ── PHOTO / GRADIENT (148px) ── */}
      <div style={{ height: 148, position: "relative", overflow: "hidden", flexShrink: 0 }}>

        {/* Background — photo or gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: gradient,
          transition: "transform 400ms ease",
          transform: isHovered ? "scale(1.04)" : "scale(1)",
        }}>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={place.name}
              onError={() => setImgError(true)}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          {/* Watermark fourchette (visible quand pas de photo) */}
          {!photoUrl && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0.18,
            }}>
              <IcoFork />
            </div>
          )}
        </div>

        {/* Gradient overlay bas */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(14,14,13,0.6) 0%, rgba(14,14,13,0.15) 45%, transparent 100%)",
        }}/>

        {/* ── BADGES overlay — top ── */}
        <div style={{
          position: "absolute", top: 10, left: 10, right: 10,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          {/* Rating pill */}
          {rating != null ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: ratingAmber ? "var(--amber)" : "white",
              borderRadius: "var(--r-pill)",
              padding: "3px 10px",
              fontSize: 12, fontWeight: 700,
              color: ratingAmber ? "white" : (ratingColor ?? "var(--ink)"),
              boxShadow: "var(--s1)",
              fontFamily: "var(--font-body)",
            }}>
              <IcoStar />
              <span>{rating.toFixed(1)}</span>
            </div>
          ) : (
            <div style={{ width: 4 }}/>
          )}

          {/* Open/closed badge */}
          {place.open_now !== undefined && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 10px",
              borderRadius: "var(--r-pill)",
              fontSize: 10, fontWeight: 600,
              background: "rgba(14,14,13,0.65)",
              backdropFilter: "blur(6px)",
              fontFamily: "var(--font-body)",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                background: place.open_now ? "var(--state-open)" : "var(--state-closed)",
                display: "block",
              }}/>
              <span style={{ color: place.open_now ? "var(--state-open)" : "var(--state-closed)" }}>
                {place.open_now ? "Ouvert" : "Fermé"}
              </span>
            </div>
          )}
        </div>

        {/* Visited badge — top-right */}
        {(place.visitCount ?? 0) > 0 && (
          <div aria-label="Visité" style={{
            position: "absolute", top: 8, right: 8,
            background: "var(--forest-pale)", color: "var(--forest-mid)",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            padding: "3px 7px", borderRadius: "var(--r-pill)",
            border: "1px solid var(--forest-mid)",
            fontFamily: "var(--font-body)",
          }}><span aria-hidden="true">✓</span> Visité</div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div style={{
            position: "absolute", inset: 0,
            border: "2px solid var(--forest-mid)",
            borderRadius: "var(--r-xl) var(--r-xl) 0 0",
            pointerEvents: "none",
          }}/>
        )}
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "14px 16px 0", flex: 1 }}>
        {/* Name — Fraunces display */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 17, fontWeight: 400,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.2, flex:1, minWidth:0,
          }}>
            {place.name}
          </div>
          {hasNote && (
            <span title="Note personnelle enregistrée" style={{
              flexShrink:0, width:7, height:7, borderRadius:"50%",
              background:"var(--forest-mid)",
              border:"1.5px solid white",
              boxShadow:"0 1px 3px rgba(45,122,85,0.35)",
            }}/>
          )}
        </div>

        {/* Meta row: CUISINE · €€€ */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {cuisine && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: "var(--forest-mid)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 130,
            }}>
              {cuisine.charAt(0).toUpperCase() + (cuisine.slice(1).toLowerCase() ?? "")}
            </span>
          )}
          {cuisine && price != null && (
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-20)", flexShrink: 0 }}/>
          )}
          {price != null && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-40)", flexShrink: 0 }}>
              {priceLabel(price)}
            </span>
          )}
        </div>
      </div>

      {/* ── FOOTER — distance + heart ── */}
      <div style={{
        padding: "10px 16px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "1px solid var(--ink-10)",
        marginTop: 12,
        flexShrink: 0,
      }}>
        {/* Distance */}
        <span style={{
          fontSize: 11, color: "var(--ink-40)",
          display: "flex", alignItems: "center", gap: 4,
          fontFamily: "var(--font-body)",
        }}>
          <IcoPin />
          {place.distance != null ? (
            <span>{formatWalkTime(place.distance)}</span>
          ) : "—"}
        </span>

        {/* Share button — apparaît au survol */}
        {onShare && isHovered && (
          <button
            onClick={e => { e.stopPropagation(); onShare(); }}
            aria-label="Partager"
            title="Partager ce restaurant"
            style={{
              display:"flex", alignItems:"center", gap:4,
              padding:"5px 9px", borderRadius:"var(--r-sm)",
              border:"1px solid var(--ink-10)",
              background:"var(--off-white)", color:"var(--ink-40)",
              cursor:"pointer", fontSize:10, fontWeight:600,
              fontFamily:"var(--font-body)",
              transition:"all 120ms ease",
              animation:"fadeIn 120ms ease both",
              minWidth: 44, minHeight: 44,
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background="var(--sky-pale)"; e.currentTarget.style.borderColor="rgba(36,89,168,0.3)"; e.currentTarget.style.color="var(--sky)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.color="var(--ink-40)"; }}
          >
            <IcoShare />
            Partager
          </button>
        )}

        {/* Heart button — brandbook .rch style */}
        <button
          onClick={handleFavClick}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          style={{
            width: 30, height: 30,
            minWidth: 44, minHeight: 44,
            borderRadius: "var(--r-sm)",
            border: `1px solid ${isFav ? "rgba(45,122,85,0.30)" : "var(--ink-10)"}`,
            background: isFav ? "var(--forest-pale)" : "var(--off-white)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            fontSize: 13,
            color: isFav ? "var(--forest-mid)" : "var(--ink-40)",
            transition: "all 140ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--forest-pale)";
            e.currentTarget.style.borderColor = "rgba(45,122,85,0.30)";
            e.currentTarget.style.color = "var(--forest-mid)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isFav ? "var(--forest-pale)" : "var(--off-white)";
            e.currentTarget.style.borderColor = isFav ? "rgba(45,122,85,0.30)" : "var(--ink-10)";
            e.currentTarget.style.color = isFav ? "var(--forest-mid)" : "var(--ink-40)";
          }}
        >
          <span aria-hidden="true">{isFav ? "♥" : "♡"}</span>
        </button>
      </div>
    </button>
  );
});

// @keyframes fadeIn needed for share btn — defined in globals.css

export default PlaceCard;
