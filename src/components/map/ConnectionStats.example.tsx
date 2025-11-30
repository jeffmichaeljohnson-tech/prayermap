/**
 * ConnectionStats Component - Integration Examples
 *
 * Demonstrates how to use the ConnectionStats component in various scenarios:
 * - Basic integration with PrayerMap
 * - Handling milestone celebrations
 * - Real-time updates with React Query
 * - Mobile considerations and haptic feedback
 * - Testing with mock data
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ConnectionStats } from './ConnectionStats';
import type { PrayerConnection } from '../../types/prayer';

// ============================================================================
// Example 1: Basic Integration
// ============================================================================

/**
 * Simplest integration - just pass connections
 */
export function BasicConnectionStats() {
  const connections: PrayerConnection[] = [
    {
      id: '1',
      prayerId: 'prayer-1',
      fromLocation: { lat: 37.7749, lng: -122.4194 }, // San Francisco
      toLocation: { lat: 40.7128, lng: -74.006 }, // New York
      requesterName: 'Sarah',
      replierName: 'John',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    // ... more connections
  ];

  return (
    <div className="relative w-full h-screen bg-heavenly-blue">
      {/* Your map */}
      <div className="w-full h-full" />

      {/* Stats component */}
      <ConnectionStats connections={connections} />
    </div>
  );
}

// ============================================================================
// Example 2: With User Authentication
// ============================================================================

/**
 * Shows personal prayer count for logged-in users
 */
export function AuthenticatedConnectionStats() {
  const [userId, setUserId] = useState<string | undefined>('user-123');
  const [connections, setConnections] = useState<PrayerConnection[]>([]);

  return (
    <div className="relative w-full h-screen">
      {/* Map container */}
      <div className="w-full h-full" />

      {/* Stats with personal count */}
      <ConnectionStats
        connections={connections}
        userId={userId} // Pass current user ID
      />
    </div>
  );
}

// ============================================================================
// Example 3: Milestone Celebrations with Haptics
// ============================================================================

/**
 * Handle milestone events with haptic feedback and custom actions
 */
export function CelebratoryConnectionStats() {
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const userId = 'user-123';

  const handleMilestone = async (milestone: number, type: 'global' | 'personal') => {
    console.log(`🎉 Milestone reached: ${milestone} (${type})`);

    // Trigger haptic feedback on mobile
    try {
      await Haptics.impact({
        style: type === 'global' ? ImpactStyle.Medium : ImpactStyle.Heavy
      });
    } catch (error) {
      // Haptics not available (web or error)
      console.log('Haptics not available');
    }

    // Show custom notification or modal
    if (type === 'global') {
      alert(`Amazing! ${milestone} prayer connections have been made! 🙏`);
    } else {
      alert(`Congratulations on your ${milestone}${getOrdinal(milestone)} prayer! ✨`);
    }

    // Track analytics
    // analytics.track('milestone_reached', { milestone, type });
  };

  return (
    <div className="relative w-full h-screen">
      <div className="w-full h-full" />

      <ConnectionStats
        connections={connections}
        userId={userId}
        onMilestone={handleMilestone}
      />
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// Example 4: Real-Time Updates with React Query
// ============================================================================

/**
 * Automatically refetch connections for real-time updates
 */
export function RealTimeConnectionStats() {
  const userId = 'user-123';

  // Fetch connections with automatic refetching
  const { data: connections = [] } = useQuery({
    queryKey: ['prayer-connections'],
    queryFn: fetchPrayerConnections,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 3000, // Data is fresh for 3 seconds
  });

  const handleMilestone = (milestone: number, type: 'global' | 'personal') => {
    console.log(`Milestone: ${milestone} (${type})`);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-heavenly-blue to-prayer-purple/10">
      <div className="w-full h-full" />

      <ConnectionStats
        connections={connections}
        userId={userId}
        onMilestone={handleMilestone}
      />
    </div>
  );
}

// Mock fetch function (replace with actual Supabase query)
async function fetchPrayerConnections(): Promise<PrayerConnection[]> {
  // In real implementation:
  // const { data } = await supabase
  //   .from('prayer_connections')
  //   .select('*')
  //   .order('created_at', { ascending: false });
  // return data || [];

  return [];
}

// ============================================================================
// Example 5: Mock Data for Testing
// ============================================================================

/**
 * Generate mock connections for testing and development
 */
export function MockConnectionStats() {
  const connections = generateMockConnections(250);
  const userId = 'user-123';

  return (
    <div className="relative w-full h-screen bg-heavenly-blue">
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500">Map placeholder</p>
      </div>

      <ConnectionStats
        connections={connections}
        userId={userId}
        onMilestone={(milestone, type) => {
          console.log(`🎯 Milestone: ${milestone} (${type})`);
        }}
      />
    </div>
  );
}

/**
 * Generate mock prayer connections for testing
 */
function generateMockConnections(count: number): PrayerConnection[] {
  const cities = [
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
    { name: 'New York', lat: 40.7128, lng: -74.006 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Miami', lat: 25.7617, lng: -80.1918 },
    { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
    { name: 'Boston', lat: 42.3601, lng: -71.0589 },
    { name: 'Denver', lat: 39.7392, lng: -104.9903 },
  ];

  const names = [
    'Sarah', 'John', 'Emily', 'Michael', 'Jessica', 'David',
    'Ashley', 'Christopher', 'Anonymous', 'Matthew', 'Jennifer',
  ];

  const connections: PrayerConnection[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const fromCity = cities[Math.floor(Math.random() * cities.length)];
    const toCity = cities[Math.floor(Math.random() * cities.length)];

    // Distribute connections over the past week
    const daysAgo = Math.random() * 7;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

    connections.push({
      id: `conn-${i}`,
      prayerId: `prayer-${i}`,
      fromLocation: {
        lat: fromCity.lat + (Math.random() - 0.5) * 0.1,
        lng: fromCity.lng + (Math.random() - 0.5) * 0.1,
      },
      toLocation: {
        lat: toCity.lat + (Math.random() - 0.5) * 0.1,
        lng: toCity.lng + (Math.random() - 0.5) * 0.1,
      },
      requesterName: names[Math.floor(Math.random() * names.length)],
      replierName: names[Math.floor(Math.random() * names.length)],
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  return connections.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============================================================================
// Example 6: Testing Milestone Triggers
// ============================================================================

/**
 * Demonstrate milestone celebrations by simulating connection growth
 */
export function MilestoneTestingStats() {
  const [connections, setConnections] = useState<PrayerConnection[]>(
    generateMockConnections(95) // Start just below 100 milestone
  );
  const userId = 'user-123';

  const addConnections = (count: number) => {
    const newConnections = generateMockConnections(count);
    setConnections(prev => [...prev, ...newConnections]);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-heavenly-blue via-dawn-gold/5 to-prayer-purple/10">
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-600 mb-8">
            Current: {connections.length} connections
          </p>

          {/* Test buttons */}
          <div className="space-x-4">
            <button
              onClick={() => addConnections(5)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Add 5 Connections
            </button>

            <button
              onClick={() => addConnections(10)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Add 10 Connections
            </button>

            <button
              onClick={() => setConnections(generateMockConnections(495))}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Jump to 495 (next milestone: 500)
            </button>
          </div>
        </div>
      </div>

      <ConnectionStats
        connections={connections}
        userId={userId}
        onMilestone={(milestone, type) => {
          console.log(`🎊 MILESTONE REACHED: ${milestone} (${type})`);
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 7: Mobile-Optimized Layout
// ============================================================================

/**
 * Shows responsive positioning on different screen sizes
 */
export function ResponsiveConnectionStats() {
  const connections = generateMockConnections(123);
  const userId = 'user-123';

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <div className="w-full h-full bg-gradient-to-br from-heavenly-blue to-prayer-purple/5" />

      {/* Stats - positioned for mobile */}
      <div className="absolute inset-0 pointer-events-none">
        <ConnectionStats
          connections={connections}
          userId={userId}
        />
      </div>

      {/* Other UI elements */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <button className="px-4 py-2 bg-white rounded-lg shadow-lg">
          Add Prayer
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Usage Notes
// ============================================================================

/**
 * INTEGRATION CHECKLIST:
 *
 * 1. Data Source
 *    ✓ Fetch connections from Supabase
 *    ✓ Use React Query for caching and real-time updates
 *    ✓ Handle loading and error states
 *
 * 2. Authentication
 *    ✓ Pass userId when user is logged in
 *    ✓ Personal stats only show for authenticated users
 *    ✓ Handle anonymous browsing (userId = undefined)
 *
 * 3. Milestone Handling
 *    ✓ Implement onMilestone callback
 *    ✓ Add haptic feedback (Capacitor Haptics)
 *    ✓ Track analytics events
 *    ✓ Show custom celebrations
 *
 * 4. Performance
 *    ✓ Component uses memoization internally
 *    ✓ Animations are GPU-accelerated
 *    ✓ No performance impact on map rendering
 *
 * 5. Mobile
 *    ✓ Touch targets are 44x44 minimum
 *    ✓ Positioned to not block map controls
 *    ✓ Smooth animations on all devices
 *    ✓ Works in both portrait and landscape
 *
 * 6. Accessibility
 *    ✓ Screen reader announcements
 *    ✓ Keyboard navigation
 *    ✓ High contrast colors
 *    ✓ Semantic HTML
 */
