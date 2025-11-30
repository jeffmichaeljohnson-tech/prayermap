import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PrayerAnimationLayer } from '../PrayerAnimationLayer';
import type { Prayer } from '../../types/prayer';

// Mock useReducedMotion hook
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Import the mocked hook to control its return value
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Mock mapbox-gl
const createMockMap = () => {
  const mockEventListeners = new Map<string, Function>();

  return {
    project: vi.fn((lngLat: [number, number]) => ({
      x: lngLat[0] * 100 + 500,
      y: lngLat[1] * 100 + 500,
    })),
    fitBounds: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      mockEventListeners.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      mockEventListeners.delete(event);
    }),
    _eventListeners: mockEventListeners,
  };
};

vi.mock('mapbox-gl', () => {
  return {
    default: {
      LngLatBounds: vi.fn(function(this: any) {
        this.extend = vi.fn();
        return this;
      }),
    },
  };
});

describe('PrayerAnimationLayer', () => {
  const mockPrayer: Prayer = {
    id: 'test-prayer-1',
    user_id: 'user-1',
    title: 'Test Prayer',
    description: 'Test prayer description',
    location: {
      lat: 40.7128,
      lng: -74.0060,
    },
    is_anonymous: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockUserLocation = {
    lat: 34.0522,
    lng: -118.2437,
  };

  const mockOnComplete = vi.fn();

  let mockMap: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Create a fresh mock map for each test
    mockMap = createMockMap();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when map is null', () => {
    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={null}
        onComplete={mockOnComplete}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders animation layer with map', () => {
    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(container.querySelector('.absolute.inset-0.pointer-events-none')).toBeInTheDocument();
  });

  it('calls fitBounds with correct parameters when map is provided', () => {
    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        padding: 150,
        pitch: 45,
        bearing: 0,
        duration: 1500,
        maxZoom: 13,
      })
    );
  });

  it('completes animation after 6 seconds in normal mode', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockOnComplete).not.toHaveBeenCalled();

    // Advance time by 6 seconds
    vi.advanceTimersByTime(6000);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('completes animation after 500ms in reduced motion mode', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockOnComplete).not.toHaveBeenCalled();

    // Advance time by 500ms
    vi.advanceTimersByTime(500);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('uses instant animation duration in reduced motion mode', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 0, // Instant in reduced motion mode
      })
    );
  });

  it('renders permanent connection line', () => {
    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('stroke', 'url(#permanentGradient)');
  });

  it('does not render traveling elements in reduced motion mode', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    // Should not have outbound gradient in reduced motion
    const outboundGradient = container.querySelector('#outboundGradient');
    expect(outboundGradient).not.toBeInTheDocument();

    // Should not have return gradient in reduced motion
    const returnGradient = container.querySelector('#returnGradient');
    expect(returnGradient).not.toBeInTheDocument();
  });

  it('renders traveling elements in normal mode', () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    // Should have outbound gradient
    const outboundGradient = container.querySelector('#outboundGradient');
    expect(outboundGradient).toBeInTheDocument();

    // Should have return gradient
    const returnGradient = container.querySelector('#returnGradient');
    expect(returnGradient).toBeInTheDocument();
  });

  it('registers move event listener on map', () => {
    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockMap.on).toHaveBeenCalledWith('move', expect.any(Function));
  });

  it('cleans up event listener and timer on unmount', () => {
    const { unmount } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith('move', expect.any(Function));

    // Timer should be cleared, so callback shouldn't be called after unmount
    vi.advanceTimersByTime(7000);
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('prevents double-calling onComplete callback', () => {
    const { rerender } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    // Advance time to complete animation
    vi.advanceTimersByTime(6000);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);

    // Rerender with new onComplete
    const newOnComplete = vi.fn();
    rerender(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={newOnComplete}
      />
    );

    // Should not call again
    vi.advanceTimersByTime(6000);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(newOnComplete).not.toHaveBeenCalled();
  });

  it('calculates positions from map projection', () => {
    const { container } = render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    expect(mockMap.project).toHaveBeenCalledWith([
      mockUserLocation.lng,
      mockUserLocation.lat,
    ]);

    expect(mockMap.project).toHaveBeenCalledWith([
      mockPrayer.location.lng,
      mockPrayer.location.lat,
    ]);

    // Should render with calculated positions
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('updates positions when map moves', () => {
    render(
      <PrayerAnimationLayer
        prayer={mockPrayer}
        userLocation={mockUserLocation}
        map={mockMap}
        onComplete={mockOnComplete}
      />
    );

    const initialProjectCalls = mockMap.project.mock.calls.length;

    // Simulate map move event
    const moveHandler = mockMap._eventListeners.get('move');
    if (moveHandler) {
      moveHandler();
    }

    // Should call project again to recalculate positions
    expect(mockMap.project.mock.calls.length).toBeGreaterThan(initialProjectCalls);
  });
});
