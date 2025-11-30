# Android Development Quick Reference

**Quick commands and troubleshooting for PrayerMap Android development**

---

## Quick Commands

### Development Workflow

```bash
# Initial setup (one-time)
npm run android:add              # Add Android platform
npm run android:sync             # Build & sync to Android

# Daily development
npm run android:open             # Open Android Studio
npm run android:run              # Build, sync, and run
npm run android:run:livereload   # Develop with hot reload

# Sync after code changes
npm run sync:all                 # Sync both iOS and Android
npm run android:sync             # Sync Android only
```

### Device Management

```bash
# List devices
npm run android:devices
# Or: adb devices

# Install app on device
npm run android:install

# View logs
npm run android:logcat
# Or detailed: adb logcat | grep prayermap
```

### Build Commands

```bash
# Debug build (automatic in Android Studio)
npm run android:run

# Release APK (for testing)
npm run android:build

# Release AAB (for Play Store)
npm run android:build:aab

# Clean build
npm run android:clean
```

---

## Common Issues & Solutions

### 1. Gradle Build Failed

**Error:** `Could not resolve all files for configuration`

```bash
# Solution 1: Clean and rebuild
npm run android:clean
npm run android:sync

# Solution 2: Update Gradle (in Android Studio)
# File → Project Structure → Project → Gradle Version → 8.0

# Solution 3: Invalidate caches
# Android Studio → File → Invalidate Caches → Invalidate and Restart
```

### 2. App Crashes on Launch

**Check logs first:**
```bash
npm run android:logcat
```

**Common causes:**
```bash
# Missing web assets
npm run build && npm run android:sync

# Corrupted build
npm run android:clean
npm run android:sync

# Plugin issues
npx cap sync android
```

### 3. Plugins Not Working

```bash
# Re-sync plugins
npx cap sync android

# Force update
cd android
./gradlew clean
./gradlew build
```

### 4. Camera/Location Permissions Not Appearing

**Check AndroidManifest.xml has:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

**Request in code:**
```typescript
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

await Camera.requestPermissions();
await Geolocation.requestPermissions();
```

### 5. "App Not Installed" Error

```bash
# Uninstall old version first
adb uninstall net.prayermap.app

# Reinstall
npm run android:install
```

### 6. Cannot Find adb

```bash
# Add to ~/.bashrc or ~/.zshrc:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Reload shell
source ~/.bashrc
```

### 7. Device Not Detected

```bash
# Check connection
adb devices

# If "unauthorized":
# - Check phone screen for USB debugging prompt
# - Click "Always allow from this computer"
# - Click "Allow"

# Restart adb
adb kill-server
adb start-server
adb devices
```

### 8. Live Reload Not Working

**For Emulator:**
```typescript
// capacitor.config.ts
server: {
  url: 'http://10.0.2.2:5173',  // Emulator special IP
  cleartext: true
}
```

**For Physical Device:**
```bash
# Find your computer's IP
ifconfig | grep "inet "  # macOS/Linux
ipconfig                 # Windows

# Update capacitor.config.ts
server: {
  url: 'http://YOUR_IP:5173',  # e.g., 192.168.1.100:5173
  cleartext: true
}
```

### 9. Keystore Password Forgotten

**If you forgot your keystore password:**
- **YOU CANNOT RECOVER IT**
- You must generate a new keystore
- This means you CANNOT update the existing app on Play Store
- You would need to publish as a new app

**Prevention:**
- Store passwords in password manager (1Password, LastPass)
- Backup keystore file in multiple secure locations
- Document passwords in secure company vault

### 10. Signing Errors

```bash
# Verify keystore exists and is valid
keytool -list -v \
  -keystore android/keystore/prayermap-release.keystore \
  -alias prayermap-release

# Check keystore.properties has correct paths
cat android/keystore.properties
```

---

## Environment Setup Checklist

### Required Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload
source ~/.bashrc
```

### Verify Setup

```bash
# Check environment
echo $ANDROID_HOME
# Should show: /home/user/Android/Sdk (or similar)

# Check adb
adb --version
# Should show version number

# Check Java
java -version
# Should show Java 17 or newer

# Check Gradle
cd android && ./gradlew --version
```

---

## Project Environment Variables

### .env Files

**Required for builds:**

```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token
VITE_APP_ENV=production
```

**Optional for staging:**

```bash
# .env.staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_MAPBOX_ACCESS_TOKEN=pk.staging-mapbox-token
VITE_APP_ENV=staging
```

### Build with Environment

```bash
# Production build
npm run build -- --mode production
npm run android:sync

