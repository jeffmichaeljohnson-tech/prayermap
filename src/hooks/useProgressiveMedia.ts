/**
 * Progressive Media Loading Hook
 * 
 * Provides Instagram/WhatsApp-level media loading with:
 * - Progressive image enhancement (blur to sharp)
 * - Intelligent caching strategies
 * - Bandwidth-aware loading
 * - Offline support
 * 
 * SPIRITUAL MISSION: Share prayer moments without waiting
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { mobileOptimizer } from '../services/mobileOptimizer';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio';
  size?: number;
  width?: number;
  height?: number;
}

interface ProgressiveImageState {
  isLoading: boolean;
  hasError: boolean;
  currentSrc: string;
  isHighRes: boolean;
  loadProgress: number;
}

interface CacheStrategy {
  immediate: boolean;
  preload: boolean;
  priority: 'low' | 'medium' | 'high';
  maxAge: number; // milliseconds
}

interface MediaCacheEntry {
  blob: Blob;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

// Global media cache
const mediaCache = new Map<string, MediaCacheEntry>();
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_ITEMS = 200;

export function useProgressiveImage(
  src: string,
  thumbnailSrc?: string,
  options: Partial<CacheStrategy> = {}
) {
  const [state, setState] = useState<ProgressiveImageState>({
    isLoading: true,
    hasError: false,
    currentSrc: thumbnailSrc || src,
    isHighRes: !thumbnailSrc,
    loadProgress: 0
  });

  const imgRef = useRef<HTMLImageElement>();
  const abortControllerRef = useRef<AbortController>();

  const strategy: CacheStrategy = {
    immediate: true,
    preload: false,
    priority: 'medium',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    ...options
  };

  const loadImage = useCallback(async (imageSrc: string, isHighRes: boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Check cache first
      const cachedEntry = mediaCache.get(imageSrc);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < strategy.maxAge) {
        const objectUrl = URL.createObjectURL(cachedEntry.blob);
        setState(prev => ({
          ...prev,
          currentSrc: objectUrl,
          isHighRes,
          isLoading: false,
          loadProgress: 100
        }));
        
        // Update access info
        cachedEntry.accessCount++;
        cachedEntry.lastAccessed = Date.now();
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, loadProgress: 0 }));

      // Load image with progress tracking
      const response = await fetch(imageSrc, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        if (total > 0) {
          const progress = (loaded / total) * 100;
          setState(prev => ({ ...prev, loadProgress: progress }));
        }
      }

      // Create blob from chunks
      const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'image/jpeg' });
      const objectUrl = URL.createObjectURL(blob);

      // Cache the blob
      await cacheMedia(imageSrc, blob);

      setState(prev => ({
        ...prev,
        currentSrc: objectUrl,
        isHighRes,
        isLoading: false,
        hasError: false,
        loadProgress: 100
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true
      }));
    }
  }, [strategy.maxAge]);

  // Load images in sequence (thumbnail first, then high-res)
  useEffect(() => {
    if (!src) return;

    const loadSequence = async () => {
      // Load thumbnail first if available
      if (thumbnailSrc && thumbnailSrc !== src) {
        await loadImage(thumbnailSrc, false);
        
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Then load high-res version
      await loadImage(src, true);
    };

    if (strategy.immediate) {
      loadSequence();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [src, thumbnailSrc, loadImage, strategy.immediate]);

  const retryLoad = useCallback(() => {
    setState(prev => ({ ...prev, hasError: false }));
    loadImage(src, true);
  }, [src, loadImage]);

  return {
    ...state,
    retryLoad,
    imgRef: (el: HTMLImageElement | null) => {
      imgRef.current = el || undefined;
    }
  };
}

// Media caching utilities
async function cacheMedia(url: string, blob: Blob): Promise<void> {
  try {
    // Check cache size limits
    await enforceChacheLimits();

    mediaCache.set(url, {
      blob,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });

  } catch (error) {
    console.warn('Failed to cache media:', error);
  }
}

async function enforceChacheLimits(): Promise<void> {
  const entries = Array.from(mediaCache.entries());
  
  // Remove old items if over limits
  if (entries.length >= MAX_CACHE_ITEMS) {
    // Sort by last accessed (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 25%
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      mediaCache.delete(entries[i][0]);
      URL.revokeObjectURL(entries[i][1].blob as any);
    }
  }

  // Check size limit (approximate)
  const totalSize = entries.reduce((size, [, entry]) => size + entry.blob.size, 0);
  if (totalSize > MAX_CACHE_SIZE) {
    // Remove items until under limit
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    let currentSize = totalSize;
    for (const [url, entry] of entries) {
      if (currentSize <= MAX_CACHE_SIZE * 0.8) break;
      
      mediaCache.delete(url);
      URL.revokeObjectURL(entry.blob as any);
      currentSize -= entry.blob.size;
    }
  }
}

// Video loading hook with quality adaptation
export function useAdaptiveVideo(
  src: string,
  poster?: string,
  qualities: { label: string; url: string }[] = []
) {
  const [currentQuality, setCurrentQuality] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [canPlay, setCanPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-select quality based on connection and device
  useEffect(() => {
    const selectOptimalQuality = () => {
      const connection = (navigator as any).connection;
      const isMobile = mobileOptimizer.capabilities?.isMobile;
      
      if (!qualities.length) return;

      let selectedIndex = 0; // Default to lowest quality

      if (connection) {
        switch (connection.effectiveType) {
          case '4g':
            selectedIndex = qualities.length - 1; // Highest quality
            break;
          case '3g':
            selectedIndex = Math.floor(qualities.length / 2); // Medium quality
            break;
          case '2g':
          case 'slow-2g':
            selectedIndex = 0; // Lowest quality
            break;
        }
      }

      // Reduce quality on mobile to save battery/data
      if (isMobile && selectedIndex > 0) {
        selectedIndex = Math.max(0, selectedIndex - 1);
      }

      setCurrentQuality(selectedIndex);
    };

    selectOptimalQuality();
  }, [qualities]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setCanPlay(false);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setCanPlay(true);
  }, []);

  const changeQuality = useCallback((qualityIndex: number) => {
    if (!videoRef.current || qualityIndex === currentQuality) return;
    
    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    
    setCurrentQuality(qualityIndex);
    
    // Restore playback state after quality change
    const handleNewVideoLoad = () => {
      if (!videoRef.current) return;
      
      videoRef.current.currentTime = currentTime;
      if (wasPlaying) {
        videoRef.current.play();
      }
    };

    videoRef.current.addEventListener('canplay', handleNewVideoLoad, { once: true });
  }, [currentQuality]);

  const currentSrc = qualities[currentQuality]?.url || src;

  return {
    currentSrc,
    currentQuality,
    availableQualities: qualities,
    isLoading,
    canPlay,
    changeQuality,
    videoRef,
    onLoadStart: handleLoadStart,
    onCanPlay: handleCanPlay
  };
}

// Audio loading with waveform visualization
export function useAudioWithWaveform(src: string, visualize = true) {
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();

  // Generate waveform data
  useEffect(() => {
    if (!visualize || !src) return;

    const generateWaveform = async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioData = await audioContext.decodeAudioData(arrayBuffer);
        
        // Downsample to ~100 data points for visualization
        const samples = 100;
        const blockSize = Math.floor(audioData.length / samples);
        const waveform: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let sum = 0;
          
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(audioData.getChannelData(0)[start + j] || 0);
          }
          
          waveform.push(sum / blockSize);
        }
        
        setWaveformData(waveform);
      } catch (error) {
        console.warn('Failed to generate waveform:', error);
      }
    };

    generateWaveform();
  }, [src, visualize]);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return {
    isLoading,
    duration,
    currentTime,
    isPlaying,
    waveformData,
    progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    togglePlay,
    seekTo,
    audioRef,
    handlers: {
      onLoadedMetadata: handleLoadedMetadata,
      onTimeUpdate: handleTimeUpdate,
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded
    }
  };
}

// Intelligent preloading hook
export function useMediaPreloader() {
  const preloadQueueRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver>();

  const preloadMedia = useCallback(async (url: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (preloadQueueRef.current.has(url)) return;
    
    preloadQueueRef.current.add(url);

    try {
      // Use different strategies based on priority
      if (priority === 'high') {
        // Immediate fetch
        const response = await fetch(url);
        const blob = await response.blob();
        await cacheMedia(url, blob);
      } else {
        // Lazy preload when browser is idle
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            fetch(url).then(response => response.blob()).then(blob => cacheMedia(url, blob));
          });
        }
      }
    } catch (error) {
      console.debug('Preload failed for:', url, error);
    } finally {
      preloadQueueRef.current.delete(url);
    }
  }, []);

  // Set up intersection observer for viewport-based preloading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const url = entry.target.getAttribute('data-preload-src');
            if (url) {
              preloadMedia(url, 'medium');
            }
          }
        });
      },
      {
        rootMargin: '200px' // Start preloading 200px before element enters viewport
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [preloadMedia]);

  const observeForPreload = useCallback((element: HTMLElement, src: string) => {
    if (!observerRef.current) return;
    
    element.setAttribute('data-preload-src', src);
    observerRef.current.observe(element);
    
    return () => {
      observerRef.current?.unobserve(element);
    };
  }, []);

  return {
    preloadMedia,
    observeForPreload,
    getCacheStats: () => ({
      items: mediaCache.size,
      totalSize: Array.from(mediaCache.values()).reduce((size, entry) => size + entry.blob.size, 0)
    })
  };
}