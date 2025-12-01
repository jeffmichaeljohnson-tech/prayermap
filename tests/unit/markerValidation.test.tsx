/**
 * AGENT 3 - Prayer Marker Validation Tests
 *
 * Comprehensive tests to ensure marker functionality works correctly
 * across multiple users and scenarios, validating Living Map requirements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PrayerMarkers } from '../../src/components/map/PrayerMarkers';
import { PrayerMarker } from '../../src/components/prayer/PrayerMarker';
// import { markerMonitoringService } from '../../src/services/markerMonitoringService';
import type { Prayer } from '../../src/types/prayer';

// Mock Datadog
vi.mock('../../src/lib/datadog', () => ({
  trackEvent: vi.fn(),
  trackError: vi.fn(),
  datadogRum: {
    addAction: vi.fn().mockResolvedValue({}),
    addTiming: vi.fn(),
    addError: vi.fn()
  },
  setDatadogContext: vi.fn()
}));

// Mock MapBox GL
const mockMap = {
  project: vi.fn().mockReturnValue({ x: 100, y: 100 }),
  on: vi.fn(),
  off: vi.fn(),
  getBounds: vi.fn().mockReturnValue({
    getNorth: () => 45,
    getSouth: () => 44,
    getEast: () => -122,
    getWest: () => -123
  })
};

// Sample prayer data for testing
const createMockPrayer = (overrides: Partial<Prayer> = {}): Prayer => ({
  id: `prayer-${Math.random()}`,
  title: 'Test Prayer',
  content: 'Please pray for healing',
  content_type: 'text',
  location: { lat: 37.7749, lng: -122.4194 },
  user_id: 'user1',
  userName: 'Test User',
  is_anonymous: false,
  createdAt: new Date(),
  prayedBy: [],
  ...overrides
});

describe('Prayer Marker System Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset monitoring service state
    markerMonitoringService.cleanupMarkerMetrics = vi.fn();
  });

  describe('Marker Appearance and Real-time Requirements', () => {
    it('should render prayer markers immediately for new prayers', async () => {
      const prayers = [createMockPrayer()];
      const onMarkerClick = vi.fn();

      render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={onMarkerClick}
        />
      );

      // Verify marker appears
      await waitFor(() => {
        const marker = screen.getByRole('button');
        expect(marker).toBeInTheDocument();
      });
    });

    it('should meet Living Map real-time latency requirements (<2 seconds)', async () => {
      const startTime = performance.now();
      const recentPrayer = createMockPrayer({
        createdAt: new Date(Date.now() - 1000) // 1 second ago
      });

      render(
        <PrayerMarkers
          prayers={[recentPrayer]}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      await waitFor(() => {
        const marker = screen.getByRole('button');
        expect(marker).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid prayer additions without performance degradation', async () => {
      const prayers: Prayer[] = [];
      const onMarkerClick = vi.fn();

      // Create multiple prayers rapidly
      for (let i = 0; i < 50; i++) {
        prayers.push(createMockPrayer({
          id: `prayer-${i}`,
          location: {
            lat: 37.7749 + (Math.random() - 0.5) * 0.1,
            lng: -122.4194 + (Math.random() - 0.5) * 0.1
          }
        }));
      }

      const startTime = performance.now();
      
      render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={onMarkerClick}
        />
      );

      await waitFor(() => {
        const markers = screen.getAllByRole('button');
        expect(markers.length).toBeGreaterThan(0);
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(200); // Should handle 50 markers in under 200ms
    });
  });

  describe('Marker Clustering and Performance', () => {
    it('should cluster nearby prayers correctly', async () => {
      const sameLocation = { lat: 37.7749, lng: -122.4194 };
      const prayers = [
        createMockPrayer({ id: 'prayer-1', location: sameLocation }),
        createMockPrayer({ id: 'prayer-2', location: sameLocation }),
        createMockPrayer({ id: 'prayer-3', location: sameLocation })
      ];

      render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      await waitFor(() => {
        // Should show only one marker for clustered prayers
        const markers = screen.getAllByRole('button');
        expect(markers.length).toBe(1);
        
        // Should show stack count
        const stackBadge = screen.getByText('3');
        expect(stackBadge).toBeInTheDocument();
      });
    });

    it('should prioritize same-user prayers in clusters', async () => {
      const sameLocation = { lat: 37.7749, lng: -122.4194 };
      const prayers = [
        createMockPrayer({ 
          id: 'prayer-1', 
          location: sameLocation, 
          user_id: 'user1',
          createdAt: new Date(Date.now() - 3000)
        }),
        createMockPrayer({ 
          id: 'prayer-2', 
          location: sameLocation, 
          user_id: 'user2',
          createdAt: new Date(Date.now() - 2000)
        }),
        createMockPrayer({ 
          id: 'prayer-3', 
          location: sameLocation, 
          user_id: 'user1',
          createdAt: new Date(Date.now() - 1000) // Most recent from user1
        })
      ];

      const onMarkerClick = vi.fn();

      render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={onMarkerClick}
        />
      );

      await waitFor(() => {
        const marker = screen.getByRole('button');
        fireEvent.click(marker);
      });

      // Should show prayer list with user1's most recent prayer first
      expect(onMarkerClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prayer-3' })
      );
    });
  });

  describe('Cross-User Marker Synchronization', () => {
    it('should display same markers for different users viewing same area', async () => {
      const prayers = [
        createMockPrayer({ id: 'prayer-1', user_id: 'user1' }),
        createMockPrayer({ id: 'prayer-2', user_id: 'user2' }),
        createMockPrayer({ id: 'prayer-3', user_id: 'user3' })
      ];

      // Simulate multiple users viewing same area
      const user1View = render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      const user2View = render(
        <PrayerMarkers
          prayers={prayers}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      await waitFor(() => {
        // Both users should see the same number of markers
        const user1Markers = user1View.container.querySelectorAll('button[role="button"]');
        const user2Markers = user2View.container.querySelectorAll('button[role="button"]');
        
        expect(user1Markers.length).toBe(user2Markers.length);
        expect(user1Markers.length).toBe(3);
      });
    });

    it('should handle prayer state changes (prayed/unprayed) consistently', async () => {
      const prayer = createMockPrayer({ id: 'prayer-1' });
      const prayedPrayer = { ...prayer, prayedBy: [{ user_id: 'user2', userName: 'User 2' }] };

      const { rerender } = render(
        <PrayerMarkers
          prayers={[prayer]}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      // Initial state - should have glow effect
      await waitFor(() => {
        const marker = screen.getByRole('button');
        expect(marker.querySelector('.blur-xl')).toBeInTheDocument();
      });

      // Update to prayed state
      rerender(
        <PrayerMarkers
          prayers={[prayedPrayer]}
          map={mockMap as any}
          onMarkerClick={vi.fn()}
        />
      );

      // Should remove glow effect for prayed prayers
      await waitFor(() => {
        const marker = screen.getByRole('button');
        const glowElement = marker.querySelector('.blur-xl');
        expect(glowElement).toBeNull();
      });
    });
  });

  describe('Marker Interaction and Performance', () => {
    it('should handle marker clicks without lag', async () => {
      const prayer = createMockPrayer();
      const onMarkerClick = vi.fn();

      render(
        <PrayerMarker
          prayer={prayer}
          map={mockMap as any}
          onClick={onMarkerClick}
          isPrayed={false}
        />
      );

      const startTime = performance.now();
      
      await waitFor(() => {
        const marker = screen.getByRole('button');
        fireEvent.click(marker);
      });

      const clickLatency = performance.now() - startTime;
      expect(clickLatency).toBeLessThan(50); // Should respond in under 50ms
      expect(onMarkerClick).toHaveBeenCalledTimes(1);
    });

    it('should handle hover interactions smoothly', async () => {
      const prayer = createMockPrayer();

      render(
        <PrayerMarker
          prayer={prayer}
          map={mockMap as any}
          onClick={vi.fn()}
          isPrayed={false}
        />
      );

      await waitFor(() => {
        const marker = screen.getByRole('button');
        fireEvent.mouseEnter(marker);
        fireEvent.mouseLeave(marker);
        
        // Should not throw errors or cause performance issues
        expect(marker).toBeInTheDocument();
      });
    });

    it('should handle position updates efficiently during map movements', async () => {
      const prayer = createMockPrayer();

      render(
        <PrayerMarker
          prayer={prayer}
          map={mockMap as any}
          onClick={vi.fn()}
          isPrayed={false}
        />
      );

      // Simulate multiple map movement events
      for (let i = 0; i < 10; i++) {
        mockMap.project.mockReturnValue({ x: 100 + i, y: 100 + i });
        
        // Trigger map move event
        const moveCallback = mockMap.on.mock.calls.find(call => call[0] === 'move')?.[1];
        if (moveCallback) {
          moveCallback();
        }
      }

      await waitFor(() => {
        // Should handle position updates without errors
        const marker = screen.getByRole('button');
        expect(marker).toBeInTheDocument();
      });
    });
  });

  describe('Marker Monitoring Integration', () => {
    it('should track marker creation metrics', async () => {
      const trackMarkerCreation = jest.spyOn(markerMonitoringService, 'trackMarkerCreation');
      
      const prayer = createMockPrayer();
      
      render(
        <PrayerMarker
          prayer={prayer}
          map={mockMap as any}
          onClick={vi.fn()}
          isPrayed={false}
        />
      );

      await waitFor(() => {
        expect(trackMarkerCreation).toHaveBeenCalledWith(prayer);
      });
    });

    it('should track marker interactions', async () => {
      const trackMarkerInteraction = jest.spyOn(markerMonitoringService, 'trackMarkerInteraction');
      
      const prayer = createMockPrayer();
      
      render(
        <PrayerMarker
          prayer={prayer}
          map={mockMap as any}
          onClick={vi.fn()}
          isPrayed={false}
        />
      );

      await waitFor(() => {
        const marker = screen.getByRole('button');
        fireEvent.click(marker);
        
        expect(trackMarkerInteraction).toHaveBeenCalledWith(
          expect.any(String),
          'click',
          expect.any(Object)
        );
      });
    });
  });
});

describe('Living Map Performance Requirements', () => {
  it('should maintain 60fps during marker animations', async () => {
    const prayers = Array.from({ length: 20 }, (_, i) =>
      createMockPrayer({
        id: `prayer-${i}`,
        location: {
          lat: 37.7749 + (Math.random() - 0.5) * 0.1,
          lng: -122.4194 + (Math.random() - 0.5) * 0.1
        }
      })
    );

    const frameStartTime = performance.now();
    
    render(
      <PrayerMarkers
        prayers={prayers}
        map={mockMap as any}
        onMarkerClick={vi.fn()}
      />
    );

    await waitFor(() => {
      const markers = screen.getAllByRole('button');
      expect(markers.length).toBe(prayers.length);
    });

    const frameDuration = performance.now() - frameStartTime;
    expect(frameDuration).toBeLessThan(16.67); // 60fps requirement
  });

  it('should handle large datasets without blocking the UI', async () => {
    const prayers = Array.from({ length: 100 }, (_, i) =>
      createMockPrayer({
        id: `prayer-${i}`,
        location: {
          lat: 37.7749 + (Math.random() - 0.5) * 1,
          lng: -122.4194 + (Math.random() - 0.5) * 1
        }
      })
    );

    const startTime = performance.now();
    
    render(
      <PrayerMarkers
        prayers={prayers}
        map={mockMap as any}
        onMarkerClick={vi.fn()}
      />
    );

    await waitFor(() => {
      const markers = screen.getAllByRole('button');
      expect(markers.length).toBeGreaterThan(0);
    });

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(500); // Should handle 100 prayers in under 500ms
  });
});