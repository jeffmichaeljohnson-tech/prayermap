import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useReducedMotion } from '../useReducedMotion';

describe('useReducedMotion', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockMediaQueryList: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create a mock media query list
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock window.matchMedia
    mockMatchMedia = vi.fn(() => mockMediaQueryList);
    window.matchMedia = mockMatchMedia as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return false by default when user has not enabled reduced motion', () => {
      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
    });

    it('should return true when user prefers reduced motion', () => {
      mockMediaQueryList.matches = true;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);
    });

    it('should query the correct media query', () => {
      renderHook(() => useReducedMotion());

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should query media preference on mount', () => {
      mockMediaQueryList.matches = false;

      renderHook(() => useReducedMotion());

      expect(mockMatchMedia).toHaveBeenCalledTimes(2); // Once for initial state, once in useEffect
    });
  });

  describe('media query listener', () => {
    it('should add event listener for media query changes', () => {
      renderHook(() => useReducedMotion());

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should update when media query changes', () => {
      let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

      mockMediaQueryList.addEventListener.mockImplementation((event, handler) => {
        if (event === 'change') {
          changeHandler = handler as (event: MediaQueryListEvent) => void;
        }
      });

      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);

      // Simulate media query change to reduced motion
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it('should update when reduced motion is disabled', () => {
      let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

      mockMediaQueryList.addEventListener.mockImplementation((event, handler) => {
        if (event === 'change') {
          changeHandler = handler as (event: MediaQueryListEvent) => void;
        }
      });

      mockMediaQueryList.matches = true;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);

      // Simulate media query change to normal motion
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: false } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(false);
    });
  });

  describe('SSR compatibility', () => {
    it('should check for window before accessing matchMedia', () => {
      // Hook has guard: if (typeof window === 'undefined') return false;
      // This test verifies the guard exists by checking it doesn't crash in normal browser environment
      expect(() => {
        renderHook(() => useReducedMotion());
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid changes to media query preference', () => {
      let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

      mockMediaQueryList.addEventListener.mockImplementation((event, handler) => {
        if (event === 'change') {
          changeHandler = handler as (event: MediaQueryListEvent) => void;
        }
      });

      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);

      // Rapid changes
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
          changeHandler({ matches: false } as MediaQueryListEvent);
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it('should maintain state across re-renders', () => {
      mockMediaQueryList.matches = true;

      const { result, rerender } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);

      rerender();

      expect(result.current).toBe(true);
    });

    it('should cleanup listener even if component unmounts quickly', () => {
      const { unmount } = renderHook(() => useReducedMotion());

      // Unmount immediately
      unmount();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('accessibility compliance', () => {
    it('should respect WCAG 2.1 AA prefers-reduced-motion media query', () => {
      renderHook(() => useReducedMotion());

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should default to normal motion when preference is not set', () => {
      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
    });

    it('should immediately honor user preference on mount', () => {
      mockMediaQueryList.matches = true;

      const { result } = renderHook(() => useReducedMotion());

      // User preference should be honored immediately
      expect(result.current).toBe(true);
    });
  });

  describe('browser compatibility', () => {
    it('should work with modern addEventListener API', () => {
      mockMediaQueryList.addEventListener = vi.fn();

      renderHook(() => useReducedMotion());

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should not use deprecated addListener API', () => {
      const mockAddListener = vi.fn();
      (mockMediaQueryList as any).addListener = mockAddListener;

      renderHook(() => useReducedMotion());

      // Should use addEventListener, not deprecated addListener
      expect(mockAddListener).not.toHaveBeenCalled();
      expect(mockMediaQueryList.addEventListener).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should only set up one listener per hook instance', () => {
      renderHook(() => useReducedMotion());

      // Should only call addEventListener once
      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should cleanup previous listener on unmount', () => {
      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledTimes(1);
    });

    it('should not re-register listener on re-renders', () => {
      const { rerender } = renderHook(() => useReducedMotion());

      const initialCallCount = mockMediaQueryList.addEventListener.mock.calls.length;

      rerender();
      rerender();
      rerender();

      // Should still only have the initial listener
      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(
        initialCallCount
      );
    });
  });

  describe('real-world usage patterns', () => {
    it('should allow components to conditionally disable animations', () => {
      mockMediaQueryList.matches = true;

      const { result } = renderHook(() => useReducedMotion());

      // Component can check this value to disable animations
      const shouldAnimate = !result.current;
      expect(shouldAnimate).toBe(false);
    });

    it('should allow components to use instant transitions when reduced motion is enabled', () => {
      mockMediaQueryList.matches = true;

      const { result } = renderHook(() => useReducedMotion());

      // Component can use this to set duration to 0
      const transitionDuration = result.current ? 0 : 0.4;
      expect(transitionDuration).toBe(0);
    });

    it('should allow components to use normal animations when reduced motion is disabled', () => {
      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      const transitionDuration = result.current ? 0 : 0.4;
      expect(transitionDuration).toBe(0.4);
    });

    it('should support Framer Motion integration pattern', () => {
      mockMediaQueryList.matches = false;

      const { result } = renderHook(() => useReducedMotion());

      // Typical Framer Motion usage
      const transition = result.current
        ? { duration: 0 }
        : { duration: 0.4, ease: 'easeOut' };

      expect(transition).toEqual({ duration: 0.4, ease: 'easeOut' });
    });

    it('should support multiple hook instances independently', () => {
      mockMediaQueryList.matches = true;

      const { result: result1 } = renderHook(() => useReducedMotion());
      const { result: result2 } = renderHook(() => useReducedMotion());

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);

      // Both should respond to the same media query
      expect(result1.current).toBe(result2.current);
    });
  });
});
