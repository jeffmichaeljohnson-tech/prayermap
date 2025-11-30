/**
 * Mobile Performance Optimization Hook
 * 
 * Provides WhatsApp-level performance optimizations for mobile messaging:
 * - Virtual scrolling for large message lists
 * - Memory management and cleanup
 * - Frame rate monitoring
 * - Battery-efficient rendering
 * 
 * SPIRITUAL MISSION: Smooth prayer conversations that never lag
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { mobileOptimizer } from '../services/mobileOptimizer';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'other';
  contentType: 'text' | 'audio' | 'video' | 'image';
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  height?: number; // Cached height for virtualization
}

interface VirtualScrollConfig {
  itemHeight: number; // Estimated item height
  overscan: number; // Items to render outside viewport
  bufferSize: number; // Items to keep in memory
  enableDynamicHeight: boolean;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  visibleItems: number;
  totalItems: number;
}

export function useMobileVirtualScroll(
  messages: Message[],
  containerHeight: number,
  config?: Partial<VirtualScrollConfig>
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [renderedRange, setRenderedRange] = useState({ start: 0, end: 0 });
  const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<ResizeObserver>();

  const virtualConfig: VirtualScrollConfig = {
    itemHeight: 80, // Default message height
    overscan: 5,
    bufferSize: 100,
    enableDynamicHeight: true,
    ...config
  };

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback((scrollTop: number, containerHeight: number) => {
    if (!messages.length) return { start: 0, end: 0 };

    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = 0;

    // Find start index
    for (let i = 0; i < messages.length; i++) {
      const itemHeight = itemHeights.get(messages[i].id) || virtualConfig.itemHeight;
      if (accumulatedHeight + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - virtualConfig.overscan);
        break;
      }
      accumulatedHeight += itemHeight;
    }

    // Find end index
    let visibleHeight = 0;
    for (let i = startIndex; i < messages.length; i++) {
      const itemHeight = itemHeights.get(messages[i].id) || virtualConfig.itemHeight;
      visibleHeight += itemHeight;
      
      if (visibleHeight > containerHeight + scrollTop - accumulatedHeight) {
        endIndex = Math.min(messages.length - 1, i + virtualConfig.overscan);
        break;
      }
    }

    return { start: startIndex, end: endIndex };
  }, [messages, itemHeights, virtualConfig]);

  // Update visible range when scroll position changes
  useEffect(() => {
    const range = calculateVisibleRange(scrollTop, containerHeight);
    setRenderedRange(range);
  }, [scrollTop, containerHeight, calculateVisibleRange]);

  // Set up ResizeObserver for dynamic heights
  useEffect(() => {
    if (!virtualConfig.enableDynamicHeight) return;

    observerRef.current = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const messageId = entry.target.getAttribute('data-message-id');
        if (messageId) {
          setItemHeights(prev => new Map(prev.set(messageId, entry.contentRect.height)));
        }
      });
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [virtualConfig.enableDynamicHeight]);

  // Calculate total height for scrollbar
  const totalHeight = useMemo(() => {
    return messages.reduce((height, message) => {
      return height + (itemHeights.get(message.id) || virtualConfig.itemHeight);
    }, 0);
  }, [messages, itemHeights, virtualConfig.itemHeight]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < renderedRange.start; i++) {
      offset += itemHeights.get(messages[i]?.id) || virtualConfig.itemHeight;
    }
    return offset;
  }, [renderedRange.start, messages, itemHeights, virtualConfig.itemHeight]);

  // Get visible messages
  const visibleMessages = useMemo(() => {
    return messages.slice(renderedRange.start, renderedRange.end + 1);
  }, [messages, renderedRange]);

  // Scroll event handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  // Register item for height measurement
  const registerItem = useCallback((messageId: string, element: HTMLElement | null) => {
    if (!element) {
      itemRefs.current.delete(messageId);
      observerRef.current?.unobserve(element!);
      return;
    }

    itemRefs.current.set(messageId, element);
    element.setAttribute('data-message-id', messageId);
    
    if (virtualConfig.enableDynamicHeight && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, [virtualConfig.enableDynamicHeight]);

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string, behavior: 'smooth' | 'instant' = 'smooth') => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    let offsetTop = 0;
    for (let i = 0; i < messageIndex; i++) {
      offsetTop += itemHeights.get(messages[i].id) || virtualConfig.itemHeight;
    }

    const container = itemRefs.current.get(messageId)?.closest('.message-container') as HTMLElement;
    if (container) {
      container.scrollTo({
        top: offsetTop,
        behavior
      });
    }
  }, [messages, itemHeights, virtualConfig.itemHeight]);

  // Scroll to bottom (latest message)
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    const container = document.querySelector('.message-container') as HTMLElement;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    }
  }, []);

  return {
    visibleMessages,
    totalHeight,
    offsetY,
    handleScroll,
    registerItem,
    scrollToMessage,
    scrollToBottom,
    renderedRange,
    performance: {
      visibleItems: visibleMessages.length,
      totalItems: messages.length
    }
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    visibleItems: 0,
    totalItems: 0
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const renderStartTimeRef = useRef(0);

  // Start render time measurement
  const startRenderMeasurement = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  // End render time measurement
  const endRenderMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  }, []);

  // Frame rate monitoring
  useEffect(() => {
    let animationFrameId: number;
    
    const measureFrameRate = (timestamp: number) => {
      if (lastFrameTimeRef.current) {
        frameCountRef.current++;
        
        // Update frame rate every 60 frames
        if (frameCountRef.current % 60 === 0) {
          const deltaTime = timestamp - lastFrameTimeRef.current;
          const fps = Math.round(60000 / deltaTime);
          setMetrics(prev => ({ ...prev, frameRate: fps }));
        }
      }
      
      lastFrameTimeRef.current = timestamp;
      animationFrameId = requestAnimationFrame(measureFrameRate);
    };

    animationFrameId = requestAnimationFrame(measureFrameRate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Memory usage monitoring
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    const interval = setInterval(measureMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    startRenderMeasurement,
    endRenderMeasurement
  };
}

// Message caching hook for better performance
export function useMessageCache(maxCacheSize = 500) {
  const cacheRef = useRef<Map<string, Message>>(new Map());
  const accessOrderRef = useRef<string[]>([]);

  const addToCache = useCallback((message: Message) => {
    // Remove if at capacity
    if (cacheRef.current.size >= maxCacheSize) {
      const oldestKey = accessOrderRef.current.shift();
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }

    cacheRef.current.set(message.id, message);
    
    // Update access order
    const existingIndex = accessOrderRef.current.indexOf(message.id);
    if (existingIndex > -1) {
      accessOrderRef.current.splice(existingIndex, 1);
    }
    accessOrderRef.current.push(message.id);
  }, [maxCacheSize]);

  const getFromCache = useCallback((messageId: string): Message | undefined => {
    const message = cacheRef.current.get(messageId);
    
    if (message) {
      // Update access order
      const index = accessOrderRef.current.indexOf(messageId);
      if (index > -1) {
        accessOrderRef.current.splice(index, 1);
        accessOrderRef.current.push(messageId);
      }
    }
    
    return message;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current = [];
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize: maxCacheSize,
      hitRate: 0 // Would need tracking to calculate
    };
  }, [maxCacheSize]);

  return {
    addToCache,
    getFromCache,
    clearCache,
    getCacheStats
  };
}

// Memory management hook
export function useMemoryManagement() {
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  const addCleanupFunction = useCallback((cleanup: () => void) => {
    cleanupFunctionsRef.current.push(cleanup);
  }, []);

  const runCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupFunctionsRef.current = [];
  }, []);

  // Auto cleanup on memory pressure
  useEffect(() => {
    const handleMemoryPressure = () => {
      console.log('🧹 Running memory cleanup due to pressure...');
      runCleanup();
      
      // Suggest garbage collection
      if (window.gc) {
        window.gc();
      }
    };

    // Listen for memory pressure events
    window.addEventListener('pagehide', handleMemoryPressure);
    
    // iOS memory warning simulation
    if (mobileOptimizer.supportsFeature('intersection')) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            // Element went out of view - opportunity for cleanup
            const element = entry.target as HTMLElement;
            if (element.dataset.cleanupOnHide) {
              handleMemoryPressure();
            }
          }
        });
      });

      // Observe elements that should trigger cleanup when hidden
      document.querySelectorAll('[data-cleanup-on-hide]').forEach(el => {
        observer.observe(el);
      });

      addCleanupFunction(() => observer.disconnect());
    }

    return () => {
      window.removeEventListener('pagehide', handleMemoryPressure);
      runCleanup();
    };
  }, [runCleanup, addCleanupFunction]);

  // Low memory handler
  const handleLowMemory = useCallback(() => {
    // Clear non-essential caches
    localStorage.removeItem('prayermap_message_cache');
    localStorage.removeItem('prayermap_media_cache');
    
    // Reduce quality settings
    mobileOptimizer.handleMemoryPressure();
    
    // Run all cleanup functions
    runCleanup();
  }, [runCleanup]);

  return {
    addCleanupFunction,
    runCleanup,
    handleLowMemory
  };
}

// Battery optimization hook
export function useBatteryOptimization() {
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number;
    charging: boolean;
    optimizationsEnabled: boolean;
  }>({
    level: 1,
    charging: false,
    optimizationsEnabled: false
  });

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          const level = battery.level;
          const charging = battery.charging;
          const lowBattery = level < 0.2;
          
          setBatteryInfo({
            level,
            charging,
            optimizationsEnabled: lowBattery && !charging
          });

          // Enable aggressive optimizations when battery is low
          if (lowBattery && !charging) {
            mobileOptimizer.handleMemoryPressure();
          }
        };

        updateBatteryInfo();
        
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
      });
    }
  }, []);

  const getOptimizedUpdateInterval = useCallback(() => {
    if (batteryInfo.optimizationsEnabled) {
      return 5000; // 5 seconds when battery saving
    }
    return 1000; // 1 second normal
  }, [batteryInfo.optimizationsEnabled]);

  const shouldReduceAnimations = useCallback(() => {
    return batteryInfo.optimizationsEnabled;
  }, [batteryInfo.optimizationsEnabled]);

  return {
    batteryInfo,
    getOptimizedUpdateInterval,
    shouldReduceAnimations
  };
}