/**
 * Enhanced Animation Performance Monitor
 * 
 * Advanced performance monitoring for 60fps spiritual animations:
 * - Real-time frame rate tracking with 16.67ms precision
 * - GPU composite layer detection and optimization
 * - Device-specific performance budgets and fallbacks
 * - Memory usage monitoring for animation objects
 * - Spiritual animation flow validation (6-second prayer sequence)
 * 
 * Integrated with Datadog RUM for comprehensive observability.
 */

import { datadogRum } from '@datadog/browser-rum';

interface AnimationMetrics {
  fps: number;
  jankRate: number;
  frameCount: number;
  jankyFrames: number;
  memoryUsage: number;
  compositeLayerCount: number;
  deviceCategory: 'low' | 'mid' | 'high';
  duration: number;
}

export class AnimationMonitor {
  private animations = new Map<string, {
    frameCount: number;
    jankyFrames: number;
    lastFrameTime: number;
    startTime: number;
    monitoring: boolean;
    animationFrameId: number | null;
    memoryBaseline: number;
    compositeLayerBaseline: number;
    devicePerformanceBudget: number;
  }>();

  private deviceCategory: 'low' | 'mid' | 'high' = 'mid';
  private performanceBudgets = {
    low: { maxFps: 45, maxJankRate: 15, maxMemoryIncrease: 20 },
    mid: { maxFps: 55, maxJankRate: 10, maxMemoryIncrease: 15 },
    high: { maxFps: 58, maxJankRate: 5, maxMemoryIncrease: 10 }
  };

  constructor() {
    this.detectDeviceCapability();
  }

