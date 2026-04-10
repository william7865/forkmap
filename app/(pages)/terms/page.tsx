// ============================================================
// app/(pages)/terms/page.tsx — Terms of Service
// ============================================================

import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/PageLayout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Forkmap",
  description: "Forkmap terms of use.",
};

export default function TermsPage() {
  return (
    <InfoPage headerLabel="Terms of Service">
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", margin: "0 0 8px" }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-60)", margin: "0 0 40px" }}>Last updated: March 2026</p>

      <Section title="Acceptance of terms">
        <p>By using Forkmap, you agree to these terms. If you do not agree, please do not use the application.</p>
      </Section>
      <Section title="What Forkmap is">
        <p>Forkmap is a restaurant discovery tool that aggregates publicly available data from OpenStreetMap and Foursquare. It is provided as-is, for informational purposes only.</p>
      </Section>
      <Section title="Your account">
        <p>You are responsible for maintaining the security of your account credentials. You must not use Forkmap for any illegal or harmful purpose. You must be at least 13 years old to create an account.</p>
      </Section>
      <Section title="Data accuracy">
        <p>Restaurant data comes from OpenStreetMap, which is community-maintained. We do not guarantee the accuracy, completeness, or currency of any restaurant information. Always verify critical details (opening hours, address) directly with the restaurant.</p>
      </Section>
      <Section title="Intellectual property">
        <p>The Forkmap interface, code, and branding are our property. Restaurant data is © OpenStreetMap contributors under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: "#e05a1e" }}>ODbL licence</a>. Ratings data is provided by Foursquare.</p>
      </Section>
      <Section title="Limitation of liability">
        <p>Forkmap is provided &quot;as is&quot; without warranty of any kind. We are not liable for any damages arising from your use of the application, reliance on restaurant data, or any interruption of service.</p>
      </Section>
      <Section title="Termination">
        <p>We reserve the right to suspend or terminate your account at any time for violation of these terms. You may delete your account at any time from <Link href="/settings" style={{ color: "#e05a1e" }}>Settings</Link>.</p>
      </Section>
      <Section title="Changes to these terms">
        <p>We may update these terms from time to time. Continued use of Forkmap after changes constitutes acceptance of the new terms.</p>
      </Section>
      <Section title="Contact">
        <p>Questions? Use the <Link href="/contact" style={{ color: "#e05a1e" }}>Contact page</Link> or email <a href="mailto:hello@forkmap.app" style={{ color: "#e05a1e" }}>hello@forkmap.app</a>.</p>
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
