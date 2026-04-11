"use client";
import NavRail from "./NavRail";
import BottomNav from "./BottomNav";

export default function NavWrapper() {
  return (
    <>
      {/* Desktop: sidebar rail — shown via CSS */}
      <div style={{ display: "none" }} className="nav-rail-wrap">
        <NavRail />
      </div>
      {/* Mobile: bottom nav — shown via CSS */}
      <div style={{ display: "none" }} className="bottom-nav-wrap">
        <BottomNav />
      </div>
      <style>{`
        @media (min-width: 769px) { .nav-rail-wrap { display: block !important; } }
        @media (max-width: 768px) { .bottom-nav-wrap { display: block !important; } }
      `}</style>
    </>
  );
}
