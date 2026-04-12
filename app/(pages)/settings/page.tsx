"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { InfoPage } from "@/components/ui/PageLayout";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/hooks/useAuth";

// ── Icons ─────────────────────────────────────────────────
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const { isReady, auth } = useAuthGuard();
  const router = useRouter();
  const sb = getSupabaseBrowserClient();

  // Profile state
  const [displayName,  setDisplayName]  = useState("");
  const [nameState,    setNameState]    = useState<SaveState>("idle");

  // Password state
  const [_currentPw,  setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [pwState,     setPwState]     = useState<SaveState>("idle");
  const [pwError,     setPwError]     = useState("");
  const [showPw,      setShowPw]      = useState(false);

  // Delete account
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteEmail,  setDeleteEmail]  = useState("");
  const [deleting,     setDeleting]     = useState(false);
  const [signingOut,   setSigningOut]   = useState(false);

  // Initialise display name from auth once ready
  const initialised = useRef(false);
  if (isReady && !initialised.current) {
    initialised.current = true;
    const name = auth.user?.user_metadata?.full_name ?? auth.user?.email?.split("@")[0] ?? "";
    setDisplayName(name);
  }

  if (!isReady) {
    return (
      <InfoPage headerLabel="Settings">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--bone)", borderTop: "3px solid var(--forest-mid)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </InfoPage>
    );
  }

  const user         = auth.user!;
  const avatarUrl    = user.user_metadata?.avatar_url;
  const currentName  = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "";
  const initials     = currentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const isGoogleUser = user.app_metadata?.provider === "google";

  // ── Save display name ──────────────────────────────────
  const saveName = async () => {
    if (!displayName.trim() || displayName === currentName) return;
    setNameState("saving");
    const { error } = await sb.auth.updateUser({ data: { full_name: displayName.trim() } });
    setNameState(error ? "error" : "saved");
    setTimeout(() => setNameState("idle"), 2500);
  };

  // ── Change password ────────────────────────────────────
  const changePassword = async () => {
    setPwError("");
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    setPwState("saving");
    const { error } = await sb.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); setPwState("error"); }
    else { setPwState("saved"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    setTimeout(() => setPwState("idle"), 2500);
  };

  // ── Sign out ───────────────────────────────────────────
  const signOut = async () => {
    setSigningOut(true);
    await auth.signOut();
    router.replace("/");
  };

  // ── Delete account ─────────────────────────────────────
  const deleteAccount = async () => {
    if (deleteEmail !== user.email) return;
    setDeleting(true);

    try {
      // Get the current session token to authenticate the request
      const sb = getSupabaseBrowserClient();
      const { data: { session } } = await sb.auth.getSession();
      const authHeader: HeadersInit = session?.access_token
        ? { "Authorization": `Bearer ${session.access_token}` }
        : {};

      // This calls DELETE /api/account which:
      // 1. Deletes all favorites from the DB
      // 2. Deletes the Supabase Auth user (permanent, GDPR Art. 17)
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: authHeader,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete account. Please try again or contact support.");
        setDeleting(false);
        return;
      }

      // Sign out locally after server confirms deletion
      await auth.signOut();
      router.replace("/");
    } catch {
      alert("An unexpected error occurred. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <InfoPage headerLabel="Settings" maxWidth={640}>
      <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--ink)" }}>
        Settings
      </h1>
      <p style={{ margin: "0 0 36px", fontSize: 14, color: "var(--ink-60)" }}>
        Manage your profile and account preferences.
      </p>

      {/* ── Avatar ── */}
      <Card title="Profile photo">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, overflow: "hidden",
              background: "linear-gradient(135deg, var(--forest-mid), var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(45,122,85,0.15)",
            }}>
              {avatarUrl
                ? <Image src={avatarUrl} alt={currentName} width={72} height={72} style={{ objectFit: "cover" }} />
                : <span style={{ fontSize: 22, fontWeight: 600, color: "white" }}>{initials}</span>
              }
            </div>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{currentName}</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ink-60)" }}>
              {isGoogleUser ? "Profile photo managed by Google" : "Avatar generated from your initials"}
            </p>
            {isGoogleUser && (
              <span style={{ fontSize: 11, background: "rgba(66,133,244,0.08)", color: "#1a56c4", border: "1px solid rgba(66,133,244,0.2)", padding: "3px 10px", borderRadius: 999, fontWeight: 600 }}>
                Google account
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Display name ── */}
      <Card title="Display name">
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            aria-label="Display name"
            style={inputStyle}
            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
          />
          <button onClick={saveName}
            disabled={!displayName.trim() || displayName === currentName || nameState === "saving"}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: nameState === "saved" ? "var(--green)" : "var(--forest-mid)",
              color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0, transition: "background 150ms",
              opacity: (!displayName.trim() || displayName === currentName) ? 0.4 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {nameState === "saved" ? <><IcoCheck /> Saved</> : nameState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
        {nameState === "error" && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--coral)" }}>Failed to save. Try again.</p>}
      </Card>

      {/* ── Email ── */}
      <Card title="Email address">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--off-white)", borderRadius: 10, border: "1px solid var(--b1)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-60)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <span style={{ fontSize: 13, color: "var(--ink-80)", fontWeight: 500 }}>{user.email}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-40)" }}>
          {isGoogleUser ? "Email is managed by your Google account and cannot be changed here." : "To change your email, contact support."}
        </p>
      </Card>

      {/* ── Password ── */}
      {!isGoogleUser && (
        <Card title="Change password">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PwField label="New password" value={newPw} onChange={setNewPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Min. 8 characters" />
            <PwField label="Confirm new password" value={confirmPw} onChange={setConfirmPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Repeat new password" />
            {pwError && <p style={{ margin: 0, fontSize: 12, color: "var(--coral)", fontWeight: 600 }}>{pwError}</p>}
            <button onClick={changePassword}
              disabled={!newPw || !confirmPw || pwState === "saving"}
              style={{
                alignSelf: "flex-start", padding: "10px 20px", borderRadius: 10, border: "none",
                background: pwState === "saved" ? "var(--green)" : "var(--forest-mid)",
                color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", opacity: (!newPw || !confirmPw) ? 0.4 : 1, transition: "background 150ms",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {pwState === "saved" ? <><IcoCheck /> Password updated</> : pwState === "saving" ? "Updating…" : "Update password"}
            </button>
          </div>
        </Card>
      )}

      {/* ── Danger zone ── */}
      <Card title="Account actions" danger>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Sign out */}
          <button onClick={signOut} disabled={signingOut} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
            background: "transparent", border: "1.5px solid var(--b2)",
            borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "background 100ms",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--off-white)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-80)" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <div>
              <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{signingOut ? "Signing out…" : "Sign out"}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--ink-60)" }}>Sign out of your account on this device</p>
            </div>
          </button>

          {/* Delete */}
          <button onClick={() => setDeleteModal(true)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
            background: "transparent", border: "1.5px solid rgba(197,48,48,0.2)",
            borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            transition: "background 100ms",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--coral-pale)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            <div>
              <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: "var(--coral)" }}>Delete account</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--ink-60)" }}>Permanently delete your account and all data</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Delete modal */}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDeleteModal(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.4)", backdropFilter: "blur(4px)" }}/>
          <div onClick={e => e.stopPropagation()} style={{
            position: "relative", background: "var(--white)", borderRadius: 20,
            padding: "28px 28px 24px", maxWidth: 380, width: "100%",
            boxShadow: "0 24px 64px rgba(28,25,23,0.2)",
            animation: "scaleIn 200ms cubic-bezier(0.16,1,0.3,1) both",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--coral-pale)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--ink)" }}>Delete your account?</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6 }}>
              This permanently deletes your account and all saved places. This cannot be undone.
              Type your email to confirm:
            </p>
            <input
              type="email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)}
              placeholder={user.email ?? "your@email.com"}
              aria-label="Confirm email to delete account"
              style={{ ...inputStyle, marginBottom: 14 }}
              onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setDeleteModal(false); setDeleteEmail(""); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid rgba(28,25,23,0.12)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink-80)", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleteEmail !== user.email || deleting} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: deleteEmail === user.email ? "var(--coral)" : "var(--cream)",
                color: deleteEmail === user.email ? "white" : "var(--ink-40)",
                cursor: deleteEmail === user.email ? "pointer" : "not-allowed",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                boxShadow: deleteEmail === user.email ? "0 4px 12px rgba(197,48,48,0.25)" : "none",
                transition: "all 150ms",
              }}>
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </InfoPage>
  );
}

function Card({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        margin: "0 0 12px", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
        textTransform: "uppercase", color: danger ? "var(--coral)" : "var(--ink-60)",
      }}>
        {title}
      </h2>
      <div style={{
        background: "var(--white)", border: `1px solid ${danger ? "rgba(197,48,48,0.12)" : "var(--b1)"}`,
        borderRadius: 14, padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(28,25,23,0.05)",
      }}>
        {children}
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-60)", marginBottom: 5 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} aria-label={label}
          style={{ ...inputStyle, paddingRight: 38 }}
          onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
        />
        <button onClick={onToggle} type="button" aria-label={show ? "Hide password" : "Show password"} style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: "var(--ink-60)", display: "flex", padding: 2,
        }}>
          {show
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid rgba(28,25,23,0.12)",
  background: "white", color: "var(--ink)",
  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
  outline: "none", transition: "border-color 120ms, box-shadow 120ms",
};
const focusStyle: React.CSSProperties = { borderColor: "var(--forest-mid)", boxShadow: "0 0 0 3px rgba(45,122,85,0.15)" };
const blurStyle:  React.CSSProperties = { borderColor: "rgba(28,25,23,0.12)", boxShadow: "none" };
