# MOBILE-GUIDE.md - iOS & Android Deployment

> **Critical missing documentation for mobile deployment workflows.** This guide covers everything needed to successfully deploy PrayerMap to iOS App Store and Google Play Store.

> **Prerequisites:** Read [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) first, then [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md).

---

## 🎯 Mobile Architecture Overview

PrayerMap uses **Capacitor** to wrap the React web app for native iOS and Android deployment:

```
Web App (React + Vite)
        ↓
Capacitor Bridge
        ↓
Native iOS App    Native Android App
```

**Core Philosophy:** Progressive Enhancement
- Web works perfectly
- Mobile adds native capabilities
- Every feature has web fallback

---

## 📱 Platform Support

### iOS Requirements
- **iOS 14+** (current minimum)
- **Xcode 15+** (for development)
- **macOS** required for iOS builds
- **Apple Developer Account** ($99/year)

### Android Requirements  
- **Android 10+** (API level 29+)
- **Android Studio** (latest)
- **Java 17+** (for build tools)
- **Google Play Console Account** ($25 one-time)

---

## 🚀 Quick Deployment Commands

### Initial Setup
```bash
# Install Capacitor CLI
npm install -g @capacitor/cli

# Add mobile platforms
npx cap add ios
npx cap add android

# Install required plugins
npm install @capacitor/camera @capacitor/geolocation 
npm install @capacitor/haptics @capacitor/push-notifications
npm install @capacitor/status-bar @capacitor/splash-screen
```

### Daily Development Workflow
```bash
# 1. Build web app
npm run build

# 2. Sync to native projects
npx cap sync

# 3. Open in native IDE (choose one)
npx cap open ios
npx cap open android

# 4. Run from Xcode/Android Studio
# (Use IDE run buttons for device/simulator)
```

### Live Reload Development
```bash
# Start web dev server
npm run dev

# In separate terminal - run on device with live reload
npx cap run ios --livereload --external
npx cap run android --livereload --external

# Note: Requires device on same network
```

---

## 🔧 Capacitor Configuration

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#E8F4F8",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    }
  }
};

export default config;
```

### iOS Specific Configuration

**Info.plist additions needed:**
```xml
<!-- Location permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>PrayerMap needs location to show nearby prayer requests and connect you with your local prayer community.</string>

<!-- Camera permissions -->
<key>NSCameraUsageDescription</key>
<string>PrayerMap needs camera access to share photos with your prayer requests.</string>

<!-- Photo library permissions -->
<key>NSPhotoLibraryUsageDescription</key>
<string>PrayerMap needs photo access to share images with prayer requests.</string>
```

### Android Specific Configuration

**android/app/src/main/AndroidManifest.xml:**
```xml
<!-- Location permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Camera and storage permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

<!-- Network permissions -->
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 🔌 Native Plugin Integration

### Geolocation Plugin
```typescript
import { Geolocation } from '@capacitor/geolocation';

// Always check permissions first
const getCurrentPosition = async () => {
  try {
    const permissions = await Geolocation.requestPermissions();
    if (permissions.location === 'granted') {
      const coordinates = await Geolocation.getCurrentPosition();
      return coordinates;
    }
  } catch (error) {
    // Fallback to browser geolocation
    return getBrowserLocation();
  }
};
```

### Camera Plugin
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri
    });
    return image;
  } catch (error) {
    // Fallback to file input
    return useFileInput();
  }
};
```

### Haptics Plugin (iOS/Android)
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const provideFeedback = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    // Haptics not available - silent fail
  }
};
```

### Platform Detection
```typescript
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
if (Capacitor.isNativePlatform()) {
  // Use native features
  await Haptics.impact();
} else {
  // Web fallback
  console.log('Native features not available');
}

// Platform-specific code
if (Capacitor.getPlatform() === 'ios') {
  // iOS specific code
} else if (Capacitor.getPlatform() === 'android') {
  // Android specific code
}
```

---

## 🍎 iOS Deployment Workflow

### Development Setup
```bash
# 1. Open iOS project
npx cap open ios

# 2. In Xcode:
#    - Set Development Team (your Apple ID)
#    - Set Bundle Identifier (net.prayermap.app)
#    - Choose iOS device or simulator
#    - Click Run button
```

### TestFlight Beta Distribution
```bash
# 1. Archive build in Xcode
#    Product → Archive

# 2. In Organizer:
#    - Select archive
#    - Click "Distribute App"
#    - Choose "App Store Connect"
#    - Upload build

# 3. In App Store Connect:
#    - Add build to TestFlight
#    - Add internal testers
#    - Submit for external testing (optional)
```

### App Store Release
```bash
# 1. Create app in App Store Connect
#    - App Information
#    - Pricing and Availability
#    - App Privacy (important for prayer app)

# 2. Submit for Review
#    - App Review Information
#    - Age Rating (4+ for prayer content)
#    - App Icon and Screenshots
```

---

## 🤖 Android Deployment Workflow

