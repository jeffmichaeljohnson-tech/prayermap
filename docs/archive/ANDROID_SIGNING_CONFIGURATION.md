# Android Release Signing Configuration Guide

**App ID:** `net.prayermap.app`
**Platform:** Android (Google Play Store)
**Date:** 2025-11-29
**Status:** Configuration Guide

---

## Overview

This document provides the complete signing configuration for releasing PrayerMap to the Google Play Store. Android apps must be signed with a release key before distribution.

**SECURITY CRITICAL:** The release keystore and its passwords are the ONLY way to update your app on Google Play. If lost, you cannot update your published app.

---

## 1. Generate Release Keystore

### Command
```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore prayermap-release.keystore \
  -alias prayermap-release \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storepass <STRONG_STORE_PASSWORD> \
  -keypass <STRONG_KEY_PASSWORD> \
  -dname "CN=PrayerMap, OU=Mobile, O=PrayerMap, L=City, ST=State, C=US"
```

### Parameter Explanation
- **`-storetype PKCS12`** - Modern keystore format (recommended over JKS)
- **`-keystore prayermap-release.keystore`** - Output filename
- **`-alias prayermap-release`** - Key alias (used in signing config)
- **`-keyalg RSA`** - RSA algorithm for maximum compatibility
- **`-keysize 4096`** - 4096-bit key (stronger than 2048)
- **`-validity 10000`** - Valid for ~27 years
- **`-storepass`** - Keystore password (KEEP SECURE)
- **`-keypass`** - Key password (KEEP SECURE)
- **`-dname`** - Distinguished Name (your organization info)

### Recommended Password Requirements
- **Minimum length:** 20+ characters
- **Include:** Uppercase, lowercase, numbers, special characters
- **DO NOT:** Use dictionary words or personal information
- **MUST:** Store in password manager (1Password, LastPass, Bitwarden)

### After Generation
```bash
# Verify keystore was created correctly
keytool -list -v -keystore prayermap-release.keystore -alias prayermap-release

# You should see:
# - Alias name: prayermap-release
# - Creation date
# - Entry type: PrivateKeyEntry
# - Certificate chain length: 1
# - Owner: CN=PrayerMap, OU=Mobile, O=PrayerMap...
# - Issuer: Same as Owner (self-signed)
# - Serial number
# - Valid from/until dates
# - Signature algorithm: SHA256withRSA
# - Public key: RSA 4096-bit
```

---

## 2. Secure Keystore Storage

### DO ✅
1. **Store in secure location:**
   ```bash
   # Create secure directory (outside git repo)
   mkdir -p ~/secure/prayermap
   mv prayermap-release.keystore ~/secure/prayermap/
   chmod 600 ~/secure/prayermap/prayermap-release.keystore
   ```

2. **Backup to encrypted cloud storage:**
   - Use encrypted backup service (iCloud Keychain, 1Password, Vault)
   - Store in multiple secure locations
   - Document backup locations in team password manager

3. **Document credentials:**
   - Store passwords in team password manager
   - Include keystore location, alias, store password, key password
   - Add recovery instructions

### DON'T ❌
1. **Never commit to git:**
   ```bash
   # Add to .gitignore (see section 6)
   *.keystore
   *.jks
   key.properties
   ```

2. **Never share via unsecured channels:**
   - Don't send via email
   - Don't share via Slack/Discord
   - Don't store in public cloud storage

3. **Never lose the keystore:**
   - If lost, you CANNOT update your app on Google Play
   - You would need to publish a new app with different package name
   - All existing users would need to uninstall and reinstall

---

## 3. gradle.properties Configuration

### File: `android/gradle.properties`

```properties
# WARNING: This file contains sensitive information
# NEVER commit this file to version control
# Each developer and CI/CD environment needs their own copy

# Release signing configuration
PRAYERMAP_RELEASE_STORE_FILE=../../../secure/prayermap/prayermap-release.keystore
PRAYERMAP_RELEASE_STORE_PASSWORD=<STORE_PASSWORD>
PRAYERMAP_RELEASE_KEY_ALIAS=prayermap-release
PRAYERMAP_RELEASE_KEY_PASSWORD=<KEY_PASSWORD>

# Optional: Upload keystore (if using Google Play App Signing)
# PRAYERMAP_UPLOAD_STORE_FILE=../../../secure/prayermap/prayermap-upload.keystore
# PRAYERMAP_UPLOAD_STORE_PASSWORD=<UPLOAD_STORE_PASSWORD>
# PRAYERMAP_UPLOAD_KEY_ALIAS=prayermap-upload
# PRAYERMAP_UPLOAD_KEY_PASSWORD=<UPLOAD_KEY_PASSWORD>
```

