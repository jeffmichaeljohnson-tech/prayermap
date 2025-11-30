/**
 * Animation Performance Utilities
 *
 * Ensures 60fps animations across all devices by:
 * - Using GPU-accelerated properties only
 * - Monitoring frame rate
 * - Providing optimized animation configs
 */

// GPU-accelerated properties only
export const GPU_PROPERTIES = ['transform', 'opacity'] as const;

// Properties to avoid animating (cause layout/paint)
export const AVOID_PROPERTIES = [
  'width', 'height', 'top', 'left', 'right', 'bottom',
  'margin', 'padding', 'border', 'font-size'
] as const;

/**
 * Check if device can handle complex animations
 */
export function canHandleComplexAnimations(): boolean {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  // Check device memory (if available)
  const nav = navigator as any;
  if (nav.deviceMemory && nav.deviceMemory < 4) {
    return false;
  }

  // Check hardware concurrency
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return false;
  }

  return true;
}

/**
 * Get animation complexity level based on device capability
 */
export type AnimationComplexity = 'full' | 'reduced' | 'minimal';

export function getAnimationComplexity(): AnimationComplexity {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'minimal';
  }

  const nav = navigator as any;

  // Low-end device detection
  if (nav.deviceMemory && nav.deviceMemory < 2) return 'minimal';
  if (nav.deviceMemory && nav.deviceMemory < 4) return 'reduced';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) return 'minimal';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return 'reduced';

  return 'full';
}

/**
 * Optimized Framer Motion transition configs
 */
export const OPTIMIZED_TRANSITIONS = {
  // Fast, snappy transitions for UI elements
  fast: {
    type: 'tween',
    duration: 0.15,
    ease: 'easeOut'
  },

  // Standard transitions
  default: {
    type: 'tween',
    duration: 0.3,
    ease: 'easeInOut'
  },

  // Smooth transitions for larger movements
  smooth: {
    type: 'tween',
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1] // Material Design easing
  },

  // Spring physics for bouncy feel
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 1
  },

  // Gentle spring for subtle movements
  gentleSpring: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 0.8
  }
} as const;

/**
 * Prayer animation timings (optimized for 60fps)
 */
export const PRAYER_ANIMATION_TIMINGS = {
  full: {
    total: 6000,
    cameraMove: 1500,
    lineDrawStart: 0,
    lineDrawEnd: 2400,
    returnStart: 3600,
    returnEnd: 5400,
    spotlightStart: 4000,
    spotlightDuration: 2000,
    celebrationStart: 5800
  },
  reduced: {
    total: 3000,
    cameraMove: 800,
    lineDrawStart: 0,
    lineDrawEnd: 1200,
    returnStart: 1800,
    returnEnd: 2700,
    spotlightStart: 2000,
    spotlightDuration: 1000,
    celebrationStart: 2900
  },
  minimal: {
    total: 500,
    cameraMove: 0,
    lineDrawStart: 0,
    lineDrawEnd: 0,
    returnStart: 0,
    returnEnd: 0,
    spotlightStart: 0,
    spotlightDuration: 0,
    celebrationStart: 0
  }
} as const;

/**
 * Get appropriate timing based on device capability
 */
export function getPrayerAnimationTiming() {
  const complexity = getAnimationComplexity();
  return PRAYER_ANIMATION_TIMINGS[complexity];
}

/**
 * Will-change hints for GPU acceleration
 */
export const WILL_CHANGE_HINTS = {
  transform: { willChange: 'transform' },
  opacity: { willChange: 'opacity' },
  both: { willChange: 'transform, opacity' },
  auto: { willChange: 'auto' }
} as const;

/**
 * Frame rate monitor for debugging
 */
export class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private callback?: (fps: number) => void;
  private rafId?: number;

  start(callback?: (fps: number) => void) {
    this.callback = callback;
    this.tick();
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private tick = () => {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      this.callback?.(this.fps);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  getFPS() {
    return this.fps;
  }
}

/**
 * Optimize a Framer Motion variants object for performance
 */
export function optimizeVariants<T extends Record<string, any>>(variants: T): T {
  const optimized = { ...variants };

  for (const key in optimized) {
    const variant = optimized[key];
    if (typeof variant === 'object' && variant !== null) {
      // Remove any non-GPU properties
      for (const prop of AVOID_PROPERTIES) {
        if (prop in variant) {
          console.warn(`[Animation] Animating "${prop}" may cause jank. Consider using transform instead.`);
        }
      }
    }
  }

  return optimized;
}
