# Play Store Screenshots

## Required Screenshots

The PWA manifest references two screenshots that need to be created:

1. **Wide Screenshot** (`screenshot-wide.png`)
   - Size: 1280x720 pixels
   - Format: PNG or JPEG
   - Shows app on tablet/landscape mode

2. **Narrow Screenshot** (`screenshot-narrow.png`)
   - Size: 720x1280 pixels
   - Format: PNG or JPEG
   - Shows app on phone/portrait mode

## How to Create Screenshots

### Option 1: Using Browser DevTools
1. Open https://notepostflow.com in Chrome
2. Press F12 to open DevTools
3. Click "Toggle device toolbar" (Ctrl+Shift+M)
4. For wide: Set to 1280x720
5. For narrow: Set to 720x1280
6. Take screenshot using DevTools screenshot feature

### Option 2: Using Playwright (Automated)
```bash
cd apps/frontend
npx playwright screenshot https://notepostflow.com screenshot-narrow.png --viewport-size=720,1280
npx playwright screenshot https://notepostflow.com screenshot-wide.png --viewport-size=1280,720
```

### Option 3: Use Mockups
- Create professional mockups using Figma/Canva
- Add device frames for better presentation
- Include key features of the app

## Play Store Requirements

Google Play Store requires:
- Minimum 2 screenshots
- Maximum 8 screenshots per type
- JPEG or 24-bit PNG (no alpha)
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Aspect ratio between 16:9 and 9:16

## Recommended Additional Screenshots

For better Play Store presentation, create:
- Phone screenshots: 1080x1920 (5-8 images)
- Tablet screenshots: 1920x1080 (optional, 2-4 images)
- Feature graphics: 1024x500 (required for featured placement)
- App icon: 512x512 (already created: icon-512x512.png)

## Current Status

- ✅ icon-192x192.png (exists)
- ✅ icon-512x512.png (exists)
- ❌ screenshot-wide.png (missing - create using instructions above)
- ❌ screenshot-narrow.png (missing - create using instructions above)
