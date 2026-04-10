// ============================================================
// app/(pages)/privacy/page.tsx — Privacy Policy
// ============================================================

import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/PageLayout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Forkmap",
  description: "How Forkmap collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <InfoPage headerLabel="Privacy Policy">
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", margin: "0 0 8px" }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-60)", margin: "0 0 40px" }}>Last updated: March 2026</p>

      <Section title="Who we are">
        <p>Forkmap is a restaurant discovery app. We are not affiliated with OpenStreetMap, Foursquare, or any mapping provider. This policy explains what personal data we collect and how we use it.</p>
      </Section>
      <Section title="Data we collect">
        <p><strong>Account data:</strong> If you create an account, we store your email address and authentication credentials (via Supabase Auth). If you sign in with Google, we receive your name, email, and profile photo from Google.</p>
        <p><strong>Saved places:</strong> When you favourite a restaurant, we store the restaurant&apos;s OpenStreetMap ID, name, and coordinates in our database.</p>
        <p><strong>Location data:</strong> Your location is processed in your browser to centre the map. We do <strong>not</strong> store your GPS coordinates on our servers.</p>
        <p><strong>Usage data:</strong> We may collect anonymised usage metrics via server logs. No third-party analytics are loaded.</p>
      </Section>
      <Section title="How we use your data">
        <p>We use your data solely to provide Forkmap&apos;s features: authenticating you, syncing your saved places, and showing your location on the map. We do <strong>not</strong> sell or share your data with advertisers.</p>
      </Section>
      <Section title="Third-party services">
        <p><strong>OpenStreetMap:</strong> Restaurant data sourced under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: "#e05a1e" }}>ODbL licence</a>.</p>
        <p><strong>Foursquare:</strong> Ratings and review counts via the Foursquare Places API. See <a href="https://foursquare.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#e05a1e" }}>Foursquare&apos;s privacy policy</a>.</p>
        <p><strong>Supabase:</strong> Authentication and database storage in the EU. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#e05a1e" }}>Supabase&apos;s privacy policy</a>.</p>
        <p><strong>OSRM:</strong> Route calculations — only coordinates are sent, no personal data.</p>
      </Section>
      <Section title="Data retention">
        <p>We keep your data until you delete your account. You can do so at any time from <Link href="/settings" style={{ color: "#e05a1e" }}>Settings</Link>.</p>
      </Section>
      <Section title="Your rights">
        <p>You can access, correct, or delete your data at any time. Email <a href="mailto:privacy@forkmap.app" style={{ color: "#e05a1e" }}>privacy@forkmap.app</a> or use the <Link href="/contact" style={{ color: "#e05a1e" }}>Contact page</Link>.</p>
      </Section>
      <Section title="Cookies">
        <p>We use a single authentication cookie set by Supabase to keep you logged in. No advertising or tracking cookies are used.</p>
      </Section>
      <Section title="Contact">
        <p>Questions about this policy? Email <a href="mailto:privacy@forkmap.app" style={{ color: "#e05a1e" }}>privacy@forkmap.app</a>.</p>
      </Section>
    </InfoPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid rgba(28,25,23,0.06)" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "var(--ink-80)", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
