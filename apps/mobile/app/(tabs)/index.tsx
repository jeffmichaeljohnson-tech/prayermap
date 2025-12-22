import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Modal, Pressable, ScrollView, Alert, Switch, Animated, Dimensions } from 'react-native';
import Mapbox, { MapView, Camera, LocationPuck, StyleImport, MarkerView } from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePrayersStore } from '@/lib/usePrayers';
import { usePrayerActionsStore } from '@/lib/usePrayerActions';
import { usePrayerConnectionsStore } from '@/lib/usePrayerConnections';
import { useAuthStore } from '@/lib/useAuthStore';
import { PrayerMarker, CreatePrayerModal, ResponsePrayerModal, AudioPlayer, VideoPlayer, PrayerConnectionLine, PrayerAnimationLayer, VideoPicker } from '@/components';
import { AddToMapFAB } from '@/components/AddToMapFAB';
import { QuickPostOverlay } from '@/components/QuickPostOverlay';
import type { Prayer } from '@/lib/types/prayer';
import { colors, glass, borderRadius, shadows } from '@/constants/theme';
import { CATEGORY_EMOJIS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types/prayer';
import { ANIMATION_TIMING } from '@/lib/types/connection';
import { router, useLocalSearchParams } from 'expo-router';

// Camera state for storing position before animation
interface CameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  heading: number;
}

// Get screen dimensions for aspect ratio calculation
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate the optimal camera view for the prayer animation
// Gets the TIGHTEST possible shot with both points in viewport
// Places sender (start) on left side and receiver (end) on right side
function calculateAnimationCameraView(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): { center: [number, number]; zoom: number; heading: number; pitch: number } {
  // Calculate center point between start and end
  const centerLng = (startLng + endLng) / 2;
  const centerLat = (startLat + endLat) / 2;

  // Calculate bearing from start to end
  const dLng = endLng - startLng;
  const dLat = endLat - startLat;
  const bearing = Math.atan2(dLng, dLat) * (180 / Math.PI);

  // Rotate 90 degrees to place start on left and end on right
  // Adding 90 means we're looking at the line from the side
  const heading = (bearing + 90 + 360) % 360;

  // Since we rotate the view 90 degrees, the line goes horizontally across screen
  // The "width" of our view needs to accommodate the full line length
  const lineLength = Math.sqrt(dLng * dLng + dLat * dLat);

  // Account for pitch compression (60 degree pitch compresses vertical by cos(60) = 0.5)
  // But since we're viewing horizontally, we need horizontal space
  // Add minimal padding (15%) for tight but clean framing
  const paddingFactor = 1.15;
  const requiredSpan = lineLength * paddingFactor;

  // Mapbox zoom formula: at zoom 0, the world is 360 degrees wide
  // At zoom Z, visible degrees = 360 / 2^Z
  // For our screen aspect ratio (typically portrait on phone),
  // the horizontal span at zoom Z is roughly: 360 / 2^Z * (screenWidth / 512)
  // We need: requiredSpan = 360 / 2^zoom * screenFactor
  // Solving for zoom: zoom = log2(360 * screenFactor / requiredSpan)

  // Screen factor accounts for typical map tile size (512px) and screen width
  // For a phone in portrait, horizontal FOV is narrower
  const screenAspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  const horizontalFOVFactor = screenAspect * 0.8; // Approximate FOV adjustment

  // Calculate zoom to fit the line horizontally with tight framing
  // Higher zoom = more zoomed in (closer view)
  let zoom = Math.log2(360 * horizontalFOVFactor / requiredSpan);

  // Clamp to reasonable bounds - max 16 for very close points, min 8 for far apart
  // Higher max for more dramatic close-ups
  zoom = Math.min(16, Math.max(8, zoom));

  // For very short distances (same neighborhood), ensure dramatic close-up
  if (lineLength < 0.01) { // Less than ~1km
    zoom = Math.max(zoom, 15);
  } else if (lineLength < 0.05) { // Less than ~5km
    zoom = Math.max(zoom, 13);
  } else if (lineLength < 0.1) { // Less than ~10km
    zoom = Math.max(zoom, 12);
  }

  return {
    center: [centerLng, centerLat],
    zoom,
    heading,
    pitch: 60, // Dramatic angle looking down at the connection
  };
}

// Storage key for "Don't show memorial line popup again" preference
const MEMORIAL_POPUP_DISMISSED_KEY = '@prayermap:memorial_popup_dismissed';

