// ============================================================
// app/(pages)/account/page.tsx — Mon compte + statistiques visites
// ============================================================
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { getSupabaseBrowserClient } from "@/lib/hooks/useAuth";
import type { FavoriteRow, PlaceCard } from "@/types";
import { PageHeader, GlobalFooter } from "@/components/ui/PageLayout";
import VisitModal from "@/components/place/VisitModal";

async function getAuthHeaders(): Promise<Record<string,string>> {
  try {
    const sb = getSupabaseBrowserClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) return {};
    return { "Authorization": `Bearer ${session.access_token}` };
  } catch { return {}; }
}

const IcoLogOut   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoMail     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IcoCalendar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IcoShield   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoTrash    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IcoHeart    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--forest-mid)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IcoArrow    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoPencil   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoGoogle   = () => <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;

interface VisitStats {
  total_visits: number; unique_restaurants: number;
  total_spent: number; avg_spent_per_meal: number; avg_personal_rating: number;
  top_restaurants: { osm_id:string; name:string; count:number; total_spent:number; avg_rating:number }[];
  visits_by_month: { month:string; count:number; spent:number }[];
  mood_breakdown: { mood:string; count:number }[];
  cuisine_breakdown: { cuisine:string; count:number; spent:number }[];
}

interface VisitRow {
  id: string;
  osm_id: string;
  name: string;
  visited_at: string;
  amount_spent?: number;
  people_count: number;
  personal_rating?: number;
  mood?: string;
  note?: string;
  snapshot?: Record<string, unknown>;
}

const CUISINE_COLORS = ["#1a4a35","#2d7a55","#c47c2b","#1d65c8","#d94f3d","#7c3aed","#0891b2","#065f46"];
const MOOD_LABELS: Record<string,string> = { solo:"Solo 🧍",couple:"Couple 👫",friends:"Amis 👯",family:"Famille 👨‍👩‍👧",work:"Travail 💼" };

function Card({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background:"var(--white)",borderRadius:20,border:"1px solid var(--ink-10)",boxShadow:"0 1px 6px rgba(14,14,13,0.06)",overflow:"hidden",...style }}>{children}</div>;
}
function CardHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ padding:"14px 20px 12px",borderBottom:"1px solid var(--ink-10)",display:"flex",alignItems:"center",gap:8 }}>
      <span style={{ display:"block",width:10,height:1.5,background:"var(--forest-mid)" }}/>
      <span style={{ fontSize:9.5,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase" as const,color:"var(--forest-mid)" }}>{label}</span>
      {sub && <span style={{ fontSize:10,color:"var(--ink-40)",marginLeft:"auto" }}>{sub}</span>}
    </div>
  );
}

