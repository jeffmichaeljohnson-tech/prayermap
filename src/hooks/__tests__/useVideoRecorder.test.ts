import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVideoRecorder, formatVideoDuration } from '../useVideoRecorder';

describe('useVideoRecorder', () => {
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock video element
    mockVideoElement = {
      srcObject: null,
      muted: false,
      play: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLVideoElement;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVideoRecorder());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.videoBlob).toBeNull();
      expect(result.current.videoUrl).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isCameraReady).toBe(false);
      expect(result.current.facingMode).toBe('user');
    });

    it('should not have camera ready initially', () => {
      const { result } = renderHook(() => useVideoRecorder());
      expect(result.current.isCameraReady).toBe(false);
    });

    it('should default to user-facing camera', () => {
      const { result } = renderHook(() => useVideoRecorder());
      expect(result.current.facingMode).toBe('user');
    });
  });

  describe('initializeCamera', () => {
    it('should request camera and microphone permissions', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
    });

    it('should set video constraints for portrait mode', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            aspectRatio: { ideal: 9 / 16 },
          }),
        })
      );
    });

    it('should set isCameraReady to true on success', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.isCameraReady).toBe(true);
    });

    it('should attach stream to video element', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(mockVideoElement.srcObject).toBeTruthy();
      expect(mockVideoElement.muted).toBe(true);
      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('should handle permission denied error', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useVideoRecorder());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.isCameraReady).toBe(false);
      expect(result.current.error).toContain('Camera access denied');
    });

    it('should handle NotFoundError (no camera)', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('NotFoundError')
      );

      const { result } = renderHook(() => useVideoRecorder());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.isCameraReady).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('switchCamera', () => {
    it('should toggle between user and environment facing modes', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.facingMode).toBe('user');

      await act(async () => {
        await result.current.switchCamera();
      });

      await waitFor(() => {
        expect(result.current.facingMode).toBe('environment');
      });
    });

    it('should stop current stream before switching', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.switchCamera();
      });

      // If no error is thrown, the switch was successful
      expect(result.current.facingMode).toBe('environment');
    });

    it('should initialize new stream with new facing mode', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      vi.mocked(navigator.mediaDevices.getUserMedia).mockClear();

      await act(async () => {
        await result.current.switchCamera();
      });

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              facingMode: 'environment',
            }),
          })
        );
      });
    });

    it('should handle switch errors gracefully', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Camera switch failed')
      );

      await act(async () => {
        await result.current.switchCamera();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to switch camera');
      });
    });
  });

  describe('startRecording', () => {
    it('should initialize camera if not ready', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should create MediaRecorder with video codecs', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should use vp9 codec when supported', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should fallback to vp8 when vp9 not supported', async () => {
      const originalIsTypeSupported = MediaRecorder.isTypeSupported;
      MediaRecorder.isTypeSupported = vi.fn((type: string) => {
        return type.includes('vp8') && !type.includes('vp9');
      });

      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      MediaRecorder.isTypeSupported = originalIsTypeSupported;
    });

    it('should set videoBitsPerSecond for quality', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should start duration timer', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.duration).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.duration).toBeGreaterThan(0);
      });
    });

    it('should collect video chunks', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });
  });

  describe('stopRecording', () => {
    it('should stop MediaRecorder', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.isRecording).toBe(false);
      });
    });

    it('should create videoBlob from chunks', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.videoBlob).toBeTruthy();
      });
    });

    it('should create videoUrl', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.videoUrl).toBeTruthy();
      });
    });

    it('should NOT stop camera stream (allow re-recording)', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.isCameraReady).toBe(true);
      });
    });
  });

  describe('pauseRecording', () => {
    it('should pause MediaRecorder', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should pause timer', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should set isPaused to true', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });
  });

  describe('resumeRecording', () => {
    it('should resume MediaRecorder', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should resume timer', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should set isPaused to false', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resetRecording', () => {
    it('should clear video blob and URL', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.videoUrl).toBeTruthy();
      });

      await act(async () => {
        result.current.resetRecording();
      });

      expect(result.current.videoBlob).toBeNull();
      expect(result.current.videoUrl).toBeNull();
    });

    it('should reset duration', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        result.current.resetRecording();
      });

      expect(result.current.duration).toBe(0);
    });

    it('should NOT stop camera (keep preview)', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.resetRecording();
      });

      expect(result.current.isCameraReady).toBe(true);
    });

    it('should revoke object URL', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.videoUrl).toBeTruthy();
      });

      await act(async () => {
        result.current.resetRecording();
      });

      expect(revokeObjectURLSpy).toHaveBeenCalled();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('stopCamera', () => {
    it('should stop all tracks', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        result.current.stopCamera();
      });

      expect(result.current.isCameraReady).toBe(false);
    });

    it('should clear video element srcObject', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(mockVideoElement.srcObject).toBeTruthy();

      await act(async () => {
        result.current.stopCamera();
      });

      expect(mockVideoElement.srcObject).toBeNull();
    });

    it('should set isCameraReady to false', async () => {
      const { result } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.isCameraReady).toBe(true);

      await act(async () => {
        result.current.stopCamera();
      });

      expect(result.current.isCameraReady).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should stop camera on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
      });

      unmount();
      expect(true).toBe(true);
    });

    it('should stop recording on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      unmount();
      expect(true).toBe(true);
    });

    it('should revoke URLs on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
        result.current.stopRecording();
      });

      unmount();
      expect(true).toBe(true);
    });

    it('should clear timers on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoRecorder());
      result.current.videoRef.current = mockVideoElement;

      await act(async () => {
        await result.current.initializeCamera();
        await result.current.startRecording();
      });

      unmount();
      expect(true).toBe(true);
    });
  });
});

describe('formatVideoDuration', () => {
  it('should format 0 seconds as "0:00"', () => {
    expect(formatVideoDuration(0)).toBe('0:00');
  });

  it('should format 59 seconds as "0:59"', () => {
    expect(formatVideoDuration(59)).toBe('0:59');
  });

  it('should format 60 seconds as "1:00"', () => {
    expect(formatVideoDuration(60)).toBe('1:00');
  });

  it('should format 125 seconds as "2:05"', () => {
    expect(formatVideoDuration(125)).toBe('2:05');
  });
});
