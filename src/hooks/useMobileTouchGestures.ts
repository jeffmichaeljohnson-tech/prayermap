/**
 * Advanced Touch Gesture Hook for Mobile Messaging
 * 
 * Provides WhatsApp/Instagram-level touch interactions for messaging:
 * - Long press for context menus
 * - Swipe to reply
 * - Haptic feedback
 * - Multi-touch support
 * 
 * SPIRITUAL MISSION: Make prayer conversations feel natural and delightful
 */

import { useRef, useCallback, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface TouchPosition {
  x: number;
  y: number;
}

interface SwipeGestureConfig {
  threshold: number;
  maxVerticalDeviation: number;
  minDuration: number;
  maxDuration: number;
}

interface LongPressConfig {
  duration: number;
  threshold: number;
  hapticFeedback: boolean;
}

interface GestureHandlers {
  onLongPress?: (position: TouchPosition) => void;
  onSwipeReply?: (direction: 'left' | 'right', distance: number) => void;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
  onTap?: (position: TouchPosition) => void;
  onDoubleTap?: (position: TouchPosition) => void;
}

interface TouchGestureState {
  isLongPress: boolean;
  isSwipe: boolean;
  swipeDirection: 'left' | 'right' | null;
  swipeDistance: number;
  startTime: number;
  startPosition: TouchPosition;
  currentPosition: TouchPosition;
  lastTapTime: number;
}

export function useMobileTouchGestures(
  handlers: GestureHandlers,
  config?: {
    swipe?: Partial<SwipeGestureConfig>;
    longPress?: Partial<LongPressConfig>;
  }
) {
  const gestureStateRef = useRef<TouchGestureState>({
    isLongPress: false,
    isSwipe: false,
    swipeDirection: null,
    swipeDistance: 0,
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    lastTapTime: 0,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const swipeIndicatorRef = useRef<HTMLElement>();

  // Configuration with sensible defaults
  const swipeConfig: SwipeGestureConfig = {
    threshold: 50, // Minimum distance for swipe
    maxVerticalDeviation: 30, // Maximum Y movement for horizontal swipe
    minDuration: 100, // Minimum time for swipe
    maxDuration: 800, // Maximum time for swipe
    ...config?.swipe,
  };

  const longPressConfig: LongPressConfig = {
    duration: 600, // WhatsApp-like timing
    threshold: 10, // Maximum movement before canceling
    hapticFeedback: true,
    ...config?.longPress,
  };

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!longPressConfig.hapticFeedback || !Capacitor.isNativePlatform()) return;
    
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }, [longPressConfig.hapticFeedback]);

  // Touch start handler
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    const currentTime = Date.now();
    
    gestureStateRef.current = {
      ...gestureStateRef.current,
      startTime: currentTime,
      startPosition: { x: touch.clientX, y: touch.clientY },
      currentPosition: { x: touch.clientX, y: touch.clientY },
      isLongPress: false,
      isSwipe: false,
      swipeDirection: null,
      swipeDistance: 0,
    };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      const distance = calculateDistance(
        gestureStateRef.current.startPosition,
        gestureStateRef.current.currentPosition
      );

      if (distance <= longPressConfig.threshold) {
        gestureStateRef.current.isLongPress = true;
        triggerHaptic(ImpactStyle.Heavy);
        handlers.onLongPress?.(gestureStateRef.current.startPosition);
      }
    }, longPressConfig.duration);

    // Prevent default to avoid context menu on long press
    event.preventDefault();
  }, [handlers, longPressConfig, triggerHaptic]);

  // Touch move handler
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!event.touches[0]) return;

    const touch = event.touches[0];
    const currentPosition = { x: touch.clientX, y: touch.clientY };
    
    gestureStateRef.current.currentPosition = currentPosition;

    const deltaX = currentPosition.x - gestureStateRef.current.startPosition.x;
    const deltaY = Math.abs(currentPosition.y - gestureStateRef.current.startPosition.y);
    const distance = Math.abs(deltaX);

    // Cancel long press if moved too much
    if (Math.abs(deltaX) > longPressConfig.threshold || deltaY > longPressConfig.threshold) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
    }

    // Handle swipe gesture (horizontal movement with minimal vertical)
    if (distance > swipeConfig.threshold && deltaY < swipeConfig.maxVerticalDeviation) {
      const direction = deltaX > 0 ? 'right' : 'left';
      
      if (!gestureStateRef.current.isSwipe) {
        gestureStateRef.current.isSwipe = true;
        gestureStateRef.current.swipeDirection = direction;
        triggerHaptic(ImpactStyle.Light);
      }

      gestureStateRef.current.swipeDistance = distance;
      handlers.onSwipeReply?.(direction, distance);
      
      // Visual feedback for swipe
      updateSwipeVisualFeedback(direction, distance);
      
      // Prevent scrolling during swipe
      event.preventDefault();
    }
  }, [handlers, longPressConfig, swipeConfig, triggerHaptic]);

  // Touch end handler
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const endTime = Date.now();
    const duration = endTime - gestureStateRef.current.startTime;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }

    // Handle swipe completion
    if (gestureStateRef.current.isSwipe && gestureStateRef.current.swipeDirection) {
      const { swipeDirection, swipeDistance } = gestureStateRef.current;
      
      // Complete swipe if distance threshold met
      if (swipeDistance > swipeConfig.threshold * 2) {
        triggerHaptic(ImpactStyle.Medium);
        handlers.onSwipeComplete?.(swipeDirection);
      }
      
      // Reset swipe visual feedback
      resetSwipeVisualFeedback();
    }
    
    // Handle tap gestures
    else if (!gestureStateRef.current.isLongPress && duration < 300) {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - gestureStateRef.current.lastTapTime;
      
      if (timeSinceLastTap < 300) {
        // Double tap
        handlers.onDoubleTap?.(gestureStateRef.current.startPosition);
        gestureStateRef.current.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        // Single tap (with delay to check for double tap)
        setTimeout(() => {
          if (Date.now() - currentTime > 250) {
            handlers.onTap?.(gestureStateRef.current.startPosition);
          }
        }, 250);
        gestureStateRef.current.lastTapTime = currentTime;
      }
    }

    // Reset gesture state
    gestureStateRef.current.isLongPress = false;
    gestureStateRef.current.isSwipe = false;
    gestureStateRef.current.swipeDirection = null;
    gestureStateRef.current.swipeDistance = 0;
  }, [handlers, swipeConfig, triggerHaptic]);

  // Visual feedback for swipe gesture
  const updateSwipeVisualFeedback = useCallback((direction: 'left' | 'right', distance: number) => {
    if (!swipeIndicatorRef.current) return;

    const progress = Math.min(distance / (swipeConfig.threshold * 2), 1);
    const translateX = direction === 'right' ? distance - 50 : distance + 50;
    
    swipeIndicatorRef.current.style.opacity = progress.toString();
    swipeIndicatorRef.current.style.transform = `translateX(${translateX}px) scale(${progress})`;
  }, [swipeConfig.threshold]);

  const resetSwipeVisualFeedback = useCallback(() => {
    if (!swipeIndicatorRef.current) return;
    
    swipeIndicatorRef.current.style.opacity = '0';
    swipeIndicatorRef.current.style.transform = 'translateX(0) scale(1)';
  }, []);

  // Bind events to element
  const bindGestures = useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Clear any pending timers
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bindGestures,
    swipeIndicatorRef,
    gestureState: gestureStateRef.current,
    resetGestures: () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      resetSwipeVisualFeedback();
    }
  };
}