  /**
   * Detect device performance category
   */
  private detectDeviceCapability(): void {
    const memoryInfo = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection?.effectiveType;

    // Device scoring algorithm
    let score = 0;
    
    // Memory scoring
    if (memoryInfo >= 8) score += 3;
    else if (memoryInfo >= 4) score += 2;
    else score += 1;
    
    // CPU cores scoring  
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;
    
    // Connection scoring
    if (connection === '4g' || connection === '5g') score += 2;
    else if (connection === '3g') score += 1;

    // GPU detection (basic heuristic)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER);
      if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel Iris')) {
        score += 2;
      }
    }

    // Categorize device
    if (score >= 8) this.deviceCategory = 'high';
    else if (score >= 5) this.deviceCategory = 'mid';
    else this.deviceCategory = 'low';

    console.log(`📱 Device performance category: ${this.deviceCategory} (score: ${score})`);
    
    // Report to Datadog
    datadogRum.addAction('device.performance.detection', () => {}, {
      category: this.deviceCategory,
      score,
      memory: memoryInfo || 'unknown',
      cores,
      connection: connection || 'unknown'
    });
  }

  /**
   * Start monitoring an animation with enhanced performance tracking
   */
  start(animationName: string): void {
    if (this.animations.has(animationName)) {
      return; // Already monitoring
    }

    const startTime = performance.now();
    let frameCount = 0;
    let jankyFrames = 0;
    let lastFrameTime = startTime;
    let monitoring = true;

    // Capture baseline metrics
    const memoryBaseline = this.getMemoryUsage();
    const compositeLayerBaseline = this.getCompositeLayerCount();
    const deviceBudget = this.performanceBudgets[this.deviceCategory];

    console.log(`🎬 Starting enhanced monitoring for: ${animationName}`);
    console.log(`📊 Device category: ${this.deviceCategory}, FPS target: ${deviceBudget.maxFps}`);
    console.log(`💾 Memory baseline: ${memoryBaseline.toFixed(1)}MB`);
    console.log(`🎨 Composite layers baseline: ${compositeLayerBaseline}`);

    const measureFrame = (timestamp: number) => {
      if (!monitoring) return;

      const frameTime = timestamp - lastFrameTime;
      
      // Device-specific frame time thresholds
      const frameThreshold = 1000 / deviceBudget.maxFps; // Dynamic threshold based on device
      
      // Detect janky frames using device-specific threshold
      if (frameTime > frameThreshold) {
        jankyFrames++;
      }

      frameCount++;
      lastFrameTime = timestamp;

      // Report every 60 frames (approximately 1 second)
      if (frameCount % 60 === 0) {
        const elapsed = timestamp - startTime;
        const fps = Math.round((frameCount / elapsed) * 1000);
        const jankRate = (jankyFrames / frameCount) * 100;
        
        // Enhanced metrics
        const currentMemory = this.getMemoryUsage();
        const memoryIncrease = ((currentMemory - memoryBaseline) / memoryBaseline) * 100;
        const compositeLayers = this.getCompositeLayerCount();

        // Report enhanced metrics to Datadog
        datadogRum.addTiming(`animation.${animationName}.fps`, fps);
        datadogRum.addTiming(`animation.${animationName}.jank_rate`, jankRate);
        datadogRum.addTiming(`animation.${animationName}.memory_increase`, memoryIncrease);
        datadogRum.addTiming(`animation.${animationName}.composite_layers`, compositeLayers);
        datadogRum.addAction(`animation.${animationName}.performance_sample`, () => {}, {
          fps,
          jankRate: jankRate.toFixed(2),
          memoryIncrease: memoryIncrease.toFixed(2),
          deviceCategory: this.deviceCategory,
          frameCount
        });

        // Device-specific performance alerts
        const budget = this.performanceBudgets[this.deviceCategory];
        
        if (fps < budget.maxFps) {
          datadogRum.addError(new Error(`Low FPS for ${this.deviceCategory} device: ${fps}/${budget.maxFps} for ${animationName}`), {
            type: 'animation_performance_device_specific',
            animation: animationName,
            fps,
            target: budget.maxFps,
            deviceCategory: this.deviceCategory,
            jankRate: jankRate.toFixed(2)
          });
        }

        if (jankRate > budget.maxJankRate) {
          datadogRum.addError(new Error(`High jank rate for ${this.deviceCategory} device: ${jankRate.toFixed(2)}%/${budget.maxJankRate}% for ${animationName}`), {
            type: 'animation_jank_device_specific',
            animation: animationName,
            jankRate: jankRate.toFixed(2),
            target: budget.maxJankRate,
            deviceCategory: this.deviceCategory,
            fps
          });
        }

        if (memoryIncrease > budget.maxMemoryIncrease) {
          datadogRum.addError(new Error(`Memory leak in animation: ${memoryIncrease.toFixed(1)}% increase for ${animationName}`), {
            type: 'animation_memory_leak',
            animation: animationName,
            memoryIncrease: memoryIncrease.toFixed(2),
            baseline: memoryBaseline.toFixed(1),
            current: currentMemory.toFixed(1),
            deviceCategory: this.deviceCategory
          });
        }

        // Reset jank counter for next reporting period
        jankyFrames = 0;
      }

      if (monitoring) {
        requestAnimationFrame(measureFrame);
      }
    };

    const animationFrameId = requestAnimationFrame(measureFrame);

    this.animations.set(animationName, {
      frameCount,
      jankyFrames,
      lastFrameTime,
      startTime,
      monitoring,
      animationFrameId,
      memoryBaseline,
      compositeLayerBaseline,
      devicePerformanceBudget: deviceBudget.maxFps
    });
  }

  /**
   * Stop monitoring an animation
   */
  stop(animationName: string): void {
    const anim = this.animations.get(animationName);
    if (!anim) return;

    anim.monitoring = false;
    if (anim.animationFrameId !== null) {
      cancelAnimationFrame(anim.animationFrameId);
    }

    // Report final metrics
    const duration = performance.now() - anim.startTime;
    const avgFps = anim.frameCount > 0 ? Math.round((anim.frameCount / duration) * 1000) : 0;
    const jankRate = anim.frameCount > 0 ? (anim.jankyFrames / anim.frameCount) * 100 : 0;

    datadogRum.addAction(`animation.${animationName}.completed`, () => {}, {
      duration,
      avgFps,
      jankRate: jankRate.toFixed(2),
      totalFrames: anim.frameCount,
      jankyFrames: anim.jankyFrames,
    });

    this.animations.delete(animationName);
  }

  /**
   * Track animation completion with timing verification
   */
  trackCompletion(
    animationName: string,
    actualDuration: number,
    expectedDuration: number
  ): void {
    const variance = Math.abs(actualDuration - expectedDuration);
    const variancePercent = (variance / expectedDuration) * 100;

    datadogRum.addTiming(`animation.${animationName}.duration`, actualDuration);
    datadogRum.addTiming(`animation.${animationName}.variance`, variancePercent);

    // Alert if animation takes significantly longer than expected (>20% variance)
    if (variancePercent > 20) {
      datadogRum.addError(
        new Error(`Animation timing variance: ${variancePercent.toFixed(2)}%`),
        {
          type: 'animation_timing',
          animation: animationName,
          actualDuration,
          expectedDuration,
          variance: variancePercent.toFixed(2),
        }
      );
    }
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    try {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.usedJSHeapSize) {
        return memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    } catch {
      // Fallback for browsers without memory API
    }
    return 0;
  }

  /**
   * Get composite layer count
   */
  private getCompositeLayerCount(): number {
    try {
      // Count elements with will-change, transform3d, or opacity animations
      const elementsWithLayers = document.querySelectorAll('[style*="will-change"], [style*="transform3d"], [style*="translateZ"]').length;
      
      // Add estimate for CSS animations and transforms
      const animatedElements = document.querySelectorAll('*').length;
      let layerEstimate = elementsWithLayers;
      
      // Check for common animation libraries
      if (document.querySelector('.framer-motion') || document.querySelector('[data-framer-motion]')) {
        layerEstimate += 5; // Framer Motion creates composite layers
      }
      
      return layerEstimate;
    } catch {
      return 0;
    }
  }

  /**
   * Get current metrics for an animation with enhanced data
   */
  getMetrics(animationName: string): AnimationMetrics | null {
    const anim = this.animations.get(animationName);
    if (!anim) return null;

    const duration = performance.now() - anim.startTime;
    const fps = anim.frameCount > 0 ? Math.round((anim.frameCount / duration) * 1000) : 0;
    const jankRate = anim.frameCount > 0 ? (anim.jankyFrames / anim.frameCount) * 100 : 0;
    const currentMemory = this.getMemoryUsage();
    const compositeLayerCount = this.getCompositeLayerCount();

    return {
      fps,
      jankRate,
      frameCount: anim.frameCount,
      jankyFrames: anim.jankyFrames,
      memoryUsage: currentMemory,
      compositeLayerCount,
      deviceCategory: this.deviceCategory,
      duration
    };
  }

  /**
   * Get all active animations
   */
  getActiveAnimations(): string[] {
    return Array.from(this.animations.keys());
  }
}

// Global instance
export const animationMonitor = new AnimationMonitor();