### Development Setup
```bash
# 1. Open Android project  
npx cap open android

# 2. In Android Studio:
#    - Sync project
#    - Select device/emulator
#    - Click Run button
```

### Google Play Store Release

#### Generate Signed APK
```bash
# 1. Generate keystore (one time only)
keytool -genkey -v -keystore prayermap-release.keystore 
  -alias prayermap-key -keyalg RSA -keysize 2048 -validity 10000

# 2. In Android Studio:
#    Build → Generate Signed Bundle/APK
#    - Choose "Android App Bundle"  
#    - Select keystore file
#    - Build release bundle
```

#### Upload to Play Console
```bash
# 1. Create app in Google Play Console
#    - App Information
#    - Store Listing
#    - Content Rating (Everyone for prayer content)

# 2. Upload AAB file
#    - Production track or Internal testing
#    - Release notes
#    - Submit for review
```

---

## 🔒 Security & Privacy

### App Store Privacy Requirements

**Data Collection (be transparent):**
- Location data (for map features)
- Prayer content (stored securely)
- User accounts (for authentication)

**Privacy Policy Required:**
- Data collection and usage
- Third-party services (Supabase, MapBox)
- User rights and data deletion

### Android Privacy Requirements

**Data Safety Section:**
- Location data collection
- Personal communications (prayers)
- User account information
- Encryption in transit and at rest

---

## 📊 Performance Considerations

### Bundle Size Optimization
```bash
# Check bundle size
npm run build
# dist/ should be < 500KB gzipped

# Capacitor adds ~2MB native overhead
# Total app size target: < 10MB
```

### iOS Specific Performance
- **Safe Area Insets:** Handle notch and home indicator
- **Background App Refresh:** Manage when app backgrounded
- **Memory Management:** iOS aggressively kills background apps

### Android Specific Performance
- **Back Button:** Handle Android back navigation
- **Permissions:** Runtime permission requests
- **Battery Optimization:** Manage background tasks

---

## ⚡ Native Features Used by PrayerMap

### Core Features (MVP)
- ✅ **Geolocation** - Show nearby prayers
- ✅ **Camera** - Add photos to prayer requests  
- ✅ **Push Notifications** - Prayer responses
- ✅ **Haptics** - Touch feedback
- ✅ **Status Bar** - App branding

### Planned Features (Future)
- 📱 **Contacts** - Invite friends to pray
- 🔔 **Local Notifications** - Prayer reminders
- 📱 **Share** - Share prayer requests
- 🎤 **Microphone** - Audio prayers
- 💾 **File System** - Offline prayer storage

---

## 🚨 Common Mobile Issues & Solutions

### "Plugin not found" Errors
```bash
# Solution: Sync and clean
npx cap sync
npx cap clean ios    # or android
npx cap copy
```

### iOS Build Errors
```bash
# Missing Development Team
# Solution: Set team in Xcode project settings

# Provisioning Profile Issues  
# Solution: Let Xcode manage automatically

# CocoaPods Issues
cd ios/App && pod install
```

### Android Build Errors
```bash
# Gradle Build Failed
# Solution: Clean and rebuild
cd android && ./gradlew clean
./gradlew assembleDebug

# SDK/NDK Issues
# Solution: Update Android Studio and SDK
```

### Live Reload Not Working
```bash
# Check network connectivity
# Ensure device and computer on same network
# Use IP address instead of localhost
npm run dev -- --host=0.0.0.0
```

---

## 📱 Testing Strategy

### Manual Testing Checklist

#### iOS Testing
- [ ] Install on actual iPhone (not just simulator)
- [ ] Test on both iPhone and iPad
- [ ] Verify all gestures (tap, swipe, pinch)
- [ ] Check safe area handling (notch compatibility)
- [ ] Test with poor network connection
- [ ] Verify haptic feedback works

#### Android Testing
- [ ] Test on multiple Android devices
- [ ] Verify back button navigation
- [ ] Check runtime permissions flow
- [ ] Test with different screen sizes
- [ ] Verify keyboard behavior
- [ ] Test installation from APK

### Automated Testing
```bash
# Use Appium for mobile automation (future)
# Current: Manual testing required
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Bundle size under limits
- [ ] Permissions properly documented
- [ ] Privacy policy updated
- [ ] Screenshots and metadata ready

### iOS Checklist
- [ ] Development certificate valid
- [ ] Provisioning profiles updated  
- [ ] App Store Connect app configured
- [ ] TestFlight testing completed
- [ ] App Review Guidelines reviewed

### Android Checklist
- [ ] Keystore file secured
- [ ] App bundle generated
- [ ] Play Console app configured
- [ ] Internal testing completed
- [ ] Google Play policies reviewed

---

## 🔗 Related Documentation

- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Main project navigation
- **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Setup and patterns
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - When mobile builds break
- **[Capacitor Docs](https://capacitorjs.com/docs)** - Official documentation

---

**Last Updated:** 2024-11-30  
**Version:** 1.0 (Initial mobile deployment guide)  
**Next Review:** After first app store submissions