# Android Deep Links Configuration for PrayerMap

## Research Summary: Android App Links vs Deep Links

Based on [official Android documentation](https://developer.android.com/training/app-links/verify-applinks), there are three types of links:

### 1. **Deep Links** (Custom URL Schemes)
- Format: `prayermap://prayer/123`
- No domain verification required
- Can conflict with other apps
- Immediately recognized by Android

### 2. **Web Links** (Intent Filters without autoVerify)
- Format: `https://prayermap.net/prayer/123`
- Opens app chooser dialog if multiple apps handle the URL
- No domain verification

### 3. **Android App Links** (Verified Intent Filters)
- Format: `https://prayermap.net/prayer/123`
- **Requires domain verification via assetlinks.json**
- **Uses `android:autoVerify="true"`**
- Opens app directly without chooser dialog
- **This is what we want for PrayerMap**

## Key Requirements (from Android Official Docs)

Per the [Android App Links documentation](https://developer.android.com/training/app-links/add-applinks):

1. **Intent Filter Requirements:**
   - Must include `android:autoVerify="true"`
   - Must include both `http` and `https` schemes
   - Must include `android.intent.action.VIEW` action
   - Must include `android.intent.category.DEFAULT` and `android.intent.category.BROWSABLE` categories
   - Must specify exact host (e.g., `prayermap.net`)

2. **Digital Asset Links File (assetlinks.json):**
   - Must be hosted at `https://prayermap.net/.well-known/assetlinks.json`
   - Must be accessible via HTTPS (not HTTP)
   - Must include SHA-256 fingerprint of app signing certificate
   - Must include exact package name (`net.prayermap.app`)

3. **Verification Process:**
   - Android 6.0+ (API 23+) automatically verifies on app install
   - Android 12+ allows manual verification
   - All hosts in intent filters must have valid assetlinks.json

---

## 1. AndroidManifest.xml Configuration

### Location
`/home/user/prayermap/android/app/src/main/AndroidManifest.xml`

### Intent Filter Configuration

Add the following intent filters to the `<activity>` element (after the MAIN/LAUNCHER intent-filter):

```xml
<!-- Android App Links for HTTPS URLs -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <!-- Accept both http and https -->
    <data android:scheme="https" />
    <data android:scheme="http" />
    <data android:host="prayermap.net" />

    <!-- Prayer detail page: https://prayermap.net/prayer/123 -->
    <data android:pathPrefix="/prayer/" />
</intent-filter>

<!-- User profile deep link -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data android:scheme="https" />
    <data android:scheme="http" />
    <data android:host="prayermap.net" />
    <data android:pathPrefix="/user/" />
</intent-filter>

<!-- Custom URL Scheme (fallback for sharing) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <!-- prayermap://prayer/123 -->
    <data android:scheme="prayermap" />
    <data android:host="prayer" />
</intent-filter>

<!-- Custom scheme for user profiles -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <!-- prayermap://user/123 -->
    <data android:scheme="prayermap" />
    <data android:host="user" />
</intent-filter>
```

### Complete AndroidManifest.xml Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <!-- Main launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Android App Links for HTTPS URLs -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data android:scheme="https" />
                <data android:scheme="http" />
                <data android:host="prayermap.net" />
                <data android:pathPrefix="/prayer/" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data android:scheme="https" />
                <data android:scheme="http" />
                <data android:host="prayermap.net" />
                <data android:pathPrefix="/user/" />
            </intent-filter>

            <!-- Custom URL Scheme -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data android:scheme="prayermap" />
                <data android:host="prayer" />
            </intent-filter>

            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data android:scheme="prayermap" />
                <data android:host="user" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

---

## 2. Digital Asset Links File (assetlinks.json)

### Location
Must be hosted at: `https://prayermap.net/.well-known/assetlinks.json`

### Getting Your SHA-256 Fingerprint

**CRITICAL:** You need different SHA-256 fingerprints for different build types:
- Debug builds (development)
- Release builds (Play Store)
- Firebase App Distribution builds (if using)

#### For Debug Build:
```bash
# Generate debug keystore if it doesn't exist
keytool -genkey -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android

# Get SHA-256 fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android | grep -A 1 "SHA256"
```

#### For Release Build:
```bash
# Get SHA-256 from your release keystore
keytool -list -v -keystore /path/to/release.keystore -alias your-key-alias

# Or get from Play Console:
# Play Console > Setup > App Integrity > App Signing > SHA-256 certificate fingerprint
```

### assetlinks.json Format

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "net.prayermap.app",
      "sha256_cert_fingerprints": [
        "DEBUG_SHA256_FINGERPRINT_HERE",
        "RELEASE_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### Complete Example

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "net.prayermap.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5",
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

**Important Notes:**
- Use colon-separated format (e.g., `AA:BB:CC:...`)
- Include ALL fingerprints (debug, release, etc.)
- File must be accessible via HTTPS only
- File must return `Content-Type: application/json`
- No `.json.txt` or other extensions
- Must be in exactly `/.well-known/assetlinks.json`

---

## 3. Capacitor Configuration

### Update capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',
  server: {
    androidScheme: 'https' // Important for App Links
  },
  // Add deep links configuration
  plugins: {
    // Existing plugins...
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E8F4F8',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#E8F4F8'
    },
    Keyboard: {
      resize: 'native',
      style: 'dark'
    }
  }
};

export default config;
```

### Handling Deep Links in App Code

Create a deep link handler service:

**File:** `/home/user/prayermap/src/services/deepLinkService.ts`

```typescript
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for deep link events
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('Deep link opened:', event.url);

      // Parse the URL
      const url = new URL(event.url);

      // Handle different URL schemes
      if (url.protocol === 'prayermap:') {
        // Custom scheme: prayermap://prayer/123
        const path = url.hostname + url.pathname;
        navigate(`/${path}`);
      } else if (url.protocol === 'https:' || url.protocol === 'http:') {
        // App Links: https://prayermap.net/prayer/123
        const path = url.pathname;
        navigate(path);
      }
    });

    // Check if app was launched with a URL
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('App launched with URL:', result.url);
        const url = new URL(result.url);
        const path = url.pathname;
        navigate(path);
      }
    });

    return () => {
      listener.remove();
    };
  }, [navigate]);
}
```

**Usage in App.tsx:**

```typescript
import { useDeepLinks } from './services/deepLinkService';

