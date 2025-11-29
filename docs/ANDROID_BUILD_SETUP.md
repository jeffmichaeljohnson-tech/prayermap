# Android Build Setup - GitHub Actions

This guide explains how to set up automated Android builds using GitHub Actions for the PrayerMap project.

## Overview

The GitHub Actions workflow automatically builds signed Android APK and AAB files for:
- **APK**: Direct installation and testing on Android devices
- **AAB**: Upload to Google Play Store

## Prerequisites

1. An Android signing keystore (`.jks` file)
2. GitHub repository with Actions enabled
3. Access to repository secrets settings

---

## Part 1: Creating an Android Keystore

If you don't already have a keystore, create one using `keytool`:

```bash
keytool -genkey -v \
  -keystore prayermap-release.jks \
  -alias prayermap \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD
```

**Interactive prompts:**
- **First and last name**: PrayerMap Team
- **Organizational unit**: Engineering
- **Organization**: PrayerMap
- **City/Locality**: Your city
- **State/Province**: Your state
- **Country code**: US (or your country)

### Important Notes

1. **Store credentials securely**: Save the passwords in a password manager
2. **Backup the keystore**: Store it in a secure location (encrypted backup)
3. **Never commit**: The keystore should NEVER be committed to git
4. **Validity**: The example uses 10,000 days (~27 years)
5. **Same credentials**: You MUST use the same keystore for all app updates

### Keystore Information to Save

```
Keystore File: prayermap-release.jks
Store Password: [YOUR_STORE_PASSWORD]
Key Alias: prayermap
Key Password: [YOUR_KEY_PASSWORD]
```

---

## Part 2: Encoding Keystore to Base64

GitHub secrets can only store text, so we encode the binary keystore file to base64:

### On macOS/Linux:

```bash
base64 -i prayermap-release.jks -o keystore.base64.txt
```

Or using a single command:

```bash
base64 prayermap-release.jks | tr -d '\n' > keystore.base64.txt
```

### On Windows (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("prayermap-release.jks")) | Out-File -FilePath keystore.base64.txt -Encoding ASCII -NoNewline
```

### Verify the encoding:

The `keystore.base64.txt` file should contain a single long string of base64-encoded text with no line breaks.

---

## Part 3: Setting Up GitHub Secrets

Navigate to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following four secrets:

### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file | Copy entire contents of `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore store password | The password you used with `-storepass` |
| `ANDROID_KEY_ALIAS` | Key alias name | `prayermap` (or your chosen alias) |
| `ANDROID_KEY_PASSWORD` | Key password | The password you used with `-keypass` |

### Adding Each Secret

For each secret:
1. Click **New repository secret**
2. Enter the **Name** (exact match from table above)
3. Paste the **Value**
4. Click **Add secret**

### Security Best Practices

- ✅ Use strong, unique passwords (20+ characters recommended)
- ✅ Store passwords in a password manager
- ✅ Limit repository access to trusted team members
- ✅ Regularly audit who has access to secrets
- ❌ Never share secrets in chat/email
- ❌ Never log secrets in workflow outputs
- ❌ Never commit secrets to git

---

## Part 4: Using the Workflow

The workflow file is located at `.github/workflows/android-build.yml`

### Trigger Methods

#### 1. Automatic (Release Tags)

When you push a tag starting with `v`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will automatically trigger the build and create both APK and AAB files.

#### 2. Manual Dispatch

From the GitHub web interface:

1. Go to **Actions** tab
2. Select **Android Build** workflow
3. Click **Run workflow**
4. Choose build type:
   - **apk**: Build APK only (for testing)
   - **aab**: Build AAB only (for Play Store)
   - **both**: Build both (default)
5. Click **Run workflow**

### Workflow Steps

The workflow performs these steps:

1. ✅ Checkout repository
2. ✅ Set up JDK 21 (required for Capacitor 7)
3. ✅ Set up Node.js 20
4. ✅ Install npm dependencies
5. ✅ Build web assets (`npm run build`)
6. ✅ Sync Capacitor (`npx cap sync android`)
7. ✅ Decode keystore from base64
8. ✅ Create `keystore.properties` with signing config
9. ✅ Build APK (`./gradlew assembleRelease`)
10. ✅ Build AAB (`./gradlew bundleRelease`)
11. ✅ Upload artifacts to GitHub
12. ✅ Clean up sensitive files

### Build Outputs

After a successful build:

1. Go to the **Actions** tab
2. Click on the completed workflow run
3. Scroll to **Artifacts** section
4. Download:
   - **app-release-apk**: Contains the APK file
   - **app-release-aab**: Contains the AAB file
   - **release-notes**: Contains version info and instructions

