# Android Capacitor Setup & Deployment Guide

**Date:** 2025-11-29
**Status:** Ready for Android Development
**Capacitor Version:** 7.4.4
**Target Android Version:** API 26+ (Android 8.0+)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Android Platform Setup](#initial-android-platform-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing on Devices](#testing-on-devices)
6. [Release Build Process](#release-build-process)
7. [Google Play Console Integration](#google-play-console-integration)
8. [Environment Variables](#environment-variables)
9. [NPM Scripts Reference](#npm-scripts-reference)
10. [Plugin Configuration](#plugin-configuration)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)
13. [Resources](#resources)

---

## Prerequisites

### Required Software

#### 1. Java Development Kit (JDK)
```bash
# Install JDK 17 (required for Android Gradle Plugin 8.0+)
# Ubuntu/Debian:
sudo apt update
sudo apt install openjdk-17-jdk

# macOS (using Homebrew):
brew install openjdk@17

# Verify installation
java -version
# Should show: openjdk version "17.x.x"
```

#### 2. Android Studio
- **Download:** https://developer.android.com/studio
- **Version:** Arctic Fox (2020.3.1) or newer
- **Required Components:**
  - Android SDK Platform 26 (minimum)
  - Android SDK Platform 34 (target)
  - Android SDK Build-Tools 34.0.0
  - Android SDK Platform-Tools
  - Android Emulator
  - Intel x86 Emulator Accelerator (HAXM) - for Intel CPUs
  - Google Play services

#### 3. Environment Variables

Add to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
# macOS: export ANDROID_HOME=$HOME/Library/Android/sdk

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Verify
echo $ANDROID_HOME
```

Reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

#### 4. Verify Android Setup
```bash
# Check Android SDK location
echo $ANDROID_HOME

# Check adb (Android Debug Bridge)
adb --version

# List available SDK packages
sdkmanager --list | grep "platforms;android"

# List connected devices/emulators
adb devices
```

---

## Initial Android Platform Setup

### Step 1: Install Android Platform Package

```bash
# From project root
npm install @capacitor/android@7.4.4
```

This adds `@capacitor/android` to your `package.json` dependencies.

### Step 2: Add Android Platform

```bash
# Build the web app first
npm run build

# Add Android platform
npx cap add android
```

This creates the `/android` directory with:
- Gradle build configuration
- Android Studio project files
- Native Android app structure
- Capacitor plugin integration

### Step 3: Sync Initial Configuration

```bash
# Copy web assets and sync plugins
npx cap sync android
```

### Step 4: Configure Android App Settings

#### A. Update Package Name (App ID)

Edit `/android/app/build.gradle`:

```gradle
android {
    namespace "net.prayermap.app"  // Match capacitor.config.ts appId
    compileSdk 34

    defaultConfig {
        applicationId "net.prayermap.app"  // Must match appId
        minSdkVersion 26  // Android 8.0+
        targetSdkVersion 34  // Latest stable
        versionCode 1  // Increment for each release
        versionName "1.0.0"  // User-facing version
    }
}
```

#### B. Configure Permissions

Edit `/android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Camera permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Location permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />

    <!-- Storage permissions (for photo library) -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="29" />

    <!-- Internet (required for web content) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Vibration for haptic feedback -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Push notifications (if using) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <!-- Main activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### C. Configure Splash Screen

Edit `/android/app/src/main/res/values/styles.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <!-- Splash screen background color (heavenly blue) -->
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
```

Create `/android/app/src/main/res/drawable/splash.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Background color (heavenly blue #E8F4F8) -->
    <item android:drawable="@android:color/white"/>

    <!-- Optional: Add logo in center -->
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher"/>
    </item>
</layer-list>
```

---

## Project Structure

After `npx cap add android`, your project structure:

```
prayermap/
├── android/                           # Android native project
│   ├── app/                          # Main application module
│   │   ├── build.gradle              # App-level Gradle config
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml    # App manifest & permissions
│   │           ├── java/net/prayermap/app/
│   │           │   └── MainActivity.java  # Main activity (entry point)
│   │           ├── res/              # Android resources
│   │           │   ├── drawable/     # Splash screen, icons
│   │           │   ├── layout/       # UI layouts
│   │           │   ├── mipmap/       # App icons (all densities)
│   │           │   └── values/       # Strings, colors, styles
│   │           └── assets/
│   │               └── public/       # Web app assets (from dist/)
│   ├── build.gradle                  # Project-level Gradle config
│   ├── gradle.properties             # Gradle settings
│   ├── settings.gradle               # Gradle module settings
│   ├── capacitor.settings.gradle     # Capacitor plugin settings
│   ├── gradlew                       # Gradle wrapper (Unix)
│   └── gradlew.bat                   # Gradle wrapper (Windows)
├── capacitor.config.ts               # Capacitor configuration
├── dist/                             # Built React app
└── package.json
```

---

## Development Workflow

### Local Development

#### Option 1: Build and Sync (Recommended for most changes)

```bash
# 1. Make changes to React code in src/

# 2. Build the web app
npm run build

# 3. Sync to Android (copies dist/ to android/app/src/main/assets/public/)
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. Run in Android Studio
# - Select device/emulator
# - Click Run (▶) or Shift+F10
```

#### Option 2: Live Reload (Fast development iteration)

```bash
# Terminal 1: Start Vite dev server
npm run dev
# Server runs at http://localhost:5173

# Terminal 2: Configure and run Android
# First, update capacitor.config.ts:
```

Edit `capacitor.config.ts` (ONLY for development):

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',

  // FOR DEVELOPMENT ONLY - Comment out for production builds
  server: {
    url: 'http://10.0.2.2:5173',  // Android emulator
    // url: 'http://YOUR_LOCAL_IP:5173',  // Physical device (find with: ifconfig or ipconfig)
    cleartext: true
  },

  // Rest of config...
};

export default config;
```

**Important:**
- `10.0.2.2` is Android emulator's special alias for host machine's `localhost`
- For **physical devices**, use your computer's local network IP (e.g., `192.168.1.100:5173`)
- Find your IP:
  - **macOS/Linux:** `ifconfig | grep "inet "`
  - **Windows:** `ipconfig` (look for IPv4 Address)
- **ALWAYS remove or comment out `server` block before production builds!**

```bash
# Sync and run with live reload
npx cap sync android
npx cap open android
# Run in Android Studio - changes will hot reload
```

#### Option 3: Capacitor Run with Live Reload

```bash
# Starts dev server and opens in Android Studio with live reload
npx cap run android --livereload --external

# Or target specific device
npx cap run android --livereload --external --target=emulator-5554
```

### Making Code Changes

```bash
# Typical development cycle:

# 1. Edit React components, services, etc.
# 2. If using live reload: changes auto-reload
# 3. If not using live reload:
npm run build && npx cap sync android
# Then rebuild in Android Studio
```

### Plugin Changes

When adding/updating Capacitor plugins:

```bash
# Install plugin
npm install @capacitor/[plugin-name]

# Sync to Android (updates native dependencies)
npx cap sync android

# May need to rebuild in Android Studio
```

---

## Testing on Devices

### Android Emulator

#### Create Emulator (Android Studio)

1. **Open AVD Manager:**
   - Android Studio → Tools → Device Manager
   - Or click device icon in toolbar

2. **Create Virtual Device:**
   - Click "Create Device"
   - Select hardware: Pixel 5 or Pixel 6 (recommended)
   - Select system image: API 34 (Android 14) - recommended for testing
   - Name it: "Pixel_5_API_34"
   - Click Finish

3. **Run Emulator:**
   ```bash
   # List available emulators
   emulator -list-avds

   # Start specific emulator
   emulator -avd Pixel_5_API_34 &

   # Or start from Android Studio
   ```

4. **Install and Run App:**
   - Select emulator in Android Studio device dropdown
   - Click Run (▶)

### Physical Android Device

#### Enable Developer Options

1. **Settings → About Phone → Build Number**
   - Tap "Build Number" 7 times
   - Developer options enabled

2. **Settings → System → Developer Options**
   - Enable "USB Debugging"
   - Enable "Install via USB" (recommended)

3. **Connect Device:**
   ```bash
   # Connect device via USB

   # Verify connection
   adb devices
   # Should show: [device-id]    device

   # If shows "unauthorized":
   # - Check phone screen for authorization prompt
   # - Select "Always allow from this computer"
   # - Click "Allow"
   ```

4. **Run on Device:**
   - Android Studio → Select your device from dropdown
   - Click Run (▶)

#### Wireless Debugging (Android 11+)

```bash
# 1. Connect device via USB first
adb devices

# 2. Enable TCP/IP mode on port 5555
adb tcpip 5555

# 3. Find device IP address
# Device: Settings → About Phone → Status → IP Address
# Or: adb shell ip addr show wlan0 | grep inet

# 4. Connect wirelessly
adb connect DEVICE_IP:5555
# Example: adb connect 192.168.1.100:5555

# 5. Disconnect USB cable

# 6. Verify
adb devices
# Should show: 192.168.1.100:5555    device

# To disconnect
adb disconnect
```

---

## Release Build Process

### Step 1: Prepare for Release

#### A. Update Version Numbers

Edit `/android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1      // Increment for each release (1, 2, 3...)
        versionName "1.0.0"  // User-facing version (1.0.0, 1.0.1, 1.1.0...)
    }
}
```

**Version Code Rules:**
- Must be an integer
- Must always increase
- Google Play uses this to determine "newer" version
- Cannot reuse a version code once uploaded to Play Store

#### B. Update App Configuration

Ensure `capacitor.config.ts` has NO `server` block:

```typescript
const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',
  // NO server block for production!

  server: {
    androidScheme: 'https'  // This is OK - keeps https scheme
  },
  // ...
};
```

#### C. Build Web App for Production

```bash
# Production build with optimizations
npm run build

# Verify build output
ls -lh dist/
# Should see index.html and assets/
```

#### D. Sync to Android

```bash
npx cap sync android
```

### Step 2: Generate Signing Key

**IMPORTANT:** Keep this keystore file secure! If lost, you cannot update your app on Play Store!

```bash
# Create keystore directory (gitignored)
mkdir -p android/keystore

# Generate release keystore
keytool -genkey -v \
  -keystore android/keystore/prayermap-release.keystore \
  -alias prayermap-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Enter keystore password (SAVE THIS SECURELY!)
# Enter key password (can be same as keystore password)
# Enter organization details
```

**Prompts you'll see:**
- **Keystore password:** Choose strong password, save in password manager
- **Key password:** Use same as keystore password (or different, save it!)
- **First and Last Name:** Your name or "PrayerMap"
- **Organization:** "PrayerMap" or your company
- **Organization Unit:** "Development" or leave blank
- **City/Locality:** Your city
- **State/Province:** Your state
- **Country Code:** US or your country code

**Backup your keystore:**
```bash
# CRITICAL: Backup this file securely!
# Store in:
# - Password manager (1Password, LastPass, etc.)
# - Encrypted cloud storage
# - Physical backup drive
# DO NOT commit to git!
```

### Step 3: Configure Gradle for Signing

#### A. Create Signing Configuration

Create `/android/keystore.properties` (gitignored):

```properties
storeFile=/home/user/prayermap/android/keystore/prayermap-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=prayermap-release
keyPassword=YOUR_KEY_PASSWORD
```

**IMPORTANT:** Add to `.gitignore`:
```bash
# Add to .gitignore
echo "android/keystore/" >> .gitignore
echo "android/keystore.properties" >> .gitignore
```

#### B. Update app/build.gradle

Edit `/android/app/build.gradle`:

```gradle
// At the top, after plugins
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        debug {
            // Development builds - no signing needed
        }

        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            // Use release signing config
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 4: Build Release APK/AAB

#### Build AAB (Android App Bundle) - Recommended

```bash
cd android

# Clean previous builds
./gradlew clean

# Build release AAB (recommended for Play Store)
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

**AAB Benefits:**
- Smaller download size for users (Google Play optimizes per-device)
- Required for new apps on Play Store (August 2021+)
- Automatic APK splitting by screen density, CPU architecture, language

#### Build APK (for direct distribution/testing)

```bash
cd android

# Build release APK
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 5: Test Release Build

```bash
# Install release APK on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or drag and drop APK onto emulator
```

**Release Build Testing Checklist:**
- [ ] App launches successfully
- [ ] All screens/features work
- [ ] Camera permissions work
- [ ] Location permissions work
- [ ] Map displays correctly
- [ ] Authentication works
- [ ] Prayer posting works
- [ ] No console errors (check Logcat in Android Studio)
- [ ] Performance is smooth
- [ ] No crashes during 5+ minute testing session

---

## Google Play Console Integration

### Step 1: Create Google Play Developer Account

1. **Sign up:** https://play.google.com/console/signup
2. **Pay one-time fee:** $25 USD
3. **Complete account details**

### Step 2: Create App in Play Console

1. **Go to Play Console:** https://play.google.com/console
2. **Click "Create app"**
3. **Fill in app details:**
   - **App name:** PrayerMap
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Accept policies

### Step 3: Set Up App Content

#### A. App Access
- All or some functionality is restricted: No
- (If yes, provide demo credentials)

#### B. Ads
- Does your app contain ads? (Select based on your monetization)

#### C. Content Rating
1. Start questionnaire
2. Select category: Reference, Religion & Spirituality
3. Answer questions honestly
4. Submit for rating

#### D. Target Audience
- Target age group: 13+
- Appeals to children: No (unless specifically designed for children)

#### E. News Apps
- Is this a news app? No

#### F. COVID-19 Contact Tracing and Status Apps
- Is this a COVID-19 contact tracing or status app? No

#### G. Data Safety
**CRITICAL:** Accurately describe data collection and sharing

Example for PrayerMap:
```
Data collected:
✓ Location (approximate, precise) - for prayer mapping
✓ Personal info (name, email) - for account
✓ Photos - for prayer images
✓ Device ID - for analytics

Data sharing:
✓ Location shared with other users (prayer map)
✓ Prayer content shared publicly

Security practices:
✓ Data encrypted in transit
✓ Users can request data deletion
✓ Committed to Google Play Families Policy
```

### Step 4: Store Listing

#### Required Assets

**App Icon**
- Size: 512 x 512 px
- Format: PNG (32-bit)
- No transparency
- Full bleed (no padding)

**Feature Graphic**
- Size: 1024 x 500 px
- Format: PNG or JPEG
- Used in Play Store feature placements

**Phone Screenshots**
- Minimum 2, maximum 8
- Size: At least 320 px on shortest side
- Recommended: 1080 x 1920 px (portrait)
- Format: PNG or JPEG

**7-inch Tablet Screenshots (Optional)**
- Recommended: 1200 x 1920 px

**10-inch Tablet Screenshots (Optional)**
- Recommended: 1600 x 2560 px

**App Description:**
```
Short description (80 chars max):
See where prayer is needed. Send prayer where you are.

Full description (4000 chars max):
PrayerMap is a location-based spiritual platform that connects people through prayer. Share prayer requests, respond to requests, and support one another through a beautifully designed interactive map interface.

Features:
• Real-time prayer map showing requests worldwide
• Post anonymous or public prayer requests
• Send support and prayers to others
• Beautiful, peaceful interface designed for spiritual connection
• Location-based prayer discovery
• Private messaging for deeper connection
• Safe, moderated community

PrayerMap makes the invisible visible - connecting people in prayer across distance and difference.
```

**Contact Details:**
- Email: support@prayermap.net (must be accessible)
- Phone: (Optional but recommended)
- Website: https://prayermap.net
- Privacy Policy URL: https://prayermap.net/privacy (REQUIRED)

### Step 5: Release to Internal Testing

1. **Create Internal Test Track:**
   - Play Console → Testing → Internal testing
   - Create new release

2. **Upload AAB:**
   - Upload `app-release.aab`
   - Release name: "1.0.0 (1)" or version name
   - Release notes: "Initial release for internal testing"

3. **Add Testers:**
   - Create email list
   - Add team members
   - Save

4. **Review and Rollout:**
   - Review release
   - Click "Start rollout to Internal testing"

5. **Share with Testers:**
   - Copy opt-in URL
   - Share with testers
   - They can install from Play Store

### Step 6: Release to Production

**Requirements Before Production:**
- [ ] Completed app content questionnaire
- [ ] Uploaded all required store assets
- [ ] Content rating received
- [ ] Privacy policy published
- [ ] Data safety section complete
- [ ] At least 2 screenshots
- [ ] App thoroughly tested
- [ ] No crashes or major bugs
- [ ] Complies with Google Play policies

**Steps:**
1. **Create Production Release:**
   - Play Console → Production → Create new release

2. **Upload AAB:**
   - Use same AAB as internal testing (if successful)
   - Or build new AAB with final changes

3. **Release Notes:**
   ```
   Initial release of PrayerMap!

   • Location-based prayer sharing
   • Interactive prayer map
   • Community support features
   • Beautiful, peaceful design
   ```

4. **Rollout:**
   - Start with staged rollout (10% → 50% → 100%)
   - Or full rollout (100% immediately)

5. **Review Time:**
   - First review: Can take up to 7 days
   - Subsequent updates: Usually 1-3 days
   - Monitor for policy issues or rejections

---

## Environment Variables

### Required Environment Variables

**Production Build:**
```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_APP_ENV=production
```

**Staging/Testing Build:**
```bash
# .env.staging
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_APP_ENV=staging
```

### Build with Specific Environment

```bash
# Production build
npm run build -- --mode production

# Staging build
npm run build -- --mode staging
```

---

## NPM Scripts Reference

Add these scripts to `package.json` for streamlined Android development:

```json
{
  "scripts": {
    "android:add": "npx cap add android",
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android",
    "android:run": "npx cap run android",
    "android:run:livereload": "npx cap run android --livereload --external",
    "android:build": "cd android && ./gradlew clean && ./gradlew assembleRelease",
    "android:build:aab": "cd android && ./gradlew clean && ./gradlew bundleRelease",
    "android:install": "adb install android/app/build/outputs/apk/release/app-release.apk",
    "android:devices": "adb devices",
    "android:logcat": "adb logcat | grep -F '`adb shell ps | grep net.prayermap.app | awk '{print $2}'`'",
    "android:clean": "cd android && ./gradlew clean",
    "sync:all": "npm run build && npx cap sync"
  }
}
```

### Usage Examples

```bash
# Development
npm run android:sync        # Build and sync
npm run android:open        # Open in Android Studio
npm run android:run         # Build, sync, and run
npm run android:run:livereload  # Run with hot reload

# Release builds
npm run android:build       # Build release APK
npm run android:build:aab   # Build release AAB (for Play Store)

# Testing
npm run android:devices     # List connected devices
npm run android:install     # Install release APK
npm run android:logcat      # View app logs

# Troubleshooting
npm run android:clean       # Clean build artifacts
```

---

## Plugin Configuration

### All Plugins Installed

PrayerMap uses these Capacitor plugins (automatically work on Android after `npx cap sync`):

1. **@capacitor/app** - App lifecycle and state
2. **@capacitor/camera** - Camera and photo library
3. **@capacitor/geolocation** - GPS location services
4. **@capacitor/haptics** - Vibration/haptic feedback
5. **@capacitor/keyboard** - Keyboard control
6. **@capacitor/push-notifications** - Push notifications
7. **@capacitor/splash-screen** - Splash screen control
8. **@capacitor/status-bar** - Status bar styling

### Plugin Usage Examples

#### Check Platform

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform(); // 'android' or 'ios'
  console.log('Running on:', platform);
} else {
  console.log('Running on web');
}
```

#### Geolocation

```typescript
import { Geolocation } from '@capacitor/geolocation';

// Request permissions first
const permission = await Geolocation.requestPermissions();

if (permission.location === 'granted') {
  const position = await Geolocation.getCurrentPosition();
  console.log('Lat:', position.coords.latitude);
  console.log('Lng:', position.coords.longitude);
}
```

#### Camera

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
  source: CameraSource.Prompt // Prompt for camera or gallery
});

console.log('Photo URI:', photo.webPath);
```

#### Haptics

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Trigger haptic feedback
await Haptics.impact({ style: ImpactStyle.Medium });

// Vibration patterns
await Haptics.vibrate({ duration: 200 });
```

### Android-Specific Considerations

#### WebView Configuration

Android uses Chromium WebView. To access WebView settings:

Edit `/android/app/src/main/java/net/prayermap/app/MainActivity.java`:

```java
package net.prayermap.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable debugging for WebView (remove in production)
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
```

#### Debugging WebView

```bash
# Chrome DevTools for Android
1. Connect device via USB
2. Open Chrome on desktop
3. Navigate to: chrome://inspect
4. Find your device
5. Click "inspect" under net.prayermap.app
```

---

## Troubleshooting

### Common Issues

#### 1. Gradle Build Fails

**Error:** `Could not resolve all files for configuration ':app:debugCompileClasspath'`

**Solution:**
```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version=8.0

# Or in Android Studio:
# File → Project Structure → Project → Gradle Version → 8.0
```

#### 2. App Crashes on Launch

**Check Logcat:**
```bash
# Terminal
adb logcat | grep -i "prayermap"

# Or in Android Studio
# View → Tool Windows → Logcat
```

**Common causes:**
- Missing web assets: Run `npm run build && npx cap sync android`
- JavaScript errors: Check console in Chrome DevTools (chrome://inspect)
- Plugin misconfiguration: Re-run `npx cap sync android`

#### 3. Plugins Not Working

**Solution:**
```bash
# Re-sync plugins
npx cap sync android

# Force update Gradle dependencies
cd android
./gradlew clean
./gradlew build
```

#### 4. Camera/Location Permissions Not Appearing

**Check AndroidManifest.xml:**
- Ensure permissions are declared
- Check target SDK version (26+)
- Test on real device (emulator may have issues)

**Request permissions in code:**
```typescript
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

// Request camera
const cameraPerms = await Camera.requestPermissions();

// Request location
const locationPerms = await Geolocation.requestPermissions();
```

#### 5. "App Not Installed" Error

**Causes:**
- Package name mismatch
- Keystore signature mismatch (uninstall old version first)
- Corrupted APK

**Solution:**
```bash
# Uninstall existing app
adb uninstall net.prayermap.app

# Reinstall
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### 6. Large APK/AAB Size

**Current size analysis:**
```bash
cd android
./gradlew bundleRelease

# Check size
ls -lh app/build/outputs/bundle/release/app-release.aab
```

**Optimization strategies:**
- Enable ProGuard/R8 (already enabled in release builds)
- Use AAB instead of APK (automatic optimization)
- Analyze bundle:
  ```bash
  # Generate report
  ./gradlew analyzeReleaseBundle
  ```

#### 7. Signing Errors

**Error:** `Failed to read key from keystore`

**Solution:**
- Verify keystore path in `keystore.properties`
- Verify passwords are correct
- Ensure keystore file exists

```bash
# Verify keystore
keytool -list -v \
  -keystore android/keystore/prayermap-release.keystore \
  -alias prayermap-release
```

### Performance Issues

#### Slow App Launch

**Optimizations:**
```bash
# 1. Enable ahead-of-time compilation (in build.gradle)
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
}

# 2. Analyze startup time
adb shell am start -W net.prayermap.app/.MainActivity
# Look for: TotalTime (should be < 3000ms)
```

#### WebView Performance

**Enable hardware acceleration** in `AndroidManifest.xml`:
```xml
<application
    android:hardwareAccelerated="true"
    ...>
</application>
```

---

## Performance Optimization

### Build Size Optimization

#### 1. Enable R8 Shrinking

Already enabled in release builds (`/android/app/build.gradle`):

```gradle
buildTypes {
    release {
        minifyEnabled true  // Enables R8 code shrinking
        shrinkResources true  // Removes unused resources
    }
}
```

#### 2. Use Android App Bundle

AAB automatically optimizes APK size per device:
- Splits by screen density (xhdpi, xxhdpi, etc.)
- Splits by CPU architecture (arm64-v8a, armeabi-v7a, x86)
- Splits by language

```bash
npm run android:build:aab
```

#### 3. Analyze APK

```bash
# Build APK
cd android && ./gradlew assembleRelease

# Analyze in Android Studio
# Build → Analyze APK → Select app-release.apk
# Shows size breakdown by component
```

### Runtime Performance

#### 1. Lazy Load Heavy Resources

```typescript
// Lazy load map component
const PrayerMap = lazy(() => import('./components/PrayerMap'));

// In component
<Suspense fallback={<LoadingSpinner />}>
  <PrayerMap />
</Suspense>
```

#### 2. Optimize Images

```bash
# Use WebP format for smaller size
# Android supports WebP natively

# In assets, convert PNGs to WebP
# Android Studio → Right-click image → Convert to WebP
```

#### 3. Enable Caching

```typescript
// Use Capacitor HTTP for native request caching
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: 'https://api.prayermap.net/prayers',
  headers: { 'Cache-Control': 'max-age=3600' }
});
```

---

## Resources

### Official Documentation

- **Capacitor Android Guide:** https://capacitorjs.com/docs/android
- **Capacitor Workflow:** https://capacitorjs.com/docs/basics/workflow
- **Capacitor Configuration:** https://capacitorjs.com/docs/config
- **Capacitor Plugins:** https://capacitorjs.com/docs/apis

### Android Development

- **Android Developer Docs:** https://developer.android.com/docs
- **Android Studio Download:** https://developer.android.com/studio
- **Gradle Documentation:** https://docs.gradle.org/
- **Android App Bundle:** https://developer.android.com/guide/app-bundle

### Google Play

- **Play Console:** https://play.google.com/console
- **Play Store Policies:** https://play.google.com/about/developer-content-policy/
- **App Signing:** https://support.google.com/googleplay/android-developer/answer/9842756
- **Launch Checklist:** https://developer.android.com/distribute/best-practices/launch/launch-checklist

### Capacitor Plugin Docs

- **App:** https://capacitorjs.com/docs/apis/app
- **Camera:** https://capacitorjs.com/docs/apis/camera
- **Geolocation:** https://capacitorjs.com/docs/apis/geolocation
- **Haptics:** https://capacitorjs.com/docs/apis/haptics
- **Push Notifications:** https://capacitorjs.com/docs/apis/push-notifications

### Debugging Tools

- **Chrome DevTools:** chrome://inspect
- **Android Studio Logcat:** View → Tool Windows → Logcat
- **ADB Documentation:** https://developer.android.com/tools/adb

---

## Testing Checklist

### Before Release

- [ ] **Build succeeds** without warnings
- [ ] **App launches** on emulator (multiple API levels)
- [ ] **App launches** on real device (multiple manufacturers)
- [ ] **Permissions work** (camera, location, storage)
- [ ] **Map displays** correctly
- [ ] **Authentication** works (sign up, sign in, sign out)
- [ ] **Prayer posting** works
- [ ] **Prayer viewing** works
- [ ] **Geolocation** accurate
- [ ] **Camera** takes photos successfully
- [ ] **Photo upload** works
- [ ] **Haptic feedback** works on device
- [ ] **Push notifications** register (if implemented)
- [ ] **No JavaScript errors** (check chrome://inspect)
- [ ] **No memory leaks** (test with Android Profiler)
- [ ] **Performance smooth** (60fps scrolling, no jank)
- [ ] **Network errors** handled gracefully
- [ ] **Offline mode** works (if applicable)
- [ ] **Deep links** work (if implemented)
- [ ] **Keyboard behavior** natural
- [ ] **Screen rotation** works
- [ ] **Back button** behaves correctly
- [ ] **App backgrounding** and foregrounding works
- [ ] **Splash screen** displays correctly
- [ ] **Status bar** styled correctly
- [ ] **Version numbers** correct in Play Console
- [ ] **Privacy policy** accessible and up to date
- [ ] **Play Store assets** uploaded (screenshots, graphics)

### Device Testing Matrix

**Minimum testing:**
- [ ] Pixel 5 (or newer) - Emulator
- [ ] Samsung Galaxy S21+ - Real device (most popular Android)
- [ ] Older device (Android 8.0 / API 26) - Minimum supported version

**Comprehensive testing:**
- [ ] Google Pixel series (pure Android)
- [ ] Samsung Galaxy series (Samsung UI modifications)
- [ ] OnePlus (OxygenOS)
- [ ] Xiaomi (MIUI)
- [ ] Various screen sizes (phone, tablet)
- [ ] Various Android versions (API 26-34)

---

## Summary

✅ **Android platform ready for development and deployment!**

### What You Can Do Now

**Development:**
```bash
npm run android:sync        # Build and sync
npm run android:open        # Open Android Studio
npm run android:run:livereload  # Develop with hot reload
```

**Testing:**
```bash
npm run android:devices     # Check connected devices
npm run android:logcat      # View logs
```

**Release:**
```bash
npm run android:build:aab   # Build for Play Store
# Then upload to Play Console
```

### Next Steps

1. **First Time Setup:**
   - [ ] Install Android Studio and SDK
   - [ ] Set up environment variables
   - [ ] Add Android platform: `npx cap add android`
   - [ ] Sync: `npx cap sync android`
   - [ ] Configure permissions in AndroidManifest.xml

2. **Development:**
   - [ ] Open in Android Studio: `npm run android:open`
   - [ ] Create emulator or connect device
   - [ ] Run app
   - [ ] Iterate with live reload

3. **Release:**
   - [ ] Generate signing key
   - [ ] Configure Gradle signing
   - [ ] Build release AAB
   - [ ] Test release build thoroughly
   - [ ] Create Play Console app
   - [ ] Upload to internal testing
   - [ ] Release to production

### Common Commands Quick Reference

```bash
# Initial setup
npm install @capacitor/android
npx cap add android

# Development
npm run build && npx cap sync android
npx cap open android
npx cap run android --livereload --external

# Release build
cd android && ./gradlew bundleRelease

# Testing
adb devices
adb install android/app/build/outputs/apk/release/app-release.apk
adb logcat | grep prayermap

# Troubleshooting
cd android && ./gradlew clean
npx cap sync android
```

---

**Android development ready! 🚀**

*Setup guide created: 2025-11-29*
*PrayerMap - "See where prayer is needed. Send prayer where you are."*
