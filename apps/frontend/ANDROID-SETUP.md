# Android TWA Setup Guide

## Digital Asset Links Configuration

The `assetlinks.json` file contains your app's signing certificate fingerprint and should **NOT** be committed to the repository for security reasons.

### Generate SHA256 Fingerprint

To generate the SHA256 fingerprint from your keystore:

```bash
keytool -list -v -keystore android.keystore -alias android -storepass YOUR_KEYSTORE_PASSWORD -keypass YOUR_KEY_PASSWORD
```

Look for the line starting with `SHA256:` in the output.

### Create assetlinks.json

1. Copy the example file:
   ```bash
   cp public/.well-known/assetlinks.json.example public/.well-known/assetlinks.json
   ```

2. Replace `REPLACE_WITH_YOUR_SIGNING_CERTIFICATE_FINGERPRINT` with your actual SHA256 fingerprint (format: `AA:BB:CC:...`)

3. Upload this file to your web server at: `https://notepostflow.com/.well-known/assetlinks.json`

### Verify Configuration

Test your Digital Asset Links setup:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://notepostflow.com&relation=delegate_permission/common.handle_all_urls
```

## Security Best Practices

- **NEVER** commit `android.keystore` to version control
- **NEVER** commit `assetlinks.json` with real fingerprint to public repositories
- Store keystore password in environment variables or secure vaults
- Use different keystores for debug and release builds
- Keep backup of production keystore in secure location

## Build Commands

### Generate APK
```bash
cd apps/frontend
./gradlew assembleRelease
```

### Generate AAB (for Play Store)
```bash
cd apps/frontend
./gradlew bundleRelease
```

### Sign APK manually
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore android.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk android
```

## Play Store Deployment

1. Generate release AAB: `./gradlew bundleRelease`
2. Upload to Play Console: `apps/frontend/android-app/build/outputs/bundle/release/android-app-release.aab`
3. Upload `assetlinks.json` to your web server
4. Wait 24-48h for Google to verify Digital Asset Links
5. Test deep linking after verification

## Troubleshooting

### App doesn't open URLs automatically
- Verify assetlinks.json is accessible at `https://notepostflow.com/.well-known/assetlinks.json`
- Check fingerprint matches your release keystore
- Wait 24-48h after first deployment for Google verification
- Test using: `adb shell am start -a android.intent.action.VIEW -d "https://notepostflow.com"`

### Build errors
- Ensure keystore path is correct in `twa-manifest.json`
- Verify keystore password is set correctly
- Check that Android SDK is installed and up to date
