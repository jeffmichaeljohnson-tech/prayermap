/**
 * Global test setup file for Vitest
 * Configures testing environment with necessary mocks and utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// ============================================================================
// Global Test Lifecycle
// ============================================================================

/**
 * Cleanup after each test to prevent test pollution
 */
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================================================
// Navigator MediaDevices Mock
// ============================================================================

/**
 * Mock MediaStream class for getUserMedia
 */
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks;
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks;
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
  }

  clone(): MediaStream {
    return new MockMediaStream([...this.tracks]) as unknown as MediaStream;
  }
}

/**
 * Mock MediaStreamTrack class
 */
class MockMediaStreamTrack implements MediaStreamTrack {
  kind: 'audio' | 'video';
  id: string;
  label: string;
  enabled = true;
  muted = false;
  readonly = false;
  readyState: MediaStreamTrackState = 'live';
  isolated = false;

  onended: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;

  constructor(kind: 'audio' | 'video', label: string) {
    this.kind = kind;
    this.id = `mock-${kind}-${Math.random().toString(36).substr(2, 9)}`;
    this.label = label;
  }

  stop(): void {
    this.readyState = 'ended';
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack(this.kind, this.label);
  }

  getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  getSettings(): MediaTrackSettings {
    return {
      deviceId: this.id,
      groupId: 'mock-group',
    };
  }

  applyConstraints(_constraints?: MediaTrackConstraints): Promise<void> {
    return Promise.resolve();
  }

  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

/**
 * Mock navigator.mediaDevices API
 */
const mockMediaDevices = {
  getUserMedia: vi.fn(
    async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      const tracks: MediaStreamTrack[] = [];

      if (constraints?.audio) {
        tracks.push(new MockMediaStreamTrack('audio', 'Mock Audio Input'));
      }

      if (constraints?.video) {
        tracks.push(new MockMediaStreamTrack('video', 'Mock Video Input'));
      }

      return new MockMediaStream(tracks) as unknown as MediaStream;
    }
  ),

  enumerateDevices: vi.fn(async (): Promise<MediaDeviceInfo[]> => {
    return [
      {
        deviceId: 'mock-audio-input-1',
        kind: 'audioinput' as MediaDeviceKind,
        label: 'Mock Microphone',
        groupId: 'mock-group-1',
        toJSON: () => ({}),
      },
      {
        deviceId: 'mock-video-input-1',
        kind: 'videoinput' as MediaDeviceKind,
        label: 'Mock Camera',
        groupId: 'mock-group-1',
        toJSON: () => ({}),
      },
      {
        deviceId: 'mock-audio-output-1',
        kind: 'audiooutput' as MediaDeviceKind,
        label: 'Mock Speaker',
        groupId: 'mock-group-1',
        toJSON: () => ({}),
      },
    ];
  }),

  getSupportedConstraints: vi.fn((): MediaTrackSupportedConstraints => {
    return {
      aspectRatio: true,
      autoGainControl: true,
      channelCount: true,
      deviceId: true,
      echoCancellation: true,
      facingMode: true,
      frameRate: true,
      groupId: true,
      height: true,
      noiseSuppression: true,
      sampleRate: true,
      sampleSize: true,
      width: true,
    };
  }),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices,
});

// ============================================================================
// MediaRecorder Mock
// ============================================================================

/**
 * Mock MediaRecorder for testing audio/video recording
 */
class MockMediaRecorder implements MediaRecorder {
  state: RecordingState = 'inactive';
  stream: MediaStream;
  mimeType: string;
  audioBitsPerSecond = 128000;
  videoBitsPerSecond = 2500000;

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onpause: ((event: Event) => void) | null = null;
  onresume: ((event: Event) => void) | null = null;
  onstart: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  private chunks: Blob[] = [];

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'video/webm';
  }

  start(timeslice?: number): void {
    if (this.state !== 'inactive') {
      throw new DOMException('Invalid state', 'InvalidStateError');
    }

    this.state = 'recording';
    this.chunks = [];

    if (this.onstart) {
      this.onstart(new Event('start'));
    }

    // Simulate data availability
    if (timeslice) {
      const interval = setInterval(() => {
        if (this.state === 'recording') {
          this.emitData();
        } else {
          clearInterval(interval);
        }
      }, timeslice);
    }
  }

  stop(): void {
    if (this.state === 'inactive') {
      throw new DOMException('Invalid state', 'InvalidStateError');
    }

    this.state = 'inactive';

    // Emit final data
    this.emitData();

    if (this.onstop) {
      this.onstop(new Event('stop'));
    }
  }

  pause(): void {
    if (this.state !== 'recording') {
      throw new DOMException('Invalid state', 'InvalidStateError');
    }

    this.state = 'paused';

    if (this.onpause) {
      this.onpause(new Event('pause'));
    }
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new DOMException('Invalid state', 'InvalidStateError');
    }

    this.state = 'recording';

    if (this.onresume) {
      this.onresume(new Event('resume'));
    }
  }

  requestData(): void {
    if (this.state === 'inactive') {
      throw new DOMException('Invalid state', 'InvalidStateError');
    }

    this.emitData();
  }

  private emitData(): void {
    // Create mock blob with some data
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([mockData], { type: this.mimeType });
    this.chunks.push(blob);

    if (this.ondataavailable) {
      const event = new Event('dataavailable') as BlobEvent;
      Object.defineProperty(event, 'data', {
        value: blob,
        writable: false,
      });
      this.ondataavailable(event);
    }
  }

  static isTypeSupported(type: string): boolean {
    return ['video/webm', 'audio/webm', 'video/mp4', 'audio/mp4'].includes(
      type
    );
  }

  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// ============================================================================
// URL Object Mocks
// ============================================================================

const objectURLs = new Map<string, Blob>();
let urlCounter = 0;

global.URL.createObjectURL = vi.fn((blob: Blob | MediaSource): string => {
  const url = `blob:mock-${urlCounter++}`;
  objectURLs.set(url, blob as Blob);
  return url;
});

global.URL.revokeObjectURL = vi.fn((url: string): void => {
  objectURLs.delete(url);
});

// ============================================================================
// Geolocation Mock
// ============================================================================

const mockGeolocation = {
  getCurrentPosition: vi.fn((success: PositionCallback, _error?: PositionErrorCallback) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    success(position);
  }),

  watchPosition: vi.fn((success: PositionCallback) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    success(position);
    return 1;
  }),

  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  writable: true,
  value: mockGeolocation,
});

// ============================================================================
// Window MatchMedia Mock
// ============================================================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// IntersectionObserver Mock
// ============================================================================

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit
  ) {}

  observe(_target: Element): void {}

  unobserve(_target: Element): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ============================================================================
// ResizeObserver Mock
// ============================================================================

class MockResizeObserver implements ResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}

  observe(_target: Element): void {}

  unobserve(_target: Element): void {}

  disconnect(): void {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// ============================================================================
// Performance Timing Mock
// ============================================================================

Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
});

// ============================================================================
// Console Capture for Debugging
// ============================================================================

beforeAll(() => {
  // Optionally capture console errors and warnings for debugging
  // Uncomment these to see what's being logged during tests
  // const originalError = console.error;
  // const originalWarn = console.warn;
  //
  // console.error = (...args: unknown[]) => {
  //   originalError.call(console, ...args);
  // };
  //
  // console.warn = (...args: unknown[]) => {
  //   originalWarn.call(console, ...args);
  // };
});
