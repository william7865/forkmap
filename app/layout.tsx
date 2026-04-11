import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/states/ErrorBoundary";
import { LanguageProvider } from "@/lib/i18n/useLanguage";
import NavWrapper from "@/components/ui/NavWrapper";

export const metadata: Metadata = {
  title: "Forkmap — Find exceptional restaurants near you",
  description: "Discover the best restaurants near you. Real data, beautiful maps, smart routing.",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ height: "100%", colorScheme: "light" }}>
      <body style={{ height: "100%", margin: 0, padding: 0 }} suppressHydrationWarning>
        <LanguageProvider>
          <ErrorBoundary>
            <NavWrapper />
            {/* Push content right on desktop, up on mobile */}
            <div className="main-content-offset">
              {children}
            </div>
            <style>{`
              @media (min-width: 769px) { .main-content-offset { margin-left: 52px; } }
              @media (max-width: 768px) { .main-content-offset { margin-bottom: 56px; } }
            `}</style>
          </ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  );
}
