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
  icon: './assets/images/icon.png',
  scheme: 'prayermap',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/a85652f3-e4f8-4bb8-84e8-744bc73e3326',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  splash: {
    image: './assets/images/splash-icon.png',
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
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#E8F4F8',
    },
    package: getUniqueIdentifier(),
    edgeToEdgeEnabled: true,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        root: './app',
      },
    ],
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow PrayerMap to use your location to show nearby prayers.',
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        // Match @rnmapbox/maps@10.2.10 expected version (supports lineGradient + lineEmissiveStrength)
        RNMapboxMapsVersion: '11.16.2',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: 'Allow PrayerMap to record audio prayers.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow PrayerMap to access your photos.',
        cameraPermission: 'Allow PrayerMap to record video prayers.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow PrayerMap to record video prayers.',
        microphonePermission: 'Allow PrayerMap to record audio for video prayers.',
      },
    ],
    'expo-video',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'a85652f3-e4f8-4bb8-84e8-744bc73e3326',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  },
});
