/**
 * PrayerMap - Web Version
 *
 * This is the web-specific implementation of the map screen.
 * Uses mapbox-gl (WebGL) instead of @rnmapbox/maps (native).
 *
 * Shares the same stores and business logic as the native version.
 *
 * IMPORTANT: Map Marker Styling Must Match Native
 * ================================================
 * The native PrayerMarker component (components/PrayerMarker.tsx) defines:
 * - Emoji: Always '🙏' for map markers (line 40) - NOT category-specific emojis
 * - Size: 44x44px container with 36px emoji font size
 * - Glow: Uses CATEGORY_GLOW_COLORS (transparent rgba) not CATEGORY_COLORS
 * - Animation: 2-second floating cycle + glow pulse (CSS keyframes on web)
 *
 * Note: CATEGORY_EMOJIS are for modals/labels, NOT for map pins.
 * This distinction ensures visual consistency across platforms.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { usePrayersStore } from '@/lib/usePrayers';
import { usePrayerConnectionsStore } from '@/lib/usePrayerConnections';
import { useAuthStore } from '@/lib/useAuthStore';
import { usePrayerActionsStore } from '@/lib/usePrayerActions';
import { supabase } from '@/lib/supabase';
import type { Prayer } from '@/lib/types/prayer';
import { CATEGORY_COLORS, CATEGORY_GLOW_COLORS, CATEGORY_LABELS, CATEGORY_EMOJIS, MAP_MARKER_CONSTANTS } from '@/lib/types/prayer';
import { colors, borderRadius, gradients } from '@/constants/theme';

// Connection line gradient colors (matches native PrayerConnectionLine.tsx)
const CONNECTION_GRADIENT = {
  purple: '#9B59B6',   // 0% - Start (responder)
  blue: '#3498DB',     // 25%
  green: '#2ECC71',    // 50%
  yellow: '#F1C40F',   // 75%
  gold: '#F39C12',     // 100% - End (prayer)
};

// Web-specific color mappings from theme
const webColors = {
  background: gradients.etherealBackground[0], // Light sky blue
  surface: colors.glass.white92,
  text: colors.gray[800],
  textSecondary: colors.gray[500],
  primary: colors.purple[400],
  border: colors.gray[200],
};

// Glass background style for web
const glassBackground = colors.glass.white85;

// Initialize Mapbox
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = mapboxToken;

// Inject CSS animations for prayer markers (matches native Reanimated animations)
const injectAnimationStyles = () => {
  const styleId = 'prayer-marker-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Floating animation - matches native: 2s cycle, 5px amplitude, ease-in-out */
    @keyframes floatingAnimation {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
      100% { transform: translateY(0px); }
    }

    /* Glow pulse animation - matches native: 2s cycle, scale 1→1.5, opacity 0.3→0.6 */
    @keyframes glowPulse {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
      50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.6; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
    }

    /* Badge spring-in animation */
    @keyframes badgeSpringIn {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.15); opacity: 1; }
      75% { transform: scale(0.95); }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Apply animations to prayer markers */
    .prayer-marker-animated {
      animation: floatingAnimation 2s cubic-bezier(0.42, 0, 0.58, 1) infinite;
      will-change: transform;
    }

    .prayer-marker-glow-animated {
      animation: glowPulse 2s cubic-bezier(0.42, 0, 0.58, 1) infinite;
      will-change: transform, opacity;
    }

    .prayer-badge-animated {
      animation: badgeSpringIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    /* FAB button styles */
    .fab-button {
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    }
    .fab-button:hover {
      transform: scale(1.05);
    }
    .fab-button:active {
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);
};

// Get light preset based on time
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

