// lib/admin.ts — admin allowlist for moderation (verification requests).
// Admins are configured via the ADMIN_USER_IDS env var (comma-separated
// Supabase user ids). Server-only — never trust a client-supplied flag.

/** Parse a comma/space-separated allowlist string into a Set of ids. */
export function parseAdminIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

/** Whether the given user id is an admin (per ADMIN_USER_IDS). */
export function isAdmin(userId: string): boolean {
  return parseAdminIds(process.env.ADMIN_USER_IDS).has(userId)
}
