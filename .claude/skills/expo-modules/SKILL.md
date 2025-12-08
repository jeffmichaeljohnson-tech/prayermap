---
name: expo-modules
description: Use when working with Expo SDK modules for camera, location, notifications, file system, secure storage, and other device APIs. Covers permissions, configurations, and best practices.
---

# Expo Modules

Implement native device functionality in Expo applications including location, notifications, camera, storage, and background tasks.

## When to Use

- Accessing device location (foreground and background)
- Implementing push notifications
- Camera and image picker functionality
- Secure storage for auth tokens
- File system operations
- Background task execution
- Device information retrieval

## Location Services

### Setup and Permissions

```typescript
// hooks/useLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  location: Location.LocationObject | null;
  error: string | null;
  loading: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const startLocationUpdates = async () => {
      try {
        // Request foreground permission first
        const { status: foregroundStatus } =
          await Location.requestForegroundPermissionsAsync();

        if (foregroundStatus !== 'granted') {
          setState({
            location: null,
            error: 'Location permission denied',
            loading: false,
          });
          return;
        }

        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setState({
          location: currentLocation,
          error: null,
          loading: false,
        });

        // Subscribe to updates
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // 10 seconds
            distanceInterval: 50, // 50 meters
          },
          (newLocation) => {
            setState((prev) => ({
              ...prev,
              location: newLocation,
            }));
          }
        );
      } catch (error) {
        setState({
          location: null,
          error: error instanceof Error ? error.message : 'Location error',
          loading: false,
        });
      }
    };

    startLocationUpdates();

    return () => {
      subscription?.remove();
    };
  }, []);

  return state;
}
```

### Background Location

```typescript
// services/backgroundLocation.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (location) {
      // Send location to server for nearby prayer notifications
      await fetch('/api/location-update', {
        method: 'POST',
        body: JSON.stringify({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        }),
      });
    }
  }
});

export async function startBackgroundLocation(): Promise<boolean> {
  // Request background permission
  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();

  if (backgroundStatus !== 'granted') {
    console.log('Background location permission denied');
    return false;
  }

  // Check if task is already running
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );

  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 1 minute
      distanceInterval: 100, // 100 meters
      foregroundService: {
        notificationTitle: 'PrayerMap',
        notificationBody: 'Monitoring for nearby prayers',
        notificationColor: '#4A90E2',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  return true;
}

export async function stopBackgroundLocation(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );

  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
```

## Push Notifications

### Setup and Registration

```typescript
// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Must be on physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayers', {
      name: 'Prayer Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
      sound: 'prayer-notification.wav',
    });

    await Notifications.setNotificationChannelAsync('responses', {
      name: 'Prayer Responses',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'prayer-answered.wav',
    });
  }

  // Save token to database
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: user.id,
        token: token.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
  }

  return token.data;
}
```

### Notification Handlers

```typescript
// hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export function useNotificationHandler() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Handle notification received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const { data } = notification.request.content;
        console.log('Notification received:', data);
      });

    // Handle user tapping on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { data } = response.notification.request.content;

        // Navigate based on notification type
        if (data.type === 'prayer_response') {
          router.push(`/prayer/${data.prayerId}`);
        } else if (data.type === 'nearby_prayer') {
          router.push({
            pathname: '/map',
            params: { focusPrayer: data.prayerId },
          });
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}
```

### Scheduling Local Notifications

