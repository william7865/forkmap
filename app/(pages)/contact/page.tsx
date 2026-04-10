"use client";

import { useState } from "react";
import Link from "next/link";
import { InfoPage } from "@/components/ui/PageLayout";

type Status = "idle" | "sending" | "success" | "error";

const TOPICS = [
  "General question",
  "Bug report",
  "Feature request",
  "Data error (wrong info on a restaurant)",
  "Account issue",
  "Other",
];

export default function ContactPage() {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [topic,   setTopic]   = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<Status>("idle");
  const [error,   setError]   = useState("");

  const valid = name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!valid) return;
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), topic, message: message.trim() }),
      });

      if (res.status === 429) {
        setStatus("error");
        setError("Too many messages sent. Please wait a few minutes before trying again.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send. Please try again or email us directly.");
    }
  };

  if (status === "success") {
    return (
      <InfoPage headerLabel="Contact">
        <div style={{ textAlign: "center", padding: "60px 0 40px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "#dcfce7", border: "1px solid rgba(27,127,79,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 28,
          }}>
            ✉️
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--ink)" }}>
            Message sent!
          </h1>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.7 }}>
            Thanks for reaching out, {name.split(" ")[0]}. We&apos;ll get back to you<br />
            at <strong style={{ color: "var(--ink-80)" }}>{email}</strong> within a few days.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => { setStatus("idle"); setName(""); setEmail(""); setMessage(""); }} style={{
              padding: "10px 20px", borderRadius: 10,
              border: "1.5px solid rgba(28,25,23,0.12)", background: "transparent",
              fontSize: 13, fontWeight: 600, color: "var(--ink-80)", cursor: "pointer", fontFamily: "inherit",
            }}>
              Send another
            </button>
            <Link href="/" style={{
              padding: "10px 20px", borderRadius: 10,
              background: "var(--forest-mid)", color: "white",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Back to map
            </Link>
          </div>
        </div>
      </InfoPage>
    );
  }

  return (
    <InfoPage headerLabel="Contact" maxWidth={600}>
      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--ink)" }}>
        Get in touch
      </h1>
      <p style={{ margin: "0 0 36px", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.7 }}>
        Have a question, spotted a data error, or want to suggest a feature?
        We read every message.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Name + Email row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Your name" required>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="William Lin"
              aria-label="Your name"
              style={inputStyle}
              onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
            />
          </Field>
          <Field label="Email address" required>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="william@example.com"
              aria-label="Email address"
              style={inputStyle}
              onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
            />
          </Field>
        </div>

        {/* Topic */}
        <Field label="Topic">
          <select value={topic} onChange={e => setTopic(e.target.value)} aria-label="Topic"
            style={{ ...inputStyle, cursor: "pointer" }}
            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
          >
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        {/* Message */}
        <Field label="Message" required hint="At least 10 characters">
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind…"
            rows={5}
            aria-label="Message"
            style={{ ...inputStyle, resize: "vertical", minHeight: 120, lineHeight: 1.6 }}
            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
          />
          <div style={{ textAlign: "right", marginTop: 4, fontSize: 11, color: message.length >= 10 ? "var(--green)" : "var(--ink-40)" }}>
            {message.length} / 10 min
          </div>
        </Field>

        {error && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--coral)", fontWeight: 600 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!valid || status === "sending"}
          style={{
            padding: "13px 24px", borderRadius: 12,
            background: valid ? "var(--forest-mid)" : "var(--cream)",
            color: valid ? "white" : "var(--ink-40)",
            border: "none", cursor: valid ? "pointer" : "not-allowed",
            fontSize: 14, fontWeight: 600, fontFamily: "inherit",
            boxShadow: valid ? "0 4px 16px rgba(45,122,85,0.15)" : "none",
            transition: "all 150ms ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {status === "sending"
            ? <><Spinner /> Sending…</>
            : "Send message →"
          }
        </button>

        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-40)", textAlign: "center" }}>
          You can also email us directly at{" "}
          <a href="mailto:hello@forkmap.app" style={{ color: "var(--forest-mid)", textDecoration: "none", fontWeight: 600 }}>
            hello@forkmap.app
          </a>
        </p>
      </div>
    </InfoPage>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-80)", letterSpacing: "0.01em" }}>
        {label}{required && <span style={{ color: "var(--forest-mid)", marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 500, color: "var(--ink-40)", marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }}/>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 10, border: "1.5px solid rgba(28,25,23,0.12)",
  background: "white", color: "var(--ink)",
  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
  outline: "none", transition: "border-color 120ms, box-shadow 120ms",
};
const focusStyle: React.CSSProperties = {
  borderColor: "var(--forest-mid)",
  boxShadow: "0 0 0 3px rgba(45,122,85,0.15)",
};
const blurStyle: React.CSSProperties = {
  borderColor: "rgba(28,25,23,0.12)",
  boxShadow: "none",
};
