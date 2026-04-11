"use client";
import { useEffect, useRef, useState } from "react";
import ShareModal from "@/components/place/ShareModal";
import VisitModal from "@/components/place/VisitModal";
import NoteModal, { getNote } from "@/components/place/NoteModal";
import HeartButton from "@/components/ui/HeartButton";
import type { PlaceCard, FoursquarePhoto } from "@/types";

type TransportMode = "foot" | "bike" | "car";
interface RouteResult { duration:number; distance:number; coords:[number,number][]; }

interface Props {
  place: PlaceCard;
  onClose: () => void;
  onToggleFavorite: (p: PlaceCard) => void;
  onSelectPlace?: (p: PlaceCard) => void;
  nearbyPlaces?: PlaceCard[];
  routeResult?: RouteResult | null;
  routeLoading?: boolean;
  routeMode?: TransportMode;
  hasUserLocation?: boolean;
  onTransportChange?: (mode: TransportMode) => void;
  onCuisineFilter?: (cuisine: string) => void;
}

// ── SVG Icons ─────────────────────────────────────────────
const IcoWalk = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1.5"/><path d="M9.8 8.9 7 11l2 5M14 8l2 4-2 2M9 20l2-7"/></svg>;
const IcoBike = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-1.5 9M15 6l3 5.5M8.5 14h8"/></svg>;
const IcoCar  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M14 17H10M5 9l2-4h10l2 4"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>;
const IcoPen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IcoShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IcoVisit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IcoX    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IcoMap  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoPhone = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.36 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcoGlobe = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IcoClock = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoArrow = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoRoute = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>;
const IcoStar = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoChevLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>;
const IcoChevRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;

const MODES: { id:TransportMode; icon:React.ReactNode; label:string; gmaps:string }[] = [
  { id:"foot",  icon:<IcoWalk />, label:"Walk",  gmaps:"walking"   },
  { id:"bike",  icon:<IcoBike />, label:"Bike",  gmaps:"bicycling" },
  { id:"car",   icon:<IcoCar />,  label:"Drive", gmaps:"driving"   },
];

function fmt(secs:number) {
  const m = Math.round(secs/60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m/60)}h ${m%60 ? `${m%60}m` : ""}`.trim();
}
function fmtDist(m:number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`;
}

// ── Photo gallery ──────────────────────────────────────────
function buildPhotoUrl(photo: FoursquarePhoto, width = 600): string {
  return `${photo.prefix}${width}x${Math.round(width * (photo.height / photo.width))}${photo.suffix}`;
}

function PhotoGallery({ photos }: { photos: FoursquarePhoto[] }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Reset when photos change (new place selected)
  useEffect(() => { setActivePhoto(0); if (galleryRef.current) galleryRef.current.scrollLeft = 0; }, [photos]);

  if (!photos.length) return null;

  const handleGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
    setActivePhoto(idx);
  };

  const urls = photos.map(p => buildPhotoUrl(p, 600));

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Horizontal scrollable strip */}
      <div
        ref={galleryRef}
        onScroll={handleGalleryScroll}
        style={{
          display: "flex", overflowX: "auto", scrollSnapType: "x mandatory",
          scrollbarWidth: "none", gap: 0,
        }}
      >
        {urls.map((url, i) => (
          <div key={i} style={{
            flexShrink: 0, width: "100%", height: 200,
            scrollSnapAlign: "start", position: "relative",
          }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{
          position: "absolute", bottom: 6, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 4,
        }}>
          {photos.slice(0, 5).map((_, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === activePhoto ? "white" : "rgba(255,255,255,0.45)",
              transition: "background 150ms",
            }} />
          ))}
          {photos.length > 5 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", alignSelf: "center" }}>
              +{photos.length - 5}
            </span>
          )}
        </div>
      )}
      {/* Attribution */}
      <div style={{ position: "absolute", bottom: 4, right: 8, fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
        📷 Foursquare
      </div>
    </div>
  );
}

