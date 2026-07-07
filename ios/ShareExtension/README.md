# Forkmap — iOS Share Extension

Fait apparaître **Forkmap** dans la feuille de partage iOS. Partager un lien
TikTok/Instagram/… → l'extension ouvre l'app sur `com.forkmap.app://import?url=<lien>`
→ l'app ouvre la feuille d'import (`CapacitorInit` + `ImportParamWatcher`).

## ✅ Déjà installé

Le target `ShareExtension` a été **ajouté au projet Xcode programmatiquement**
(via `ios/App/add_share_extension.rb`, gem `xcodeproj`). Il :
- compile, linke et s'embarque dans l'app (`App.app/PlugIns/ShareExtension.appex`),
- **survit à `npx cap sync ios`** (le flux `build:mobile` le conserve),
- s'installe/lance au simulateur (validation iOS OK).

Fichiers du target : `ios/App/ShareExtension/ShareViewController.swift` + `Info.plist`.
Pas d'App Group : l'app hôte est ouverte via le custom scheme `com.forkmap.app`.

## Ce qu'il reste (toi)

1. **Signing device** : à la 1re ouverture dans Xcode, sélectionne ton équipe
   (`7DF6272J7M`, déjà en `DEVELOPMENT_TEAM`) pour le target `ShareExtension`
   si Xcode le demande. Signing automatique.
2. **Tester sur un iPhone réel** : les extensions de partage ne se déclenchent pas
   au simulateur via CLI. Safari/TikTok → Partager → **Forkmap**.

## Si le target disparaît (ré-ajout)

```bash
cd ios/App && ruby add_share_extension.rb
```
Le script est idempotent (supprime puis re-crée le target proprement).
