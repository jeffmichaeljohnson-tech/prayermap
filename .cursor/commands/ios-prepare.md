# iOS Deployment Preparation

Checklist and commands for preparing PrayerMap for iOS App Store deployment.

## Pre-Flight Checklist

### 1. Development Environment
- [ ] Xcode installed (latest stable)
- [ ] Apple Developer account active
- [ ] Certificates and provisioning profiles configured
- [ ] CocoaPods installed (`sudo gem install cocoapods`)

### 2. Capacitor Setup
```bash
# Install Capacitor if not already
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize (if not done)
npx cap init PrayerMap com.jjtech.prayermap

# Add iOS platform
npx cap add ios
```

### 3. Build Web App
```bash
# Production build
npm run build

# Sync to iOS
npx cap sync ios
```

### 4. Install Required Plugins
```bash
npm install @capacitor/geolocation @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen @capacitor/app @capacitor/push-notifications

npx cap sync ios
```

### 5. Open in Xcode
```bash
npx cap open ios
```

## Xcode Configuration

### General Tab
- [ ] Display Name: PrayerMap
- [ ] Bundle Identifier: com.jjtech.prayermap
- [ ] Version: 1.0.0
- [ ] Build: 1
- [ ] Deployment Target: iOS 14.0

### Signing & Capabilities
- [ ] Team selected
- [ ] Signing Certificate configured
- [ ] Provisioning Profile selected
- [ ] Add capabilities:
  - [ ] Push Notifications
  - [ ] Background Modes (if needed)

### Info.plist Permissions
Add these usage descriptions:
- [ ] NSLocationWhenInUseUsageDescription
- [ ] NSMicrophoneUsageDescription
- [ ] NSCameraUsageDescription (if adding video)
- [ ] NSPhotoLibraryUsageDescription (if needed)

## App Store Assets

### Required
- [ ] App Icon (1024x1024 PNG, no alpha)
- [ ] Screenshots:
  - [ ] 6.7" (iPhone 14 Pro Max): 1290 x 2796
  - [ ] 6.5" (iPhone 11 Pro Max): 1284 x 2778
  - [ ] 5.5" (iPhone 8 Plus): 1242 x 2208
- [ ] App Preview video (optional but recommended)

### App Store Connect
- [ ] App name reserved
- [ ] Description written
- [ ] Keywords defined
- [ ] Category selected (Lifestyle or Social Networking)
- [ ] Privacy Policy URL
- [ ] Support URL

## Testing Checklist

### Functionality
- [ ] App launches without crash
- [ ] Location permission flow works
- [ ] Map loads and displays prayers
- [ ] Can create new prayer
- [ ] Can record audio prayer
- [ ] Real-time updates work
- [ ] Push notifications received
- [ ] Authentication works
- [ ] Inbox shows responses

### UI/UX
- [ ] Safe areas respected (notch, home indicator)
- [ ] Keyboard doesn't cover inputs
- [ ] All touch targets ≥ 44pt
- [ ] Text readable (≥ 16pt body)
- [ ] Glassmorphic effects render correctly
- [ ] Animations smooth (60fps)
- [ ] Dark mode supported (if applicable)

### Performance
- [ ] Launch time < 3 seconds
- [ ] Smooth scrolling
- [ ] Memory usage stable
- [ ] Battery drain reasonable
- [ ] Network efficient

## Build & Submit

### Archive for App Store
1. In Xcode: Product → Archive
2. Validate archive
3. Distribute to App Store Connect

### TestFlight
1. Upload build to App Store Connect
2. Add internal testers
3. Submit for external testing (optional)

### App Review
- [ ] All metadata complete
- [ ] Screenshots uploaded
- [ ] Build uploaded and processed
- [ ] Submit for review

## Commands Reference

```bash
# Development cycle
npm run build && npx cap sync ios && npx cap open ios

# Live reload during development
npx cap run ios --livereload --external

# Check Capacitor status
npx cap doctor

# Update Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/ios

# Clean iOS build
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```
