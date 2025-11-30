/**
 * Mobile Living Map Specialist - AGENT 11 Implementation
 * 
 * Ensures real-time works perfectly on iOS/Android with native performance
 * for memorial line rendering and mobile-specific Living Map optimizations.
 * 
 * SPIRITUAL MISSION: Perfect mobile experience for prayer witnessing
 */

import type { Prayer, PrayerConnection } from '../types/prayer';

interface MobileCapabilities {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
  memoryLevel: 'low' | 'medium' | 'high';
  connectionSpeed: 'slow' | 'fast' | 'unknown';
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
}

interface MobileOptimizationConfig {
  maxPrayersVisible: number;
  maxConnectionsVisible: number;
  animationQuality: 'low' | 'medium' | 'high';
  useIntersectionObserver: boolean;
  enableVirtualization: boolean;
  reducedMotion: boolean;
  preloadStrategy: 'minimal' | 'balanced' | 'aggressive';
  cacheStrategy: 'memory' | 'local' | 'hybrid';
}

interface TouchInteractionConfig {
  tapRadius: number;
  longPressDuration: number;
  swipeThreshold: number;
  pinchSensitivity: number;
  enableHapticFeedback: boolean;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  connectionLatency: number;
  cacheHitRate: number;
}

/**
 * Mobile Living Map Optimizer
 */
export class MobileOptimizer {
  private capabilities: MobileCapabilities;
  private config: MobileOptimizationConfig;
  private touchConfig: TouchInteractionConfig;
  private performanceMonitor: PerformanceMonitor;
  private visibilityObserver?: IntersectionObserver;

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.config = this.generateOptimizationConfig();
    this.touchConfig = this.generateTouchConfig();
    this.performanceMonitor = new PerformanceMonitor();