# Staging build
npm run build -- --mode staging
npm run android:sync
```

---

## Performance Tips

### Speed Up Builds

```bash
# Enable Gradle daemon (add to gradle.properties)
echo "org.gradle.daemon=true" >> android/gradle.properties
echo "org.gradle.parallel=true" >> android/gradle.properties
echo "org.gradle.configureondemand=true" >> android/gradle.properties

# Increase heap size
echo "org.gradle.jvmargs=-Xmx4096m" >> android/gradle.properties
```

### Reduce APK Size

```bash
# Use AAB instead of APK
npm run android:build:aab

# Analyze APK size
cd android
./gradlew assembleRelease
# Android Studio → Build → Analyze APK
```

### Debug Performance Issues

```bash
# Android Studio Profiler
# Run → Profile 'app'
# Monitor CPU, Memory, Network, Energy
```

---

## Debugging

### Chrome DevTools for WebView

```bash
# 1. Connect device via USB
# 2. Enable USB debugging on device
# 3. Open Chrome on desktop
# 4. Navigate to: chrome://inspect
# 5. Find your device
# 6. Click "inspect" under net.prayermap.app
```

### Android Studio Logcat

```bash
# In Android Studio:
# View → Tool Windows → Logcat

# Filter by package
# Select "net.prayermap.app" from dropdown

# Filter by level
# Select "Error" to see only errors
```

### ADB Logcat

```bash
# All logs
adb logcat

# Only errors
adb logcat '*:E'

# Filter by tag
adb logcat -s "Capacitor"

# Clear logs
adb logcat -c
```

---

## Testing

### Emulator Testing

```bash
# List emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_34 &

# Run app
npm run android:run
```

### Device Testing

```bash
# Connect device
adb devices

# Install app
npm run android:install

# Monitor logs
npm run android:logcat
```

### Screenshot Testing

```bash
# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Or in Android Studio:
# View → Tool Windows → Logcat → Camera icon
```

---

## Release Checklist

### Pre-Release

- [ ] Update version in `android/app/build.gradle`
  - [ ] Increment `versionCode`
  - [ ] Update `versionName`
- [ ] Remove `server` block from `capacitor.config.ts`
- [ ] Build production: `npm run build -- --mode production`
- [ ] Sync: `npm run android:sync`
- [ ] Test thoroughly on multiple devices

### Build Release

- [ ] Clean build: `npm run android:clean`
- [ ] Build AAB: `npm run android:build:aab`
- [ ] Verify output: `ls android/app/build/outputs/bundle/release/`
- [ ] Test release build on device

### Upload to Play Console

- [ ] Log in to Play Console
- [ ] Navigate to app
- [ ] Production → Create new release
- [ ] Upload AAB
- [ ] Add release notes
- [ ] Review and rollout

---

## File Locations

### Important Android Files

```
android/
├── app/
│   ├── build.gradle              # App configuration, version numbers
│   └── src/main/
│       ├── AndroidManifest.xml   # Permissions, app metadata
│       ├── java/                 # MainActivity.java
│       └── res/
│           ├── values/
│           │   └── strings.xml   # App name, strings
│           └── mipmap/           # App icons
├── build.gradle                  # Project-level Gradle
├── gradle.properties             # Gradle settings
└── keystore.properties           # Signing config (gitignored)
```

### Where Things Get Copied

```
Web Build → Android Copy:
dist/              → android/app/src/main/assets/public/
dist/index.html    → android/app/src/main/assets/public/index.html
dist/assets/*      → android/app/src/main/assets/public/assets/*
```

---

## Plugin Reference

### Import Plugins

```typescript
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics } from '@capacitor/haptics';
```

### Check Platform

```typescript
if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform(); // 'android' or 'ios'

  if (platform === 'android') {
    // Android-specific code
  }
}
```

### Request Permissions

```typescript
// Camera
const cameraPerms = await Camera.requestPermissions();
if (cameraPerms.camera === 'granted') {
  // Use camera
}

// Location
const locationPerms = await Geolocation.requestPermissions();
if (locationPerms.location === 'granted') {
  // Use location
}
```

---

## Resources

### Official Documentation
- Capacitor Android: https://capacitorjs.com/docs/android
- Android Developer: https://developer.android.com/docs
- Play Console: https://play.google.com/console

### Quick Links
- Chrome DevTools: chrome://inspect
- Play Store Policies: https://play.google.com/about/developer-content-policy/
- Capacitor Plugins: https://capacitorjs.com/docs/apis

---

## Get Help

1. **Check logs:** `npm run android:logcat`
2. **Review docs:** `/docs/archive/ANDROID_SETUP.md`
3. **Clean and rebuild:** `npm run android:clean && npm run android:sync`
4. **Check official docs:** https://capacitorjs.com/docs/android

---

*Quick Reference for PrayerMap Android Development*
*Last Updated: 2025-11-29*
