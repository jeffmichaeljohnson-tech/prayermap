/**
 * TimelineSlider Usage Example
 *
 * This file demonstrates how to integrate the TimelineSlider component
 * into your PrayerMap application.
 */

import { useState } from 'react';
import { TimelineSlider, useTimelineFilter } from './TimelineSlider';
import type { PrayerConnection } from '../../types/prayer';

/**
 * Example 1: Basic Usage with useTimelineFilter Hook
 */
export function MapWithTimeline({ connections }: { connections: PrayerConnection[] }) {
  // Use the custom hook to manage timeline state
  const timeline = useTimelineFilter(connections);

  return (
    <div className="relative w-full h-screen">
      {/* Your map component */}
      <YourMapComponent connections={timeline.filteredConnections} />

      {/* Timeline Slider */}
      <TimelineSlider
        dateRange={timeline.dateRange}
        currentDate={timeline.currentDate}
        onDateChange={timeline.setDate}
        connectionCount={timeline.connectionCount}
        isPlaying={timeline.isPlaying}
        onPlay={timeline.play}
        onPause={timeline.pause}
        playbackSpeed={timeline.playbackSpeed}
        onSpeedChange={timeline.setPlaybackSpeed}
      />
    </div>
  );
}

/**
 * Example 2: Custom Timeline Management
 */
export function MapWithCustomTimeline({ connections }: { connections: PrayerConnection[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);

  // Calculate date range
  const dateRange = {
    start: new Date('2024-01-01'),
    end: new Date(),
  };

  // Filter connections by current date
  const filteredConnections = connections.filter(
    (c) => new Date(c.createdAt) <= currentDate
  );

  return (
    <div className="relative w-full h-screen">
      {/* Your map */}
      <YourMapComponent connections={filteredConnections} />

      {/* Timeline Slider */}
      <TimelineSlider
        dateRange={dateRange}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        connectionCount={filteredConnections.length}
        isPlaying={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
      />
    </div>
  );
}

/**
 * Example 3: Integration with Existing Map Component
 */
export function IntegratedMapExample() {
  // Assume you already have connections from your API
  const connections: PrayerConnection[] = [
    {
      id: '1',
      prayerId: 'prayer-1',
      prayerResponseId: 'response-1',
      fromLocation: { lat: 40.7128, lng: -74.0060 },
      toLocation: { lat: 34.0522, lng: -118.2437 },
      requesterName: 'John',
      replierName: 'Sarah',
      createdAt: new Date('2024-01-15'),
      expiresAt: new Date('2025-01-15'),
    },
    {
      id: '2',
      prayerId: 'prayer-2',
      prayerResponseId: 'response-2',
      fromLocation: { lat: 34.0522, lng: -118.2437 },
      toLocation: { lat: 51.5074, lng: -0.1278 },
      requesterName: 'Sarah',
      replierName: 'Michael',
      createdAt: new Date('2024-03-20'),
      expiresAt: new Date('2025-03-20'),
    },
    // ... more connections
  ];

  // Use the hook for timeline management
  const timeline = useTimelineFilter(connections);

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div className="absolute inset-0">
        {/* MapBox GL or your map component */}
        <MapComponent>
          {/* Render filtered connections */}
          {timeline.filteredConnections.map((connection) => (
            <ConnectionLine key={connection.id} connection={connection} />
          ))}
        </MapComponent>
      </div>

      {/* Timeline Controls */}
      <TimelineSlider
        dateRange={timeline.dateRange}
        currentDate={timeline.currentDate}
        onDateChange={timeline.setDate}
        connectionCount={timeline.connectionCount}
        isPlaying={timeline.isPlaying}
        onPlay={timeline.play}
        onPause={timeline.pause}
        playbackSpeed={timeline.playbackSpeed}
        onSpeedChange={timeline.setPlaybackSpeed}
      />

      {/* Optional: Info Panel */}
      <div className="absolute top-4 left-4 glass-strong rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Timeline Info</h3>
        <p className="text-sm text-gray-600">
          Mode: {timeline.filterMode}
        </p>
        <p className="text-sm text-gray-600">
          Connections: {timeline.connectionCount} / {connections.length}
        </p>
        <p className="text-sm text-gray-600">
          Date: {timeline.currentDate.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

/**
 * Example 4: With Animation Sync
 *
 * Sync connection animations with timeline playback
 */
export function AnimatedTimelineMap({ connections }: { connections: PrayerConnection[] }) {
  const timeline = useTimelineFilter(connections);
  const [animatingConnections, setAnimatingConnections] = useState<Set<string>>(new Set());

  // When date changes, animate new connections
  const handleDateChange = (date: Date) => {
    timeline.setDate(date);

    // Find connections that just became visible
    const previousConnections = timeline.filteredConnections;
    const newConnections = connections.filter(
      (c) =>
        new Date(c.createdAt) <= date &&
        !previousConnections.some((prev) => prev.id === c.id)
    );

    // Animate them
    if (newConnections.length > 0) {
      setAnimatingConnections(new Set(newConnections.map((c) => c.id)));

      // Clear animation state after animation completes
      setTimeout(() => {
        setAnimatingConnections(new Set());
      }, 1000);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <YourMapComponent
        connections={timeline.filteredConnections}
        animatingIds={animatingConnections}
      />

      <TimelineSlider
        dateRange={timeline.dateRange}
        currentDate={timeline.currentDate}
        onDateChange={handleDateChange}
        connectionCount={timeline.connectionCount}
        isPlaying={timeline.isPlaying}
        onPlay={timeline.play}
        onPause={timeline.pause}
        playbackSpeed={timeline.playbackSpeed}
        onSpeedChange={timeline.setPlaybackSpeed}
      />
    </div>
  );
}

// Placeholder components for examples
function YourMapComponent({ connections }: { connections: PrayerConnection[] }) {
  return <div>Map with {connections.length} connections</div>;
}

function MapComponent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function ConnectionLine({ connection }: { connection: PrayerConnection }) {
  return <div>Connection {connection.id}</div>;
}
