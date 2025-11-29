/**
 * Navigator mediaDevices mock for testing
 * Provides comprehensive simulation of getUserMedia, enumerateDevices, and related APIs
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { vi } from 'vitest';

// ============================================================================
// Mock MediaStreamTrack
// ============================================================================

/**
 * Mock MediaStreamTrack implementation
 */
export class MockMediaStreamTrack implements MediaStreamTrack {
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

  private constraints: MediaTrackConstraints = {};

  constructor(kind: 'audio' | 'video', label?: string) {
    this.kind = kind;
    this.id = `mock-${kind}-${Math.random().toString(36).substr(2, 9)}`;
    this.label = label || `Mock ${kind === 'audio' ? 'Microphone' : 'Camera'}`;
  }

  /**
   * Stop the track
   */
  stop(): void {
    this.readyState = 'ended';
    this.enabled = false;

    if (this.onended) {
      setTimeout(() => {
        const event = new Event('ended');
        this.onended?.call(this, event);
      }, 0);
    }
  }

  /**
   * Clone the track
   */
  clone(): MediaStreamTrack {
    const cloned = new MockMediaStreamTrack(this.kind, this.label);
    cloned.enabled = this.enabled;
    cloned.constraints = { ...this.constraints };
    return cloned;
  }

  /**
   * Get track capabilities
   */
  getCapabilities(): MediaTrackCapabilities {
    if (this.kind === 'audio') {
      return {
        autoGainControl: [true, false],
        channelCount: { max: 2, min: 1 },
        echoCancellation: [true, false],
        noiseSuppression: [true, false],
        sampleRate: { max: 48000, min: 8000 },
        sampleSize: { max: 16, min: 8 },
      };
    } else {
      return {
        aspectRatio: { max: 16 / 9, min: 4 / 3 },
        facingMode: ['user', 'environment'],
        frameRate: { max: 60, min: 1 },
        height: { max: 1080, min: 240 },
        width: { max: 1920, min: 320 },
      };
    }
  }

  /**
   * Get applied constraints
   */
  getConstraints(): MediaTrackConstraints {
    return { ...this.constraints };
  }

  /**
   * Get current settings
   */
  getSettings(): MediaTrackSettings {
    if (this.kind === 'audio') {
      return {
        autoGainControl: true,
        channelCount: 2,
        deviceId: this.id,
        echoCancellation: true,
        groupId: 'mock-group-1',
        noiseSuppression: true,
        sampleRate: 48000,
        sampleSize: 16,
      };
    } else {
      return {
        aspectRatio: 16 / 9,
        deviceId: this.id,
        facingMode: 'user',
        frameRate: 30,
        groupId: 'mock-group-1',
        height: 720,
        width: 1280,
      };
    }
  }

  /**
   * Apply constraints to the track
   */
  async applyConstraints(constraints?: MediaTrackConstraints): Promise<void> {
    if (constraints) {
      this.constraints = { ...this.constraints, ...constraints };
    }
    return Promise.resolve();
  }

  // Event listener methods
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// ============================================================================
// Mock MediaStream
// ============================================================================

/**
 * Mock MediaStream implementation
 */
export class MockMediaStream implements MediaStream {
  id: string;
  active = true;

  private tracks: MediaStreamTrack[] = [];

  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => unknown) | null = null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => unknown) | null = null;

  constructor(tracks: MediaStreamTrack[] = []) {
    this.id = `mock-stream-${Math.random().toString(36).substr(2, 9)}`;
    this.tracks = tracks;
  }

  /**
   * Get all tracks
   */
  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  /**
   * Get audio tracks only
   */
  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }

  /**
   * Get video tracks only
   */
  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  /**
   * Get track by ID
   */
  getTrackById(trackId: string): MediaStreamTrack | null {
    return this.tracks.find((track) => track.id === trackId) || null;
  }

  /**
   * Add a track to the stream
   */
  addTrack(track: MediaStreamTrack): void {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track);

      if (this.onaddtrack) {
        const event = new Event('addtrack') as MediaStreamTrackEvent;
        Object.defineProperty(event, 'track', {
          value: track,
          writable: false,
        });
        this.onaddtrack.call(this, event);
      }
    }
  }

  /**
   * Remove a track from the stream
   */
  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track);
    if (index !== -1) {
      this.tracks.splice(index, 1);

      if (this.onremovetrack) {
        const event = new Event('removetrack') as MediaStreamTrackEvent;
        Object.defineProperty(event, 'track', {
          value: track,
          writable: false,
        });
        this.onremovetrack.call(this, event);
      }
    }

    // Update active state
    this.active = this.tracks.some((t) => t.readyState === 'live');
  }

  /**
   * Clone the stream
   */
  clone(): MediaStream {
    const clonedTracks = this.tracks.map((track) => track.clone());
    return new MockMediaStream(clonedTracks);
  }

  // Event listener methods
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// ============================================================================
// Mock MediaDevices
// ============================================================================

/**
 * Simulated permission state for media devices
 */
let permissionState: 'granted' | 'denied' | 'prompt' = 'granted';

/**
 * Simulated device list
 */
let mockDeviceList: MediaDeviceInfo[] = [
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

/**
 * Mock getUserMedia implementation
 */
export const getUserMedia = vi.fn(
  async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
    // Check permission
    if (permissionState === 'denied') {
      throw new DOMException('Permission denied', 'NotAllowedError');
    }

    // Validate constraints
    if (!constraints || (!constraints.audio && !constraints.video)) {
      throw new DOMException(
        'At least one of audio and video must be requested',
        'TypeError'
      );
    }

    const tracks: MediaStreamTrack[] = [];

    // Create audio track if requested
    if (constraints.audio) {
      tracks.push(new MockMediaStreamTrack('audio'));
    }

    // Create video track if requested
    if (constraints.video) {
      tracks.push(new MockMediaStreamTrack('video'));
    }

    return new MockMediaStream(tracks);
  }
);

/**
 * Mock enumerateDevices implementation
 */
export const enumerateDevices = vi.fn(async (): Promise<MediaDeviceInfo[]> => {
  return [...mockDeviceList];
});

/**
 * Mock getSupportedConstraints implementation
 */
export const getSupportedConstraints = vi.fn((): MediaTrackSupportedConstraints => {
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
    latency: true,
    noiseSuppression: true,
    sampleRate: true,
    sampleSize: true,
    width: true,
  };
});

/**
 * Mock mediaDevices object
 */
export const mockMediaDevices = {
  getUserMedia,
  enumerateDevices,
  getSupportedConstraints,
  ondevicechange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Set the permission state for getUserMedia
 * @param state - Permission state to set
 */
export function setMediaPermission(state: 'granted' | 'denied' | 'prompt'): void {
  permissionState = state;
}

/**
 * Set custom device list
 * @param devices - Array of mock device info
 */
export function setMockDevices(devices: MediaDeviceInfo[]): void {
  mockDeviceList = devices;
}

/**
 * Reset to default device list
 */
export function resetMockDevices(): void {
  mockDeviceList = [
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
}

/**
 * Install mock mediaDevices globally
 */
export function installMockMediaDevices(): void {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: mockMediaDevices,
  });
}

/**
 * Create a mock error for media device operations
 * @param name - Error name (NotAllowedError, NotFoundError, etc.)
 * @param message - Error message
 */
export function createMediaError(name: string, message: string): DOMException {
  return new DOMException(message, name);
}