// Create curved Bézier path for connection lines (matches native PrayerConnectionLine.tsx)
function createCurvedPath(
  startLng: number, startLat: number,
  endLng: number, endLat: number,
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];
  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;

  // Perpendicular offset for graceful arc (15% of distance)
  const perpLng = -(endLat - startLat) * 0.15;
  const perpLat = (endLng - startLng) * 0.15;

  const controlLng = midLng + perpLng;
  const controlLat = midLat + perpLat;

  // Quadratic Bézier curve
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lng = invT * invT * startLng + 2 * invT * t * controlLng + t * t * endLng;
    const lat = invT * invT * startLat + 2 * invT * t * controlLat + t * t * endLat;
    points.push([lng, lat]);
  }
  return points;
}

export default function MapScreenWeb() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [lightPreset] = useState(getLightPreset());
  const [isPraying, setIsPraying] = useState(false);
  const [praySuccess, setPraySuccess] = useState(false);

  // Stores
  const { prayers, isLoading, fetchAllPrayers } = usePrayersStore();
  const { connections, fetchConnections } = usePrayerConnectionsStore();
  const { user } = useAuthStore();
  const { respondToPrayer } = usePrayerActionsStore();

  // Inject CSS animations on mount
  useEffect(() => {
    injectAnimationStyles();
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to center of US
          setUserLocation([-98.5795, 39.8283]);
        }
      );
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!userLocation) return;

    const mapStyle = lightPreset === 'night' || lightPreset === 'dusk'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: userLocation,
      zoom: 10,
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }));

    map.current.on('load', () => {
      setIsMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation, lightPreset]);

  // LIVING MAP PRINCIPLE: Fetch prayers on mount and subscribe to realtime updates
  // All prayers must be visible to all users at all times, in real-time (<2 seconds)
  useEffect(() => {
    console.log('[MapWeb] Fetching all prayers (LIVING MAP PRINCIPLE: ALL prayers visible globally)');
    fetchAllPrayers();
    fetchConnections();

    // Subscribe to realtime prayer changes for LIVING MAP real-time updates
    const channel = supabase
      .channel('prayers-realtime-web')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prayers' },
        (payload) => {
          console.log('[MapWeb] REALTIME: New prayer created!', payload.new?.id);
          // Refetch all prayers to get the new prayer with proper location format
          fetchAllPrayers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prayers' },
        (payload) => {
          console.log('[MapWeb] REALTIME: Prayer updated', payload.new?.id);
          fetchAllPrayers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'prayers' },
        (payload) => {
          console.log('[MapWeb] REALTIME: Prayer deleted', payload.old?.id);
          fetchAllPrayers();
        }
      )
      .subscribe((status) => {
        console.log('[MapWeb] Realtime subscription status:', status);
      });

    return () => {
      console.log('[MapWeb] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchAllPrayers, fetchConnections]);

  // Add prayer markers to map with animations
  // LIVING MAP PRINCIPLE: ALL prayers must have visible markers
  useEffect(() => {
    if (!map.current || !isMapReady) {
      console.log('[MapWeb] Skipping marker creation - map not ready:', { mapExists: !!map.current, isMapReady });
      return;
    }

    console.log(`[MapWeb] Creating markers for ${prayers.length} prayers (LIVING MAP: ALL prayers visible)`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    let successCount = 0;
    let errorCount = 0;

    // Add new markers for each prayer
    prayers.forEach((prayer, index) => {
      try {
        // Validate location coordinates
        if (!prayer.location?.coordinates || prayer.location.coordinates.length !== 2) {
          console.error(`[MapWeb] Invalid coordinates for prayer ${prayer.id}:`, prayer.location);
          errorCount++;
          return;
        }

        const [lng, lat] = prayer.location.coordinates;

        // Validate coordinate values
        if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
          console.error(`[MapWeb] Invalid coordinate values for prayer ${prayer.id}: lng=${lng}, lat=${lat}`);
          errorCount++;
          return;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.error(`[MapWeb] Coordinates out of range for prayer ${prayer.id}: lng=${lng}, lat=${lat}`);
          errorCount++;
          return;
        }
      // Use glow colors like native PrayerMarker component
      const glowColor = CATEGORY_GLOW_COLORS[prayer.category] || CATEGORY_GLOW_COLORS.other;

      // Create marker wrapper (Mapbox controls this element's transform for positioning)
      const wrapper = document.createElement('div');
      wrapper.className = 'prayer-marker-wrapper';
      wrapper.style.cssText = `cursor: pointer;`;

      // Create inner marker element with floating animation
      const el = document.createElement('div');
      el.className = 'prayer-marker prayer-marker-animated';
      el.style.cssText = `
        width: ${MAP_MARKER_CONSTANTS.containerSize}px;
        height: ${MAP_MARKER_CONSTANTS.containerSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${MAP_MARKER_CONSTANTS.fontSize}px;
        position: relative;
      `;

      // Add glow effect with pulse animation
      const glow = document.createElement('div');
      glow.className = 'prayer-marker-glow prayer-marker-glow-animated';
      glow.style.cssText = `
        position: absolute;
        width: ${MAP_MARKER_CONSTANTS.glowSize}px;
        height: ${MAP_MARKER_CONSTANTS.glowSize}px;
        border-radius: 50%;
        background: ${glowColor};
        top: 50%;
        left: 50%;
        z-index: -1;
        pointer-events: none;
      `;

      // Create emoji span
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = MAP_MARKER_CONSTANTS.emoji;
      emojiSpan.style.cssText = `position: relative; z-index: 1;`;

      // Add response count badge if applicable
      const responseCount = prayer.response_count || 0;
      if (responseCount > 0) {
        const badge = document.createElement('div');
        badge.className = 'prayer-badge-animated';
        badge.style.cssText = `
          position: absolute;
          top: -4px;
          left: -4px;
          min-width: ${MAP_MARKER_CONSTANTS.badge.minWidth}px;
          height: ${MAP_MARKER_CONSTANTS.badge.height}px;
          border-radius: ${MAP_MARKER_CONSTANTS.badge.borderRadius}px;
          background-color: ${MAP_MARKER_CONSTANTS.badge.backgroundColor};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 2;
        `;
        badge.innerHTML = `<span style="color: white; font-size: ${MAP_MARKER_CONSTANTS.badge.fontSize}px; font-weight: bold;">${responseCount > 99 ? '99+' : responseCount}</span>`;
        el.appendChild(badge);
      }

      el.appendChild(glow);
      el.appendChild(emojiSpan);
      wrapper.appendChild(el);

      // Hover effects - pause animation and scale up
      wrapper.addEventListener('mouseenter', () => {
        el.style.animationPlayState = 'paused';
        el.style.transform = 'scale(1.15)';
        glow.style.animationPlayState = 'paused';
        glow.style.transform = 'translate(-50%, -50%) scale(1.5)';
        glow.style.opacity = '0.7';
      });
      wrapper.addEventListener('mouseleave', () => {
        el.style.animationPlayState = 'running';
        el.style.transform = '';
        glow.style.animationPlayState = 'running';
        glow.style.transform = '';
        glow.style.opacity = '';
      });

      const marker = new mapboxgl.Marker(wrapper)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      wrapper.addEventListener('click', () => {
        setSelectedPrayer(prayer);
        setPraySuccess(false);
        map.current?.flyTo({
          center: [lng, lat],
          zoom: 14,
          pitch: 60,
          duration: 1500,
        });
      });

      markersRef.current.push(marker);
        successCount++;
        console.log(`[MapWeb] Created marker ${index + 1} for prayer ${prayer.id} at [${lng}, ${lat}]`);
      } catch (error) {
        console.error(`[MapWeb] Failed to create marker for prayer ${prayer.id}:`, error);
        errorCount++;
      }
    });

    // LIVING MAP: Log summary of marker creation
    console.log(`[MapWeb] Marker creation complete: ${successCount} succeeded, ${errorCount} failed out of ${prayers.length} prayers`);
    if (errorCount > 0) {
      console.warn(`[MapWeb] WARNING: ${errorCount} prayers are not visible on the map due to invalid coordinates!`);
    }
  }, [prayers, isMapReady]);

  // Add ethereal 3-layer connection lines with curved paths
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Remove existing connection layers
    ['connection-glow', 'connection-main', 'connection-highlight'].forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });
    if (map.current.getSource('connections')) {
      map.current.removeSource('connections');
    }

    if (connections.length === 0) return;

    // Create curved GeoJSON features for each connection
    const features = connections.map((conn) => {
      const curvedPath = createCurvedPath(
        conn.from_lng, conn.from_lat,
        conn.to_lng, conn.to_lat,
        50
      );
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: curvedPath,
        },
      };
    });

    map.current.addSource('connections', {
      type: 'geojson',
      lineMetrics: true, // Required for line-gradient
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    // Layer 1: Outer glow (8px, 0.3 opacity, blur)
    map.current.addLayer({
      id: 'connection-glow',
      type: 'line',
      source: 'connections',
      paint: {
        'line-width': 8,
        'line-opacity': 0.3,
        'line-blur': 4,
        'line-gradient': [
          'interpolate', ['linear'], ['line-progress'],
          0, CONNECTION_GRADIENT.purple,
          0.25, CONNECTION_GRADIENT.blue,
          0.5, CONNECTION_GRADIENT.green,
          0.75, CONNECTION_GRADIENT.yellow,
          1, CONNECTION_GRADIENT.gold,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    // Layer 2: Main gradient line (3px, 0.9 opacity)
    map.current.addLayer({
      id: 'connection-main',
      type: 'line',
      source: 'connections',
      paint: {
        'line-width': 3,
        'line-opacity': 0.9,
        'line-gradient': [
          'interpolate', ['linear'], ['line-progress'],
          0, CONNECTION_GRADIENT.purple,
          0.25, CONNECTION_GRADIENT.blue,
          0.5, CONNECTION_GRADIENT.green,
          0.75, CONNECTION_GRADIENT.yellow,
          1, CONNECTION_GRADIENT.gold,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    // Layer 3: Bright center highlight (1px, white)
    map.current.addLayer({
      id: 'connection-highlight',
      type: 'line',
      source: 'connections',
      paint: {
        'line-width': 1,
        'line-opacity': 0.6,
        'line-color': 'rgba(255, 255, 255, 0.8)',
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });
  }, [connections, isMapReady]);

  const closePrayerModal = () => {
    setSelectedPrayer(null);
    setPraySuccess(false);
  };

  // Handle "Pray for this" action
  const handlePrayForThis = async () => {
    if (!selectedPrayer || !user) {
      // Show sign in prompt for web
      alert('Please sign in to pray for others. Download the app for the full experience!');
      return;
    }

    if (selectedPrayer.user_id === user.id) {
      alert("You can't pray for your own prayer request.");
      return;
    }

    setIsPraying(true);
    try {
      const result = await respondToPrayer({
        prayerId: selectedPrayer.id,
        message: '', // Quick pray without message
        isAnonymous: false,
        contentType: 'text',
      });

      if (result.success) {
        setPraySuccess(true);
        // Refresh connections to show new line
        setTimeout(() => {
          fetchConnections();
          fetchAllPrayers(); // Refresh to update response counts
        }, 500);
      } else {
        alert('Failed to record prayer. Please try again.');
      }
    } catch (error) {
      console.error('Error praying:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsPraying(false);
    }
  };

  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={webColors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={webColors.primary} />
          <Text style={styles.loadingText}>Loading prayers...</Text>
        </View>
      )}

      {/* Prayer Count Badge */}
      <View style={styles.prayerCountBadge}>
        <Text style={styles.prayerCountText}>
          {prayers.length} prayers on the map
          {connections.length > 0 && ` · ${connections.length} connections`}
        </Text>
      </View>

      {/* Purple FAB Button - matches native AddToMapFAB.tsx */}
      <View style={styles.fabContainer}>
        <Pressable
          style={styles.fab}
          onPress={() => alert('Download the PrayerMap app to create prayers!')}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
        <Text style={styles.fabLabel}>Add to Map</Text>
      </View>

      {/* Prayer Detail Modal */}
      <Modal
        visible={selectedPrayer !== null}
        transparent
        animationType="slide"
        onRequestClose={closePrayerModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closePrayerModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedPrayer && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[selectedPrayer.category] }]}>
                    <Text style={styles.categoryBadgeText}>
                      {CATEGORY_EMOJIS[selectedPrayer.category]} {CATEGORY_LABELS[selectedPrayer.category]}
                    </Text>
                  </View>
                  <Text style={styles.modalDate}>{formatDate(selectedPrayer.created_at)}</Text>
                </View>

                <Text style={styles.modalAuthor}>
                  {selectedPrayer.is_anonymous ? 'Anonymous' : selectedPrayer.user_name || 'A Prayer Warrior'}
                </Text>

                <ScrollView style={styles.modalScrollContent}>
                  <Text style={styles.modalPrayerContent}>{selectedPrayer.content}</Text>
                </ScrollView>

                {selectedPrayer.response_count !== undefined && selectedPrayer.response_count > 0 && (
                  <View style={styles.responseCount}>
                    <Text style={styles.responseCountText}>
                      🙏 {selectedPrayer.response_count} {selectedPrayer.response_count === 1 ? 'person has' : 'people have'} prayed
                    </Text>
                  </View>
                )}

                {/* Pray for this button with state handling */}
                {praySuccess ? (
                  <View style={styles.prayButtonSuccess}>
                    <Text style={styles.prayButtonText}>✓ Prayed!</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.prayButton, isPraying && styles.prayButtonDisabled]}
                    onPress={handlePrayForThis}
                    disabled={isPraying}
                  >
                    {isPraying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.prayButtonText}>🙏 Pray For This</Text>
                    )}
                  </Pressable>
                )}

                <Pressable style={styles.closeButton} onPress={closePrayerModal}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* App Store Banner for Web Users */}
      <View style={styles.appBanner}>
        <Text style={styles.appBannerText}>
          📱 Get the full PrayerMap experience
        </Text>
        <View style={styles.appStoreLinks}>
          <a href="https://apps.apple.com/app/prayermap" target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>
            <Text style={styles.appStoreLink}>App Store</Text>
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.prayermap.app" target="_blank" rel="noopener noreferrer">
            <Text style={styles.appStoreLink}>Google Play</Text>
          </a>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: webColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: webColors.background,
  },
  loadingText: {
    marginTop: 12,
    color: webColors.textSecondary,
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: '50%',
    transform: [{ translateX: -75 }],
    backgroundColor: glassBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerCountBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: glassBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  prayerCountText: {
    color: webColors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  // FAB Button styles - matches native AddToMapFAB.tsx
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Above the app banner
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.purple[400], // #C084FC
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  fabLabel: {
    marginTop: 8,
    color: colors.gray[700],
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: webColors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalDate: {
    color: webColors.textSecondary,
    fontSize: 12,
  },
  modalAuthor: {
    color: webColors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalScrollContent: {
    maxHeight: 200,
    marginBottom: 16,
  },
  modalPrayerContent: {
    color: webColors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  responseCount: {
    backgroundColor: glassBackground,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  responseCountText: {
    color: webColors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  prayButton: {
    backgroundColor: '#C084FC',
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayButtonDisabled: {
    opacity: 0.7,
  },
  prayButtonSuccess: {
    backgroundColor: '#86EFAC', // green-300
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 12,
  },
  closeButtonText: {
    color: webColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  appBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: glassBackground,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: webColors.border,
    alignItems: 'center',
  },
  appBannerText: {
    color: webColors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  appStoreLinks: {
    flexDirection: 'row',
  },
  appStoreLink: {
    color: webColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