### gradle.properties Template (Committed to Git)

Create `android/gradle.properties.template`:

```properties
# PrayerMap Release Signing Configuration Template
# Copy this file to gradle.properties and fill in actual values
# NEVER commit gradle.properties to git

# Release signing configuration
PRAYERMAP_RELEASE_STORE_FILE=/path/to/prayermap-release.keystore
PRAYERMAP_RELEASE_STORE_PASSWORD=<YOUR_STORE_PASSWORD>
PRAYERMAP_RELEASE_KEY_ALIAS=prayermap-release
PRAYERMAP_RELEASE_KEY_PASSWORD=<YOUR_KEY_PASSWORD>

# Instructions:
# 1. Copy this file: cp gradle.properties.template gradle.properties
# 2. Replace <YOUR_*> placeholders with actual credentials
# 3. Update STORE_FILE path to your keystore location
# 4. Verify gradle.properties is in .gitignore
```

---

## 4. build.gradle Signing Configuration

### File: `android/app/build.gradle`

```gradle
android {
    namespace "net.prayermap.app"
    compileSdk 34

    defaultConfig {
        applicationId "net.prayermap.app"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    // Signing configurations
    signingConfigs {
        debug {
            // Default debug signing (auto-generated)
            // Used for local development and testing
        }

        release {
            // Release signing for Google Play Store
            // Reads credentials from gradle.properties
            if (project.hasProperty('PRAYERMAP_RELEASE_STORE_FILE')) {
                storeFile file(PRAYERMAP_RELEASE_STORE_FILE)
                storePassword PRAYERMAP_RELEASE_STORE_PASSWORD
                keyAlias PRAYERMAP_RELEASE_KEY_ALIAS
                keyPassword PRAYERMAP_RELEASE_KEY_PASSWORD
            } else {
                // Fallback for CI/CD or when credentials not available
                println("WARNING: Release signing not configured. Using debug signing.")
            }
        }
    }

    buildTypes {
        debug {
            // Development builds
            signingConfig signingConfigs.debug
            applicationIdSuffix ".debug"
            debuggable true
            minifyEnabled false
            shrinkResources false
        }

        release {
            // Production builds for Google Play
            signingConfig signingConfigs.release
            debuggable false
            minifyEnabled true
            shrinkResources true

            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            // Optimize build
            ndk {
                debugSymbolLevel 'FULL'
            }
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    // Add your dependencies here
}
```

### Alternative: key.properties File (Recommended for Better Security)

#### File: `android/key.properties`
```properties
storeFile=/path/to/prayermap-release.keystore
storePassword=<STORE_PASSWORD>
keyAlias=prayermap-release
keyPassword=<KEY_PASSWORD>
```

#### Updated build.gradle (Using key.properties)
```gradle
// Load keystore info from key.properties file
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { stream ->
        keystoreProperties.load(stream)
    }
}

android {
    // ... other config ...

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
        release {
            signingConfig signingConfigs.release
            // ... other release config ...
        }
    }
}
```

---

## 5. ProGuard Rules

### File: `android/app/proguard-rules.pro`

```proguard
# PrayerMap ProGuard Rules
# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep plugin classes
-keep class com.capacitorjs.plugins.** { *; }

# Keep JSON parsing classes (if using Gson/Jackson)
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Keep Supabase/PostgreSQL classes (if using native libraries)
-keep class org.postgresql.** { *; }

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Keep crash reporting
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
```

---

## 6. .gitignore Configuration

### Add to: `android/.gitignore`

```gitignore
# Android signing files - NEVER COMMIT
*.keystore
*.jks
key.properties
gradle.properties

# Build outputs
*.apk
*.aab
*.ap_
*.dex

# Local configuration
local.properties

# Generated files
.gradle/
build/
captures/
.externalNativeBuild/
.cxx/

# IDE files
.idea/
*.iml
.DS_Store

# NDK
obj/

# Google Services (if using Firebase)
google-services.json
```

### Add to: `.gitignore` (Root)

```gitignore
# Android
android/*.keystore
android/*.jks
android/key.properties
android/gradle.properties
android/app/release/
android/app/build/

# Build artifacts
*.apk
*.aab

# Secure directory (if storing keystores locally)
secure/
```

