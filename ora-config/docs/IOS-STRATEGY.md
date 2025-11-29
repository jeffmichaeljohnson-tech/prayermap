# iOS Deployment Strategy

## Approach: Capacitor

Wrap existing React app for fastest iOS deployment.

## Setup Commands

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init PrayerMap com.jjtech.prayermap
npx cap add ios
```

## Build Workflow

```bash
npm run build
npx cap sync ios
npx cap open ios
```

## Required Plugins

```bash
npm install @capacitor/geolocation @capacitor/push-notifications @capacitor/haptics
```

## Key Considerations

- Safe areas for notch/home indicator
- 44pt minimum touch targets
- Location permission handling
- Push notification setup

## App Store Checklist

- [ ] App Icon 1024x1024
- [ ] Screenshots (6.5", 5.5")
- [ ] Privacy Policy URL
- [ ] Info.plist permissions
