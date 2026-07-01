// ─────────────────────────────────────────────────────────────────────────
// Forkmap — Edge Function « push-send »
// Reçoit le payload envoyé par le serveur Forkmap (lib/db.ts → sendPushToUser)
// et relaie vers FCM (Android/web) + APNs (iOS).
//
//   POST  { tokens: [{ token, platform }], title, body, data }
//   Authorization: Bearer <PUSH_WEBHOOK_SECRET>   (doit matcher le secret Vercel)
//
// Déploiement :   supabase functions deploy push-send --no-verify-jwt
// (le --no-verify-jwt car on gère nous-mêmes l'auth via PUSH_WEBHOOK_SECRET)
//
// Secrets à définir (supabase secrets set … ou dashboard) — voir README.md.
// ─────────────────────────────────────────────────────────────────────────

interface TokenRef {
  token: string
  platform: 'ios' | 'android' | 'web'
}
interface Payload {
  tokens: TokenRef[]
  title: string
  body: string
  data?: Record<string, unknown>
}

const env = (k: string): string => Deno.env.get(k) ?? ''

// ── Helpers crypto (JWT) ───────────────────────────────────────────────────
function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/, '')
    .replace(/-----END[^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

// Les data FCM doivent être des chaînes.
function stringifyData(data?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(data ?? {})) out[k] = typeof v === 'string' ? v : JSON.stringify(v)
  return out
}

// ── FCM (Android / web) — HTTP v1 avec compte de service ───────────────────
let fcmTokenCache: { token: string; exp: number } | null = null

async function getFcmAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (fcmTokenCache && fcmTokenCache.exp > now + 60) return fcmTokenCache.token

  const email = env('FCM_CLIENT_EMAIL')
  const privateKey = env('FCM_PRIVATE_KEY').replace(/\\n/g, '\n')
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  )
  const jwt = `${unsigned}.${b64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('FCM auth failed: ' + JSON.stringify(json))
  fcmTokenCache = { token: json.access_token, exp: now + 3500 }
  return json.access_token
}

async function sendFcm(p: Payload, token: string): Promise<boolean> {
  const projectId = env('FCM_PROJECT_ID')
  const accessToken = await getFcmAccessToken()
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data: stringifyData(p.data),
      },
    }),
  })
  if (!res.ok) console.error('[fcm]', res.status, await res.text())
  return res.ok
}

// ── APNs (iOS) — HTTP/2 avec JWT ES256 (.p8) ───────────────────────────────
let apnsJwtCache: { jwt: string; iat: number } | null = null

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  // Un token APNs est valable ~1 h ; on le régénère toutes les 50 min.
  if (apnsJwtCache && now - apnsJwtCache.iat < 3000) return apnsJwtCache.jwt

  const keyId = env('APNS_KEY_ID')
  const teamId = env('APNS_TEAM_ID')
  const privateKey = env('APNS_PRIVATE_KEY').replace(/\\n/g, '\n')
  const header = { alg: 'ES256', kid: keyId }
  const claim = { iss: teamId, iat: now }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  )
  const jwt = `${unsigned}.${b64url(sig)}`
  apnsJwtCache = { jwt, iat: now }
  return jwt
}

async function sendApns(p: Payload, token: string): Promise<boolean> {
  const jwt = await getApnsJwt()
  const bundleId = env('APNS_BUNDLE_ID') || 'com.forkmap.app'
  const host = env('APNS_PRODUCTION') === 'true' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com'
  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: { title: p.title, body: p.body }, sound: 'default', badge: 1 },
      data: p.data ?? {},
    }),
  })
  if (!res.ok) console.error('[apns]', res.status, await res.text())
  return res.ok
}

// ── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // Auth : le secret partagé avec Vercel (PUSH_WEBHOOK_SECRET).
  const secret = env('PUSH_WEBHOOK_SECRET')
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  let p: Payload
  try {
    p = (await req.json()) as Payload
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  if (!p?.tokens?.length || !p.title || !p.body) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0
  await Promise.all(
    p.tokens.map(async (t) => {
      try {
        const ok = t.platform === 'ios' ? await sendApns(p, t.token) : await sendFcm(p, t.token)
        ok ? sent++ : failed++
      } catch (err) {
        console.error('[push]', t.platform, err)
        failed++
      }
    })
  )

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
