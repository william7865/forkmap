// ============================================================
// app/api/contact/route.ts — POST /api/contact
//
// Handles contact form submissions.
// Sends an email via Resend (https://resend.com) if
// RESEND_API_KEY is set — otherwise logs to console (dev mode).
//
// To enable real email:
//   1. Sign up at resend.com (free tier: 100 emails/day)
//   2. Add RESEND_API_KEY and CONTACT_EMAIL_TO to .env.local
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email().max(200),
  topic:   z.string().max(100),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  // Max 5 contact messages per 10 minutes per IP — anti-spam
  const limited = rateLimit(req, {
    limit: 5,
    windowMs: 600_000,
    message: "Too many messages sent. Please wait before sending another.",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map(e => e.message).join("; ") },
      { status: 400 }
    );
  }

  const { name, email, topic, message } = parsed.data;

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL_TO ?? "hello@forkmap.app";

  if (resendApiKey) {
    // ── Send via Resend ──────────────────────────────────────
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    "Forkmap Contact <noreply@forkmap.app>",
          to:      [toEmail],
          replyTo: email,
          subject: `[Forkmap] ${topic} — from ${name}`,
          text: [
            `From: ${name} <${email}>`,
            `Topic: ${topic}`,
            "",
            message,
          ].join("\n"),
          html: `
            <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
            <p><strong>Topic:</strong> ${topic}</p>
            <hr/>
            <p style="white-space:pre-wrap">${message.replace(/</g, "&lt;")}</p>
          `,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("[POST /api/contact] Resend error:", errBody);
        return NextResponse.json(
          { error: "Failed to send message. Please try again." },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error("[POST /api/contact] Network error:", err);
      return NextResponse.json(
        { error: "Failed to send message. Please try again." },
        { status: 502 }
      );
    }
  } else {
    // ── Dev fallback — log to console ────────────────────────
    console.log("\n📧 [CONTACT FORM SUBMISSION - no RESEND_API_KEY set]");
    console.log(`From: ${name} <${email}>`);
    console.log(`Topic: ${topic}`);
    console.log(`Message:\n${message}`);
    console.log("──────────────────────────────────────────\n");
    // Return success in dev so the UI flow can be tested
  }

  return NextResponse.json({ success: true });
}
