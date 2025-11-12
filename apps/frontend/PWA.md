# NotePostFlow - Progressive Web App (PWA)

NotePostFlow est maintenant une **Progressive Web App** installable sur mobile et desktop!

## Qu'est-ce qu'une PWA?

Une PWA est une application web qui peut être installée sur n'importe quel appareil comme une app native:
- ✅ Icône sur l'écran d'accueil
- ✅ Fonctionne offline (cache intelligent)
- ✅ Notifications push (à venir)
- ✅ Expérience native (plein écran, pas de barre d'adresse)
- ✅ Mises à jour automatiques

## Installation

### Sur Android/iOS (Mobile)

1. Ouvre **Chrome** ou **Safari** et va sur https://notepostflow.com
2. Clique sur le menu (⋮) → **Installer l'application** ou **Ajouter à l'écran d'accueil**
3. Confirme l'installation
4. L'app apparaît sur ton écran d'accueil!

### Sur Desktop (Windows/Mac/Linux)

1. Ouvre **Chrome** ou **Edge** et va sur https://notepostflow.com
2. Dans la barre d'adresse, clique sur l'icône d'installation ⊕
3. Clique sur **Installer**
4. L'app s'ouvre dans sa propre fenêtre!

## Configuration

### Fichiers PWA

- **`public/manifest.json`** - Métadonnées de l'app (nom, icônes, couleurs)
- **`public/sw.js`** - Service Worker (généré automatiquement)
- **`public/icon-*.png`** - Icônes de l'app (à ajouter)

### Icônes requises

Pour que la PWA fonctionne, tu dois ajouter ces icônes dans `public/`:

```
public/
├── icon-192x192.png    # Icône 192x192px
├── icon-512x512.png    # Icône 512x512px
├── apple-touch-icon.png # Icône iOS 180x180px
└── favicon.ico          # Favicon
```

**Générateur d'icônes:** https://realfavicongenerator.net/

## Fonctionnalités PWA

### Cache Offline

next-pwa met automatiquement en cache:
- Pages visitées
- Images
- Assets statiques (CSS, JS)
- Requêtes API (avec stratégie intelligente)

### Stratégies de cache

```typescript
// Configuration dans next.config.ts
workboxOptions: {
  cacheOnFrontEndNav: true,           // Cache lors de la navigation
  aggressiveFrontEndNavCaching: true, // Cache agressif
  reloadOnOnline: true,                // Recharge quand connexion revient
}
```

### Mise à jour automatique

Le Service Worker vérifie les mises à jour automatiquement:
- Détecte les nouvelles versions
- Télécharge en arrière-plan
- Applique au prochain rechargement

## Build & Déploiement

### Build Production

```bash
cd apps/frontend
npm run build
```

Le build génère automatiquement:
- `public/sw.js` - Service Worker
- `public/workbox-*.js` - Scripts Workbox

### Vérification PWA

Après le build, vérifie que la PWA fonctionne:

1. **Chrome DevTools** → **Application** tab
   - ✅ Manifest présent
   - ✅ Service Worker enregistré
   - ✅ Cache Storage actif

2. **Lighthouse** → **Run Audit** → **Progressive Web App**
   - Score minimum: 90/100

### Déploiement

```bash
# Commit les changements
git add -A
git commit -m "feat: add PWA support"
git push

# Vercel déploie automatiquement
```

## Passer au Play Store (TWA)

Pour mettre la PWA sur Google Play Store, utilise **TWA (Trusted Web Activity)**:

### 1. Installer Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### 2. Initialiser le projet Android

```bash
bubblewrap init --manifest https://notepostflow.com/manifest.json
```

Réponds aux questions:
- **Domain**: notepostflow.com
- **Package Name**: com.notepostflow.app
- **App Name**: NotePostFlow
- **Display Mode**: standalone
- **Orientation**: portrait
- **Theme Color**: #000000
- **Background Color**: #ffffff

### 3. Générer l'APK

```bash
bubblewrap build
```

L'APK est généré dans: `./app-release-signed.apk`

### 4. Tester sur appareil

```bash
adb install app-release-signed.apk
```

### 5. Créer le App Bundle pour Play Store

```bash
bubblewrap build --target bundle
```

Le bundle est généré: `./app-release-bundle.aab`

### 6. Upload sur Play Console

1. Va sur https://play.google.com/console
2. Crée une nouvelle app
3. Upload `app-release-bundle.aab`
4. Remplis les informations (description, screenshots, etc.)
5. Soumets pour review

**Temps de review:** 1-3 jours généralement

## Avantages PWA + TWA

**PWA seule:**
- Installation depuis le navigateur
- Mises à jour instantanées
- Aucun frais de store
- Multi-plateforme (Android, iOS, Desktop)

**TWA (Play Store):**
- Visibilité sur Google Play
- Notifications push natives
- Accès aux fonctionnalités Android avancées
- Crédibilité (utilisateurs font plus confiance aux apps du store)

**Best of both worlds:**
- Les utilisateurs peuvent installer depuis le web OU le store
- Une seule base de code
- Mises à jour via le web (pas besoin de republier sur le store)

## Ressources

- **PWA Docs**: https://web.dev/progressive-web-apps/
- **next-pwa**: https://github.com/DuCanhGH/next-pwa
- **Bubblewrap**: https://github.com/GoogleChromeLabs/bubblewrap
- **TWA Guide**: https://developer.chrome.com/docs/android/trusted-web-activity/

## Checklist Finale

Avant de déployer en production:

- [ ] Ajouter les icônes (192x192, 512x512)
- [ ] Tester l'installation PWA sur mobile
- [ ] Tester l'installation PWA sur desktop
- [ ] Vérifier Lighthouse score (>90)
- [ ] Tester le mode offline
- [ ] Configurer le TWA pour Play Store

**Note:** Les icônes sont le seul élément manquant actuellement. Tout le reste est configuré et fonctionnel! 🚀