---

## 7. GitHub Actions Secrets

For CI/CD deployment to Google Play, store these as GitHub Secrets:

### Required Secrets

1. **`ANDROID_KEYSTORE_BASE64`**
   - Base64-encoded keystore file
   - Generate with:
     ```bash
     base64 -i prayermap-release.keystore | tr -d '\n' > keystore.b64
     # Copy contents of keystore.b64 to GitHub secret
     ```

2. **`ANDROID_KEYSTORE_PASSWORD`**
   - Keystore password (storePassword)

3. **`ANDROID_KEY_ALIAS`**
   - Key alias (e.g., `prayermap-release`)

4. **`ANDROID_KEY_PASSWORD`**
   - Key password (keyPassword)

5. **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** (Optional, for automated Play Store uploads)
   - Google Play Console service account JSON
   - Used for fastlane or Gradle Play Publisher

### GitHub Actions Workflow Example

```yaml
name: Android Release Build

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > android/app/release.keystore

      - name: Create key.properties
        env:
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cat > android/key.properties << EOF
          storeFile=release.keystore
          storePassword=$KEYSTORE_PASSWORD
          keyAlias=$KEY_ALIAS
          keyPassword=$KEY_PASSWORD
          EOF

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build release AAB
        run: |
          cd android
          ./gradlew bundleRelease

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release.aab
          path: android/app/build/outputs/bundle/release/app-release.aab

      - name: Cleanup keystore
        if: always()
        run: rm -f android/app/release.keystore android/key.properties
```

---

## 8. Build Commands

### Local Development Build

```bash
# Build debug APK (for testing)
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release Build (Signed)

```bash
# Build release AAB (for Google Play)
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Verify Signing

```bash
# Check if AAB is signed correctly
jarsigner -verify -verbose android/app/build/outputs/bundle/release/app-release.aab

# Should show:
# jar verified.
# Contains entries whose signer certificate will expire within six months.
# Contains entries whose certificate chain is invalid: reason: algorithm check failed...
```

### Extract and Verify APK from AAB

```bash
# Install bundletool (if not already installed)
wget https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all-1.15.6.jar
alias bundletool='java -jar bundletool-all-1.15.6.jar'

# Generate APKs from AAB
bundletool build-apks \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=prayermap.apks \
  --ks=~/secure/prayermap/prayermap-release.keystore \
  --ks-pass=pass:<STORE_PASSWORD> \
  --ks-key-alias=prayermap-release \
  --key-pass=pass:<KEY_PASSWORD>

# Install on connected device
bundletool install-apks --apks=prayermap.apks
```

---

## 9. Google Play App Signing (Recommended)

Google Play offers **App Signing by Google Play**, which adds an extra layer of security.

### How It Works
1. You sign your AAB with an **upload key** (you create this)
2. Google re-signs with their **app signing key** (Google manages this)
3. If you lose your upload key, Google can reset it
4. Your app signing key is never at risk

### Setup
1. Generate upload keystore (separate from release keystore):
   ```bash
   keytool -genkeypair -v \
     -storetype PKCS12 \
     -keystore prayermap-upload.keystore \
     -alias prayermap-upload \
     -keyalg RSA \
     -keysize 4096 \
     -validity 10000
   ```

2. In Google Play Console:
   - Go to Release → Setup → App Signing
   - Enable "Use app signing by Google Play"
   - Upload your release keystore (one time only)
   - Download Google's public certificate

3. Sign future releases with upload key:
   ```gradle
   signingConfigs {
       release {
           storeFile file(PRAYERMAP_UPLOAD_STORE_FILE)
           storePassword PRAYERMAP_UPLOAD_STORE_PASSWORD
           keyAlias PRAYERMAP_UPLOAD_KEY_ALIAS
           keyPassword PRAYERMAP_UPLOAD_KEY_PASSWORD
       }
   }
   ```

---

## 10. Security Checklist

Before releasing to Google Play:

### Keystore Security
- [ ] Release keystore stored in secure location (not in git)
- [ ] Keystore backed up to encrypted cloud storage
- [ ] Keystore passwords stored in team password manager
- [ ] `.gitignore` configured to exclude keystore files
- [ ] `gradle.properties` excluded from git
- [ ] Team members know keystore recovery process

