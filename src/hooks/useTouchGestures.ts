/**
 * Touch Gestures Hook for Ethereal Chat UI
 * Agent 5 - Chat UI Designer
 * 
 * Mobile-optimized touch interactions with haptic feedback
 */

import { useRef, useCallback, useEffect } from 'react';
import type { TouchGestureState } from '../types/chat';

interface TouchGestureOptions {
  onTap?: (event: TouchEvent) => void;
  onLongPress?: (event: TouchEvent) => void;
  onSwipeLeft?: (event: TouchEvent) => void;
  onSwipeRight?: (event: TouchEvent) => void;
  onSwipeUp?: (event: TouchEvent) => void;
  onSwipeDown?: (event: TouchEvent) => void;
  onPinch?: (scale: number, event: TouchEvent) => void;
  longPressDuration?: number;
  swipeThreshold?: number;
  enableHaptics?: boolean;
  preventScrolling?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  initialDistance?: number;
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    longPressDuration = 500,
    swipeThreshold = 50,
    enableHaptics = true,
    preventScrolling = false
  } = options;

  const touchDataRef = useRef<TouchData | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Haptic feedback utility
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 50,
        heavy: 100
      };
      navigator.vibrate(patterns[type]);
    }
  }, [enableHaptics]);

  // Calculate distance between two touches
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventScrolling) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    if (!touch) return;

    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
      initialDistance: event.touches.length === 2 
        ? getDistance(event.touches[0], event.touches[1])
        : undefined
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchDataRef.current) {
          triggerHaptic('medium');
          onLongPress(event);
          touchDataRef.current = null; // Prevent other gestures
        }
      }, longPressDuration);
    }
  }, [onLongPress, longPressDuration, triggerHaptic, preventScrolling, getDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchDataRef.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    touchDataRef.current.currentX = touch.clientX;
    touchDataRef.current.currentY = touch.clientY;

    // Handle pinch gesture
    if (event.touches.length === 2 && touchDataRef.current.initialDistance && onPinch) {
      const currentDistance = getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / touchDataRef.current.initialDistance;
      onPinch(scale, event);
    }

    // Cancel long press if moved too much
    const deltaX = Math.abs(touch.clientX - touchDataRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchDataRef.current.startY);
    
    if ((deltaX > 10 || deltaY > 10) && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [onPinch, getDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchDataRef.current) return;

    const touchData = touchDataRef.current;
    const duration = Date.now() - touchData.startTime;
    const deltaX = touchData.currentX - touchData.startX;
    const deltaY = touchData.currentY - touchData.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Determine gesture type
    if (absX < 10 && absY < 10 && duration < 300) {
      // Tap
      if (onTap) {
        triggerHaptic('light');
        onTap(event);
      }
    } else if (absX > swipeThreshold || absY > swipeThreshold) {
      // Swipe
      triggerHaptic('light');
      
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(event);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(event);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(event);
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(event);
        }
      }
    }

    touchDataRef.current = null;
  }, [onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, triggerHaptic]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScrolling });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScrolling });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScrolling]);

  return {
    ref: elementRef,
    triggerHaptic
  };
}

// Hook for scroll optimization
export function useOptimizedScroll(callback: () => void, dependency: any[]) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependency);
}

// Hook for virtual scrolling (for large message lists)
export function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const scrollTop = useRef(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const visibleRange = {
    start: Math.max(0, Math.floor(scrollTop.current / itemHeight) - overscan),
    end: Math.min(
      itemCount - 1,
      Math.floor((scrollTop.current + containerHeight) / itemHeight) + overscan
    )
  };

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    scrollTop.current = target.scrollTop;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    containerRef,
    visibleRange,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleRange.start * itemHeight
  };
}

// Hook for intersection observer (for lazy loading)
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [callback, options]);

  return targetRef;
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  items: any[],
  onSelect: (index: number) => void,
  initialIndex = 0
) {
  const currentIndexRef = useRef(initialIndex);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        currentIndexRef.current = Math.max(0, currentIndexRef.current - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        currentIndexRef.current = Math.min(items.length - 1, currentIndexRef.current + 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndexRef.current);
        break;
      case 'Home':
        event.preventDefault();
        currentIndexRef.current = 0;
        break;
      case 'End':
        event.preventDefault();
        currentIndexRef.current = items.length - 1;
        break;
    }
  }, [items.length, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return currentIndexRef.current;
}