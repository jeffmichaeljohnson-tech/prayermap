/**
 * Standalone MediaRecorder mock for testing
 * Provides full simulation of MediaRecorder API with event handling
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { vi } from 'vitest';

// ============================================================================
// Mock MediaRecorder Implementation
// ============================================================================

/**
 * Enhanced mock MediaRecorder for testing recording functionality
 * Includes state management, event simulation, and error injection
 */
export class MockMediaRecorder implements MediaRecorder {
  state: RecordingState = 'inactive';
  stream: MediaStream;
  mimeType: string;
  audioBitsPerSecond = 128000;
  videoBitsPerSecond = 2500000;
  audioBitrateMode: BitrateMode = 'variable';

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onpause: ((event: Event) => void) | null = null;
  onresume: ((event: Event) => void) | null = null;
  onstart: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  private chunks: Blob[] = [];
  private timesliceInterval: NodeJS.Timeout | null = null;
  private simulateError = false;
  private errorToSimulate: string | null = null;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'video/webm;codecs=vp8,opus';
    if (options?.audioBitsPerSecond) {
      this.audioBitsPerSecond = options.audioBitsPerSecond;
    }
    if (options?.videoBitsPerSecond) {
      this.videoBitsPerSecond = options.videoBitsPerSecond;
    }
  }

  /**
   * Start recording
   * @param timeslice - Optional timeslice in milliseconds for periodic data events
   */
  start(timeslice?: number): void {
    if (this.state !== 'inactive') {
      throw new DOMException('Invalid state: recorder is not inactive', 'InvalidStateError');
    }

    this.state = 'recording';
    this.chunks = [];

    // Emit start event
    if (this.onstart) {
      setTimeout(() => {
        this.onstart?.(new Event('start'));
      }, 0);
    }

    // Simulate error if configured
    if (this.simulateError && this.errorToSimulate) {
      setTimeout(() => {
        const error = new Event('error');
        Object.defineProperty(error, 'error', {
          value: new Error(this.errorToSimulate || 'Recording error'),
        });
        this.onerror?.(error);
        this.state = 'inactive';
      }, 10);
      return;
    }

    // Set up timeslice-based data emission
    if (timeslice && timeslice > 0) {
      this.timesliceInterval = setInterval(() => {
        if (this.state === 'recording') {
          this.emitData();
        }
      }, timeslice);
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (this.state === 'inactive') {
      throw new DOMException('Invalid state: recorder is not recording', 'InvalidStateError');
    }

    // Clear timeslice interval
    if (this.timesliceInterval) {
      clearInterval(this.timesliceInterval);
      this.timesliceInterval = null;
    }

    this.state = 'inactive';

    // Emit final data
    this.emitData();

    // Emit stop event
    if (this.onstop) {
      setTimeout(() => {
        this.onstop?.(new Event('stop'));
      }, 0);
    }
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.state !== 'recording') {
      throw new DOMException('Invalid state: recorder is not recording', 'InvalidStateError');
    }

    this.state = 'paused';

    // Pause timeslice interval
    if (this.timesliceInterval) {
      clearInterval(this.timesliceInterval);
      this.timesliceInterval = null;
    }

    // Emit pause event
    if (this.onpause) {
      setTimeout(() => {
        this.onpause?.(new Event('pause'));
      }, 0);
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this.state !== 'paused') {
      throw new DOMException('Invalid state: recorder is not paused', 'InvalidStateError');
    }

    this.state = 'recording';

    // Emit resume event
    if (this.onresume) {
      setTimeout(() => {
        this.onresume?.(new Event('resume'));
      }, 0);
    }
  }

  /**
   * Request data immediately
   */
  requestData(): void {
    if (this.state === 'inactive') {
      throw new DOMException('Invalid state: recorder is inactive', 'InvalidStateError');
    }

    this.emitData();
  }

  /**
   * Emit data event with blob
   * @private
   */
  private emitData(): void {
    // Create mock blob with realistic size (simulate 1KB per emission)
    const mockData = new Uint8Array(1024).fill(Math.floor(Math.random() * 256));
    const blob = new Blob([mockData], { type: this.mimeType });
    this.chunks.push(blob);

    if (this.ondataavailable) {
      setTimeout(() => {
        const event = new Event('dataavailable') as BlobEvent;
        Object.defineProperty(event, 'data', {
          value: blob,
          writable: false,
          enumerable: true,
        });
        this.ondataavailable?.(event);
      }, 0);
    }
  }

  /**
   * Check if a MIME type is supported
   * @param type - MIME type to check
   */
  static isTypeSupported(type: string): boolean {
    const supportedTypes = [
      'video/webm',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'audio/webm',
      'audio/webm;codecs=opus',
      'video/mp4',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
    ];

    return supportedTypes.some((supported) =>
      type.toLowerCase().startsWith(supported.toLowerCase())
    );
  }

  /**
   * Configure error simulation for testing error handling
   * @param errorMessage - Error message to simulate
   */
  setSimulateError(errorMessage: string): void {
    this.simulateError = true;
    this.errorToSimulate = errorMessage;
  }

  /**
   * Get all chunks recorded so far
   */
  getChunks(): Blob[] {
    return [...this.chunks];
  }

  /**
   * Get combined blob of all chunks
   */
  getCombinedBlob(): Blob {
    return new Blob(this.chunks, { type: this.mimeType });
  }

  // Event listener methods (required by MediaRecorder interface)
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a mock MediaStream for testing
 * @param hasAudio - Whether the stream should have audio tracks
 * @param hasVideo - Whether the stream should have video tracks
 */
