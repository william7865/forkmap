// lib/api.ts
// Wraps fetch() with optional API base URL for Capacitor builds.
// Set NEXT_PUBLIC_API_URL=https://yourapp.vercel.app when building for mobile.
// Leave unset (empty) for Vercel deployments — calls stay relative.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return fetch(`${base}${path}`, init);
}