function DeleteModal({ email, onConfirm, onCancel }: { email: string; onConfirm: () => void; onCancel: () => void }) {
  const [input, setInput] = useState("");
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onCancel}>
      <div style={{ position:"absolute",inset:0,background:"rgba(14,14,13,0.5)",backdropFilter:"blur(8px)" }}/>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative",background:"var(--white)",borderRadius:20,padding:28,maxWidth:380,width:"100%",boxShadow:"0 32px 80px rgba(14,14,13,0.22)",fontFamily:"var(--font-body)" }}>
        <div style={{ width:48,height:48,borderRadius:14,background:"var(--coral-pale)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:"var(--coral)" }}><IcoTrash /></div>
        <h3 style={{ margin:"0 0 8px",fontFamily:"var(--font-display)",fontSize:18,fontWeight:400,letterSpacing:"-0.03em" }}>Supprimer le compte ?</h3>
        <p style={{ margin:"0 0 18px",fontSize:13,color:"var(--ink-60)",lineHeight:1.65 }}>Action irréversible — toutes vos données seront supprimées.</p>
        <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:600,color:"var(--ink-80)" }}>Tapez <strong>{email}</strong> pour confirmer :</p>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={email}
          style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid var(--ink-10)",background:"var(--off-white)",fontSize:13,fontFamily:"monospace",outline:"none",color:"var(--ink)",marginBottom:16,boxSizing:"border-box" as const }} />
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--ink-10)",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--ink-80)",fontFamily:"inherit" }}>Annuler</button>
          <button onClick={onConfirm} disabled={input!==email} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",background:input===email?"var(--coral)":"var(--cream)",cursor:input===email?"pointer":"not-allowed",fontSize:13,fontWeight:600,color:input===email?"white":"var(--ink-40)",fontFamily:"inherit",transition:"all 150ms" }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, color="var(--forest-mid)", valueSuffix="" }: {
  data: { label: string; value: number; sublabel?: string }[];
  color?: string; valueSuffix?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:88,fontSize:11,fontWeight:600,color:"var(--ink-80)",textAlign:"right" as const,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }} title={d.label}>{d.label}</div>
          <div style={{ flex:1,height:24,background:"var(--off-white)",borderRadius:6,overflow:"hidden",position:"relative" }}>
            <div style={{ position:"absolute",top:0,left:0,bottom:0,width:`${(d.value/max)*100}%`,background:color,borderRadius:6,transition:"width 600ms var(--ease-out)" }}/>
            <span style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:10,fontWeight:700,color:"white",zIndex:1,whiteSpace:"nowrap" as const }}>{d.value > 0 ? `${d.value}${valueSuffix}` : ""}</span>
          </div>
          {d.sublabel && <span style={{ fontSize:10,color:"var(--ink-40)",whiteSpace:"nowrap" as const,flexShrink:0 }}>{d.sublabel}</span>}
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ data }: { data: { month:string; count:number; spent:number }[] }) {
  const [tab, setTab] = useState<"visits"|"spent">("visits");
  const values = data.map(d => tab==="visits" ? d.count : d.spent);
  const max = Math.max(...values, 1);
  const W=320, H=80, PAD=10;
  const pts = values.map((v,i) => ({
    x: PAD + (i / Math.max(values.length-1,1)) * (W-PAD*2),
    y: H - PAD - ((v/max)*(H-PAD*2)),
    v, month: data[i].month,
  }));
  const pathD = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const [hov, setHov] = useState<number|null>(null);
  const color = tab==="visits" ? "var(--forest-mid)" : "var(--coral)";
  const fmtM = (m:string) => { const [y,mo]=m.split("-"); return new Date(+y,+mo-1).toLocaleDateString("fr-FR",{month:"short"}); };
  if (!data.length) return <p style={{ margin:0,fontSize:12,color:"var(--ink-40)",textAlign:"center" as const,padding:"20px 0" }}>Pas encore de données</p>;
  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:14 }}>
        {([["visits","Visites"],["spent","Dépenses €"]]).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k as "visits"|"spent")} style={{ padding:"4px 11px",borderRadius:"var(--r-pill)",fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${tab===k?"var(--forest-mid)":"var(--ink-10)"}`,background:tab===k?"var(--forest-pale)":"transparent",color:tab===k?"var(--forest)":"var(--ink-60)",fontFamily:"inherit",transition:"all 120ms" }}>{l}</button>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H+12}`} style={{ overflow:"visible" }} onMouseLeave={()=>setHov(null)}>
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        <path d={areaD} fill="url(#g1)"/>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=>(
          <g key={i} onMouseEnter={()=>setHov(i)}>
            <circle cx={p.x} cy={p.y} r={hov===i?5:3} fill={hov===i?color:"var(--white)"} stroke={color} strokeWidth="2"/>
            {hov===i && <><rect x={p.x-30} y={p.y-34} width={60} height={20} rx={5} fill="var(--ink)" opacity="0.88"/><text x={p.x} y={p.y-20} textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="var(--font-body)">{tab==="spent"?`${p.v.toFixed(0)}€`:`${p.v} visite${p.v>1?"s":""}`}</text></>}
          </g>
        ))}
        {pts.filter((_,i)=>i===0||i===pts.length-1||i%Math.max(Math.ceil(pts.length/5),1)===0).map((p,i)=>(
          <text key={i} x={p.x} y={H+10} textAnchor="middle" fontSize="8" fill="var(--ink-40)" fontFamily="var(--font-body)">{fmtM(p.month)}</text>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ data, colors }: { data:{label:string;value:number}[]; colors:string[] }) {
  const [hov, setHov] = useState<number|null>(null);
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return <p style={{ margin:0,fontSize:12,color:"var(--ink-40)",textAlign:"center" as const,padding:"20px 0" }}>Pas encore de données</p>;
  const R=38,cx=48,cy=48,sw=16,circ=2*Math.PI*R;
  let off = -Math.PI/2;
  const slices = data.map((d,i)=>{
    const pct=d.value/total, angle=pct*2*Math.PI, start=off; off+=angle;
    return { ...d, pct, color:colors[i%colors.length],
      dashArray:`${(pct*circ).toFixed(2)} ${circ.toFixed(2)}`,
      dashOffset: -((start/(2*Math.PI))*circ) };
  });
  return (
    <div style={{ display:"flex",alignItems:"center",gap:14 }}>
      <svg width={cx*2} height={cy*2} viewBox={`0 0 ${cx*2} ${cy*2}`} style={{ flexShrink:0 }}>
        {slices.map((s,i)=>(
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color} strokeWidth={hov===i?sw+3:sw}
            strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset}
            style={{ transition:"stroke-width 150ms",cursor:"pointer" }}
            onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} />
        ))}
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-body)">{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize="8" fill="var(--ink-40)" fontFamily="var(--font-body)">visites</text>
      </svg>
      <div style={{ flex:1,display:"flex",flexDirection:"column",gap:5,minWidth:0 }}>
        {slices.slice(0,5).map((s,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:6,opacity:hov!==null&&hov!==i?0.4:1,transition:"opacity 150ms",cursor:"default" }}
            onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <div style={{ width:8,height:8,borderRadius:2,background:s.color,flexShrink:0 }}/>
            <span style={{ fontSize:10,color:"var(--ink-80)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{s.label}</span>
            <span style={{ fontSize:10,fontWeight:700,color:"var(--ink-60)",flexShrink:0 }}>{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ minHeight:"100vh",background:"var(--white)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:32,height:32,border:"2px solid var(--bone)",borderTop:"2px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

export default function AccountPage() {
  const { isReady, auth } = useAuthGuard();
  if (!isReady) return <Spinner />;
  return <AccountPageInner auth={auth} />;
}

function AccountPageInner({ auth }: { auth: ReturnType<typeof useAuthGuard>["auth"] }) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [stats, setStats] = useState<VisitStats|null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [editingVisit, setEditingVisit] = useState<{ visit: VisitRow; place: PlaceCard } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fetchVisits = async () => {
    const h = await getAuthHeaders();
    try { const r = await fetch("/api/visits", { headers: h }); if (r.ok) { const d = await r.json(); setVisits(d.data ?? []); } } catch {} finally { setVisitsLoading(false); }
  };

  useEffect(()=>{
    (async()=>{
      const h = await getAuthHeaders();
      try{ const r=await fetch("/api/favorites",{headers:h}); if(r.ok){const d=await r.json();setFavorites(d.data??[]);} }catch{}finally{setFavLoading(false);}
      try{ const r=await fetch("/api/visits/stats",{headers:h}); if(r.ok){const d=await r.json();setStats(d.data);} }catch{}finally{setStatsLoading(false);}
    })();
    fetchVisits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  if (auth.loading) return <Spinner />;
  const user = auth.user;
  if (!user) return null;

  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Utilisateur";
  const initials    = displayName.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase();
  const avatarUrl   = user.user_metadata?.avatar_url;
  const isGoogle    = (user.app_metadata?.provider??"email")==="google";
  const joined      = new Date(user.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  const cuisines    = [...new Set(favorites.map(f=>f.snapshot?.cuisine).filter(Boolean))];
  const recentFavs  = [...favorites].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,3);

  const hasStats = !statsLoading && stats && stats.total_visits > 0;

  const MOOD_EMOJIS: Record<string, string> = { solo: "🧍", couple: "👫", friends: "👯", family: "👨‍👩‍👧", work: "💼" };
  const sortedVisits = [...visits].sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());

  return (
    <div style={{ minHeight:"100vh",background:"var(--off-white)",color:"var(--ink)",fontFamily:"var(--font-body)",display:"flex",flexDirection:"column" }}>
      <PageHeader current="Mon compte" actions={
        <button onClick={async()=>{ setSigningOut(true); await auth.signOut(); router.replace("/"); }} disabled={signingOut}
          style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:"var(--r-md)",border:"1px solid rgba(217,79,61,0.3)",background:"transparent",cursor:signingOut?"not-allowed":"pointer",fontSize:11,fontWeight:600,color:"var(--coral)",fontFamily:"inherit" }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--coral-pale)"}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent"}}
        >
          <IcoLogOut /> {signingOut?"Déconnexion…":"Se déconnecter"}
        </button>
      }/>

      <div style={{ maxWidth:640,margin:"0 auto",padding:"32px 20px 80px",display:"flex",flexDirection:"column",gap:14,width:"100%" }}>

        {/* Hero */}
        <Card style={{ animation:"fadeUp 280ms var(--ease-out) both" }}>
          <div style={{ height:4,background:"linear-gradient(90deg,var(--forest),var(--forest-bright))" }}/>
          <div style={{ padding:"22px 24px 0",display:"flex",alignItems:"flex-start",gap:16 }}>
            <div style={{ position:"relative",flexShrink:0 }}>
              <div style={{ width:64,height:64,borderRadius:18,overflow:"hidden",background:"var(--forest-mid)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--s-forest)" }}>
                {avatarUrl?<img src={avatarUrl} alt={displayName} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:22,fontWeight:600,color:"white" }}>{initials}</span>}
              </div>
              {isGoogle&&<div style={{ position:"absolute",bottom:-3,right:-3,width:20,height:20,borderRadius:7,background:"white",border:"2px solid white",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(14,14,13,0.12)" }}><IcoGoogle /></div>}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <h1 style={{ margin:"0 0 3px",fontFamily:"var(--font-display)",fontSize:20,fontWeight:400,letterSpacing:"-0.03em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{displayName}</h1>
              <p style={{ margin:"0 0 10px",fontSize:12,color:"var(--ink-60)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{user.email}</p>
              <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                <span style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:isGoogle?"#deeeff":"var(--off-white)",color:isGoogle?"#1d65c8":"var(--ink-60)",border:`1px solid ${isGoogle?"rgba(29,101,200,0.2)":"var(--ink-10)"}` }}>{isGoogle?<IcoGoogle />:<IcoShield />} {isGoogle?"Google":"Email"}</span>
                <span style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:"var(--off-white)",color:"var(--ink-60)",border:"1px solid var(--ink-10)" }}><IcoCalendar /> {joined}</span>
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid var(--ink-10)",marginTop:16 }}>
            {[
              { val:favLoading?"…":favorites.length, label:"Favoris", color:"var(--forest-mid)" },
              { val:statsLoading?"…":(stats?.total_visits??0), label:"Visites", color:"var(--amber)" },
              { val:statsLoading?"…":(stats?.total_spent?`${Math.round(stats.total_spent)}€`:"0€"), label:"Dépensé", color:"var(--coral)" },
              { val:favLoading?"…":(cuisines.length||"—"), label:"Cuisines", color:"#1d65c8" },
            ].map((s,i)=>(
              <div key={i} style={{ padding:"12px 8px",textAlign:"center" as const,borderRight:i<3?"1px solid var(--ink-10)":"none" }}>
                <div style={{ fontFamily:"var(--font-display)",fontSize:20,fontWeight:400,letterSpacing:"-0.04em",color:s.color,lineHeight:1,marginBottom:3 }}>{s.val}</div>
                <div style={{ fontSize:9.5,fontWeight:600,color:"var(--ink-40)",letterSpacing:"0.06em",textTransform:"uppercase" as const }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Graphique mensuel */}
        {!statsLoading && stats && stats.visits_by_month.length > 1 && (
          <Card style={{ animation:"fadeUp 280ms var(--ease-out) 40ms both" }}>
            <CardHeader label="Activité" sub={`${stats.total_visits} visite${stats.total_visits>1?"s":""} · moy. ${stats.avg_spent_per_meal.toFixed(0)}€/repas`} />
            <div style={{ padding:"16px 20px" }}><MonthlyChart data={stats.visits_by_month} /></div>
          </Card>
        )}

        {/* Top restaurants — visites */}
        {hasStats && stats!.top_restaurants.length > 0 && (
          <Card style={{ animation:"fadeUp 280ms var(--ease-out) 60ms both" }}>
            <CardHeader label="Restaurants les plus visités" />
            <div style={{ padding:"16px 20px" }}>
              <BarChart
                data={stats!.top_restaurants.slice(0,7).map(r=>({ label:r.name, value:r.count, sublabel:r.total_spent>0?`${r.total_spent.toFixed(0)}€`:undefined }))}
                color="var(--forest-mid)" valueSuffix=" fois"
              />
            </div>
          </Card>
        )}

        {/* Dépenses par restaurant */}
        {hasStats && stats!.top_restaurants.filter(r=>r.total_spent>0).length > 0 && (
          <Card style={{ animation:"fadeUp 280ms var(--ease-out) 80ms both" }}>
            <CardHeader label="Dépenses par restaurant" sub={`Moy. ${stats!.avg_spent_per_meal.toFixed(0)}€/repas`} />
            <div style={{ padding:"16px 20px" }}>
              <BarChart
                data={stats!.top_restaurants.filter(r=>r.total_spent>0).slice(0,7).map(r=>({ label:r.name, value:Math.round(r.total_spent), sublabel:r.avg_rating>0?`⭐ ${r.avg_rating.toFixed(1)}`:undefined }))}
                color="var(--coral)" valueSuffix="€"
              />
            </div>
          </Card>
        )}

        {/* Cuisine + Mood */}
        {hasStats && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,animation:"fadeUp 280ms var(--ease-out) 100ms both" }}>
            <Card>
              <CardHeader label="Cuisines" />
              <div style={{ padding:"14px 16px" }}>
                <DonutChart data={stats!.cuisine_breakdown.map(c=>({ label:c.cuisine, value:c.count }))} colors={CUISINE_COLORS} />
              </div>
            </Card>
            <Card>
              <CardHeader label="Avec qui" />
              <div style={{ padding:"14px 16px" }}>
                <DonutChart data={stats!.mood_breakdown.map(m=>({ label:MOOD_LABELS[m.mood]??m.mood, value:m.count }))} colors={["#1a4a35","#c47c2b","#1d65c8","#d94f3d","#7c3aed"]} />
              </div>
            </Card>
          </div>
        )}

        {/* Invite à logger si aucune visite */}
        {!statsLoading && (!stats || stats.total_visits === 0) && (
          <Card style={{ animation:"fadeUp 280ms var(--ease-out) 60ms both" }}>
            <div style={{ padding:"32px 24px",textAlign:"center" as const }}>
              <div style={{ fontSize:40,marginBottom:16 }}>📊</div>
              <h3 style={{ margin:"0 0 8px",fontFamily:"var(--font-display)",fontSize:18,fontWeight:400,letterSpacing:"-0.02em" }}>Vos statistiques apparaîtront ici</h3>
              <p style={{ margin:"0 0 20px",fontSize:13,color:"var(--ink-60)",lineHeight:1.65 }}>Commencez à logger vos visites en cliquant sur le bouton ✓ dans la fiche d&apos;un restaurant.</p>
              <Link href="/" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"11px 22px",borderRadius:"var(--r-md)",background:"var(--forest-mid)",color:"white",textDecoration:"none",fontSize:13,fontWeight:600,boxShadow:"var(--s-forest)" }}>
                Explorer les restaurants →
              </Link>
            </div>
          </Card>
        )}

        {/* Mes visites */}
        <Card style={{ animation:"fadeUp 280ms var(--ease-out) 110ms both" }}>
          <CardHeader label="Mes visites" sub={!visitsLoading ? `${sortedVisits.length} visite${sortedVisits.length !== 1 ? "s" : ""}` : undefined} />
          {visitsLoading ? (
            <div style={{ padding:"24px 20px", textAlign:"center" as const }}>
              <div style={{ width:24,height:24,border:"2px solid var(--bone)",borderTop:"2px solid var(--forest-mid)",borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto" }}/>
            </div>
          ) : sortedVisits.length === 0 ? (
            <div style={{ padding:"28px 20px", textAlign:"center" as const }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🍽</div>
              <p style={{ margin:0, fontSize:13, color:"var(--ink-40)" }}>Aucune visite enregistrée</p>
            </div>
          ) : (
            <div>
              {sortedVisits.map((visit, i) => {
                const dateStr = new Date(visit.visited_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                const moodEmoji = visit.mood ? MOOD_EMOJIS[visit.mood] : null;
                const notePreview = visit.note && visit.note.length > 60 ? visit.note.slice(0, 60) + "…" : visit.note;
                return (
                  <div key={visit.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i < sortedVisits.length - 1 ? "1px solid var(--ink-10)" : "none",transition:"background 100ms" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="var(--off-white)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                  >
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:700, fontFamily:"var(--font-display)", color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{visit.name}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const }}>
                        <span style={{ fontSize:11, color:"var(--ink-60)" }}>{dateStr}</span>
                        {visit.personal_rating && visit.personal_rating > 0 && (
                          <span style={{ display:"flex", gap:1 }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ fontSize:11, color: s <= (visit.personal_rating ?? 0) ? "#f59e0b" : "var(--ink-20)" }}>★</span>
                            ))}
                          </span>
                        )}
                        {moodEmoji && <span style={{ fontSize:11 }}>{moodEmoji}</span>}
                        {visit.amount_spent != null && <span style={{ fontSize:11, fontWeight:600, color:"var(--ink-60)" }}>{visit.amount_spent}€</span>}
                        {visit.people_count > 1 && <span style={{ fontSize:11, color:"var(--ink-40)" }}>{visit.people_count} pers.</span>}
                      </div>
                      {notePreview && <p style={{ margin:"3px 0 0", fontSize:11, color:"var(--ink-60)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{notePreview}</p>}
                    </div>
                    <button
                      onClick={() => {
                        const place = (visit.snapshot ?? { osm_id: visit.osm_id, name: visit.name, lat: 0, lon: 0 }) as unknown as PlaceCard;
                        setEditingVisit({ visit, place });
                      }}
                      style={{ width:30, height:30, borderRadius:"var(--r-sm)", border:"1px solid var(--ink-10)", background:"var(--off-white)", color:"var(--ink-60)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 120ms" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--bone)"}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--off-white)"}}
                      title="Modifier la visite"
                    >
                      <IcoPencil />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Récents favoris */}
        {!favLoading && recentFavs.length > 0 && (
          <Card style={{ animation:"fadeUp 280ms var(--ease-out) 120ms both" }}>
            <CardHeader label="Derniers favoris" />
            {recentFavs.map((fav,i)=>(
              <Link key={fav.id} href={`/?select=${encodeURIComponent(fav.osm_id)}&lat=${fav.lat}&lon=${fav.lon}`}
                style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 20px",borderBottom:i<recentFavs.length-1?"1px solid var(--ink-10)":"none",textDecoration:"none",transition:"background 100ms" }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--off-white)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
              >
                <div style={{ width:36,height:36,borderRadius:11,background:"var(--forest-pale)",border:"1px solid rgba(45,122,85,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"var(--forest-mid)" }}><IcoHeart /></div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:"0 0 2px",fontSize:13,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{fav.name}</p>
                  <p style={{ margin:0,fontSize:11,color:"var(--ink-60)" }}>{fav.snapshot?.cuisine&&<span style={{ marginRight:6,color:"var(--forest-mid)",fontWeight:600 }}>{fav.snapshot.cuisine as string}</span>}{new Date(fav.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</p>
                </div>
              </Link>
            ))}
            <Link href="/favorites" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 20px",fontSize:12,fontWeight:700,color:"var(--forest-mid)",textDecoration:"none",transition:"background 100ms",borderTop:"1px solid var(--ink-10)" }}
              onMouseEnter={e=>(e.currentTarget.style.background="var(--forest-pale)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
            >Voir tous mes favoris <IcoArrow /></Link>
          </Card>
        )}

        {/* Compte */}
        <Card style={{ animation:"fadeUp 280ms var(--ease-out) 140ms both" }}>
          <CardHeader label="Compte" />
          <div style={{ padding:"2px 0" }}>
            <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:"1px solid var(--ink-10)" }}>
              <div style={{ width:36,height:36,borderRadius:11,background:"var(--off-white)",border:"1px solid var(--ink-10)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><IcoMail /></div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ margin:"0 0 1px",fontSize:13,fontWeight:600,color:"var(--ink)" }}>Email</p>
                <p style={{ margin:0,fontSize:11,color:"var(--ink-60)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{user.email}</p>
              </div>
            </div>
            <button onClick={()=>setShowDeleteModal(true)} style={{ width:"100%",display:"flex",alignItems:"center",gap:14,padding:"14px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left" as const,fontFamily:"inherit",transition:"background 100ms" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(217,79,61,0.03)"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent"}}
            >
              <div style={{ width:36,height:36,borderRadius:11,background:"rgba(217,79,61,0.06)",border:"1px solid rgba(217,79,61,0.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--coral)",flexShrink:0 }}><IcoTrash /></div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 1px",fontSize:13,fontWeight:600,color:"var(--coral)" }}>Supprimer le compte</p>
                <p style={{ margin:0,fontSize:11,color:"var(--ink-60)" }}>Suppression définitive de toutes vos données</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {editingVisit && (
        <VisitModal
          place={editingVisit.place}
          existingVisit={editingVisit.visit}
          onClose={() => setEditingVisit(null)}
          onSaved={() => { setEditingVisit(null); fetchVisits(); }}
        />
      )}
      {showDeleteModal && <DeleteModal email={user.email??""} onConfirm={async()=>{ setShowDeleteModal(false); await auth.signOut(); router.replace("/"); }} onCancel={()=>setShowDeleteModal(false)} />}
      <GlobalFooter />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
