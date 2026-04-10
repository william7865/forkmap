"use client";

import { useState } from "react";
import { InfoPage } from "@/components/ui/PageLayout";

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
  category: string;
}

const FAQS: FAQItem[] = [
  // Getting started
  {
    category: "Getting started",
    q: "How do I search for restaurants?",
    a: "Type a restaurant name or cuisine in the search bar at the top of the map. Results filter in real time as you type. You can also browse the map by panning and zooming — the sidebar list updates automatically to show what's in the current view.",
  },
  {
    category: "Getting started",
    q: "How do I set my starting location?",
    a: "There are three ways: (1) Click \"Locate me\" in the sidebar — Forkmap will use your device's GPS. (2) Type an address in the starting point field and pick a suggestion. (3) Click \"Pin start\" in the header, then click anywhere on the map.",
  },
  {
    category: "Getting started",
    q: "What does the score mean?",
    a: "The score is a weighted combination of Foursquare rating, number of reviews, and proximity. Higher scores indicate better-reviewed restaurants that are also nearby. You can sort by score, distance, rating, or name using the filters.",
  },

  // Favourites
  {
    category: "Favourites",
    q: "How do I save a restaurant to favourites?",
    a: "Click the heart icon ♡ on any restaurant card in the sidebar or on the detail panel. The heart turns orange when saved. You need to be signed in for favourites to persist — otherwise they're lost on refresh.",
  },
  {
    category: "Favourites",
    q: "Where can I see my saved restaurants?",
    a: "Click \"Saved\" in the header, or go to your account dropdown → \"Saved places\". Your favourites are sorted by date saved by default, with options to sort alphabetically or by cuisine.",
  },
  {
    category: "Favourites",
    q: "Can I open a saved restaurant on the map?",
    a: "Yes. On the Saved places page, click any restaurant card — the map will centre on that restaurant and open its detail panel.",
  },

  // Routing
  {
    category: "Directions",
    q: "How do I get directions to a restaurant?",
    a: "First set a starting point (GPS, address, or pin). Then click a restaurant to open its detail panel. The route is calculated automatically and shown on the map. Use the tabs (Walk / Bike / Transit / Drive) to switch transport modes.",
  },
  {
    category: "Directions",
    q: "Why is the route not showing?",
    a: "Routes require a starting location. Make sure you've set one via the sidebar (GPS or address) or by using the \"Pin start\" button. If the route still doesn't appear, the routing service may be temporarily unavailable — try again in a moment.",
  },

  // Filters
  {
    category: "Filters",
    q: "How do I use filters?",
    a: "Click \"Filters\" in the header to expand the filter panel. You can filter by minimum rating, number of reviews, price level, cuisine type, and whether a place is currently open. Filters apply immediately — the list and map update in real time.",
  },
  {
    category: "Filters",
    q: "How do I reset filters?",
    a: "Click \"Filters\" to open the panel and click \"Reset all\" at the bottom, or close the panel and click the orange filter button which shows a badge with the number of active filters.",
  },

  // Account
  {
    category: "Account",
    q: "Do I need an account to use Forkmap?",
    a: "No. You can browse, search, filter, and get directions without an account. An account is only required to save favourite restaurants across sessions and devices.",
  },
  {
    category: "Account",
    q: "How do I create an account?",
    a: "Click \"Sign in\" in the top-right corner. Choose \"Create account\" and enter your email and a password, or sign in with Google for a one-click setup.",
  },
  {
    category: "Account",
    q: "How do I delete my account?",
    a: "Go to Account → Settings (or Settings in the menu) → scroll to \"Danger zone\" → \"Delete account\". You'll be asked to confirm by typing your email address. This permanently deletes your account and all saved data.",
  },

  // Data
  {
    category: "Data & accuracy",
    q: "Where does the restaurant data come from?",
    a: "Restaurant locations, names, addresses, opening hours, and cuisine types come from OpenStreetMap — a community-maintained, openly licensed map. Ratings and review counts are enriched from Foursquare.",
  },
  {
    category: "Data & accuracy",
    q: "The data for a restaurant is wrong. What can I do?",
    a: "OpenStreetMap data is edited by volunteers. If you find an error, you can fix it directly on openstreetmap.org — your fix will appear in Forkmap within a few days. You can also contact us via the Contact page.",
  },
];

const CATEGORIES = [...new Set(FAQS.map(f => f.category))];

export default function HelpPage() {
  const [open,   setOpen]   = useState<string | null>(null);
  const [cat,    setCat]    = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter(f => {
    const matchCat  = cat === "All" || f.category === cat;
    const matchQ    = search.trim() === "" ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      (typeof f.a === "string" && f.a.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchQ;
  });

  return (
    <InfoPage headerLabel="Help & FAQ" maxWidth={720}>
      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--ink)" }}>
        Help & FAQ
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.7 }}>
        Common questions about using Forkmap.
      </p>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-60)", display: "flex", pointerEvents: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
        <input
          type="text" placeholder="Search questions…" value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search FAQ"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px 10px 38px", borderRadius: 10,
            border: "1.5px solid rgba(28,25,23,0.12)", background: "white",
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            outline: "none", transition: "border-color 120ms, box-shadow 120ms",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "var(--forest-mid)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,122,85,0.15)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "rgba(28,25,23,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: "5px 13px", borderRadius: 999,
            border: cat === c ? "1.5px solid var(--forest-mid)" : "1.5px solid var(--b2)",
            background: cat === c ? "rgba(45,122,85,0.15)" : "transparent",
            color: cat === c ? "var(--forest)" : "var(--ink-60)",
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "all 120ms",
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-60)", fontSize: 13 }}>
          No results for &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(faq => {
            const isOpen = open === faq.q;
            return (
              <div key={faq.q} style={{
                background: "var(--white)",
                border: `1px solid ${isOpen ? "rgba(45,122,85,0.15)" : "var(--b1)"}`,
                borderRadius: 12, overflow: "hidden",
                boxShadow: isOpen ? "0 4px 16px var(--b1)" : "0 1px 3px rgba(28,25,23,0.04)",
                transition: "box-shadow 150ms, border-color 150ms",
              }}>
                <button
                  onClick={() => setOpen(isOpen ? null : faq.q)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 18px", background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit", gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "var(--forest)", background: "rgba(45,122,85,0.15)",
                      padding: "2px 7px", borderRadius: 999, flexShrink: 0,
                    }}>
                      {faq.category}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.4 }}>
                      {faq.q}
                    </span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-60)" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease", flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {isOpen && (
                  <div style={{
                    padding: "0 18px 16px 18px",
                    fontSize: 13, color: "var(--ink-80)", lineHeight: 1.75,
                    animation: "fadeUp 150ms ease both",
                    borderTop: "1px solid rgba(28,25,23,0.05)",
                    paddingTop: 14,
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Still stuck CTA */}
      <div style={{
        marginTop: 44,
        background: "var(--off-white)", borderRadius: 14,
        padding: "20px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Still stuck?</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-60)" }}>Send us a message and we'll help you out.</p>
        </div>
        <a href="/contact" style={{
          padding: "9px 18px", borderRadius: 10,
          background: "var(--forest-mid)", color: "white",
          textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          Contact us →
        </a>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </InfoPage>
  );
}
