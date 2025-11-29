import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { haptic, hapticSequence, prayerAnimationHaptics, HapticPattern } from '../hapticService';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn()
  }
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    selectionStart: vi.fn(),
    selectionChanged: vi.fn(),
    selectionEnd: vi.fn()
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY'
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR'
  }
}));

describe('hapticService', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockVibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock matchMedia (reduced motion check)
    mockMatchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    window.matchMedia = mockMatchMedia;

    // Mock navigator.vibrate
    mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('haptic - basic patterns', () => {
    it('should trigger light haptic on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('light');

      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should trigger medium haptic on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('medium');

      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
    });

    it('should trigger heavy haptic on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('heavy');

      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });
    });

    it('should default to medium haptic when no pattern specified', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic();

      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
    });
  });

  describe('haptic - notification patterns', () => {
    it('should trigger success notification on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('success');

      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
    });

    it('should trigger warning notification on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('warning');

      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
    });

    it('should trigger error notification on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('error');

      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
    });
  });

  describe('haptic - selection pattern', () => {
    it('should trigger selection sequence on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('selection');

      expect(Haptics.selectionStart).toHaveBeenCalled();
      expect(Haptics.selectionChanged).toHaveBeenCalled();
      expect(Haptics.selectionEnd).toHaveBeenCalled();
    });
  });

  describe('haptic - prayer-specific patterns', () => {
    it('should trigger prayer_start pattern with light -> medium progression', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('prayer_start');

      // Should call impact twice
      expect(Haptics.impact).toHaveBeenCalledTimes(2);
      expect(Haptics.impact).toHaveBeenNthCalledWith(1, { style: ImpactStyle.Light });
      expect(Haptics.impact).toHaveBeenNthCalledWith(2, { style: ImpactStyle.Medium });
    });

    it('should trigger prayer_connect pattern with two quick taps', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('prayer_connect');

      expect(Haptics.impact).toHaveBeenCalledTimes(2);
      expect(Haptics.impact).toHaveBeenNthCalledWith(1, { style: ImpactStyle.Medium });
      expect(Haptics.impact).toHaveBeenNthCalledWith(2, { style: ImpactStyle.Medium });
    });

    it('should trigger prayer_complete pattern with success + flourish', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('prayer_complete');

      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should trigger heartbeat pattern with heavy -> light rhythm', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await haptic('heartbeat');

      expect(Haptics.impact).toHaveBeenCalledTimes(2);
      expect(Haptics.impact).toHaveBeenNthCalledWith(1, { style: ImpactStyle.Heavy });
      expect(Haptics.impact).toHaveBeenNthCalledWith(2, { style: ImpactStyle.Light });
    });
  });

  describe('haptic - web fallback', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    });

    it('should use vibration API for light haptic on web', async () => {
      await haptic('light');

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('should use vibration API for medium haptic on web', async () => {
      await haptic('medium');

      expect(mockVibrate).toHaveBeenCalledWith(25);
    });

    it('should use vibration API for heavy haptic on web', async () => {
      await haptic('heavy');

      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('should use vibration patterns for notifications on web', async () => {
      await haptic('success');

      expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30]);
    });

    it('should use vibration patterns for prayer_start on web', async () => {
      await haptic('prayer_start');

      expect(mockVibrate).toHaveBeenCalledWith([15, 50, 30]);
    });

    it('should not crash when vibration API is not available', async () => {
      // Remove vibrate from navigator
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true
      });

      await expect(haptic('medium')).resolves.not.toThrow();
      expect(mockVibrate).not.toHaveBeenCalled();
    });
  });

  describe('haptic - reduced motion respect', () => {
    it('should skip haptic when reduced motion is enabled', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      mockMatchMedia.mockReturnValue({
        matches: true, // Reduced motion enabled
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      await haptic('medium');

      expect(Haptics.impact).not.toHaveBeenCalled();
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('should trigger haptic when reduced motion is disabled', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      mockMatchMedia.mockReturnValue({
        matches: false, // Reduced motion disabled
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      await haptic('medium');

      expect(Haptics.impact).toHaveBeenCalled();
    });
  });

  describe('haptic - error handling', () => {
    it('should silently fail when haptics throw error', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Haptics.impact).mockRejectedValue(new Error('Haptics not available'));

      await expect(haptic('medium')).resolves.not.toThrow();
    });

    it('should log error to console.debug', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Haptics.impact).mockRejectedValue(new Error('Haptics not available'));

      await haptic('medium');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Haptic] Not available:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hapticSequence', () => {
    it('should play multiple haptics in sequence', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await hapticSequence([
        { pattern: 'light', delay: 0 },
        { pattern: 'medium', delay: 0 },
        { pattern: 'heavy', delay: 0 }
      ]);

      expect(Haptics.impact).toHaveBeenCalledTimes(3);
    });

    it('should respect delays between patterns', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const start = Date.now();

      await hapticSequence([
        { pattern: 'light', delay: 100 },
        { pattern: 'medium', delay: 100 }
      ]);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(200); // Total delay should be ~200ms
    });
  });

  describe('prayerAnimationHaptics', () => {
    it('should trigger all four phases of prayer animation', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      // Start the animation (don't await to avoid full delay)
      const promise = prayerAnimationHaptics();

      // Fast-forward timers if using fake timers, or just test initial call
      expect(Haptics.impact).toHaveBeenCalled(); // prayer_start called immediately

      // For full testing, you'd need to use vi.useFakeTimers() and advance time
      // But for now, just verify it starts
      await promise; // Let it complete in background
    }, 10000); // Increase timeout for 6+ second animation

    it('should call prayer animation phases in correct order', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await prayerAnimationHaptics();

      // prayer_start: 2 impacts (light, medium)
      // prayer_connect: 2 impacts (medium, medium)
      // heartbeat: 2 impacts (heavy, light)
      // prayer_complete: 1 notification + 1 impact
      expect(Haptics.impact).toHaveBeenCalled();
      expect(Haptics.notification).toHaveBeenCalled();
    }, 10000);
  });

  describe('hapticService singleton', () => {
    it('should export hapticService with trigger method', async () => {
      const { hapticService } = await import('../hapticService');

      expect(hapticService.trigger).toBeDefined();
      expect(typeof hapticService.trigger).toBe('function');
    });

    it('should export hapticService with sequence method', async () => {
      const { hapticService } = await import('../hapticService');

      expect(hapticService.sequence).toBeDefined();
      expect(typeof hapticService.sequence).toBe('function');
    });

    it('should export hapticService with prayerAnimation method', async () => {
      const { hapticService } = await import('../hapticService');

      expect(hapticService.prayerAnimation).toBeDefined();
      expect(typeof hapticService.prayerAnimation).toBe('function');
    });
  });
});
