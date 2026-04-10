// ============================================================
// app/(pages)/attribution/page.tsx — Data Attribution
// Required by the ODbL licence when using OpenStreetMap data.
// ============================================================

import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/PageLayout";

export const metadata: Metadata = {
  title: "Data Attribution — Forkmap",
  description: "Attribution for the data sources used by Forkmap.",
};

export default function AttributionPage() {
  const sources = [
    {
      name: "OpenStreetMap",
      badge: "ODbL",
      badgeColor: "#1a56c4",
      badgeBg: "rgba(66,133,244,0.08)",
      desc: "Restaurant locations, names, addresses, opening hours, cuisine types, and phone numbers are sourced from OpenStreetMap, a community-maintained map of the world.",
      credit: "© OpenStreetMap contributors",
      licence: "Open Database Licence (ODbL)",
      licenceUrl: "https://opendatacommons.org/licenses/odbl/",
      href: "https://www.openstreetmap.org",
    },
    {
      name: "Wikidata / Wikipedia",
      url: "https://www.wikidata.org",
      icon: "🌐",
      desc: "Descriptions, Michelin stars, Wikipedia excerpts, and distinctions via the Wikidata SPARQL API and Wikipedia REST API. Free, open, unlimited.",
      credit: "Wikimedia Foundation",
      licence: "CC0 / CC BY-SA",
    },
    {
      name: "Foursquare Places",
      badge: "API",
      badgeColor: "#0f6c52",
      badgeBg: "rgba(15,108,82,0.08)",
      desc: "Ratings, review counts, price levels, and category data are enriched via the Foursquare Places API.",
      credit: "Foursquare",
      licence: "Foursquare Terms of Service",
      licenceUrl: "https://foursquare.com/legal/terms",
      href: "https://developer.foursquare.com",
    },
    {
      name: "OSRM",
      badge: "Routing",
      badgeColor: "#7c3aed",
      badgeBg: "rgba(124,58,237,0.07)",
      desc: "Route calculations (walking, cycling, driving) are powered by the Open Source Routing Machine, built on OpenStreetMap road data.",
      credit: "© OSRM contributors",
      licence: "BSD 2-Clause",
      licenceUrl: "https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE.TXT",
      href: "https://project-osrm.org",
    },
    {
      name: "Nominatim",
      badge: "Geocoding",
      badgeColor: "#92400e",
      badgeBg: "rgba(146,64,14,0.07)",
      desc: "Address-to-coordinate lookup (geocoding) uses Nominatim, an open-source geocoder built on OpenStreetMap data.",
      credit: "© Nominatim / OpenStreetMap contributors",
      licence: "ODbL",
      licenceUrl: "https://opendatacommons.org/licenses/odbl/",
      href: "https://nominatim.openstreetmap.org",
    },
    {
      name: "Leaflet",
      badge: "Map library",
      badgeColor: "#166534",
      badgeBg: "rgba(22,101,52,0.07)",
      desc: "The interactive map is rendered using Leaflet, an open-source JavaScript mapping library.",
      credit: "© Leaflet contributors",
      licence: "BSD 2-Clause",
      licenceUrl: "https://github.com/Leaflet/Leaflet/blob/main/LICENSE",
      href: "https://leafletjs.com",
    },
  ];

  return (
    <InfoPage headerLabel="Data Attribution">
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", margin: "0 0 8px" }}>
        Data Attribution
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-60)", margin: "0 0 36px", lineHeight: 1.7 }}>
        Forkmap is built on open data from the following providers. We are grateful to these projects and their contributors.
      </p>

      {/* OSM required notice */}
      <div style={{
        background: "rgba(26,86,196,0.06)", border: "1px solid rgba(26,86,196,0.15)",
        borderRadius: 12, padding: "14px 18px", marginBottom: 28,
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a56c4" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p style={{ margin: 0, fontSize: 13, color: "#1a4a9e", lineHeight: 1.65 }}>
          <strong>OpenStreetMap attribution is legally required</strong> under the Open Database Licence (ODbL). Any application using OpenStreetMap data must credit "© OpenStreetMap contributors" in a visible location.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sources.map(src => (
          <div key={src.name} style={{
            background: "var(--white)", border: "1px solid rgba(28,25,23,0.07)",
            borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 1px 4px rgba(28,25,23,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>{src.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: src.badgeColor, background: src.badgeBg }}>{src.badge}</span>
              </div>
              <a href={src.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 600, color: "var(--forest-mid)", textDecoration: "none", flexShrink: 0, marginTop: 2 }}>
                Website →
              </a>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-80)", lineHeight: 1.65 }}>{src.desc}</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>
                Credit: <strong style={{ color: "var(--ink-80)" }}>{src.credit}</strong>
              </span>
              <a href={src.licenceUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--forest-mid)", textDecoration: "none", fontWeight: 500 }}>
                Licence: {src.licence} →
              </a>
            </div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