    this.initializeMobileOptimizations();
  }

  /**
   * Detect mobile device capabilities
   */
  private detectCapabilities(): MobileCapabilities {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobi/.test(userAgent);

    // Detect WebGL support
    const canvas = document.createElement('canvas');
    const supportsWebGL = !!(
      canvas.getContext('webgl') || 
      canvas.getContext('experimental-webgl')
    );

    // Detect memory level
    const memoryLevel = this.detectMemoryLevel();

    // Detect connection speed
    const connectionSpeed = this.detectConnectionSpeed();

    // Detect screen size
    const screenSize = this.detectScreenSize();

    return {
      isIOS,
      isAndroid,
      isMobile,
      supportsWebGL,
      supportsServiceWorker: 'serviceWorker' in navigator,
      memoryLevel,
      connectionSpeed,
      screenSize,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }

  /**
   * Generate optimization configuration based on device capabilities
   */
  private generateOptimizationConfig(): MobileOptimizationConfig {
    const { memoryLevel, connectionSpeed, isMobile, isIOS, isAndroid } = this.capabilities;

    // Base configuration for mobile
    let config: MobileOptimizationConfig = {
      maxPrayersVisible: 200,
      maxConnectionsVisible: 100,
      animationQuality: 'medium',
      useIntersectionObserver: true,
      enableVirtualization: true,
      reducedMotion: false,
      preloadStrategy: 'balanced',
      cacheStrategy: 'hybrid'
    };

    // Adjust for memory constraints
    if (memoryLevel === 'low') {
      config.maxPrayersVisible = 100;
      config.maxConnectionsVisible = 50;
      config.animationQuality = 'low';
      config.preloadStrategy = 'minimal';
      config.reducedMotion = true;
    } else if (memoryLevel === 'high') {
      config.maxPrayersVisible = 400;
      config.maxConnectionsVisible = 200;
      config.animationQuality = 'high';
      config.preloadStrategy = 'aggressive';
    }

    // Adjust for connection speed
    if (connectionSpeed === 'slow') {
      config.maxPrayersVisible = Math.min(config.maxPrayersVisible, 150);
      config.maxConnectionsVisible = Math.min(config.maxConnectionsVisible, 75);
      config.preloadStrategy = 'minimal';
    }

    // Platform-specific optimizations
    if (isIOS) {
      // iOS performs better with certain optimizations
      config.animationQuality = 'high';
      config.cacheStrategy = 'memory'; // iOS has better memory management
    }

    if (isAndroid) {
      // Android needs more conservative settings
      config.useIntersectionObserver = true;
      config.enableVirtualization = true;
      config.cacheStrategy = 'local'; // Use localStorage more on Android
    }

    return config;
  }

  /**
   * Generate touch interaction configuration
   */
  private generateTouchConfig(): TouchInteractionConfig {
    const { isIOS, isAndroid, screenSize } = this.capabilities;

    return {
      tapRadius: screenSize === 'small' ? 44 : 48, // iOS guidelines: min 44pt
      longPressDuration: 500,
      swipeThreshold: 50,
      pinchSensitivity: 1.0,
      enableHapticFeedback: isIOS && 'vibrate' in navigator
    };
  }

  /**
   * Initialize mobile-specific optimizations
   */
  private initializeMobileOptimizations(): void {
    if (!this.capabilities.isMobile) return;

    console.log('📱 Initializing mobile optimizations:', {
      device: this.capabilities.isIOS ? 'iOS' : this.capabilities.isAndroid ? 'Android' : 'Mobile',
      memoryLevel: this.capabilities.memoryLevel,
      connectionSpeed: this.capabilities.connectionSpeed,
      config: this.config
    });

    // Set up viewport meta tag for mobile
    this.optimizeViewport();

    // Set up touch event optimizations
    this.optimizeTouchEvents();

    // Set up performance monitoring
    this.performanceMonitor.start();

    // Set up visibility observer for memory optimization
    if (this.config.useIntersectionObserver) {
      this.setupVisibilityObserver();
    }

    // Set up memory pressure monitoring (iOS)
    if (this.capabilities.isIOS) {
      this.setupMemoryPressureHandling();
    }

    // Set up orientation change handling
    this.setupOrientationHandling();
  }

  /**
   * Optimize prayers for mobile rendering
   */
  optimizePrayersForMobile(prayers: Prayer[]): Prayer[] {
    // Limit based on mobile configuration
    const limited = prayers.slice(0, this.config.maxPrayersVisible);

    // Sort by priority (recent first, nearby first if location available)
    return limited.sort((a, b) => {
      const timeDiff = b.created_at.getTime() - a.created_at.getTime();
      return timeDiff; // Recent first for now
    });
  }

  /**
   * Optimize connections for mobile rendering
   */
  optimizeConnectionsForMobile(connections: PrayerConnection[]): PrayerConnection[] {
    // Limit based on mobile configuration
    const limited = connections.slice(0, this.config.maxConnectionsVisible);

    // Prioritize recent connections for better spiritual impact
    return limited.sort((a, b) => 
      b.created_at.getTime() - a.created_at.getTime()
    );
  }

  /**
   * Get optimized marker touch area
   */
  getMarkerTouchArea(): { radius: number; padding: number } {
    return {
      radius: this.touchConfig.tapRadius / 2,
      padding: this.touchConfig.tapRadius / 4
    };
  }

  /**
   * Check if should use reduced motion
   */
  shouldUseReducedMotion(): boolean {
    // Check system preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return this.config.reducedMotion || prefersReducedMotion;
  }

  /**
   * Get animation configuration for mobile
   */
  getAnimationConfig(): {
    duration: number;
    easing: string;
    stiffness?: number;
    damping?: number;
  } {
    const reduced = this.shouldUseReducedMotion();
    const quality = this.config.animationQuality;

    if (reduced) {
      return {
        duration: 150,
        easing: 'linear'
      };
    }

    switch (quality) {
      case 'low':
        return {
          duration: 200,
          easing: 'ease-out'
        };
      case 'medium':
        return {
          duration: 300,
          easing: 'ease-out',
          stiffness: 100,
          damping: 20
        };
      case 'high':
        return {
          duration: 400,
          easing: 'ease-out',
          stiffness: 200,
          damping: 25
        };
    }
  }

  /**
   * Trigger haptic feedback if supported
   */
  triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.touchConfig.enableHapticFeedback) return;

    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Handle memory pressure warnings
   */
  handleMemoryPressure(): void {
    console.log('⚠️ Memory pressure detected - optimizing...');

    // Reduce visible items
    this.config.maxPrayersVisible = Math.max(50, this.config.maxPrayersVisible * 0.7);
    this.config.maxConnectionsVisible = Math.max(25, this.config.maxConnectionsVisible * 0.7);

    // Switch to reduced animations
    this.config.animationQuality = 'low';
    this.config.reducedMotion = true;

    // Clear caches if possible
    this.clearNonEssentialCaches();

    // Trigger garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Check if device supports specific features
   */
  supportsFeature(feature: 'webgl' | 'serviceworker' | 'intersection' | 'vibration'): boolean {
    switch (feature) {
      case 'webgl':
        return this.capabilities.supportsWebGL;
      case 'serviceworker':
        return this.capabilities.supportsServiceWorker;
      case 'intersection':
        return 'IntersectionObserver' in window;
      case 'vibration':
        return 'vibrate' in navigator;
      default:
        return false;
    }
  }

  /**
   * Private helper methods
   */
  private detectMemoryLevel(): 'low' | 'medium' | 'high' {
    // Use available memory hints
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const ratio = memory.usedJSHeapSize / memory.totalJSHeapSize;
      
      if (ratio > 0.8) return 'low';
      if (ratio < 0.3) return 'high';
      return 'medium';
    }

    // Fallback to device characteristics
    const ram = this.estimateDeviceRAM();
    if (ram <= 2) return 'low';
    if (ram >= 6) return 'high';
    return 'medium';
  }

  private estimateDeviceRAM(): number {
    // Very rough estimation based on user agent and performance
    const cores = navigator.hardwareConcurrency || 2;
    if (cores >= 8) return 8;
    if (cores >= 4) return 4;
    return 2;
  }

  private detectConnectionSpeed(): 'slow' | 'fast' | 'unknown' {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
      if (effectiveType === '4g') return 'fast';
    }
    
    return 'unknown';
  }

  private detectScreenSize(): 'small' | 'medium' | 'large' {
    const width = window.screen.width;
    const height = window.screen.height;
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 667) return 'small'; // iPhone SE size
    if (maxDimension <= 1024) return 'medium'; // iPad size
    return 'large';
  }

  private optimizeViewport(): void {
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }

  private optimizeTouchEvents(): void {
    // Prevent default touch behaviors that interfere with map interaction
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent zooming
      }
    }, { passive: false });

    // Optimize scroll behavior
    document.addEventListener('touchmove', (e) => {
      if (e.target === document.body) {
        e.preventDefault(); // Prevent body scroll
      }
    }, { passive: false });
  }

  private setupVisibilityObserver(): void {
    this.visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          element.style.visibility = 'visible';
        } else {
          element.style.visibility = 'hidden';
        }
      });
    }, {
      rootMargin: '50px' // Load items 50px before they're visible
    });
  }

  private setupMemoryPressureHandling(): void {
    // iOS Safari memory pressure handling
    window.addEventListener('pagehide', () => {
      this.handleMemoryPressure();
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was restored from back/forward cache
        console.log('📱 Page restored from cache');
      }
    });
  }

  private setupOrientationHandling(): void {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.capabilities.orientation = 
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        console.log('📱 Orientation changed to:', this.capabilities.orientation);
      }, 100);
    });
  }

  private clearNonEssentialCaches(): void {
    // Clear any non-essential cached data
    try {
      // Clear old cached prayers but keep recent ones
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('prayermap_') && !key.includes('essential')
      );
      
      keys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Failed to clear cache item:', key);
        }
      });
    } catch (error) {
      console.warn('Cache clearing failed:', error);
    }
  }
}

/**
 * Performance monitoring for mobile optimization
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    connectionLatency: 0,
    cacheHitRate: 0
  };

  private frameCount = 0;
  private lastFrameTime = 0;
  private monitoring = false;

  start(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
  }

  stop(): void {
    this.monitoring = false;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  private startFrameRateMonitoring(): void {
    const measureFrameRate = (timestamp: number) => {
      if (!this.monitoring) return;

      if (this.lastFrameTime) {
        this.frameCount++;
        const timeDelta = timestamp - this.lastFrameTime;
        
        if (this.frameCount % 60 === 0) {
          this.metrics.frameRate = Math.round(60000 / (timeDelta * 60));
        }
      }
      
      this.lastFrameTime = timestamp;
      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      if (!this.monitoring) return;

      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
      }
    }, 5000);
  }
}

// Global mobile optimizer instance
export const mobileOptimizer = new MobileOptimizer();

export default mobileOptimizer;