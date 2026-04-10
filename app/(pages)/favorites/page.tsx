// ============================================================
// app/(pages)/favorites/page.tsx — Lieux sauvegardés
// Refonte complète : partage, notes, filtres cuisine, grid/list
// ============================================================
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FavoriteRow } from "@/types";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { getSupabaseBrowserClient } from "@/lib/hooks/useAuth";
import { PageHeader, GlobalFooter } from "@/components/ui/PageLayout";
import { getNotes, getNote, saveNote } from "@/components/place/NoteModal";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sb = getSupabaseBrowserClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) return {};
    return { "Authorization": `Bearer ${session.access_token}` };
  } catch { return {}; }
}

// ── Icons ─────────────────────────────────────────────────
const IcoHeart  = ({ filled }: { filled?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled?"var(--forest-mid)":"none"} stroke={filled?"var(--forest-mid)":"currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoMap    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoTrash  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IcoStar   = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoShare  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;
const IcoPen    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const IcoArrow  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoCheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCopy   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoWhatsApp = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>;
const IcoX      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IcoFilter = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IcoGrid   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const IcoList   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

// ── Types ─────────────────────────────────────────────────
type SortKey = "date_desc" | "date_asc" | "name" | "rating";
type ViewMode = "list" | "grid";

// ── Delete modal ──────────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onCancel}>
      <div style={{ position:"absolute",inset:0,background:"rgba(14,14,13,0.5)",backdropFilter:"blur(8px)" }}/>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative",background:"var(--white)",borderRadius:"var(--r-xl)",padding:"28px",maxWidth:360,width:"100%",boxShadow:"0 32px 80px rgba(14,14,13,0.22)",animation:"scaleIn 200ms var(--ease-spring) both",fontFamily:"var(--font-body)" }}>
        <div style={{ width:44,height:44,borderRadius:14,background:"var(--coral-pale)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:"var(--coral)" }}><IcoTrash /></div>
        <h3 style={{ margin:"0 0 8px",fontFamily:"var(--font-display)",fontSize:18,fontWeight:400,letterSpacing:"-0.03em" }}>Retirer des favoris ?</h3>
        <p style={{ margin:"0 0 22px",fontSize:13,color:"var(--ink-60)",lineHeight:1.6 }}>
          <strong style={{ color:"var(--ink-80)" }}>{name}</strong> sera retiré de vos lieux sauvegardés.
        </p>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"10px",borderRadius:"var(--r-md)",border:"1px solid var(--ink-10)",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--ink-80)",fontFamily:"inherit" }}>Garder</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"10px",borderRadius:"var(--r-md)",border:"none",background:"var(--coral)",cursor:"pointer",fontSize:13,fontWeight:600,color:"white",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(217,79,61,0.25)" }}>Retirer</button>
        </div>
      </div>
    </div>
  );
}

