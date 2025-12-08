---
name: expo-config
description: Use when configuring Expo applications through app.json, app.config.js/ts, and EAS build configuration. Covers environment variables, build profiles, plugins, and deployment settings.
---

# Expo Configuration

Configure Expo applications with static and dynamic configuration, EAS builds, and environment management.

## When to Use

- Setting up a new Expo project
- Configuring app metadata (name, icons, splash)
- Managing environment variables across dev/staging/prod
- Setting up EAS build profiles
- Configuring native plugins (camera, location, notifications)
- Preparing for App Store / Play Store submission

## Configuration Methods

### Static Configuration (app.json)

Use for simple, non-dynamic values:

```json
{
  "expo": {
    "name": "PrayerMap",
    "slug": "prayermap",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#E8F4F8"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.prayermap.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#E8F4F8"
      },
      "package": "com.prayermap.app"
    }
  }
}
```

### Dynamic Configuration (app.config.ts)

Use for environment-based values and logic:

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from '@expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.prayermap.app.dev';
  if (IS_PREVIEW) return 'com.prayermap.app.preview';
  return 'com.prayermap.app';
};

const getAppName = () => {
  if (IS_DEV) return 'PrayerMap (Dev)';
  if (IS_PREVIEW) return 'PrayerMap (Preview)';
  return 'PrayerMap';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'prayermap',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#E8F4F8',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'PrayerMap needs your location to show prayers near you.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'PrayerMap needs your location to notify you of nearby prayers.',
      NSCameraUsageDescription:
        'PrayerMap needs camera access to add photos to prayers.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#E8F4F8',
    },
    package: getUniqueIdentifier(),
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow PrayerMap to use your location to show nearby prayers.',
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#4A90E2',
        sounds: ['./assets/sounds/prayer-notification.wav'],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow PrayerMap to access your camera.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow PrayerMap to access your photos.',
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  },
});
```

## EAS Build Configuration

### eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "APP_VARIANT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "env": {
        "APP_VARIANT": "preview"
      },
      "channel": "preview"
    },
    "production": {
      "env": {
        "APP_VARIANT": "production"
      },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "internal"
      }
    }
  }
}
```

### Environment Files

```bash
# .env.development
APP_VARIANT=development
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...dev
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx.dev

# .env.preview
APP_VARIANT=preview
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...preview
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx.preview

# .env.production
APP_VARIANT=production
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...prod
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxx.prod
```

## Runtime Configuration Access

```typescript
// lib/config.ts
import Constants from 'expo-constants';

interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapboxToken: string;
  isProduction: boolean;
}

export const config: AppConfig = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl ?? '',
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey ?? '',
  mapboxToken: Constants.expoConfig?.extra?.mapboxToken ?? '',
  isProduction: Constants.expoConfig?.extra?.eas?.projectId !== undefined,
};

// Usage
import { config } from '@/lib/config';

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
```

## Plugin Configuration Examples

### Location Plugin

```typescript
// In app.config.ts plugins array
[
  'expo-location',
  {
    locationAlwaysAndWhenInUsePermission:
      'Allow $(PRODUCT_NAME) to use your location.',
    locationAlwaysPermission:
      'Allow $(PRODUCT_NAME) to use your location even when the app is in the background.',
    locationWhenInUsePermission:
      'Allow $(PRODUCT_NAME) to use your location.',
    isAndroidBackgroundLocationEnabled: true,
    isAndroidForegroundServiceEnabled: true,
  },
],
```

### Notifications Plugin

```typescript
[
  'expo-notifications',
  {
    icon: './assets/notification-icon.png',
    color: '#4A90E2',
    defaultChannel: 'default',
    sounds: [
      './assets/sounds/prayer-received.wav',
      './assets/sounds/prayer-answered.wav',
    ],
    enableBackgroundRemoteNotifications: true,
  },
],
```

### Mapbox Plugin

```typescript
[
  '@rnmapbox/maps',
  {
    RNMapboxMapsImpl: 'mapbox',
    RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
    RNMapboxMapsVersion: '11.0.0',
  },
],
```

## Build Commands

```bash
# Development build (with dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build (App Store / Play Store)
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production

# OTA Update (no app review needed)
eas update --branch preview --message "Bug fixes"
eas update --branch production --message "v1.0.1 hotfix"
```

## Best Practices

### DO
- Use `app.config.ts` for any dynamic values
- Keep secrets in EAS Secrets, not in code
- Use separate bundle IDs for dev/preview/prod
- Configure all required permissions upfront
- Test on real devices before submitting
- Use `autoIncrement` for production builds

### DON'T
- Hardcode API keys or secrets
- Use both app.json AND app.config.js (pick one)
- Forget platform-specific permissions
- Skip the preview build testing phase
- Submit without testing OTA updates
- Ignore TypeScript types for config

## Common Issues

### "Missing bundle identifier"
Ensure `ios.bundleIdentifier` is set in config.

### "Plugin not found"
Run `npx expo install <plugin-name>` and rebuild.

### "Environment variable undefined"
Check that variable starts with `EXPO_PUBLIC_` for client access, or is in `extra` block.

### "EAS build fails"
Check `eas.json` profiles match your environment setup.
