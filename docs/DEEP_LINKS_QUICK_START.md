# Android Deep Links - Quick Start Guide

## 🚀 Quick Setup (5 Steps)

### Step 1: Get SHA-256 Fingerprints

```bash
# Run the extraction script
./scripts/get-android-sha256.sh

# This will output your debug and release SHA-256 fingerprints
```

### Step 2: Update assetlinks.json

Edit `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "net.prayermap.app",
      "sha256_cert_fingerprints": [
        "YOUR_DEBUG_SHA256_HERE",
        "YOUR_RELEASE_SHA256_HERE"
      ]
    }
  }
]
```

### Step 3: Deploy assetlinks.json

Upload to your server so it's accessible at:
```
https://prayermap.net/.well-known/assetlinks.json
```

Verify it works:
```bash
curl https://prayermap.net/.well-known/assetlinks.json
```

### Step 4: Add Deep Link Handler to App

In your main `App.tsx`:

```typescript
import { useDeepLinks } from '@/hooks/useDeepLinks';

function App() {
  // Initialize deep link handler
  useDeepLinks();

  return (
    // Your app content
    <YourAppContent />
  );
}
```

### Step 5: Build and Test

```bash
# Build the app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Run the app on device/emulator, then test:
./scripts/test-deep-links.sh
```

## 📱 Supported URL Patterns

### App Links (Verified HTTPS)
- `https://prayermap.net/prayer/:id` → Opens prayer detail
- `https://prayermap.net/user/:id` → Opens user profile

### Custom Scheme (Fallback)
- `prayermap://prayer/:id` → Opens prayer detail
- `prayermap://user/:id` → Opens user profile

## ✅ Verification

### Check if App Links are verified:
```bash
adb shell pm get-app-links net.prayermap.app
```

### Expected output:
```
net.prayermap.app:
  Domain verification state:
    prayermap.net: verified
```

### If not verified, force reverification:
```bash
adb shell pm verify-app-links --re-verify net.prayermap.app
```

## 🧪 Testing

### Manual Testing
```bash
# Test HTTPS link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://prayermap.net/prayer/123" net.prayermap.app

# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW \
  -d "prayermap://prayer/123" net.prayermap.app
```

### Automated Testing
```bash
# Run the test suite
./scripts/test-deep-links.sh
```

### Real-world Testing
1. Send yourself an email with link: `https://prayermap.net/prayer/123`
2. Open email on Android device
3. Click the link
4. App should open directly (not browser)

## 🐛 Troubleshooting

### Links open in browser instead of app
**Solution:** Verify assetlinks.json is accessible and contains correct SHA-256

```bash
# Check accessibility
curl -I https://prayermap.net/.well-known/assetlinks.json

# Verify fingerprints match
./scripts/get-android-sha256.sh
```

### "App not verified" status
**Solution:** Clear and reverify

```bash
adb shell pm set-app-links-user-selection --user cur net.prayermap.app true prayermap.net
adb shell pm verify-app-links --re-verify net.prayermap.app
```

### Different fingerprints for debug/release
**Solution:** Include BOTH in assetlinks.json

```json
{
  "sha256_cert_fingerprints": [
    "DEBUG_FINGERPRINT_HERE",
    "RELEASE_FINGERPRINT_HERE"
  ]
}
```

## 📚 Full Documentation

See `docs/android-deep-links-config.md` for complete documentation including:
- Detailed configuration explanations
- AndroidManifest.xml details
- Capacitor integration guide
- Advanced troubleshooting

## 🔗 Useful Links

- [Android App Links Official Docs](https://developer.android.com/training/app-links)
- [Capacitor Deep Links Guide](https://capacitorjs.com/docs/guides/deep-links)
- [Digital Asset Links Generator](https://developers.google.com/digital-asset-links/tools/generator)
- [Digital Asset Links Tester](https://developers.google.com/digital-asset-links/tools/generator)
