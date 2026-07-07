# Forkmap — iOS Share Extension (setup)

Fait apparaître **Forkmap** dans la feuille de partage iOS. Partager un lien
TikTok/Instagram/… → l'extension ouvre l'app sur `com.forkmap.app://import?url=<lien>`
→ l'app ouvre la feuille d'import (déjà branché : `CapacitorInit` + `ImportParamWatcher`).

> Ces étapes sont **manuelles dans Xcode** (impossible d'ajouter un target de façon
> fiable en éditant `project.pbxproj` à la main). ~10 min, une seule fois.

## Étapes

1. Ouvre `ios/App/App.xcworkspace` dans Xcode.
2. **File → New → Target… → Share Extension**. Nomme-le `ShareExtension`.
   - Bundle Identifier : `com.forkmap.app.share`.
   - Décoche "Activate scheme" si proposé.
3. Xcode crée un dossier `ShareExtension/` avec un `ShareViewController.swift`,
   un `Info.plist` et un `MainInterface.storyboard`.
   - **Remplace** le `ShareViewController.swift` généré par celui de ce dossier
     (`ios/ShareExtension/ShareViewController.swift`).
   - **Remplace** le `Info.plist` généré par celui de ce dossier
     (`ios/ShareExtension/Info.plist`).
   - **Supprime** `MainInterface.storyboard` (l'extension n'a pas d'UI) et retire
     la clé `NSExtensionMainStoryboard` si Xcode l'a ajoutée (notre Info.plist
     utilise `NSExtensionPrincipalClass` à la place).
4. Cible de déploiement : mets la même iOS Deployment Target que l'app.
5. Signing : sélectionne ton équipe de dev pour le target `ShareExtension`
   (signing automatique). **Pas besoin d'App Group** — on passe par l'URL scheme.
6. Vérifie que le scheme `com.forkmap.app` est bien déclaré dans
   `ios/App/App/Info.plist` (`CFBundleURLSchemes`) — c'est déjà le cas.
7. Build & run sur un **appareil réel** (les extensions de partage ne se testent
   pas bien au simulateur). Depuis Safari/TikTok → Partager → **Forkmap**.

## Notes
- L'ouverture de l'app hôte depuis l'extension utilise le responder-chain
  `openURL:` (méthode éprouvée pour les share extensions).
- Si rien ne s'ouvre : vérifie le Bundle ID du target, le scheme, et que
  l'app principale est installée.
- `npx cap sync ios` **ne recrée pas** le target — l'ajout Xcode est persistant.