export function createMockMediaStream(
  hasAudio = true,
  hasVideo = false
): MediaStream {
  const tracks: MediaStreamTrack[] = [];

  if (hasAudio) {
    const audioTrack = {
      kind: 'audio',
      id: 'mock-audio-track',
      label: 'Mock Audio Track',
      enabled: true,
      readyState: 'live',
      stop: vi.fn(),
      getSettings: vi.fn(() => ({ deviceId: 'mock-audio-device' })),
    } as unknown as MediaStreamTrack;
    tracks.push(audioTrack);
  }

  if (hasVideo) {
    const videoTrack = {
      kind: 'video',
      id: 'mock-video-track',
      label: 'Mock Video Track',
      enabled: true,
      readyState: 'live',
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        deviceId: 'mock-video-device',
        width: 1280,
        height: 720,
      })),
    } as unknown as MediaStreamTrack;
    tracks.push(videoTrack);
  }

  return {
    id: 'mock-stream',
    active: true,
    getTracks: vi.fn(() => tracks),
    getAudioTracks: vi.fn(() => tracks.filter((t) => t.kind === 'audio')),
    getVideoTracks: vi.fn(() => tracks.filter((t) => t.kind === 'video')),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
  } as unknown as MediaStream;
}

/**
 * Create a mock Blob for audio/video data
 * @param type - MIME type of the blob
 * @param size - Size of the blob in bytes (default: 1024)
 */
export function createMockMediaBlob(type = 'video/webm', size = 1024): Blob {
  const data = new Uint8Array(size).fill(Math.floor(Math.random() * 256));
  return new Blob([data], { type });
}

/**
 * Wait for MediaRecorder to reach a specific state
 * @param recorder - MediaRecorder instance
 * @param state - Target state to wait for
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export function waitForRecorderState(
  recorder: MockMediaRecorder,
  state: RecordingState,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkState = () => {
      if (recorder.state === state) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout waiting for recorder state: ${state}`));
      } else {
        setTimeout(checkState, 10);
      }
    };

    checkState();
  });
}

/**
 * Install MockMediaRecorder globally
 */
export function installMockMediaRecorder(): void {
  global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
}
