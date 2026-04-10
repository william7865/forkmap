import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/PageLayout";

export const metadata: Metadata = {
  title: "About — Forkmap",
  description: "What Forkmap is, how it works, and who built it.",
};

export default function AboutPage() {
  return (
    <InfoPage headerLabel="About">
      {/* Hero */}
      <div style={{ marginBottom: 52 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(45,122,85,0.15)", border: "1px solid rgba(45,122,85,0.15)",
          borderRadius: 999, padding: "4px 14px", marginBottom: 18,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--forest)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Open source · Free to use
          </span>
        </div>
        <h1 style={{ margin: "0 0 16px", fontSize: 36, fontWeight: 600, letterSpacing: "-0.05em", color: "var(--ink)", lineHeight: 1.2 }}>
          Find the best places<br />to eat, anywhere.
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--ink-80)", lineHeight: 1.75, maxWidth: 580 }}>
          Forkmap is a restaurant discovery app built on open data. It combines the depth
          of OpenStreetMap with Foursquare ratings to give you a real, unbiased view of
          what's around you — with smart routing, filters, and a map that puts you in control.
        </p>
      </div>

      {/* What you can do */}
      <Section title="What you can do">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {[
            { icon: "🗺", title: "Explore the map", desc: "Browse restaurants on an interactive map. Pan, zoom, and discover what's in any neighbourhood." },
            { icon: "⭐", title: "Filter by quality", desc: "Filter by rating, price, cuisine, and opening hours. Sort by distance, score, or name." },
            { icon: "🧭", title: "Get directions", desc: "Calculate walking, cycling, transit, or driving routes to any restaurant directly from the app." },
            { icon: "❤️", title: "Save favourites", desc: "Save places you love or want to visit. Your list syncs across all your devices." },
            { icon: "📍", title: "Set your location", desc: "Use your GPS, type an address, or drop a pin anywhere on the map as your starting point." },
            { icon: "🔍", title: "Search instantly", desc: "Search by name or cuisine type. Results update in real time as you type." },
          ].map(item => (
            <div key={item.title} style={{
              background: "var(--white)", border: "1px solid var(--b1)",
              borderRadius: 14, padding: "18px 20px",
              boxShadow: "0 1px 4px rgba(28,25,23,0.05)",
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data sources */}
      <Section title="Data sources">
        <p style={{ fontSize: 14, color: "var(--ink-80)", lineHeight: 1.75, marginBottom: 20 }}>
          Forkmap is built on a stack of trusted open-data providers. We don't own or create restaurant data — we aggregate, enrich, and display it.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              name: "OpenStreetMap", badge: "ODbL",
              desc: "Restaurant locations, names, addresses, opening hours, cuisine, and phone numbers come from the OpenStreetMap database — a community-maintained, openly licensed map of the world.",
              href: "https://www.openstreetmap.org",
            },
            {
              name: "Foursquare Places", badge: "API",
              desc: "Ratings, review counts, price levels, photos, and category data are enriched via the Foursquare Places API.",
              href: "https://developer.foursquare.com",
            },
            {
              name: "OSRM", badge: "Routing",
              desc: "Route calculations (walk / bike / drive / transit times and polylines) are powered by the Open Source Routing Machine, running on OpenStreetMap road data.",
              href: "https://project-osrm.org",
            },
            {
              name: "Nominatim", badge: "Geocoding",
              desc: "Address-to-coordinate lookup (geocoding) uses Nominatim, an OpenStreetMap-based geocoder.",
              href: "https://nominatim.openstreetmap.org",
            },
          ].map(src => (
            <div key={src.name} style={{
              display: "flex", gap: 16, alignItems: "flex-start",
              padding: "16px 18px",
              background: "var(--white)", border: "1px solid var(--b1)",
              borderRadius: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{src.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-60)", background: "rgba(28,25,23,0.05)", padding: "2px 8px", borderRadius: 999 }}>{src.badge}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-80)", lineHeight: 1.65 }}>{src.desc}</p>
              </div>
              <a href={src.href} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "var(--forest-mid)", textDecoration: "none", marginTop: 2 }}>
                Website →
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* Tech stack */}
      <Section title="Built with">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Next.js 15", "TypeScript", "Leaflet.js", "Supabase", "Tailwind CSS", "Overpass API", "Foursquare API", "OSRM"].map(tech => (
            <span key={tech} style={{
              padding: "5px 13px", borderRadius: 999,
              background: "var(--off-white)", border: "1px solid var(--b1)",
              fontSize: 12, fontWeight: 600, color: "var(--ink-80)",
            }}>
              {tech}
            </span>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div style={{
        marginTop: 48,
        background: "linear-gradient(135deg, rgba(45,122,85,0.15) 0%, rgba(212,136,10,0.05) 100%)",
        border: "1px solid rgba(45,122,85,0.15)",
        borderRadius: 18, padding: "28px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
      }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            Ready to explore?
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-60)" }}>Open the map and start discovering restaurants around you.</p>
        </div>
        <a href="/" style={{
          padding: "11px 24px", borderRadius: 12,
          background: "var(--forest-mid)", color: "white",
          textDecoration: "none", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(45,122,85,0.15)",
          flexShrink: 0,
          transition: "background 120ms",
        }}>
          Open the map →
        </a>
      </div>
    </InfoPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={{
        margin: "0 0 18px", fontSize: 18, fontWeight: 600,
        letterSpacing: "-0.03em", color: "var(--ink)",
        paddingBottom: 12, borderBottom: "1px solid rgba(28,25,23,0.06)",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
