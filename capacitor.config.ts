import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.prayermap.app',
  appName: 'PrayerMap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
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