### Build Configuration
- [ ] `minifyEnabled true` for release builds
- [ ] `shrinkResources true` for release builds
- [ ] ProGuard rules configured correctly
- [ ] Debug symbols uploaded to Play Console
- [ ] No hardcoded secrets in code
- [ ] API keys stored in BuildConfig or environment

### Testing
- [ ] Release build tested on multiple devices
- [ ] APK extracted from AAB and tested
- [ ] All features work in release build
- [ ] No crashes in release mode
- [ ] ProGuard hasn't broken anything
- [ ] App size is reasonable

### CI/CD
- [ ] GitHub Actions secrets configured
- [ ] Automated build workflow tested
- [ ] Keystore cleanup in CI pipeline
- [ ] No secrets logged in CI output

---

## 11. Troubleshooting

### "keystore file not found"
```bash
# Check path in gradle.properties
cat android/gradle.properties | grep STORE_FILE

# Verify file exists
ls -l /path/to/prayermap-release.keystore
```

### "keystore password was incorrect"
```bash
# Verify password works
keytool -list -v -keystore prayermap-release.keystore
# Enter password when prompted
```

### "Entry for alias ... not found"
```bash
# List all aliases in keystore
keytool -list -keystore prayermap-release.keystore

# Ensure alias matches gradle.properties
```

### ProGuard Breaks App
```bash
# Test with ProGuard disabled first
android {
    buildTypes {
        release {
            minifyEnabled false // Temporarily disable
        }
    }
}

# Then enable and add keep rules for broken classes
-keep class com.broken.class.** { *; }
```

### Build Fails in CI
```bash
# Verify secrets are set
echo ${{ secrets.ANDROID_KEYSTORE_BASE64 }} | base64 -d > test.keystore
keytool -list -keystore test.keystore

# Check permissions
ls -l android/app/release.keystore
chmod 644 android/app/release.keystore
```

---

## 12. Resources

### Official Documentation
- **Android App Signing:** https://developer.android.com/studio/publish/app-signing
- **Configure Gradle Builds:** https://developer.android.com/build
- **ProGuard Rules:** https://developer.android.com/studio/build/shrink-code
- **Google Play App Signing:** https://support.google.com/googleplay/android-developer/answer/9842756

### Capacitor Resources
- **Capacitor Android Guide:** https://capacitorjs.com/docs/android
- **Publishing Android Apps:** https://capacitorjs.com/docs/android/deploying-to-google-play

### Tools
- **bundletool:** https://github.com/google/bundletool
- **Fastlane:** https://fastlane.tools/ (for automated deployments)
- **Gradle Play Publisher:** https://github.com/Triple-T/gradle-play-publisher

---

## Summary

### ✅ What You Need to Do

1. **Generate release keystore** (one time only)
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore prayermap-release.keystore \
     -alias prayermap-release \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

2. **Store keystore securely**
   - Move to secure directory outside git
   - Backup to encrypted cloud storage
   - Store passwords in password manager

3. **Configure gradle.properties**
   ```properties
   PRAYERMAP_RELEASE_STORE_FILE=/path/to/prayermap-release.keystore
   PRAYERMAP_RELEASE_STORE_PASSWORD=<PASSWORD>
   PRAYERMAP_RELEASE_KEY_ALIAS=prayermap-release
   PRAYERMAP_RELEASE_KEY_PASSWORD=<PASSWORD>
   ```

4. **Update .gitignore**
   ```gitignore
   *.keystore
   *.jks
   key.properties
   gradle.properties
   ```

5. **Configure signing in build.gradle**
   - Add signingConfigs block
   - Configure release buildType
   - Enable ProGuard

6. **Set GitHub Actions secrets**
   - ANDROID_KEYSTORE_BASE64
   - ANDROID_KEYSTORE_PASSWORD
   - ANDROID_KEY_ALIAS
   - ANDROID_KEY_PASSWORD

7. **Build and test**
   ```bash
   ./gradlew bundleRelease
   ```

### 🔐 Security Reminders

- **NEVER** commit keystore to git
- **NEVER** share keystore via unsecured channels
- **ALWAYS** backup keystore to multiple secure locations
- **ALWAYS** use strong passwords (20+ characters)
- **ALWAYS** verify .gitignore before committing

### 📦 Ready for Google Play

Once configured, you can build release AABs with:
```bash
npm run build && npx cap sync android && cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Upload this AAB to Google Play Console for distribution.

---

*Configuration guide created for PrayerMap Android - 2025-11-29*
*App ID: `net.prayermap.app`*
*"See where prayer is needed. Send prayer where you are."*