### Artifacts Retention

- Build artifacts are kept for **30 days**
- Release notes are kept for **90 days**
- Download them before they expire

---

## Part 5: Testing the Build

### Test the APK Locally

1. Download the APK artifact from GitHub Actions
2. Unzip the artifact
3. Install on Android device:

```bash
adb install app-release.apk
```

Or email/share the APK to install on device directly.

### Verify the Signature

Check that the APK is properly signed:

```bash
# Extract APK signing certificate
unzip -p app-release.apk META-INF/CERT.RSA | \
  keytool -printcert | \
  grep -A 5 "Owner:"
```

Should show your keystore information (organization, etc.)

### Test on Multiple Devices

Test the APK on:
- ✅ Different Android versions (Android 7.0+ minimum)
- ✅ Different screen sizes (phone, tablet)
- ✅ Different manufacturers (Samsung, Google, etc.)

---

## Part 6: Uploading to Google Play Store

### Upload AAB to Play Console

1. Download the AAB artifact from GitHub Actions
2. Unzip the artifact
3. Log into [Google Play Console](https://play.google.com/console)
4. Select **PrayerMap** app
5. Go to **Release** → **Production** (or Testing track)
6. Click **Create new release**
7. Upload the `.aab` file
8. Fill in release notes
9. Review and roll out

### Version Management

Update version in `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2      // Increment for each release
    versionName "1.1"  // Semantic version
}
```

Remember:
- `versionCode` must increment with each upload to Play Store
- `versionName` is displayed to users

---

## Part 7: Troubleshooting

### Build Fails: "Keystore not found"

**Problem**: Secrets not configured correctly

**Solution**:
1. Verify all four secrets are set in GitHub
2. Check secret names match exactly (case-sensitive)
3. Ensure base64 encoding has no line breaks

### Build Fails: "Wrong password"

**Problem**: Incorrect keystore or key password

**Solution**:
1. Verify passwords in GitHub secrets
2. Test keystore locally:
```bash
keytool -list -v -keystore prayermap-release.jks
```

### Build Fails: "Gradle error"

**Problem**: Gradle configuration or dependency issue

**Solution**:
1. Check workflow logs for specific error
2. Test build locally:
```bash
cd android
./gradlew assembleRelease --stacktrace
```

### APK Installation Fails

**Problem**: Signature mismatch or corrupted file

**Solution**:
1. Uninstall existing app completely
2. Verify APK signature
3. Try clean install

### Missing Artifacts

**Problem**: Workflow completed but no artifacts

**Solution**:
1. Check workflow logs for upload errors
2. Verify build actually completed successfully
3. Check if files exist in expected paths

---

## Part 8: Security Checklist

Before going to production:

- [ ] Keystore is backed up in secure location
- [ ] Passwords are stored in password manager
- [ ] GitHub secrets are set correctly
- [ ] `.gitignore` excludes keystore files
- [ ] Only trusted team members have repo access
- [ ] Workflow logs don't expose secrets
- [ ] Two-factor authentication enabled on GitHub
- [ ] Keystore file is encrypted in backup

---

## Part 9: CI/CD Best Practices

### Versioning Strategy

Use semantic versioning for releases:
- `v1.0.0`: Major release
- `v1.1.0`: Minor features
- `v1.1.1`: Bug fixes

### Branch Protection

Protect your main branches:
1. Require pull request reviews
2. Require status checks to pass
3. Require branches to be up to date

### Automated Testing

Add test steps before building:

```yaml
- name: Run unit tests
  run: npm test

- name: Run E2E tests
  run: npm run test:e2e
```

### Notifications

Set up notifications for build failures:
- Email notifications
- Slack integration
- GitHub notifications

---

## Resources

### Official Documentation

- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Google Play Console](https://support.google.com/googleplay/android-developer/)

### PrayerMap Specific

- **Workflow File**: `.github/workflows/android-build.yml`
- **Build Config**: `android/app/build.gradle`
- **App ID**: `net.prayermap.app`
- **Minimum SDK**: API 24 (Android 7.0)
- **Target SDK**: API 34 (Android 14)

---

## Summary

This automation provides:
- ✅ Consistent, reproducible builds
- ✅ Secure signing process
- ✅ No local environment dependencies
- ✅ Automatic artifact creation
- ✅ Version tracking
- ✅ Easy distribution for testing
- ✅ Direct Play Store upload capability

The workflow eliminates manual build steps and ensures every release is built the same way, reducing errors and saving time.

---

**Last Updated**: 2025-11-29
**Maintained for**: PrayerMap Android Build Pipeline
**Version**: 1.0