// Helper function to calculate distance between two points
function calculateDistance(point1: TouchPosition, point2: TouchPosition): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Message Context Menu Component
export interface MessageContextAction {
  label: string;
  icon: string;
  action: () => void;
  destructive?: boolean;
}

export class MessageContextMenu {
  private element: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;

  constructor(private config: {
    message: any;
    position: TouchPosition;
    actions: MessageContextAction[];
  }) {}

  show(): void {
    if (this.element) return;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'fixed inset-0 bg-black/20 backdrop-blur-sm z-50';
    this.overlay.addEventListener('click', () => this.hide());

    // Create menu
    this.element = document.createElement('div');
    this.element.className = 'fixed z-50 bg-white/90 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-white/30';
    
    // Position menu
    const x = Math.min(this.config.position.x, window.innerWidth - 200);
    const y = Math.max(this.config.position.y - 200, 50);
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;

    // Add actions
    this.config.actions.forEach(action => {
      const button = document.createElement('button');
      button.className = `w-full flex items-center gap-3 p-3 hover:bg-white/20 rounded-xl transition-colors text-left ${
        action.destructive ? 'text-red-600' : 'text-gray-800'
      }`;
      button.innerHTML = `
        <span class="text-lg">${action.icon}</span>
        <span class="font-medium">${action.label}</span>
      `;
      button.addEventListener('click', () => {
        action.action();
        this.hide();
      });
      this.element!.appendChild(button);
    });

    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.element);

    // Animate in
    requestAnimationFrame(() => {
      this.overlay!.style.opacity = '1';
      this.element!.style.transform = 'scale(1)';
      this.element!.style.opacity = '1';
    });
  }

  hide(): void {
    if (!this.element) return;

    // Animate out
    this.overlay!.style.opacity = '0';
    this.element.style.transform = 'scale(0.9)';
    this.element.style.opacity = '0';

    setTimeout(() => {
      this.overlay?.remove();
      this.element?.remove();
      this.overlay = null;
      this.element = null;
    }, 200);
  }
}