// ── Note inline modal ─────────────────────────────────────
function NoteDrawer({ fav, onClose, onSaved }: { fav: FavoriteRow; onClose: () => void; onSaved: (note: string) => void }) {
  const [value, setValue] = useState(() => getNote(fav.osm_id));
  const [saved, setSaved] = useState(false);
  const MAX = 280;

  const handleSave = () => {
    saveNote(fav.osm_id, value);
    setSaved(true);
    onSaved(value.trim());
    setTimeout(onClose, 700);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0 0" }} onClick={onClose}>
      <div style={{ position:"absolute",inset:0,background:"rgba(14,14,13,0.45)",backdropFilter:"blur(6px)" }}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",background:"var(--white)",
        borderRadius:"20px 20px 0 0",
        width:"100%",maxWidth:520,
        padding:"20px 20px 32px",
        boxShadow:"0 -16px 48px rgba(14,14,13,0.18)",
        animation:"slideUp 240ms var(--ease-out) both",
        fontFamily:"var(--font-body)",
      }}>
        {/* Handle */}
        <div style={{ width:36,height:4,borderRadius:2,background:"var(--bone)",margin:"0 auto 16px" }}/>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"var(--forest-pale)",border:"1px solid rgba(45,122,85,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--forest-mid)",flexShrink:0 }}><IcoPen /></div>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ margin:"0 0 1px",fontFamily:"var(--font-display)",fontSize:15,fontWeight:400,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fav.name}</p>
            <p style={{ margin:0,fontSize:10,color:"var(--ink-40)",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase" }}>Note personnelle</p>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"1px solid var(--ink-10)",background:"var(--off-white)",color:"var(--ink-60)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><IcoX /></button>
        </div>
        <textarea value={value} onChange={e=>setValue(e.target.value.slice(0,MAX))} rows={4}
          placeholder="Tes impressions, ce que tu veux commander, avec qui y aller…"
          style={{ width:"100%",boxSizing:"border-box",padding:"11px 13px",borderRadius:"var(--r-md)",border:"1.5px solid var(--ink-10)",background:"var(--off-white)",fontSize:13,color:"var(--ink)",lineHeight:1.65,fontFamily:"var(--font-body)",resize:"none",outline:"none",transition:"border-color 150ms" }}
          onFocus={e=>{e.target.style.borderColor="var(--forest-mid)";e.target.style.boxShadow="var(--s-focus)"}}
          onBlur={e=>{e.target.style.borderColor="var(--ink-10)";e.target.style.boxShadow="none"}}
        />
        <div style={{ display:"flex",justifyContent:"flex-end",alignItems:"center",gap:6,marginTop:4,marginBottom:12 }}>
          <span style={{ fontSize:10,color:"var(--ink-40)",fontWeight:500 }}>{value.length}/{MAX}</span>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {value.trim() && <button onClick={()=>{setValue("");saveNote(fav.osm_id,"");onSaved("")}} style={{ padding:"9px 14px",borderRadius:"var(--r-md)",border:"1px solid rgba(217,79,61,0.25)",background:"transparent",color:"var(--coral)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",transition:"all 120ms" }}>Effacer</button>}
          <button onClick={handleSave} style={{ flex:1,padding:"11px",borderRadius:"var(--r-md)",border:"none",background:saved?"var(--green)":"var(--forest-mid)",color:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",boxShadow:"var(--s-forest)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 200ms" }}>
            {saved?<><IcoCheck />Enregistrée !</>:"Enregistrer la note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Share mini-modal ──────────────────────────────────────
function ShareDrawer({ fav, onClose }: { fav: FavoriteRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fav.name)}&query_place_id=${fav.lat},${fav.lon}`;
  const text    = `🍴 ${fav.name}${fav.snapshot?.cuisine ? ` · ${fav.snapshot.cuisine}` : ""} — trouvé sur Forkmap`;
  const full    = `${text}\n${mapsUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(full).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9100,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div style={{ position:"absolute",inset:0,background:"rgba(14,14,13,0.45)",backdropFilter:"blur(6px)" }}/>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative",background:"var(--white)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,padding:"20px 20px 32px",boxShadow:"0 -16px 48px rgba(14,14,13,0.18)",animation:"slideUp 240ms var(--ease-out) both",fontFamily:"var(--font-body)" }}>
        <div style={{ width:36,height:4,borderRadius:2,background:"var(--bone)",margin:"0 auto 16px" }}/>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
          <h3 style={{ margin:0,fontFamily:"var(--font-display)",fontSize:16,fontWeight:400,letterSpacing:"-0.02em",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fav.name}</h3>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"1px solid var(--ink-10)",background:"var(--off-white)",color:"var(--ink-60)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><IcoX /></button>
        </div>
        {/* Canaux */}
        <div style={{ display:"flex",gap:8,marginBottom:16 }}>
          {[
            { icon:<IcoWhatsApp />, label:"WhatsApp", color:"#25D366", bg:"rgba(37,211,102,0.08)", onClick:()=>window.open(`https://wa.me/?text=${encodeURIComponent(full)}`,"_blank") },
            { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label:"SMS", color:"var(--sky)", bg:"var(--sky-pale)", onClick:()=>window.open(`sms:?body=${encodeURIComponent(full)}`,"_blank") },
            { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>, label:"Email", color:"var(--ink-80)", bg:"var(--cream)", onClick:()=>window.open(`mailto:?subject=${encodeURIComponent("Restaurant : "+fav.name)}&body=${encodeURIComponent(full)}`,"_blank") },
          ].map((ch,i)=>(
            <button key={i} onClick={ch.onClick} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",borderRadius:"var(--r-lg)",border:"1px solid var(--ink-10)",background:"var(--white)",cursor:"pointer",transition:"all 150ms",fontFamily:"inherit" }}
              onMouseEnter={e=>{e.currentTarget.style.background=ch.bg;e.currentTarget.style.borderColor=ch.color+"44";e.currentTarget.style.color=ch.color}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--white)";e.currentTarget.style.borderColor="var(--ink-10)";e.currentTarget.style.color="var(--ink-60)"}}
            >
              <div style={{ color:"inherit" }}>{ch.icon}</div>
              <span style={{ fontSize:10,fontWeight:600,color:"inherit" }}>{ch.label}</span>
            </button>
          ))}
        </div>
        {/* Copie lien */}
        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 10px 9px 14px",borderRadius:"var(--r-md)",background:"var(--off-white)",border:`1px solid ${copied?"rgba(45,122,85,0.4)":"var(--ink-10)"}`,transition:"border-color 200ms" }}>
          <span style={{ flex:1,fontSize:11,color:"var(--ink-60)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{mapsUrl.replace("https://","")}</span>
          <button onClick={copy} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:"var(--r-sm)",background:copied?"var(--forest-pale)":"var(--white)",border:`1px solid ${copied?"rgba(45,122,85,0.4)":"var(--ink-10)"}`,cursor:"pointer",fontSize:11,fontWeight:600,color:copied?"var(--green)":"var(--ink-60)",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,transition:"all 200ms" }}>
            {copied?<IcoCheck />:<IcoCopy />} {copied?"Copié !":"Copier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fav card — liste ──────────────────────────────────────
function FavCardList({ fav, index, note, onRemove, onOpenMap, onShare, onNote }: {
  fav: FavoriteRow; index: number; note: string;
  onRemove: () => void; onOpenMap: () => void; onShare: () => void; onNote: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name;
  const rating  = fav.snapshot?.fsq?.rating;
  const price   = fav.snapshot?.fsq?.price;
  const openNow = fav.snapshot?.open_now;
  const dateLabel = new Date(fav.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"});

  return (
    <div
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        background:"var(--white)",
        border:`1px solid ${hovered?"var(--ink-20)":"var(--ink-10)"}`,
        borderLeft:`3px solid ${hovered?"var(--forest-mid)":"rgba(45,122,85,0.35)"}`,
        borderRadius:"var(--r-xl)", overflow:"hidden",
        boxShadow:hovered?"var(--s3)":"var(--s1)",
        transform:hovered?"translateY(-1px)":"none",
        transition:"all 180ms var(--ease-out)",
        animation:`cardIn 280ms var(--ease-out) ${index*35}ms both`,
      }}
    >
      <div style={{ padding:"14px 16px 12px 18px" }}>
        {/* Row 1: nom + rating + actions */}
        <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:8 }}>
          <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={onOpenMap}>
            <h3 style={{ margin:"0 0 4px",fontFamily:"var(--font-display)",fontSize:16,fontWeight:400,letterSpacing:"-0.03em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--ink)" }}>
              {fav.name}
            </h3>
            {/* Badges */}
            <div style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
              {cuisine && <span style={{ padding:"2px 9px",borderRadius:"var(--r-pill)",fontSize:9.5,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",background:"var(--forest-pale)",color:"var(--forest-mid)",border:"1px solid rgba(45,122,85,0.2)" }}>{cuisine}</span>}
              {price != null && <span style={{ padding:"2px 8px",borderRadius:"var(--r-pill)",fontSize:10,fontWeight:600,background:"var(--cream)",color:"var(--ink-60)",border:"1px solid var(--bone)" }}>{"€".repeat(price)}</span>}
              {openNow !== undefined && <span style={{ padding:"2px 8px",borderRadius:"var(--r-pill)",fontSize:9.5,fontWeight:700,background:openNow?"#dcfce7":"var(--coral-pale)",color:openNow?"#16a34a":"var(--coral)",border:`1px solid ${openNow?"rgba(22,163,74,0.25)":"rgba(217,79,61,0.25)"}` }}>{openNow?"Ouvert":"Fermé"}</span>}
              {rating != null && <span style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:"var(--r-pill)",fontSize:10,fontWeight:700,background:rating>=9?"var(--amber-pale)":"var(--cream)",color:rating>=9?"var(--amber)":"var(--ink-60)",border:`1px solid ${rating>=9?"#fed7aa":"var(--bone)"}` }}><IcoStar />{rating.toFixed(1)}</span>}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display:"flex",gap:5,flexShrink:0 }}>
            <ActionBtn icon={<IcoPen />} label="Note" active={!!note} activeColor="var(--forest-mid)" activeBg="var(--forest-pale)" onClick={onNote} />
            <ActionBtn icon={<IcoShare />} label="Partager" onClick={onShare} />
            <ActionBtn icon={<IcoTrash />} label="Retirer" hoverColor="var(--coral)" hoverBg="var(--coral-pale)" onClick={onRemove} />
          </div>
        </div>

        {/* Note preview */}
        {note && (
          <button onClick={onNote} style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",background:"var(--forest-pale)",border:"1px solid rgba(45,122,85,0.2)",borderLeft:"2px solid var(--forest-mid)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit",transition:"all 120ms",marginBottom:4 }}
            onMouseEnter={e=>e.currentTarget.style.borderLeftColor="var(--forest)"}
            onMouseLeave={e=>e.currentTarget.style.borderLeftColor="var(--forest-mid)"}
          >
            <IcoPen />
            <span style={{ fontSize:12,color:"var(--ink-80)",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const }}>{note}</span>
          </button>
        )}

        {/* Footer: date + voir sur carte */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8 }}>
          <span style={{ fontSize:10,color:"var(--ink-40)",fontWeight:500 }}>{dateLabel}</span>
          <button onClick={onOpenMap} style={{ display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:"var(--r-sm)",border:"1px solid var(--ink-10)",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:600,color:"var(--ink-60)",fontFamily:"inherit",transition:"all 120ms" }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--forest-pale)";e.currentTarget.style.color="var(--forest-mid)";e.currentTarget.style.borderColor="rgba(45,122,85,0.3)"}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--ink-60)";e.currentTarget.style.borderColor="var(--ink-10)"}}
          >
            <IcoMap /> Voir sur la carte
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fav card — grille ─────────────────────────────────────
function FavCardGrid({ fav, index, note, onRemove, onOpenMap, onShare, onNote }: {
  fav: FavoriteRow; index: number; note: string;
  onRemove: () => void; onOpenMap: () => void; onShare: () => void; onNote: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name;
  const rating  = fav.snapshot?.fsq?.rating;
  const GRADIENTS: Record<string,string> = {
    japonais:"linear-gradient(135deg,#0c2d3a,#2980a0)",sushi:"linear-gradient(135deg,#0c2d3a,#2980a0)",
    italien:"linear-gradient(135deg,#2d1a0e,#7c4422)",pizza:"linear-gradient(135deg,#2d1a0e,#7c4422)",
    français:"linear-gradient(135deg,#1a2e1a,#3d7e3d)",burger:"linear-gradient(135deg,#1a1200,#7c5a00)",
    chinois:"linear-gradient(135deg,#1a0a0a,#8b1a1a)",indien:"linear-gradient(135deg,#2d1400,#c45c00)",
  };
  const grad = cuisine ? (Object.entries(GRADIENTS).find(([k])=>cuisine.toLowerCase().includes(k))?.[1] ?? "linear-gradient(135deg,#1a2e1a,#3d6e3d)") : "linear-gradient(135deg,#1a2e1a,#3d6e3d)";

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{
      background:"var(--white)",border:`1px solid ${hovered?"var(--ink-20)":"var(--ink-10)"}`,
      borderRadius:"var(--r-xl)",overflow:"hidden",
      boxShadow:hovered?"var(--s3)":"var(--s1)",
      transform:hovered?"translateY(-2px)":"none",
      transition:"all 200ms var(--ease-out)",
      animation:`cardIn 280ms var(--ease-out) ${index*30}ms both`,
      display:"flex",flexDirection:"column",
    }}>
      {/* Photo/gradient area */}
      <div onClick={onOpenMap} style={{ height:100,background:grad,position:"relative",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" opacity="0.25">
          <path d="M9 4v8c0 2.5 1 4 3 4.5V21M15 4v5c0 1-.7 1.5-1.5 1.5S12 10 12 9V4M15 9.5c0 2 1.5 3 3 3V21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {note && <div style={{ position:"absolute",top:8,left:8,width:8,height:8,borderRadius:"50%",background:"var(--forest-bright)",border:"1.5px solid rgba(255,255,255,0.6)",boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>}
        {rating != null && <span style={{ position:"absolute",top:8,right:8,display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:"var(--r-pill)",fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.15)",color:"white",backdropFilter:"blur(4px)",border:"1px solid rgba(255,255,255,0.2)" }}><IcoStar />{rating.toFixed(1)}</span>}
      </div>
      {/* Body */}
      <div style={{ padding:"12px 14px",flex:1,display:"flex",flexDirection:"column",gap:6 }}>
        <h3 onClick={onOpenMap} style={{ margin:0,fontFamily:"var(--font-display)",fontSize:14,fontWeight:400,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer",color:"var(--ink)" }}>{fav.name}</h3>
        {cuisine && <span style={{ fontSize:9.5,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"var(--forest-mid)" }}>{cuisine}</span>}
        <div style={{ flex:1 }}/>
        {/* Action row */}
        <div style={{ display:"flex",gap:5,paddingTop:6,borderTop:"1px solid var(--ink-10)" }}>
          <ActionBtn icon={<IcoPen />} active={!!note} activeColor="var(--forest-mid)" activeBg="var(--forest-pale)" onClick={onNote} small />
          <ActionBtn icon={<IcoShare />} onClick={onShare} small />
          <div style={{ flex:1 }}/>
          <ActionBtn icon={<IcoTrash />} hoverColor="var(--coral)" hoverBg="var(--coral-pale)" onClick={onRemove} small />
        </div>
      </div>
    </div>
  );
}

// ── Action button helper ──────────────────────────────────
function ActionBtn({ icon, label, active, activeColor, activeBg, hoverColor, hoverBg, onClick, small }: {
  icon: React.ReactNode; label?: string; active?: boolean;
  activeColor?: string; activeBg?: string;
  hoverColor?: string; hoverBg?: string;
  onClick: () => void; small?: boolean;
}) {
  const sz = small ? 28 : 30;
  const bg     = active ? (activeBg ?? "var(--forest-pale)") : "var(--off-white)";
  const color  = active ? (activeColor ?? "var(--forest-mid)") : "var(--ink-40)";
  const border = active ? `1px solid ${activeColor ? activeColor+"44" : "rgba(45,122,85,0.3)"}` : "1px solid var(--ink-10)";
  return (
    <button onClick={e=>{e.stopPropagation();onClick();}} title={label}
      style={{ width:sz,height:sz,borderRadius:"var(--r-sm)",border,background:bg,color,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 140ms ease" }}
      onMouseEnter={e=>{e.currentTarget.style.background=hoverBg??activeBg??"var(--cream)";e.currentTarget.style.color=hoverColor??activeColor??"var(--ink)";}}
      onMouseLeave={e=>{e.currentTarget.style.background=bg;e.currentTarget.style.color=color;}}
    >{icon}</button>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function FavoritesPage() {
  const { isReady, auth } = useAuthGuard();
  const router = useRouter();

  const [favorites,  setFavorites]  = useState<FavoriteRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string|null>(null);
  const [sortBy,     setSortBy]     = useState<SortKey>("date_desc");
  const [viewMode,   setViewMode]   = useState<ViewMode>("list");
  const [cuisine,    setCuisine]    = useState<string|null>(null);
  const [toDelete,   setToDelete]   = useState<FavoriteRow|null>(null);
  const [shareTarget,setShareTarget]= useState<FavoriteRow|null>(null);
  const [noteTarget, setNoteTarget] = useState<FavoriteRow|null>(null);
  // notes: osm_id → texte (state local rafraîchi depuis localStorage)
  const [notes, setNotes]           = useState<Record<string,string>>({});

  const loadFavorites = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/favorites", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFavorites(data.data ?? []);
    } catch (e: any) {
      setFetchError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isReady) { loadFavorites(); setNotes(getNotes()); } }, [isReady, loadFavorites]);

  const cuisineOptions = useMemo(() =>
    [...new Set(favorites.map(f => f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name).filter(Boolean) as string[])].sort()
  , [favorites]);

  const sorted = useMemo((): FavoriteRow[] => {
    let arr: FavoriteRow[] = [...favorites];
    if (cuisine) arr = arr.filter(f => (f.snapshot?.cuisine ?? f.snapshot?.fsq?.categories?.[0]?.name) === cuisine);
    switch (sortBy) {
      case "date_asc":  arr.sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()); break;
      case "name":      arr.sort((a,b)=>a.name.localeCompare(b.name)); break;
      case "rating":    arr.sort((a,b)=>(b.snapshot?.fsq?.rating??0)-(a.snapshot?.fsq?.rating??0)); break;
      default:          arr.sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    }
    return arr;
  }, [favorites, sortBy, cuisine]);

  if (!isReady) return (
    <div style={{ minHeight:"100vh",background:"var(--white)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:32,height:32,border:"2px solid var(--bone)",borderTop:"2px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const handleRemoveConfirm = async () => {
    if (!toDelete) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/favorites/${encodeURIComponent(toDelete.osm_id)}`,{ method:"DELETE", headers });
    setFavorites(prev => prev.filter(f => f.osm_id !== toDelete.osm_id));
    setToDelete(null);
  };

  const headerActions = (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,background:"var(--forest-pale)",color:"var(--forest-mid)",border:"1px solid rgba(45,122,85,0.2)" }}>
      <IcoHeart filled />
      {favorites.length} lieu{favorites.length!==1?"x":""}
    </span>
  );

  return (
    <div style={{ minHeight:"100vh",background:"var(--off-white)",color:"var(--ink)",fontFamily:"var(--font-body)",display:"flex",flexDirection:"column" }}>
      <PageHeader current="Mes favoris" actions={!loading && favorites.length>0 ? headerActions : undefined} />

      <main style={{ flex:1 }}>
        <div style={{ maxWidth:660, margin:"0 auto", padding:"36px 20px 80px" }}>

          {/* Titre */}
          <div style={{ marginBottom:24,animation:"fadeUp 280ms var(--ease-out) both" }}>
            <h1 style={{ margin:"0 0 6px",fontFamily:"var(--font-display)",fontSize:30,fontWeight:400,letterSpacing:"-0.04em",lineHeight:1.1 }}>
              Lieux sauvegardés
            </h1>
            <p style={{ margin:0,fontSize:13,color:"var(--ink-40)" }}>
              {loading ? "Chargement…" : `${sorted.length}${cuisine?` sur ${favorites.length}`:""} restaurant${sorted.length!==1?"s":""} sauvegardé${sorted.length!==1?"s":""}`}
            </p>
          </div>

          {/* Barre contrôles */}
          {!loading && favorites.length > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap",animation:"fadeUp 280ms var(--ease-out) 40ms both" }}>

              {/* Sort */}
              <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                <span style={{ fontSize:9.5,fontWeight:700,color:"var(--ink-40)",letterSpacing:"0.1em",textTransform:"uppercase",marginRight:2 }}>Trier</span>
                {([["date_desc","Récent"],["date_asc","Ancien"],["name","A→Z"],["rating","Note"]] as [SortKey,string][]).map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)} style={{ padding:"4px 11px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${sortBy===k?"var(--forest-mid)":"var(--ink-10)"}`,background:sortBy===k?"var(--forest-pale)":"transparent",color:sortBy===k?"var(--forest)":"var(--ink-60)",transition:"all 120ms",fontFamily:"inherit" }}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{ flex:1 }}/>

              {/* Vue grille/liste */}
              <div style={{ display:"flex",borderRadius:"var(--r-sm)",border:"1px solid var(--ink-10)",overflow:"hidden" }}>
                {(["list","grid"] as ViewMode[]).map(m=>(
                  <button key={m} onClick={()=>setViewMode(m)} style={{ width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:viewMode===m?"var(--ink)":"var(--white)",color:viewMode===m?"white":"var(--ink-60)",cursor:"pointer",transition:"all 120ms" }}>
                    {m==="list"?<IcoList />:<IcoGrid />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtre cuisine */}
          {!loading && cuisineOptions.length > 1 && (
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:20,flexWrap:"wrap",animation:"fadeUp 280ms var(--ease-out) 60ms both" }}>
              <IcoFilter />
              <button onClick={()=>setCuisine(null)} style={{ padding:"4px 11px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${!cuisine?"var(--forest-mid)":"var(--ink-10)"}`,background:!cuisine?"var(--forest-pale)":"transparent",color:!cuisine?"var(--forest)":"var(--ink-60)",transition:"all 120ms",fontFamily:"inherit" }}>
                Tout
              </button>
              {cuisineOptions.map(c=>(
                <button key={c} onClick={()=>setCuisine(c===cuisine?null:c)} style={{ padding:"4px 11px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${cuisine===c?"var(--forest-mid)":"var(--ink-10)"}`,background:cuisine===c?"var(--forest-pale)":"transparent",color:cuisine===c?"var(--forest)":"var(--ink-60)",transition:"all 120ms",fontFamily:"inherit",textTransform:"capitalize" }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:100,borderRadius:"var(--r-xl)" }}/>)}
            </div>
          )}

          {/* Error */}
          {fetchError && !loading && (
            <div style={{ textAlign:"center",padding:"40px 0" }}>
              <p style={{ margin:"0 0 4px",fontSize:13,fontWeight:600,color:"var(--ink-80)" }}>Impossible de charger les favoris</p>
              <button onClick={loadFavorites} style={{ padding:"8px 18px",borderRadius:"var(--r-pill)",border:"1px solid rgba(217,79,61,0.3)",background:"var(--coral-pale)",color:"var(--coral)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Réessayer</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !favorites.length && (
            <div style={{ textAlign:"center",padding:"64px 0 40px",animation:"fadeUp 300ms var(--ease-out) both" }}>
              <div style={{ width:72,height:72,borderRadius:24,background:"var(--cream)",border:"1px solid var(--bone)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32 }}>🍽</div>
              <h2 style={{ margin:"0 0 8px",fontFamily:"var(--font-display)",fontSize:22,fontWeight:400,letterSpacing:"-0.03em" }}>Aucun lieu sauvegardé</h2>
              <p style={{ margin:"0 0 28px",color:"var(--ink-40)",fontSize:13,lineHeight:1.7 }}>Appuyez sur le ♡ d'un restaurant sur la carte<br/>pour le sauvegarder ici.</p>
              <Link href="/" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"11px 24px",borderRadius:"var(--r-md)",background:"var(--forest-mid)",color:"white",textDecoration:"none",fontSize:13,fontWeight:600,boxShadow:"var(--s-forest)" }}>
                Explorer les restaurants →
              </Link>
            </div>
          )}

          {/* Empty filter */}
          {!loading && favorites.length > 0 && sorted.length === 0 && (
            <div style={{ textAlign:"center",padding:"32px 0" }}>
              <p style={{ fontSize:13,color:"var(--ink-60)",margin:"0 0 10px" }}>Aucun résultat pour ce filtre</p>
              <button onClick={()=>setCuisine(null)} style={{ padding:"7px 16px",borderRadius:"var(--r-pill)",border:"1px solid var(--ink-10)",background:"var(--white)",fontSize:12,fontWeight:600,color:"var(--ink-60)",cursor:"pointer",fontFamily:"inherit" }}>Réinitialiser</button>
            </div>
          )}

          {/* Liste */}
          {viewMode === "list" ? (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {sorted.map((fav,i)=>(
                <FavCardList key={fav.id} fav={fav} index={i} note={notes[fav.osm_id]??""}
                  onRemove={()=>setToDelete(fav)}
                  onOpenMap={()=>router.push(`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`)}
                  onShare={()=>setShareTarget(fav)}
                  onNote={()=>setNoteTarget(fav)}
                />
              ))}
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
              {sorted.map((fav,i)=>(
                <FavCardGrid key={fav.id} fav={fav} index={i} note={notes[fav.osm_id]??""}
                  onRemove={()=>setToDelete(fav)}
                  onOpenMap={()=>router.push(`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`)}
                  onShare={()=>setShareTarget(fav)}
                  onNote={()=>setNoteTarget(fav)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {toDelete && <DeleteModal name={toDelete.name} onConfirm={handleRemoveConfirm} onCancel={()=>setToDelete(null)} />}
      {shareTarget && <ShareDrawer fav={shareTarget} onClose={()=>setShareTarget(null)} />}
      {noteTarget && (
        <NoteDrawer fav={noteTarget} onClose={()=>setNoteTarget(null)}
          onSaved={n=>{setNotes(prev=>n?{...prev,[noteTarget.osm_id]:n}:{...prev,[noteTarget.osm_id]:""});}}
        />
      )}

      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes cardIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      <GlobalFooter />
    </div>
  );
}