// Initialize Mapbox with access token
const mapboxToken = Constants.expoConfig?.extra?.mapboxToken || process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

// Get the appropriate light preset based on current time
function getLightPreset(): 'dawn' | 'day' | 'dusk' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MapScreen() {
  const [isMapReady, setIsMapReady] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [lightPreset, setLightPreset] = useState(getLightPreset());
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [currentZoom, setCurrentZoom] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [prayerToRespond, setPrayerToRespond] = useState<Prayer | null>(null);

  // Quick post state (TikTok-style flow)
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickPostContentType, setQuickPostContentType] = useState<'text' | 'audio' | 'video'>('text');
  const [quickPostTextContent, setQuickPostTextContent] = useState('');
  const [quickPostAudioUri, setQuickPostAudioUri] = useState<string | undefined>(undefined);
  const [quickPostAudioDuration, setQuickPostAudioDuration] = useState<number>(0);
  const [quickPostVideoUri, setQuickPostVideoUri] = useState<string | undefined>(undefined);
  const [quickPostVideoDuration, setQuickPostVideoDuration] = useState<number>(0);
  const [showVideoPickerModal, setShowVideoPickerModal] = useState(false);
  const audioRecordingRef = useRef<Audio.Recording | null>(null);

  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null) as React.RefObject<Camera & { setCamera: (options: any) => void }>;

  // Prayer store
  const { prayers, isLoading, fetchNearbyPrayers } = usePrayersStore();
  const { respondToPrayer, isResponding, lastResponsePrayerId } = usePrayerActionsStore();
  const { connections, fetchConnections, subscribeToConnections, unsubscribeFromConnections } = usePrayerConnectionsStore();
  const { user } = useAuthStore();

  // Get URL params for "View on PrayerMap" navigation from Feed
  const params = useLocalSearchParams<{ viewPrayerId?: string; lat?: string; lng?: string }>();

  // Track if we have a pending navigation to a prayer location
  const [pendingPrayerLocation, setPendingPrayerLocation] = useState<[number, number] | null>(null);

  // Handle navigation from Feed "View on PrayerMap" link
  useEffect(() => {
    if (params.viewPrayerId && params.lat && params.lng) {
      const targetLat = parseFloat(params.lat);
      const targetLng = parseFloat(params.lng);

      // Set pending location immediately so Camera component uses it instead of userLocation
      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        setPendingPrayerLocation([targetLng, targetLat]);
      }
    }
  }, [params.viewPrayerId, params.lat, params.lng]);

  // Execute camera animation once map is ready
  useEffect(() => {
    if (pendingPrayerLocation && cameraRef.current && isMapReady && params.viewPrayerId) {
      const [targetLng, targetLat] = pendingPrayerLocation;

      // Small delay to ensure camera is fully initialized
      setTimeout(() => {
        // Fly camera to the prayer location
        cameraRef.current?.setCamera({
          centerCoordinate: [targetLng, targetLat],
          zoomLevel: 14,
          pitch: 45,
          animationDuration: 1500,
          animationMode: 'flyTo',
        });

        // Find the prayer and open the modal after camera animation
        setTimeout(() => {
          const prayer = prayers.find(p => p.id === params.viewPrayerId);
          if (prayer) {
            setSelectedPrayer(prayer);
          }
          // Clear pending location and params
          setPendingPrayerLocation(null);
          router.setParams({ viewPrayerId: undefined, lat: undefined, lng: undefined });
        }, 1600); // Wait for camera animation to complete
      }, 100);
    }
  }, [pendingPrayerLocation, prayers, isMapReady, params.viewPrayerId]);

  // Debug: Log all prayers when they change
  useEffect(() => {
    if (prayers.length > 0) {
      console.log('[MapScreen] Prayers loaded:', prayers.length);
      prayers.forEach((p, i) => {
        console.log(`[MapScreen] Prayer ${i}: ${p.content_type} | ${p.title || p.content.substring(0, 20)} | coords: [${p.location.coordinates}]`);
      });
      // Specifically check for audio/video prayers
      const mediaPrayers = prayers.filter(p => p.content_type === 'audio' || p.content_type === 'video');
      console.log(`[MapScreen] Found ${mediaPrayers.length} audio/video prayers`);
    }
  }, [prayers]);

  // Prayer animation state (for the 6-second dramatic animation)
  const [prayerAnimation, setPrayerAnimation] = useState<{
    isPlaying: boolean;
    startLng: number;
    startLat: number;
    endLng: number;
    endLat: number;
  } | null>(null);

  // Store original camera state before animation for fly-back
  const originalCameraState = useRef<CameraState | null>(null);

  // Memorial line popup state
  const [showMemorialPopup, setShowMemorialPopup] = useState(false);
  const [memorialPopupDismissed, setMemorialPopupDismissed] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  // Animated values for ethereal memorial popup fade-in
  const memorialOpacity = useRef(new Animated.Value(0)).current;
  const memorialScale = useRef(new Animated.Value(0.9)).current;

  // Animate memorial popup when it appears
  useEffect(() => {
    if (showMemorialPopup) {
      // Reset values
      memorialOpacity.setValue(0);
      memorialScale.setValue(0.9);
      // Ethereal fade-in animation - gentle and angelic
      Animated.parallel([
        Animated.timing(memorialOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(memorialScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMemorialPopup]);

  // Load the "Don't show memorial popup again" preference on mount
  useEffect(() => {
    AsyncStorage.getItem(MEMORIAL_POPUP_DISMISSED_KEY).then((value) => {
      if (value === 'true') {
        setMemorialPopupDismissed(true);
      }
    });
  }, []);

  useEffect(() => {
    // Enable telemetry for better map performance metrics
    Mapbox.setTelemetryEnabled(true);

    // Request location permissions and get current position
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);

      if (granted) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation([location.coords.longitude, location.coords.latitude]);

          // Fetch prayers near user's location
          fetchNearbyPrayers(location.coords.latitude, location.coords.longitude, 100);

          // Fetch prayer connections and subscribe to realtime updates
          fetchConnections();
          subscribeToConnections();
        } catch (error) {
          console.warn('Could not get current location:', error);
          // Fetch prayers for a default location (Rochester, NY area)
          fetchNearbyPrayers(43.1566, -77.6088, 100);

          // Fetch connections and subscribe to realtime updates
          fetchConnections();
          subscribeToConnections();
        }
      } else {
        // Fetch prayers for default location
        fetchNearbyPrayers(43.1566, -77.6088, 100);

        // Fetch connections and subscribe to realtime updates
        fetchConnections();
        subscribeToConnections();
      }
    })();

    // Update light preset every minute to keep it in sync with time
    const intervalId = setInterval(() => {
      setLightPreset(getLightPreset());
    }, 60000);

    return () => {
      clearInterval(intervalId);
      // Clean up realtime subscription
      unsubscribeFromConnections();
    };
  }, []);

  // Handle prayer marker press
  const handlePrayerPress = useCallback((prayer: Prayer) => {
    setSelectedPrayer(prayer);
  }, []);

  // Close prayer detail modal
  const closePrayerDetail = useCallback(() => {
    setSelectedPrayer(null);
  }, []);

  // Handle "Pray for this" button - opens response modal
  const handlePrayForThis = useCallback(() => {
    if (!selectedPrayer) return;

    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to pray for others.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }

    // Check if user is trying to pray for their own prayer
    if (selectedPrayer.user_id === user.id) {
      Alert.alert('Oops!', "You can't pray for your own prayer request.");
      return;
    }

    // Open response modal
    setPrayerToRespond(selectedPrayer);
    setSelectedPrayer(null);
    setShowResponseModal(true);
  }, [selectedPrayer, user]);

  // Handle successful response - triggers dramatic prayer animation with camera choreography
  const handleResponseSuccess = useCallback(() => {
    const respondedPrayer = prayerToRespond;
    setShowResponseModal(false);
    setPrayerToRespond(null);

    // Start the dramatic prayer animation if we have both locations
    if (respondedPrayer && userLocation && cameraRef.current) {
      const startLng = userLocation[0]; // Responder (user) location
      const startLat = userLocation[1];
      const endLng = respondedPrayer.location.coordinates[0]; // Prayer location
      const endLat = respondedPrayer.location.coordinates[1];

      // Store current camera state for fly-back after animation
      originalCameraState.current = {
        center: userLocation,
        zoom: currentZoom,
        pitch: 45,
        heading: 0,
      };

      // Calculate optimal camera view for the animation
      const animationView = calculateAnimationCameraView(startLng, startLat, endLng, endLat);

      // First fly to the animation view (1.5 seconds)
      cameraRef.current.setCamera({
        centerCoordinate: animationView.center,
        zoomLevel: animationView.zoom,
        pitch: animationView.pitch,
        heading: animationView.heading,
        animationDuration: 1500,
        animationMode: 'flyTo',
      });

      // After camera arrives, start the animation
      setTimeout(() => {
        setPrayerAnimation({
          isPlaying: true,
          startLng,
          startLat,
          endLng,
          endLat,
        });
      }, 1500);
    }

    // Refresh prayers to update response count
    if (userLocation) {
      fetchNearbyPrayers(userLocation[1], userLocation[0], 100);
      // Force refresh connections to include the new one (bypass debounce)
      // The realtime subscription will also trigger a refresh
      setTimeout(() => fetchConnections(true), 500);
    }
  }, [userLocation, fetchNearbyPrayers, fetchConnections, prayerToRespond, currentZoom]);

  // Handle prayer animation complete - fly back to original view, then show popup
  const handlePrayerAnimationComplete = useCallback(() => {
    setPrayerAnimation(null);

    // Fly back to original camera position
    if (originalCameraState.current && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: originalCameraState.current.center,
        zoomLevel: originalCameraState.current.zoom,
        pitch: originalCameraState.current.pitch,
        heading: originalCameraState.current.heading,
        animationDuration: 1500,
        animationMode: 'flyTo',
      });
      originalCameraState.current = null;
    }

    // Show memorial popup after camera flies back (unless user dismissed it permanently)
    // 3 second delay gives user time to see the new memorial line on the map
    if (!memorialPopupDismissed) {
      setTimeout(() => {
        setShowMemorialPopup(true);
      }, 3000); // Wait for camera animation + time to appreciate the memorial line
    }
  }, [memorialPopupDismissed]);

  // Handle dismissing the memorial popup
  const handleDismissMemorialPopup = useCallback(async () => {
    setShowMemorialPopup(false);

    // If "Don't show again" is checked, save to AsyncStorage
    if (dontShowAgainChecked) {
      try {
        await AsyncStorage.setItem(MEMORIAL_POPUP_DISMISSED_KEY, 'true');
        setMemorialPopupDismissed(true);
      } catch (error) {
        console.error('Failed to save memorial popup preference:', error);
      }
    }

    // Reset the checkbox for next time
    setDontShowAgainChecked(false);
  }, [dontShowAgainChecked]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(currentZoom + 1, 18);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  }, [currentZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(currentZoom - 1, 1);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  }, [currentZoom]);

  // Handle FAB press to open create prayer modal
  const handleOpenCreatePrayer = useCallback(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to share a prayer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }
    setShowCreateModal(true);
  }, [user]);

  // Handle successful prayer creation - zoom to the new prayer for visual feedback
  const handlePrayerCreated = useCallback((prayerLocation?: { lat: number; lng: number }) => {
    setShowCreateModal(false);

    // Refresh prayers first
    if (userLocation) {
      fetchNearbyPrayers(userLocation[1], userLocation[0], 100);
    }

    // Zoom to the new prayer location for visual feedback (frictionless UX)
    if (prayerLocation && cameraRef.current) {
      // Zoom in close so the user can clearly see their new prayer on the map
      const newZoom = 17; // Close zoom to see the marker clearly
      setCurrentZoom(newZoom);
      cameraRef.current.setCamera({
        centerCoordinate: [prayerLocation.lng, prayerLocation.lat],
        zoomLevel: newZoom,
        animationDuration: 1500, // Smooth fly animation
        animationMode: 'flyTo',
      });
    }
  }, [userLocation, fetchNearbyPrayers]);

  // Handle FAB type selection (TikTok-style flow)
  const handleSelectPrayerType = useCallback(async (type: 'text' | 'audio' | 'video') => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to share a prayer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }

    // Reset quick post state
    setQuickPostTextContent('');
    setQuickPostAudioUri(undefined);
    setQuickPostAudioDuration(0);
    setQuickPostVideoUri(undefined);
    setQuickPostVideoDuration(0);
    setQuickPostContentType(type);

    if (type === 'text') {
      // For text, show the quick post overlay directly
      setShowQuickPost(true);
    } else if (type === 'audio') {
      // For audio, launch the audio recorder immediately
      try {
        // Request microphone permission
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow microphone access to record audio prayers.');
          return;
        }

        // Configure audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Start recording
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        audioRecordingRef.current = recording;

        // Show alert with stop button
        Alert.alert(
          'Recording Audio Prayer',
          'Tap Stop when you\'re done sharing your prayer.',
          [
            {
              text: 'Stop Recording',
              onPress: async () => {
                if (audioRecordingRef.current) {
                  await audioRecordingRef.current.stopAndUnloadAsync();
                  const uri = audioRecordingRef.current.getURI();
                  const status = await audioRecordingRef.current.getStatusAsync();

                  if (uri) {
                    setQuickPostAudioUri(uri);
                    setQuickPostAudioDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
                    setShowQuickPost(true);
                  }
                  audioRecordingRef.current = null;
                }
              },
            },
          ],
          { cancelable: false }
        );
      } catch (error) {
        console.error('Error starting audio recording:', error);
        Alert.alert('Error', 'Failed to start audio recording. Please try again.');
      }
    } else if (type === 'video') {
      // For video, show the custom TikTok-style video picker
      setShowVideoPickerModal(true);
    }
  }, [user]);

  // Handle quick post close
  const handleQuickPostClose = useCallback(() => {
    setShowQuickPost(false);
    setQuickPostTextContent('');
    setQuickPostAudioUri(undefined);
    setQuickPostAudioDuration(0);
    setQuickPostVideoUri(undefined);
    setQuickPostVideoDuration(0);
  }, []);

  // Handle quick post success
  const handleQuickPostSuccess = useCallback((prayerLocation?: { lat: number; lng: number }) => {
    setShowQuickPost(false);
    setQuickPostTextContent('');
    setQuickPostAudioUri(undefined);
    setQuickPostAudioDuration(0);
    setQuickPostVideoUri(undefined);
    setQuickPostVideoDuration(0);

    // Refresh prayers
    if (userLocation) {
      fetchNearbyPrayers(userLocation[1], userLocation[0], 100);
    }

    // Zoom to the new prayer location for visual feedback
    if (prayerLocation && cameraRef.current) {
      const newZoom = 17;
      setCurrentZoom(newZoom);
      cameraRef.current.setCamera({
        centerCoordinate: [prayerLocation.lng, prayerLocation.lat],
        zoomLevel: newZoom,
        animationDuration: 1500,
        animationMode: 'flyTo',
      });
    }
  }, [userLocation, fetchNearbyPrayers]);

  if (!mapboxToken) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Map Configuration Error</Text>
          <Text style={styles.errorText}>Mapbox token not found. Please add EXPO_PUBLIC_MAPBOX_TOKEN to your environment.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/standard"
        projection="globe"
        onDidFinishLoadingMap={() => {
          setIsMapReady(true);
        }}
        logoEnabled={false}
        attributionEnabled={true}
        attributionPosition={{ bottom: 8, right: 8 }}
        scaleBarEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Configure Standard style with dynamic lighting */}
        <StyleImport
          id="basemap"
          existing
          config={{
            lightPreset: lightPreset,
            showPointOfInterestLabels: 'true',
            showTransitLabels: 'true',
            showPlaceLabels: 'true',
            showRoadLabels: 'true',
          }}
        />

        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [-98.5795, 39.8283], // Center of USA
            zoomLevel: 3,
            pitch: 45,
          }}
          centerCoordinate={pendingPrayerLocation ?? userLocation ?? undefined}
          zoomLevel={pendingPrayerLocation ? 14 : (userLocation ? 10 : 3)}
          pitch={45}
          animationMode="flyTo"
          animationDuration={pendingPrayerLocation ? 1500 : 2000}
        />

        {/* Prayer Memorial Lines - persistent connections between prayers */}
        {/* Rendered FIRST so they appear BELOW the location puck */}
        {isMapReady && connections.length > 0 && (
          <PrayerConnectionLine connections={connections} />
        )}

        {/* User location puck with 3D bearing indicator */}
        {/* Rendered AFTER prayer lines so it appears ON TOP */}
        {locationPermission && (
          <LocationPuck
            puckBearing="heading"
            puckBearingEnabled={true}
            visible={true}
            pulsing={{
              isEnabled: true,
              color: '#4169E1',
              radius: 50,
            }}
          />
        )}

        {/* Prayer Animation Layer - dramatic 6-second animation when someone prays */}
        {prayerAnimation && (
          <PrayerAnimationLayer
            startLng={prayerAnimation.startLng}
            startLat={prayerAnimation.startLat}
            endLng={prayerAnimation.endLng}
            endLat={prayerAnimation.endLat}
            isPlaying={prayerAnimation.isPlaying}
            onComplete={handlePrayerAnimationComplete}
          />
        )}

        {/* Prayer Markers */}
        {isMapReady && prayers.map((prayer) => (
          <MarkerView
            key={prayer.id}
            id={`prayer-${prayer.id}`}
            coordinate={prayer.location.coordinates}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap={true}
          >
            <PrayerMarker
              prayer={prayer}
              onPress={() => handlePrayerPress(prayer)}
            />
          </MarkerView>
        ))}
      </MapView>

      {/* Loading overlay */}
      {(!isMapReady || isLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>
            {!isMapReady ? 'Loading map...' : 'Loading prayers...'}
          </Text>
        </View>
      )}

      {/* Prayer count indicator */}
      {isMapReady && prayers.length > 0 && (
        <View style={styles.prayerCount}>
          <Text style={styles.prayerCountText}>
            {prayers.length} prayer{prayers.length !== 1 ? 's' : ''} nearby
            {connections.length > 0 && ` · ${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Zoom Controls */}
      {isMapReady && (
        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomButton} onPress={handleZoomIn}>
            <FontAwesome name="plus" size={20} color={colors.purple[400]} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomButton} onPress={handleZoomOut}>
            <FontAwesome name="minus" size={20} color={colors.purple[400]} />
          </Pressable>
        </View>
      )}

      {/* Prayer Detail Modal */}
      <Modal
        visible={selectedPrayer !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={closePrayerDetail}
      >
        <Pressable style={styles.modalOverlay} onPress={closePrayerDetail}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            {selectedPrayer && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Text style={styles.categoryEmoji}>
                      {CATEGORY_EMOJIS[selectedPrayer.category] || '🙏'}
                    </Text>
                    <View>
                      <Text style={styles.categoryLabel}>
                        {CATEGORY_LABELS[selectedPrayer.category] || selectedPrayer.category}
                      </Text>
                      <Text style={styles.prayerDate}>
                        {formatDate(selectedPrayer.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={closePrayerDetail} style={styles.closeButton}>
                    <FontAwesome name="times" size={24} color="#666" />
                  </Pressable>
                </View>

                {/* Prayer Content */}
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Author info - show prominently at top */}
                  <View style={styles.authorRowTop}>
                    <FontAwesome name="user-circle" size={18} color="#4169E1" />
                    <Text style={styles.authorTextTop}>
                      {selectedPrayer.is_anonymous
                        ? 'Anonymous'
                        : selectedPrayer.user_name || 'A fellow believer'}
                    </Text>
                  </View>

                  {selectedPrayer.title && (
                    <Text style={styles.prayerTitle}>{selectedPrayer.title}</Text>
                  )}

                  {/* Audio Prayer - auto-plays for engaging, frictionless UX */}
                  {selectedPrayer.content_type === 'audio' && selectedPrayer.media_url ? (
                    <View style={styles.audioPrayerContainer}>
                      <AudioPlayer
                        uri={selectedPrayer.media_url}
                        duration={selectedPrayer.media_duration}
                        autoPlay={true}
                      />
                    </View>
                  ) : selectedPrayer.content_type === 'video' && selectedPrayer.media_url ? (
                    <View style={styles.videoPrayerContainer}>
                      <VideoPlayer
                        uri={selectedPrayer.media_url}
                        duration={selectedPrayer.media_duration}
                      />
                    </View>
                  ) : (
                    <Text style={styles.prayerContent}>{selectedPrayer.content}</Text>
                  )}

                  {/* Response count */}
                  {(selectedPrayer.response_count || 0) > 0 && (
                    <View style={styles.responseRow}>
                      <FontAwesome name="heart" size={14} color="#EC4899" />
                      <Text style={styles.responseText}>
                        {selectedPrayer.response_count} people have prayed for this
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Action Button */}
                <Pressable
                  style={[
                    styles.prayButton,
                    (isResponding || lastResponsePrayerId === selectedPrayer.id) && styles.prayButtonDisabled
                  ]}
                  onPress={handlePrayForThis}
                  disabled={isResponding || lastResponsePrayerId === selectedPrayer.id}
                >
                  {isResponding ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : lastResponsePrayerId === selectedPrayer.id ? (
                    <>
                      <FontAwesome name="check" size={20} color="#fff" />
                      <Text style={styles.prayButtonText}>Prayed!</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome name="heart" size={20} color="#fff" />
                      <Text style={styles.prayButtonText}>Pray for this</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Add to Map FAB - TikTok-style expandable */}
      {isMapReady && (
        <AddToMapFAB onSelectType={handleSelectPrayerType} />
      )}

      {/* Quick Post Overlay - streamlined post-recording flow */}
      <QuickPostOverlay
        visible={showQuickPost}
        contentType={quickPostContentType}
        textContent={quickPostTextContent}
        audioUri={quickPostAudioUri}
        audioDuration={quickPostAudioDuration}
        videoUri={quickPostVideoUri}
        videoDuration={quickPostVideoDuration}
        onClose={handleQuickPostClose}
        onSuccess={handleQuickPostSuccess}
      />

      {/* Create Prayer Modal */}
      <CreatePrayerModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePrayerCreated}
      />

      {/* Response Prayer Modal */}
      <ResponsePrayerModal
        visible={showResponseModal}
        prayer={prayerToRespond}
        onClose={() => {
          setShowResponseModal(false);
          setPrayerToRespond(null);
        }}
        onSuccess={handleResponseSuccess}
      />

      {/* Video Picker Modal - TikTok-style custom camera */}
      <Modal
        visible={showVideoPickerModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowVideoPickerModal(false)}
      >
        <VideoPicker
          onVideoSelected={(uri, duration, textOverlays) => {
            setShowVideoPickerModal(false);
            setQuickPostVideoUri(uri);
            setQuickPostVideoDuration(duration);
            setShowQuickPost(true);
          }}
          onCancel={() => setShowVideoPickerModal(false)}
          maxDuration={600}
        />
      </Modal>

      {/* Memorial Line Popup - Ethereal angelic theme */}
      <Modal
        visible={showMemorialPopup}
        transparent
        animationType="none"
        onRequestClose={handleDismissMemorialPopup}
      >
        <Animated.View style={[styles.memorialOverlay, { opacity: memorialOpacity }]}>
          <Animated.View
            style={[
              styles.memorialContainer,
              {
                opacity: memorialOpacity,
                transform: [{ scale: memorialScale }],
              },
            ]}
          >
            <View style={styles.memorialIconContainer}>
              <Text style={styles.memorialIcon}>🕊️</Text>
            </View>
            <Text style={styles.memorialTitle}>Prayer Memorial Created</Text>
            <Text style={styles.memorialMessage}>
              A golden line now connects your prayer to theirs on the map. This memorial will remain visible for 1 year, a lasting symbol of your support.
            </Text>
            <Pressable
              style={styles.dontShowAgainRow}
              onPress={() => setDontShowAgainChecked(!dontShowAgainChecked)}
            >
              <View style={[styles.memorialCheckbox, dontShowAgainChecked && styles.memorialCheckboxChecked]}>
                {dontShowAgainChecked && <FontAwesome name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.dontShowAgainText}>Don't show this again</Text>
            </Pressable>
            <Pressable style={styles.memorialDismissButton} onPress={handleDismissMemorialPopup}>
              <Text style={styles.memorialDismissText}>Got it</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 244, 248, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4169E1',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  prayerCount: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: colors.glass.white92,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.ethereal,
  },
  prayerCountText: {
    fontSize: 14,
    color: colors.purple[500],
    fontFamily: 'Inter-SemiBold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area for home indicator
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  prayerDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 300,
  },
  prayerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  prayerContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  audioPrayerContainer: {
    marginBottom: 16,
  },
  videoPrayerContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  authorRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  authorTextTop: {
    fontSize: 15,
    color: '#4169E1',
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  authorText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  responseText: {
    fontSize: 14,
    color: '#EC4899',
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  prayButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  prayButtonDisabled: {
    backgroundColor: '#86EFAC', // green-300 for success state
  },
  // Zoom controls - Ethereal glass styling
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 120,
    backgroundColor: colors.glass.white92,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.ethereal,
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.glass.white30,
    marginHorizontal: 8,
  },
  // Memorial popup styles
  memorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  memorialContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  memorialIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  memorialIcon: {
    fontSize: 36,
  },
  memorialTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  memorialMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  dontShowAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingVertical: 4,
  },
  memorialCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memorialCheckboxChecked: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  dontShowAgainText: {
    fontSize: 14,
    color: '#6b7280',
  },
  memorialDismissButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  memorialDismissText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