function App() {
  // Initialize deep link handler
  useDeepLinks();

  return (
    // Your app content
  );
}
```

---

## 4. Testing Commands

### Step 1: Build and Sync
```bash
# Build the web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### Step 2: Get SHA-256 Fingerprint

```bash
# For debug builds
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

### Step 3: Deploy assetlinks.json

1. Create the file with your SHA-256 fingerprints
2. Upload to: `https://prayermap.net/.well-known/assetlinks.json`
3. Verify it's accessible: `curl https://prayermap.net/.well-known/assetlinks.json`

### Step 4: Verify Digital Asset Links

Use Google's official verification tool:

```bash
# Open in browser
https://developers.google.com/digital-asset-links/tools/generator

# Or use adb to verify
adb shell pm get-app-links net.prayermap.app
```

### Step 5: Test Deep Links via ADB

```bash
# Test HTTPS App Link (requires verification)
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://prayermap.net/prayer/123" net.prayermap.app

# Test custom scheme (no verification needed)
adb shell am start -W -a android.intent.action.VIEW \
  -d "prayermap://prayer/123" net.prayermap.app

# Test user profile
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://prayermap.net/user/456" net.prayermap.app
```

### Step 6: Verify App Link Status (Android 12+)

```bash
# Check verification status
adb shell pm get-app-links --user cur net.prayermap.app

# Expected output:
# net.prayermap.app:
#   ID: [unique-id]
#   Signatures: [SHA-256]
#   Domain verification state:
#     prayermap.net: verified
```

### Step 7: Manual Verification (Android 12+)

If auto-verification fails:

```bash
# Request manual verification
adb shell pm verify-app-links --re-verify net.prayermap.app

# Or reset and reverify
adb shell pm set-app-links --package net.prayermap.app 0 prayermap.net
adb shell pm verify-app-links --re-verify net.prayermap.app
```

### Step 8: Test in Real Scenarios

1. **Email Test:**
   - Send email with link: `https://prayermap.net/prayer/123`
   - Click link on Android device
   - Should open app directly (not browser)

2. **SMS Test:**
   - Send SMS with link
   - Click link
   - Should open app

3. **Browser Test:**
   - Open Chrome on Android
   - Type: `https://prayermap.net/prayer/123`
   - Should show option to open in app

4. **Share Test:**
   - Share a prayer from within app
   - Receive on another Android device
   - Should open in app

---

## Troubleshooting

### Problem: Links open in browser instead of app

**Solution:**
1. Verify assetlinks.json is accessible at `https://prayermap.net/.well-known/assetlinks.json`
2. Check SHA-256 fingerprint matches exactly
3. Verify package name is `net.prayermap.app`
4. Check `android:autoVerify="true"` is present
5. Reinstall app (verification happens on install)

### Problem: "App not verified" status

**Solution:**
```bash
# Check verification status
adb shell pm get-app-links net.prayermap.app

# Clear and reverify
adb shell pm set-app-links-user-selection --user cur net.prayermap.app true prayermap.net
```

### Problem: Different SHA-256 for release vs debug

**Solution:**
- Include BOTH fingerprints in assetlinks.json
- Debug keystore: `~/.android/debug.keystore`
- Release keystore: Get from Play Console or your keystore file

### Problem: 403 or 404 on assetlinks.json

**Solution:**
1. Ensure `.well-known` directory exists
2. Check web server allows access to hidden directories
3. Verify HTTPS (not HTTP)
4. Check CORS headers if needed
5. Test: `curl -I https://prayermap.net/.well-known/assetlinks.json`

---

## Deployment Checklist

- [ ] AndroidManifest.xml updated with intent filters
- [ ] `android:autoVerify="true"` added to HTTPS intent filters
- [ ] `android:launchMode="singleTask"` set on MainActivity
- [ ] SHA-256 fingerprint obtained for debug build
- [ ] SHA-256 fingerprint obtained for release build
- [ ] assetlinks.json created with all fingerprints
- [ ] assetlinks.json deployed to `https://prayermap.net/.well-known/`
- [ ] Verified assetlinks.json is accessible via HTTPS
- [ ] Deep link handler implemented in app code
- [ ] Tested with ADB commands
- [ ] Tested with Google's verification tool
- [ ] Tested real-world scenarios (email, SMS, browser)
- [ ] Verified on Android 12+ device
- [ ] Documented custom URL schemes for fallback

---

## Resources

### Official Documentation
- [Android App Links Verification](https://developer.android.com/training/app-links/verify-applinks)
- [Add Intent Filters](https://developer.android.com/training/app-links/add-applinks)
- [Capacitor Deep Links Guide](https://capacitorjs.com/docs/guides/deep-links)
- [Digital Asset Links Generator](https://developers.google.com/digital-asset-links/tools/generator)

### Testing Tools
- [Google Digital Asset Links Tool](https://developers.google.com/digital-asset-links/tools/generator)
- [App Links Assistant (Android Studio)](https://developer.android.com/studio/write/app-link-indexing)

---

**Last Updated:** 2025-11-29
**Status:** Ready for implementation
**Next Steps:** Apply AndroidManifest.xml changes and deploy assetlinks.json