```typescript
// Schedule a local notification
export async function schedulePrayerReminder(
  prayerId: string,
  title: string,
  triggerDate: Date
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prayer Reminder',
      body: `Remember to pray: ${title}`,
      data: { type: 'reminder', prayerId },
      sound: 'prayer-notification.wav',
    },
    trigger: {
      date: triggerDate,
    },
  });
}

// Schedule daily prayer reminder
export async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Prayer Time',
      body: 'Take a moment to pray for your community',
      data: { type: 'daily_reminder' },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

## Camera and Image Picker

### Camera Access

```typescript
// components/CameraCapture.tsx
import { useState, useRef } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export function CameraCapture({ onCapture }: { onCapture: (uri: string) => void }) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-center mb-4">
          We need camera permission to add photos to prayers
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-primary-blue px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        onCapture(photo.uri);
      }
    }
  };

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View className="flex-1">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
        <View className="flex-1 justify-end items-center pb-10">
          <TouchableOpacity
            onPress={takePicture}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300"
          />
        </View>
      </CameraView>
    </View>
  );
}
```

### Image Picker

```typescript
// utils/imagePicker.ts
import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    console.log('Media library permission denied');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== 'granted') {
    console.log('Camera permission denied');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}
```

## Secure Storage

```typescript
// lib/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
} as const;

export const secureStorage = {
  // Auth tokens
  async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  // Clear all auth data
  async clearAuth(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  },

  // Generic methods
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },

  // JSON storage
  async setJSON<T>(key: string, value: T): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await SecureStore.getItemAsync(key);
    return value ? JSON.parse(value) : null;
  },
};
```

## AsyncStorage (Non-Sensitive Data)

```typescript
// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ONBOARDING_COMPLETE: '@onboarding_complete',
  NOTIFICATION_RADIUS: '@notification_radius',
  MAP_STYLE: '@map_style',
  LAST_LOCATION: '@last_location',
} as const;

export const storage = {
  async setOnboardingComplete(complete: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, String(complete));
  },

  async isOnboardingComplete(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  },

  async setNotificationRadius(radiusMiles: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.NOTIFICATION_RADIUS, String(radiusMiles));
  },

  async getNotificationRadius(): Promise<number> {
    const value = await AsyncStorage.getItem(KEYS.NOTIFICATION_RADIUS);
    return value ? parseInt(value, 10) : 15; // Default 15 miles
  },

  async setLastLocation(lat: number, lng: number): Promise<void> {
    await AsyncStorage.setItem(
      KEYS.LAST_LOCATION,
      JSON.stringify({ lat, lng })
    );
  },

  async getLastLocation(): Promise<{ lat: number; lng: number } | null> {
    const value = await AsyncStorage.getItem(KEYS.LAST_LOCATION);
    return value ? JSON.parse(value) : null;
  },

  async clear(): Promise<void> {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },
};
```

## Background Tasks

```typescript
// services/backgroundTasks.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';

// Define the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Fetch new prayers or updates
    const response = await fetch('/api/sync');
    const data = await response.json();

    // Process data...
    console.log('Background fetch completed:', data);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();

  if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
```

## Device Information

```typescript
// utils/device.ts
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export const deviceInfo = {
  isDevice: Device.isDevice,
  brand: Device.brand,
  modelName: Device.modelName,
  osName: Device.osName,
  osVersion: Device.osVersion,
  platformApiLevel: Device.platformApiLevel, // Android only

  async getDeviceId(): Promise<string | null> {
    if (Platform.OS === 'ios') {
      return Application.getIosIdForVendorAsync();
    }
    return Application.getAndroidId();
  },

  getAppVersion(): string {
    return Application.nativeApplicationVersion ?? '1.0.0';
  },

  getBuildNumber(): string {
    return Application.nativeBuildVersion ?? '1';
  },
};
```

## Best Practices

### DO
- Always check and request permissions before using device features
- Handle permission denied gracefully with fallback UI
- Use `SecureStore` for sensitive data, `AsyncStorage` for preferences
- Clean up subscriptions and listeners in useEffect cleanup
- Test on real devices (simulators don't support all features)
- Configure foreground service for background location on Android

### DON'T
- Assume permissions are granted
- Store auth tokens in AsyncStorage (use SecureStore)
- Forget to remove listeners on unmount
- Request background permissions without clear user benefit
- Poll location continuously (use distance intervals)
- Ignore platform-specific permission requirements
