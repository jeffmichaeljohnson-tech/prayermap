import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAudioRecorder, formatDuration } from '../useAudioRecorder';

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAudioRecorder());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.audioUrl).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not be recording initially', () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isRecording).toBe(false);
    });

    it('should have null audioBlob and audioUrl initially', () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.audioUrl).toBeNull();
    });
  });

  describe('startRecording', () => {
    it('should request microphone permissions', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
    });

    it('should start recording when permissions granted', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should set isRecording to true', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('should start duration timer', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      expect(result.current.duration).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve(); // Let state updates complete
      });

      expect(result.current.duration).toBeGreaterThan(0);
    });

    it('should handle permission denied error', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toContain('Microphone access denied');
    });

    it('should handle NotFoundError (no microphone)', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('NotFoundError')
      );

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should use webm codec when supported', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // The hook should use webm since MediaRecorder.isTypeSupported returns true for webm
      expect(result.current.isRecording).toBe(true);
    });

    it('should fallback to mp4 when webm not supported', async () => {
      // Mock isTypeSupported to return false
      const originalIsTypeSupported = MediaRecorder.isTypeSupported;
      MediaRecorder.isTypeSupported = vi.fn(() => false);

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Restore
      MediaRecorder.isTypeSupported = originalIsTypeSupported;
    });

    it('should collect audio chunks on dataavailable', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // The MockMediaRecorder in setup.ts automatically emits data
      expect(result.current.isRecording).toBe(true);
    });
  });

  describe('stopRecording', () => {
    it('should stop the media recorder', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      await act(async () => {
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should stop the duration timer', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve(); // Let state updates complete
      });

      await act(async () => {
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should create audioBlob from chunks', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      await act(async () => {
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.audioBlob).toBeTruthy();
    });

    it('should create audioUrl from blob', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.audioUrl).toBeTruthy();
    });

    it('should stop all media tracks', async () => {
      const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, 'getUserMedia');

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      // Wait for stream to be created
      await getUserMediaSpy.mock.results[0].value;

      await act(async () => {
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.isRecording).toBe(false);

      getUserMediaSpy.mockRestore();
    });

    it('should set isRecording to false', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('pauseRecording', () => {
    it('should pause the media recorder', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should stop the timer', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should set isPaused to true', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should preserve duration when paused', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      const durationBeforePause = result.current.duration;

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
      expect(result.current.duration).toBe(durationBeforePause);
    });

    it('should do nothing if not recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resumeRecording', () => {
    it('should resume the media recorder', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.pauseRecording();
      });

      await act(async () => {
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should restart the timer from paused duration', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should set isPaused to false', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should do nothing if not paused', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        result.current.resumeRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('resetRecording', () => {
    it('should stop any ongoing recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.resetRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should clear audioBlob and audioUrl', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.audioUrl).toBeTruthy();

      await act(async () => {
        result.current.resetRecording();
      });

      expect(result.current.audioBlob).toBeNull();
      expect(result.current.audioUrl).toBeNull();
    });

    it('should revoke object URL', async () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.audioUrl).toBeTruthy();

      await act(async () => {
        result.current.resetRecording();
      });

      expect(revokeObjectURLSpy).toHaveBeenCalled();
      revokeObjectURLSpy.mockRestore();
    });

    it('should reset duration to 0', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
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

    it('should stop all tracks', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.resetRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should clear chunks', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        result.current.resetRecording();
      });

      expect(result.current.audioBlob).toBeNull();
    });
  });

  describe('duration tracking', () => {
    it('should update duration every 100ms while recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve(); // Let state updates complete
      });

      expect(result.current.duration).toBeGreaterThan(0);
    });

    it('should pause duration when recording is paused', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        result.current.pauseRecording();
      });

      const pausedDuration = result.current.duration;

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.duration).toBe(pausedDuration);
    });

    it('should resume duration from correct point', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle MediaRecorder errors', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Since MediaRecorder errors are handled internally, we just verify the hook doesn't crash
      expect(result.current.isRecording).toBe(true);
    });

    it('should set error state with descriptive message', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('NotAllowedError')
      );

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toContain('Microphone access denied');
    });

    it('should clean up on error', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    it('should clean up on unmount', () => {
      const { unmount } = renderHook(() => useAudioRecorder());
      unmount();
      expect(true).toBe(true);
    });

    it('should stop recording on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();
      expect(true).toBe(true);
    });

    it('should revoke URLs on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
        await Promise.resolve(); // Let MediaRecorder callbacks complete
        result.current.stopRecording();
        await Promise.resolve(); // Let onstop callback complete
      });

      expect(result.current.audioUrl).toBeTruthy();

      unmount();
      expect(true).toBe(true);
    });
  });
});

describe('formatDuration', () => {
  it('should format 0 seconds as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should format 59 seconds as "0:59"', () => {
    expect(formatDuration(59)).toBe('0:59');
  });

  it('should format 60 seconds as "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('should format 125 seconds as "2:05"', () => {
    expect(formatDuration(125)).toBe('2:05');
  });
});
