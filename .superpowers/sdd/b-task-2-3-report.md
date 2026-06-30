# Rapport — Amis Étape B : Tasks 2 & 3

**Date :** 2026-06-30  
**Branche :** `feat/amis-etape-b`

## Task 2 — GET /api/users/[username]/profile

**Fichier créé :** `app/api/users/[username]/profile/route.ts`

- Route Next.js 15 avec `params` en tant que `Promise<{ username: string }>`.
- Rate-limit 60 req/min, auth bearer via `requireUser`, lecture via `getPublicProfileBundle(meId, username)`.
- Retourne `{ data: PublicProfileBundle }` (200) ou `{ error }` (404 / 500).
- Route émise dans le build : `ƒ /api/users/[username]/profile`.

## Task 3 — FriendButton

**Fichier créé :** `components/social/FriendButton.tsx`

- Composant client React avec état d'amitié local optimiste.
- Quatre états : `none` → bouton "Ajouter en ami", `pending_sent` → pill "Demande envoyée", `pending_received` → bouton "Accepter la demande", `friends` → pill "Amis".
- Appelle `sendRequest(userId)` / `accept(userId)` depuis `useFriends()`.
- Mise à jour locale avant await (optimiste) + callback `onChange(newStatus)`.
- Utilise `.btn-primary` et la `Pill` interne avec variables CSS (`--r-pill`, `--bone`, `--text-2`).

## Vérification

```
npm run lint       → 0 errors, 3 warnings (2 pre-existants PlaceDetail + 1 param `tone` non utilisé dans Pill — issu du brief exact)
npm run type-check → PASS (aucune erreur)
npm run build      → PASS — route /api/users/[username]/profile émise
```

## Remarque

Le paramètre `tone` dans la fonction interne `Pill` est présent dans le brief mais non consommé dans le rendu actuel (prévu pour une extension future). Lint génère un warning (pas une erreur). Transcription exacte conservée.