// Animated rating bar
function RatingBar({ rating }:{ rating:number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW((rating/10)*100), 80); return () => clearTimeout(t); }, [rating]);
  const color = rating>=8?"#1b7f4f":rating>=6?"var(--forest-mid)":"#c53030";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(28,25,23,0.07)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${w}%`, background:color, borderRadius:3, transition:"width 0.7s cubic-bezier(0.16,1,0.3,1)" }}/>
      </div>
      <span style={{ fontSize:16, fontWeight:800, color, fontVariantNumeric:"tabular-nums", minWidth:34, textAlign:"right", letterSpacing:"-0.03em" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function Label({ children }:{ children?: React.ReactNode }) {
  return (
    <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ink-60)", marginBottom:8 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height:1, background:"rgba(28,25,23,0.06)", margin:"0 -16px" }}/>;
}

export default function PlaceDetail({
  place, onClose, onToggleFavorite, onSelectPlace, nearbyPlaces = [],
  routeResult, routeLoading, routeMode="foot",
  hasUserLocation, onTransportChange, onCuisineFilter,
}: Props) {
  interface VisitRow {
    id: string; visited_at: string; amount_spent?: number;
    people_count: number; personal_rating?: number; mood?: string; note?: string;
  }

  const MOOD_EMOJI: Record<string, string> = {
    solo: "🧍", couple: "👫", friends: "👯", family: "👨‍👩‍👧", work: "💼",
  };

  const [transportMode, setTransportMode] = useState<"walk" | "bike" | "drive">("walk");
  const [showShare, setShowShare] = useState(false);
  const [showNote,  setShowNote]  = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null);
  const [note,      setNote]      = useState(() => typeof window !== "undefined" ? getNote(place.osm_id) : "");
  // Update note when place changes
  useEffect(() => { setNote(getNote(place.osm_id)); }, [place.osm_id]);

  const fetchVisits = async () => {
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/hooks/useAuth");
      const sb = getSupabaseBrowserClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/visits?osm_id=${encodeURIComponent(place.osm_id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rows: VisitRow[] = data.data ?? [];
        setVisits(rows);
        setVisitCount(rows.length);
      }
    } catch {}
  };

  // Fetch visits for this place
  useEffect(() => { fetchVisits(); }, [place.osm_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cuisine = place.cuisine ?? place.fsq?.categories?.[0]?.name;
  const currentMode = MODES.find(m => m.id === routeMode) ?? MODES[0];
  const photos = place.fsq?.photos ?? [];

  return (
    <div
      style={{
        width:"100%", height:"100%",
        background:"var(--white)",
        borderRadius:"var(--r-xl)",
        boxShadow:"0 24px 64px rgba(14,14,13,0.16), 0 4px 16px rgba(14,14,13,0.08), 0 0 0 1px rgba(14,14,13,0.07)",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}
    >
      {/* ── Gradient accent top bar ── */}
      <div style={{ height:3, background:"linear-gradient(90deg,var(--forest-mid) 0%,#c47c2b 100%)", flexShrink:0 }}/>

      {/* ── Photo gallery (Foursquare) ── */}
      {photos.length > 0 && <PhotoGallery photos={photos} />}

      {/* ── HEADER ─────────────────────────────────── */}
      <div style={{ padding:"16px 16px 14px", flexShrink:0 }}>

        {/* Top row: name + actions */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {/* Name — Fraunces display brandbook */}
            <h2 style={{ margin:"0 0 4px", fontFamily:"var(--font-display)", fontSize:22, fontWeight:400, letterSpacing:"-0.03em", lineHeight:1.15, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {place.name}
            </h2>
            {cuisine && (
              onCuisineFilter ? (
                <button
                  onClick={() => onCuisineFilter(cuisine)}
                  style={{
                    cursor: "pointer", background: "none",
                    border: "1px solid var(--ink-10)",
                    borderRadius: "var(--r-pill)", padding: "3px 8px",
                    fontSize: 11, color: "var(--ink-60)",
                    fontFamily: "var(--font-body)",
                  }}
                >{cuisine}</button>
              ) : (
                <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--forest-mid)" }}>
                  {cuisine}
                </span>
              )
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            {/* Note perso */}
            <button
              onClick={() => setShowNote(true)}
              aria-label="Note personnelle"
              title={note ? "Modifier ma note" : "Ajouter une note"}
              style={{
                width:34, height:34, borderRadius:"var(--r-sm)",
                border:`1px solid ${note ? "rgba(45,122,85,0.35)" : "var(--ink-10)"}`,
                background: note ? "var(--forest-pale)" : "var(--off-white)",
                color: note ? "var(--forest-mid)" : "var(--ink-60)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 150ms ease", position:"relative",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="var(--forest-pale)"; e.currentTarget.style.borderColor="rgba(45,122,85,0.3)"; e.currentTarget.style.color="var(--forest-mid)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=note?"var(--forest-pale)":"var(--off-white)"; e.currentTarget.style.borderColor=note?"rgba(45,122,85,0.35)":"var(--ink-10)"; e.currentTarget.style.color=note?"var(--forest-mid)":"var(--ink-60)"; }}
            >
              <IcoPen />
              {note && <span style={{ position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"var(--forest-mid)",border:"1.5px solid white" }}/>}
            </button>

            {/* Logger visite */}
            <button
              onClick={() => { setSelectedVisit(null); setShowVisit(true); }}
              aria-label="Logger une visite"
              title="Logger une visite"
              style={{
                width:34, height:34, borderRadius:"var(--r-sm)",
                border:`1px solid ${visitCount ? "rgba(196,124,43,0.35)" : "var(--ink-10)"}`,
                background: visitCount ? "var(--amber-pale)" : "var(--off-white)",
                color: visitCount ? "var(--amber)" : "var(--ink-60)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 150ms ease", position:"relative",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="var(--amber-pale)"; e.currentTarget.style.borderColor="rgba(196,124,43,0.4)"; e.currentTarget.style.color="var(--amber)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=visitCount?"var(--amber-pale)":"var(--off-white)"; e.currentTarget.style.borderColor=visitCount?"rgba(196,124,43,0.35)":"var(--ink-10)"; e.currentTarget.style.color=visitCount?"var(--amber)":"var(--ink-60)"; }}
            >
              <IcoVisit />
              {visitCount != null && visitCount > 0 && (
                <span style={{ position:"absolute",top:-5,right:-5,minWidth:16,height:16,borderRadius:"50%",background:"var(--amber)",border:"2px solid white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white",padding:"0 2px" }}>
                  {visitCount > 9 ? "9+" : visitCount}
                </span>
              )}
            </button>

            {/* Partager */}
            <button
              onClick={() => setShowShare(true)}
              aria-label="Partager ce restaurant"
              title="Partager"
              style={{
                width:34, height:34, borderRadius:"var(--r-sm)",
                border:"1px solid var(--ink-10)",
                background:"var(--off-white)", color:"var(--ink-60)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 150ms ease",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="var(--sky-pale)"; e.currentTarget.style.borderColor="rgba(36,89,168,0.3)"; e.currentTarget.style.color="var(--sky)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.color="var(--ink-60)"; }}
            >
              <IcoShare />
            </button>
            {/* Favourite — brandbook .rch style */}
            <div style={{
              width:34, height:34, borderRadius:"var(--r-sm)",
              border:`1px solid ${place.is_favorite ? "rgba(45,122,85,0.30)" : "var(--ink-10)"}`,
              background: place.is_favorite ? "var(--forest-pale)" : "var(--off-white)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 140ms ease",
            }}>
              <HeartButton isFavorite={!!place.is_favorite} size={16} onClick={() => onToggleFavorite(place)} />
            </div>
            {/* Close */}
            <button onClick={onClose} aria-label="Close" style={{ width:34,height:34,borderRadius:"var(--r-sm)",border:"1px solid var(--ink-10)",background:"var(--off-white)",color:"var(--ink-60)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 150ms ease" }}>
              <IcoX />
            </button>
          </div>
        </div>

        {/* Status row — badges brandbook exact */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {place.open_now !== undefined && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:5,
              padding:"4px 11px", borderRadius:"var(--r-pill)",
              fontSize:11, fontWeight:600, letterSpacing:"0.02em",
              background: place.open_now ? "#dcfce7" : "var(--coral-pale)",
              color: place.open_now ? "#16a34a" : "var(--coral)",
              border: `1px solid ${place.open_now ? "#bbf7d0" : "#fecaca"}`,
            }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",flexShrink:0 }}/>
              {place.open_now ? "Ouvert" : "Fermé"}
            </span>
          )}
          {place.fsq?.price != null && (
            <span style={{
              display:"inline-flex", alignItems:"center",
              padding:"4px 11px", borderRadius:"var(--r-pill)",
              fontSize:11, fontWeight:600, letterSpacing:"0.02em",
              background:"var(--cream)", color:"var(--ink-60)",
              border:"1px solid var(--bone)",
            }}>
              {"€".repeat(place.fsq.price)}
            </span>
          )}
          {place.distance != null && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"4px 11px", borderRadius:"var(--r-pill)",
              fontSize:11, fontWeight:600, letterSpacing:"0.02em",
              background:"var(--cream)", color:"var(--ink-60)",
              border:"1px solid var(--bone)",
            }}>
              <IcoMap />
              {fmtDist(place.distance)}
            </span>
          )}
          {place.fsq?.rating != null && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"4px 11px", borderRadius:"var(--r-pill)",
              fontSize:11, fontWeight:600, letterSpacing:"0.02em",
              background: place.fsq.rating >= 9 ? "var(--amber-pale)" : "var(--cream)",
              color: place.fsq.rating >= 9 ? "var(--amber)" : "var(--ink-60)",
              border:`1px solid ${place.fsq.rating >= 9 ? "#fed7aa" : "var(--bone)"}`,
            }}>
              <IcoStar /> {place.fsq.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <Divider />

      {/* ── SCROLLABLE BODY ─────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 20px", display:"flex", flexDirection:"column", gap:18 }}>

        {/* Rating */}
        {place.fsq?.rating != null && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <Label>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <IcoStar /> Rating
                </span>
              </Label>
              {place.fsq.total_ratings && (
                <span style={{ fontSize:11, color:"var(--ink-60)", fontVariantNumeric:"tabular-nums" }}>
                  {place.fsq.total_ratings.toLocaleString()} reviews
                </span>
              )}
            </div>
            <RatingBar rating={place.fsq.rating} />
          </div>
        )}

        {/* Route section */}
        <div>
          <Label>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <IcoRoute />
              {hasUserLocation ? "Route from your start" : "Getting there"}
            </span>
          </Label>

          {!hasUserLocation ? (
            <div style={{ padding:"14px",borderRadius:12,background:"rgba(28,25,23,0.03)",border:"1px solid rgba(28,25,23,0.07)",fontSize:12,color:"var(--ink-60)",textAlign:"center",lineHeight:1.6 }}>
              Set a starting point to<br/>see real-time routes
            </div>
          ) : (
            <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid rgba(28,25,23,0.08)", background:"rgba(28,25,23,0.02)" }}>

              {/* Transport mode tabs */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", background:"rgba(28,25,23,0.03)" }}>
                {MODES.map(m => (
                  <button key={m.id} onClick={() => onTransportChange?.(m.id)} style={{
                    padding:"11px 4px 9px",
                    border:"none", cursor:"pointer",
                    background: routeMode===m.id ? "var(--white)" : "transparent",
                    borderBottom: `2px solid ${routeMode===m.id ? "var(--forest-mid)" : "transparent"}`,
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    color: routeMode===m.id ? "var(--forest-mid)" : "var(--ink-60)",
                    transition:"all 120ms ease",
                    fontFamily:"inherit",
                  }}>
                    {m.icon}
                    <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ padding:"14px 14px 12px" }}>
                {routeLoading ? (
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 0" }}>
                    <div style={{ width:14,height:14,border:"2px solid rgba(28,25,23,0.1)",borderTop:"2px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>
                    <span style={{ fontSize:12,color:"var(--ink-60)" }}>Calculating…</span>
                  </div>
                ) : routeResult ? (
                  <>
                    {/* Time + distance row */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--ink-40)",marginBottom:3 }}>Travel time</div>
                        <div style={{ fontSize:28,fontWeight:800,color:"var(--forest-mid)",letterSpacing:"-0.05em",lineHeight:1 }}>{fmt(routeResult.duration)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--ink-40)",marginBottom:3 }}>By road</div>
                        <div style={{ fontSize:16,fontWeight:700,color:"var(--ink-80)",letterSpacing:"-0.02em" }}>{fmtDist(routeResult.distance)}</div>
                      </div>
                    </div>

                    {/* Route on map indicator */}
                    <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--ink-60)",marginBottom:12,padding:"6px 10px",background:"rgba(28,25,23,0.03)",borderRadius:8,border:"1px solid rgba(28,25,23,0.06)" }}>
                      <IcoRoute />
                      Route traced on map
                    </div>

                    {/* Google Maps CTA */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=${currentMode.gmaps}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"11px 14px",borderRadius:10,background:"var(--forest-mid)",color:"white",textDecoration:"none",fontSize:12.5,fontWeight:700,letterSpacing:"-0.01em",boxShadow:"0 4px 16px rgba(29,74,53,0.25)",transition:"background 120ms ease" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--forest)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--forest-mid)")}
                    >
                      Open in Google Maps <IcoArrow />
                    </a>
                  </>
                ) : (
                  <p style={{ margin:0,padding:"8px 0",textAlign:"center",fontSize:12,color:"var(--ink-60)" }}>
                    Select a restaurant to calculate route
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Distinctions Michelin / Wikidata ── */}
        {(place.wikidata?.michelin_stars || place.wikidata?.distinctions?.length || place.osm_enriched?.michelin) && (
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
            {(place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin) && (
              <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:700,background:"var(--amber-pale)",color:"var(--amber)",border:"1px solid rgba(196,124,43,0.25)" }}>
                {"⭐".repeat(place.wikidata?.michelin_stars ?? place.osm_enriched?.michelin ?? 0)} Michelin
              </span>
            )}
            {place.wikidata?.distinctions?.filter(d => !d.includes("Michelin")).map(d => (
              <span key={d} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:700,background:"var(--amber-pale)",color:"var(--amber)",border:"1px solid rgba(196,124,43,0.25)" }}>
                {d}
              </span>
            ))}
          </div>
        )}

        {/* ── Description (Wikidata/Wikipedia > FSQ) ── */}
        {(place.wikidata?.description || place.fsq?.description) && (
          <div>
            <Label>À propos</Label>
            <p style={{ margin:0,fontSize:13,color:"var(--ink-80)",lineHeight:1.7,letterSpacing:"-0.01em" }}>
              {place.wikidata?.description ?? place.fsq?.description}
            </p>
            {place.wikidata?.wikipedia_url && (
              <a href={place.wikidata.wikipedia_url} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex",alignItems:"center",gap:4,marginTop:6,fontSize:11,color:"var(--ink-40)",textDecoration:"none",fontWeight:600 }}>
                <IcoGlobe /> Lire sur Wikipedia →
              </a>
            )}
          </div>
        )}

        {/* ── Horaires (OSM parsé > FSQ) ── */}
        {(place.osm_enriched?.today_hours || place.fsq?.hours?.display) && (
          <div>
            <Label><span style={{ display:"flex",alignItems:"center",gap:4 }}><IcoClock />Horaires</span></Label>
            <p style={{ margin:0,fontSize:13,color:"var(--ink-80)" }}>
              {place.osm_enriched?.today_hours
                ? <>Aujourd&apos;hui : <strong>{place.osm_enriched.today_hours}</strong></>
                : place.fsq?.hours?.display}
            </p>
          </div>
        )}

        {/* ── Features pills ── */}
        {(() => {
          const e = place.osm_enriched;
          if (!e) return null;
          const pills: { label: string; emoji: string; color: string; bg: string }[] = [];
          if (e.outdoor_seating)    pills.push({ label:"Terrasse",     emoji:"🌿", color:"var(--forest)",     bg:"var(--forest-pale)" });
          if (e.wifi)               pills.push({ label:"Wi-Fi",        emoji:"📶", color:"var(--sky)",        bg:"var(--sky-pale)" });
          if (e.takeaway)           pills.push({ label:"À emporter",   emoji:"🥡", color:"var(--ink-60)",     bg:"var(--cream)" });
          if (e.delivery)           pills.push({ label:"Livraison",    emoji:"🛵", color:"var(--ink-60)",     bg:"var(--cream)" });
          if (e.reservations)       pills.push({ label:"Réservation",  emoji:"📅", color:"var(--ink-60)",     bg:"var(--cream)" });
          if (e.dogs_allowed)       pills.push({ label:"Chiens OK",    emoji:"🐕", color:"var(--ink-60)",     bg:"var(--cream)" });
          if (e.live_music)         pills.push({ label:"Musique live", emoji:"🎵", color:"var(--amber)",      bg:"var(--amber-pale)" });
          if (e.organic)            pills.push({ label:"Bio",          emoji:"🌱", color:"var(--forest)",     bg:"var(--forest-pale)" });
          if (e.halal)              pills.push({ label:"Halal",        emoji:"☪️", color:"var(--forest)",     bg:"var(--forest-pale)" });
          if (e.kosher)             pills.push({ label:"Kasher",       emoji:"✡️", color:"var(--sky)",        bg:"var(--sky-pale)" });
          if (e.vegetarian_friendly) pills.push({ label:"Végétarien",  emoji:"🥗", color:"var(--forest)",     bg:"var(--forest-pale)" });
          if (e.wheelchair === "yes")    pills.push({ label:"Accessible PMR", emoji:"♿", color:"var(--sky)",  bg:"var(--sky-pale)" });
          if (e.wheelchair === "limited") pills.push({ label:"PMR partiel",   emoji:"♿", color:"var(--amber)", bg:"var(--amber-pale)" });
          if (e.air_conditioning)   pills.push({ label:"Climatisation", emoji:"❄️", color:"var(--sky)",       bg:"var(--sky-pale)" });
          if (!pills.length) return null;
          return (
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {pills.map(p => (
                <span key={p.label} style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,background:p.bg,color:p.color,border:"none" }}>
                  <span>{p.emoji}</span> {p.label}
                </span>
              ))}
              {e.capacity && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,background:"var(--cream)",color:"var(--ink-60)" }}>🪑 {e.capacity} couverts</span>}
            </div>
          );
        })()}

        {/* ── Modes de paiement ── */}
        {place.osm_enriched?.payment_methods && place.osm_enriched.payment_methods.length > 0 && (
          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:10,fontWeight:600,color:"var(--ink-40)",textTransform:"uppercase",letterSpacing:"0.08em" }}>Paiement :</span>
            {place.osm_enriched.payment_methods.map(m => (
              <span key={m} style={{ padding:"3px 8px",borderRadius:"var(--r-pill)",fontSize:10,fontWeight:600,background:"var(--off-white)",color:"var(--ink-60)",border:"1px solid var(--ink-10)",textTransform:"capitalize" }}>
                {m === "cash" ? "Espèces" : m === "card" ? "Carte" : m === "contactless" ? "Sans contact" : m}
              </span>
            ))}
          </div>
        )}

        {/* ── Adresse ── */}
        {place.address && (
          <div style={{ display:"flex",gap:10,alignItems:"flex-start",padding:"11px 13px",borderRadius:12,background:"rgba(28,25,23,0.03)",border:"1px solid rgba(28,25,23,0.07)" }}>
            <span style={{ flexShrink:0,marginTop:1,color:"var(--ink-60)" }}><IcoMap /></span>
            <div style={{ flex:1,minWidth:0 }}>
              <span style={{ fontSize:13,color:"var(--ink-80)",lineHeight:1.55 }}>{place.address}</span>
              {place.osm_enriched?.district && (
                <span style={{ display:"block",fontSize:10,color:"var(--ink-40)",fontWeight:600,marginTop:2 }}>{place.osm_enriched.district}</span>
              )}
            </div>
          </div>
        )}

        {/* ── CTA buttons ── */}
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {(place.osm_enriched?.booking_url) && (
            <a href={place.osm_enriched.booking_url} target="_blank" rel="noopener noreferrer"
              style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"11px 12px",borderRadius:10,background:"var(--amber)",color:"white",textDecoration:"none",fontSize:12,fontWeight:700,boxShadow:"0 4px 12px rgba(196,124,43,0.3)",letterSpacing:"-0.01em",whiteSpace:"nowrap" }}>
              📅 Réserver
            </a>
          )}
          {(place.fsq?.website ?? place.website) && (
            <a href={place.fsq?.website ?? place.website} target="_blank" rel="noopener noreferrer"
              style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"11px 12px",borderRadius:10,background:"var(--forest-mid)",color:"white",textDecoration:"none",fontSize:12.5,fontWeight:700,boxShadow:"0 4px 16px rgba(29,74,53,0.22)",letterSpacing:"-0.01em" }}
              onMouseEnter={e => (e.currentTarget.style.background="var(--forest)")}
              onMouseLeave={e => (e.currentTarget.style.background="var(--forest-mid)")}
            >
              <IcoGlobe /> Site web
            </a>
          )}
          {(place.fsq?.tel ?? place.phone) && (
            <a href={`tel:${place.fsq?.tel ?? place.phone}`}
              style={{ display:"flex",alignItems:"center",gap:5,padding:"11px 14px",borderRadius:10,background:"rgba(28,25,23,0.04)",border:"1.5px solid rgba(28,25,23,0.1)",color:"var(--ink-80)",textDecoration:"none",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}>
              <IcoPhone /> Appeler
            </a>
          )}
          {place.osm_enriched?.instagram && (
            <a href={`https://instagram.com/${place.osm_enriched.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex",alignItems:"center",gap:5,padding:"11px 14px",borderRadius:10,background:"rgba(28,25,23,0.04)",border:"1.5px solid rgba(28,25,23,0.1)",color:"var(--ink-80)",textDecoration:"none",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}>
              📷 Instagram
            </a>
          )}
        </div>

        {/* ── Note personnelle ── */}
        {note && (
          <button
            onClick={() => setShowNote(true)}
            style={{
              display:"flex", alignItems:"flex-start", gap:9,
              padding:"10px 12px",
              background:"var(--forest-pale)",
              border:"1px solid rgba(45,122,85,0.2)",
              borderLeft:"3px solid var(--forest-mid)",
              borderRadius:"var(--r-md)",
              cursor:"pointer", textAlign:"left", width:"100%",
              fontFamily:"var(--font-body)",
              transition:"all 120ms ease",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--forest-pale)"; e.currentTarget.style.borderLeftColor="var(--forest)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--forest-pale)"; e.currentTarget.style.borderLeftColor="var(--forest-mid)";}}
          >
            <IcoPen />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--forest-mid)" }}>Ma note</p>
              <p style={{ margin:0, fontSize:12, color:"var(--ink-80)", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{note}</p>
            </div>
          </button>
        )}

        {/* ── Mes visites ── */}
        {visits.length > 0 && (
          <div>
            <Label>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                <IcoVisit /> Mes visites ({visits.length})
              </span>
            </Label>
            <div style={{ display:"flex", flexDirection:"column", maxHeight: visits.length > 3 ? 130 : undefined, overflowY: visits.length > 3 ? "auto" : undefined }}>
              {visits.map(v => (
                <div key={v.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid var(--ink-10)" }}>
                  <span style={{ fontSize:12, color:"var(--ink-80)", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    📅 {new Date(v.visited_at).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" })}
                    {v.personal_rating != null && (
                      <span style={{ marginLeft:8, color:"#f59e0b" }}>{"★".repeat(v.personal_rating)}</span>
                    )}
                    {v.mood && MOOD_EMOJI[v.mood] && (
                      <span style={{ marginLeft:6 }}>{MOOD_EMOJI[v.mood]}</span>
                    )}
                    {v.amount_spent != null && (
                      <span style={{ marginLeft:6, color:"var(--ink-60)" }}>{v.amount_spent}€</span>
                    )}
                  </span>
                  <button
                    aria-label="Modifier cette visite"
                    onClick={() => { setSelectedVisit(v); setShowVisit(true); }}
                    style={{
                      width:26, height:26, borderRadius:"var(--r-sm)",
                      background:"var(--off-white)", border:"1px solid var(--ink-10)",
                      color:"var(--ink-60)", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, transition:"all 120ms ease",
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="var(--amber-pale)"; e.currentTarget.style.borderColor="rgba(196,124,43,0.35)"; e.currentTarget.style.color="var(--amber)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.borderColor="var(--ink-10)"; e.currentTarget.style.color="var(--ink-60)"; }}
                  >
                    <IcoPen />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Restaurants similaires ── */}
        {nearbyPlaces.length > 0 && (
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:10 }}>
              <span style={{ display:"block",width:10,height:1.5,background:"var(--forest-mid)" }}/>
              <span style={{ fontSize:9.5,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--forest-mid)" }}>
                À proximité
              </span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {nearbyPlaces.slice(0,3).map(p => {
                const c = p.cuisine ?? p.fsq?.categories?.[0]?.name;
                const r = p.fsq?.rating;
                const d = p.distance == null ? null : p.distance < 1000 ? `${Math.round(p.distance)} m` : `${(p.distance/1000).toFixed(1)} km`;
                return (
                  <button key={p.osm_id} onClick={() => onSelectPlace?.(p)} style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"9px 11px",
                    borderRadius:"var(--r-md)",
                    border:"1px solid var(--ink-10)",
                    background:"var(--off-white)",
                    cursor:"pointer", textAlign:"left",
                    transition:"all 150ms ease", fontFamily:"var(--font-body)",
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="var(--forest-pale)"; e.currentTarget.style.borderColor="rgba(45,122,85,0.25)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="var(--off-white)"; e.currentTarget.style.borderColor="var(--ink-10)"; }}
                  >
                    {/* Mini gradient thumb */}
                    <div style={{
                      width:32, height:32, borderRadius:8, flexShrink:0,
                      background: c ? `linear-gradient(135deg,#1a2e1a,#3d6e3d)` : "var(--cream)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:"0 0 2px",fontSize:12,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.02em" }}>{p.name}</p>
                      <p style={{ margin:0,fontSize:10,color:"var(--ink-60)",display:"flex",gap:6 }}>
                        {c && <span style={{ textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,color:"var(--forest-mid)" }}>{c}</span>}
                        {d && <span>{d}</span>}
                      </p>
                    </div>
                    {r != null && (
                      <span style={{ fontSize:11,fontWeight:700,color:"var(--ink-60)",flexShrink:0,fontVariantNumeric:"tabular-nums" }}>
                        {r.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <a href={`https://www.openstreetmap.org/${place.osm_type}/${place.osm_id.split("/")[1]}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display:"block",textAlign:"center",fontSize:10,color:"var(--ink-40)",textDecoration:"none",letterSpacing:"0.02em" }}>
          View on OpenStreetMap
        </a>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--white)", borderTop: "1px solid var(--ink-10)",
        padding: "12px 16px",
      }}>
        {/* Transport mode tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {(["walk", "bike", "drive"] as const).map(mode => (
            <button key={mode} onClick={() => setTransportMode(mode)} style={{
              flex: 1, padding: "6px 0",
              borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600,
              border: `1px solid ${transportMode === mode ? "var(--forest-mid)" : "var(--ink-10)"}`,
              background: transportMode === mode ? "var(--forest-pale)" : "transparent",
              color: transportMode === mode ? "var(--forest-mid)" : "var(--ink-60)",
              cursor: "pointer", fontFamily: "var(--font-body)",
            }}>
              {mode === "walk" ? "🚶 Marche" : mode === "bike" ? "🚲 Vélo" : "🚗 Voiture"}
            </button>
          ))}
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=${transportMode === "walk" ? "walking" : transportMode === "bike" ? "bicycling" : "driving"}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", width: "100%", padding: "12px",
            background: "var(--forest-mid)", color: "white",
            border: "none", borderRadius: "var(--r-md)",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-body)", boxShadow: "var(--s-forest)",
            textAlign: "center", textDecoration: "none",
          }}
        >
          Itinéraire →
        </a>
      </div>

      {/* Note modal */}
      {showNote && <NoteModal place={place} onClose={() => setShowNote(false)} onSaved={n => setNote(n)} />}

      {/* Share modal */}
      {showShare && <ShareModal place={place} onClose={() => setShowShare(false)} />}

      {/* Visit modal */}
      {showVisit && (
        <VisitModal
          place={place}
          existingVisit={selectedVisit}
          onClose={() => { setShowVisit(false); setSelectedVisit(null); }}
          onSaved={() => { fetchVisits(); }}
        />
      )}

      <style>{`@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
    </div>
  );
}
