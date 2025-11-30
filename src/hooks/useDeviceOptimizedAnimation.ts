import { useMemo, useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export type DeviceCategory = 'low' | 'mid' | 'high';

export interface AnimationConfig {
  duration: number;
  fps: number;
  complexity: 'minimal' | 'standard' | 'enhanced';
  enableGPU: boolean;
  enableBlur: boolean;
  enableShadows: boolean;
  maxConcurrentAnimations: number;
}

export interface OptimizedAnimationProps {
  transition: {
    duration: number;
    ease: string;
    type: 'tween' | 'spring';
  };
  style: React.CSSProperties;
  shouldAnimate: boolean;
}

/**
 * Device-optimized animation hook for PrayerMap spiritual animations
 * 
 * Automatically adapts animation complexity based on:
 * - Device hardware capabilities
 * - Network connection quality  
 * - Battery status (if available)
 * - User preference for reduced motion
 * - Current system performance
 * 
 * Ensures beautiful 60fps prayer animations across all devices.
 */
export function useDeviceOptimizedAnimation(animationName: string = 'default') {
  const reducedMotion = useReducedMotion();
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>('mid');
  const [performanceScore, setPerformanceScore] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    detectDeviceCapabilities();
    monitorBatteryStatus();
  }, []);

  const detectDeviceCapabilities = async () => {
    let score = 0;
    
    // Memory scoring
    const memoryInfo = (navigator as any).deviceMemory;
    if (memoryInfo >= 8) score += 3;
    else if (memoryInfo >= 4) score += 2;
    else score += 1;
    
    // CPU cores scoring  
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;
    
    // Connection scoring
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g' || effectiveType === '5g') score += 2;
      else if (effectiveType === '3g') score += 1;
      
      // Downgrade for slow connections
      if (connection.downlink && connection.downlink < 1.5) score -= 1;
    }

    // GPU detection
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        
        // High-end GPU detection
        if (renderer.includes('NVIDIA') && renderer.includes('RTX')) score += 3;
        else if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel Iris')) score += 2;
        else score += 1;
        
        // WebGL capabilities
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (maxTextureSize >= 4096) score += 1;
      }
    } catch {
      // WebGL not available
    }

    // Performance timing check
    const performanceStart = performance.now();
    // Run a small performance test
    for (let i = 0; i < 10000; i++) {
      Math.random() * Math.random();
    }
    const performanceTime = performance.now() - performanceStart;
    if (performanceTime < 1) score += 2;
    else if (performanceTime < 3) score += 1;

    setPerformanceScore(score);
    
    // Categorize device
    if (score >= 12) setDeviceCategory('high');
    else if (score >= 7) setDeviceCategory('mid');
    else setDeviceCategory('low');

    console.log(`🔧 Device optimization: ${score >= 12 ? 'high' : score >= 7 ? 'mid' : 'low'} performance (score: ${score})`);
  };

  const monitorBatteryStatus = async () => {
    try {
      const battery = await (navigator as any).getBattery();
      setBatteryLevel(battery.level);
      
      battery.addEventListener('levelchange', () => {
        setBatteryLevel(battery.level);
      });
    } catch {
      // Battery API not supported
    }
  };

  const animationConfig: AnimationConfig = useMemo(() => {
    // Base configuration for each device category
    const configs = {
      low: {
        duration: 4000, // Shorter prayer animation
        fps: 45,
        complexity: 'minimal' as const,
        enableGPU: false,
        enableBlur: false,
        enableShadows: false,
        maxConcurrentAnimations: 2
      },
      mid: {
        duration: 6000, // Standard 6-second prayer
        fps: 55,
        complexity: 'standard' as const,
        enableGPU: true,
        enableBlur: true,
        enableShadows: true,
        maxConcurrentAnimations: 4
      },
      high: {
        duration: 6000, // Full 6-second spiritual experience
        fps: 60,
        complexity: 'enhanced' as const,
        enableGPU: true,
        enableBlur: true,
        enableShadows: true,
        maxConcurrentAnimations: 8
      }
    };

    let config = configs[deviceCategory];

    // Battery optimization
    if (batteryLevel !== null && batteryLevel < 0.2) {
      config = {
        ...config,
        duration: config.duration * 0.75, // 25% faster
        fps: Math.min(config.fps, 45),
        enableBlur: false,
        enableShadows: false,
        maxConcurrentAnimations: Math.min(config.maxConcurrentAnimations, 2)
      };
    }

    // Reduced motion override
    if (reducedMotion) {
      config = {
        ...config,
        duration: 0,
        complexity: 'minimal',
        enableGPU: false,
        enableBlur: false,
        enableShadows: false,
        maxConcurrentAnimations: 1
      };
    }

    return config;
  }, [deviceCategory, batteryLevel, reducedMotion]);

  /**
   * Get optimized animation props for motion components
   */
  const getAnimationProps = (customDuration?: number): OptimizedAnimationProps => {
    const duration = customDuration || animationConfig.duration;
    
    const baseStyle: React.CSSProperties = {};
    
    if (animationConfig.enableGPU) {
      baseStyle.willChange = 'transform, opacity';
      baseStyle.transform = 'translateZ(0)';
      baseStyle.backfaceVisibility = 'hidden';
    }

    return {
      transition: {
        duration: reducedMotion ? 0 : duration / 1000,
        ease: animationConfig.complexity === 'enhanced' ? 'easeInOut' : 'easeOut',
        type: 'tween'
      },
      style: baseStyle,
      shouldAnimate: !reducedMotion
    };
  };

  /**
   * Get prayer-specific animation configuration
   */
  const getPrayerAnimationConfig = () => ({
    // Camera movement timing
    cameraPhase1Duration: animationConfig.complexity === 'minimal' ? 500 : 1500,
    cameraPhase2Duration: animationConfig.complexity === 'minimal' ? 500 : 1000,
    cameraReturnDuration: animationConfig.complexity === 'minimal' ? 500 : 1500,
    
    // Line animation timing
    outboundLineDelay: animationConfig.complexity === 'minimal' ? 0 : 0,
    outboundLineDuration: animationConfig.duration * 0.4,
    returnLineDelay: animationConfig.duration * 0.6,
    returnLineDuration: animationConfig.duration * 0.3,
    
    // Memorial line timing
    memorialLineDelay: animationConfig.complexity === 'minimal' ? 0 : animationConfig.duration * 0.9,
    
    // Performance settings
    enableTravelingLights: animationConfig.complexity !== 'minimal',
    enablePulsingMarkers: animationConfig.complexity === 'enhanced',
    enableCameraAnimation: animationConfig.complexity !== 'minimal',
    
    // GPU optimizations
    useGPUAcceleration: animationConfig.enableGPU,
    useShadows: animationConfig.enableShadows,
    useBlurEffects: animationConfig.enableBlur
  });

  /**
   * Check if should skip expensive effects based on performance
   */
  const shouldSkipEffect = (effectType: 'shadow' | 'blur' | 'glow' | 'particle'): boolean => {
    switch (effectType) {
      case 'shadow':
        return !animationConfig.enableShadows;
      case 'blur':
        return !animationConfig.enableBlur;
      case 'glow':
        return animationConfig.complexity === 'minimal';
      case 'particle':
        return animationConfig.complexity !== 'enhanced';
      default:
        return false;
    }
  };

  /**
   * Get frame rate target for this device
   */
  const getTargetFPS = (): number => animationConfig.fps;

  /**
   * Check if we can run concurrent animations
   */
  const canRunConcurrentAnimation = (currentCount: number): boolean => {
    return currentCount < animationConfig.maxConcurrentAnimations;
  };

  return {
    deviceCategory,
    performanceScore,
    animationConfig,
    getAnimationProps,
    getPrayerAnimationConfig,
    shouldSkipEffect,
    getTargetFPS,
    canRunConcurrentAnimation,
    batteryLevel
  };
}

/**
 * Simplified hook for basic components
 */
export function useOptimizedMotion() {
  const { getAnimationProps } = useDeviceOptimizedAnimation();
  return getAnimationProps();
}