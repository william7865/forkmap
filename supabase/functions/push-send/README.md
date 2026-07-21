# Push Forkmap — Edge Function `push-send`

Envoie les notifications **système** (app fermée) vers **FCM** (Android/web) et **APNs** (iOS).
Les notifs **in-app** (cloche) fonctionnent sans rien de tout ça — ceci n'ajoute que le push OS.

```
Forkmap (Vercel)  --POST {tokens,title,body,data}-->  push-send (Supabase)  -->  FCM / APNs  -->  téléphone
   sendPushToUser()          + Bearer PUSH_WEBHOOK_SECRET
```

## 1. Déployer la fonction

```bash
supabase functions deploy push-send --no-verify-jwt
# URL obtenue : https://<PROJECT_REF>.supabase.co/functions/v1/push-send
```

## 2. Secrets de la fonction (Supabase)

```bash
# Secret partagé (le même que côté Vercel)
supabase secrets set PUSH_WEBHOOK_SECRET="un-secret-long-aleatoire"

# ── FCM (Android / web) — compte de service Firebase ──
# Firebase Console → Paramètres du projet → Comptes de service → Générer une clé privée (JSON)
supabase secrets set FCM_PROJECT_ID="ton-projet-firebase"
supabase secrets set FCM_CLIENT_EMAIL="xxx@ton-projet.iam.gserviceaccount.com"
supabase secrets set FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── APNs (iOS) — clé .p8 Apple Developer ──
# developer.apple.com → Certificates, IDs & Profiles → Keys → clé APNs (.p8)
supabase secrets set APNS_KEY_ID="ABC123DEFG"          # Key ID de la clé .p8
supabase secrets set APNS_TEAM_ID="TEAMID1234"          # ton Team ID Apple
supabase secrets set APNS_BUNDLE_ID="com.forkmap.app"
supabase secrets set APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
supabase secrets set APNS_PRODUCTION="false"            # "true" pour l'App Store, "false" en dev/TestFlight
```

> Astuce `\n` : garde les sauts de ligne des clés sous forme `\n` littéraux (le code les reconvertit).

## 3. Variables côté Vercel

Project → Settings → Environment Variables (**Production**), puis **Redeploy** :

```
PUSH_WEBHOOK_URL     = https://<PROJECT_REF>.supabase.co/functions/v1/push-send
PUSH_WEBHOOK_SECRET  = un-secret-long-aleatoire   (LE MÊME qu'à l'étape 2)
```

C'est tout côté serveur : `lib/db.ts → sendPushToUser()` postera automatiquement sur cette URL
à chaque message / demande d'ami.

## 4. Prérequis app (pour recevoir vraiment le push)

- **iOS** : capability _Push Notifications_ + _Background Modes → Remote notifications_ dans Xcode,
  et un **appareil physique** (le simulateur ne reçoit pas de push APNs). Les tokens iOS collectés
  par Capacitor sont des tokens **APNs** → gérés par la branche APNs ci-dessus.
- **Android** : `google-services.json` dans `android/app/` (Firebase) → les tokens sont des tokens **FCM**.
- Le token est enregistré à la connexion (`CapacitorInit` → `/api/push-tokens`, table `push_tokens`).

## 5. Tester

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/push-send" \
  -H "Authorization: Bearer un-secret-long-aleatoire" \
  -H "Content-Type: application/json" \
  -d '{"tokens":[{"token":"<TOKEN_APPAREIL>","platform":"ios"}],"title":"Test","body":"Coucou 👋"}'
# → {"sent":1,"failed":0}
```

## Payload reçu (référence)

```json
{
  "tokens": [{ "token": "…", "platform": "ios" | "android" | "web" }],
  "title": "Nouveau message",
  "body": "William : Coucou",
  "data": { "type": "message", "username": "william" }
}
```
