/**
 * Mobile Keyboard Management Hook
 * 
 * Handles keyboard interactions for mobile messaging with:
 * - iOS/Android keyboard detection
 * - Auto-expanding textarea
 * - Smooth layout adjustments
 * - Viewport management
 * 
 * SPIRITUAL MISSION: Remove friction from prayer conversations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface KeyboardInfo {
  height: number;
  isVisible: boolean;
  isNative: boolean;
}

interface AutoExpandConfig {
  minHeight: number;
  maxHeight: number;
  lineHeight: number;
  padding: number;
}

interface KeyboardHandlers {
  onShow?: (info: KeyboardInfo) => void;
  onHide?: () => void;
  onHeightChange?: (height: number) => void;
}

export function useMobileKeyboard(
  handlers?: KeyboardHandlers,
  autoExpandConfig?: Partial<AutoExpandConfig>
) {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    height: 0,
    isVisible: false,
    isNative: Capacitor.isNativePlatform()
  });

  const [originalViewportHeight, setOriginalViewportHeight] = useState(0);
  const listenersSetup = useRef(false);

  // Default configuration for auto-expanding input
  const expandConfig: AutoExpandConfig = {
    minHeight: 44, // iOS minimum touch target
    maxHeight: 120, // About 4-5 lines
    lineHeight: 20,
    padding: 12,
    ...autoExpandConfig
  };

  // Initialize viewport height
  useEffect(() => {
    setOriginalViewportHeight(window.innerHeight);
  }, []);

  // Set up keyboard listeners
  useEffect(() => {
    if (listenersSetup.current) return;
    listenersSetup.current = true;

    let removeListeners: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      // Native keyboard handling
      const setupNativeKeyboard = async () => {
        try {
          const showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
            const keyboardData: KeyboardInfo = {
              height: info.keyboardHeight,
              isVisible: true,
              isNative: true
            };
            setKeyboardInfo(keyboardData);
            handlers?.onShow?.(keyboardData);
            handlers?.onHeightChange?.(info.keyboardHeight);
          });

          const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardInfo(prev => ({
              ...prev,
              height: 0,
              isVisible: false
            }));
            handlers?.onHide?.();
            handlers?.onHeightChange?.(0);
          });

          removeListeners = () => {
            showListener.remove();
            hideListener.remove();
          };
        } catch (error) {
          console.warn('Native keyboard listeners not available:', error);
          setupWebKeyboard();
        }
      };

      setupNativeKeyboard();
    } else {
      setupWebKeyboard();
    }

    function setupWebKeyboard() {
      // Web keyboard detection via viewport resize
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const heightDiff = originalViewportHeight - currentHeight;
        
        if (heightDiff > 150) { // Likely keyboard
          const keyboardData: KeyboardInfo = {
            height: heightDiff,
            isVisible: true,
            isNative: false
          };
          setKeyboardInfo(keyboardData);
          handlers?.onShow?.(keyboardData);
          handlers?.onHeightChange?.(heightDiff);
        } else if (keyboardInfo.isVisible && heightDiff < 50) {
          setKeyboardInfo(prev => ({
            ...prev,
            height: 0,
            isVisible: false
          }));
          handlers?.onHide?.();
          handlers?.onHeightChange?.(0);
        }
      };

      window.addEventListener('resize', handleResize);
      
      if (!removeListeners) {
        removeListeners = () => {
          window.removeEventListener('resize', handleResize);
        };
      }
    }

    return () => {
      removeListeners?.();
      listenersSetup.current = false;
    };
  }, [handlers, keyboardInfo.isVisible, originalViewportHeight]);

  // Auto-expanding textarea hook
  const useAutoExpandingTextarea = (
    initialValue = '',
    onValueChange?: (value: string) => void
  ) => {
    const [value, setValue] = useState(initialValue);
    const [height, setHeight] = useState(expandConfig.minHeight);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const updateHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to measure scrollHeight
      textarea.style.height = `${expandConfig.minHeight}px`;
      
      // Calculate new height based on content
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, expandConfig.minHeight), expandConfig.maxHeight);
      
      setHeight(newHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Handle overflow
      textarea.style.overflowY = newHeight >= expandConfig.maxHeight ? 'scroll' : 'hidden';
    }, []);

    const handleChange = useCallback((newValue: string) => {
      setValue(newValue);
      onValueChange?.(newValue);
      
      // Update height on next frame to ensure content is rendered
      requestAnimationFrame(updateHeight);
    }, [onValueChange, updateHeight]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        return { shouldSend: true, message: value.trim() };
      }
      return { shouldSend: false, message: '' };
    }, [value]);

    useEffect(() => {
      updateHeight();
    }, [updateHeight, value]);

    return {
      textareaRef,
      value,
      height,
      setValue: handleChange,
      handleKeyDown,
      reset: () => {
        setValue('');
        setHeight(expandConfig.minHeight);
      }
    };
  };

  // Layout adjustment utilities
  const adjustLayoutForKeyboard = useCallback((
    containerElement: HTMLElement,
    inputElement?: HTMLElement,
    options: {
      scrollBehavior?: 'smooth' | 'instant';
      maintainScrollPosition?: boolean;
    } = {}
  ) => {
    const { scrollBehavior = 'smooth', maintainScrollPosition = false } = options;
    
    if (keyboardInfo.isVisible) {
      // Adjust container for keyboard
      containerElement.style.transform = `translateY(-${keyboardInfo.height}px)`;
      containerElement.style.transition = 'transform 0.3s ease-out';
      
      // Scroll input into view
      if (inputElement) {
        setTimeout(() => {
          inputElement.scrollIntoView({
            behavior: scrollBehavior,
            block: 'nearest'
          });
        }, 100);
      }
      
      // Auto-scroll to bottom of conversation
      if (!maintainScrollPosition) {
        setTimeout(() => {
          containerElement.scrollTop = containerElement.scrollHeight;
        }, 150);
      }
    } else {
      // Reset layout
      containerElement.style.transform = 'translateY(0)';
      containerElement.style.transition = 'transform 0.3s ease-out';
    }
  }, [keyboardInfo]);

  // Safe area calculations for input positioning
  const getInputSafeAreaStyle = useCallback((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      transition: 'transform 0.3s ease-out'
    };

    if (keyboardInfo.isVisible) {
      // Position above keyboard
      baseStyle.transform = `translateY(-${keyboardInfo.height}px)`;
    }

    return baseStyle;
  }, [keyboardInfo]);

  // Prevent zoom on input focus (iOS)
  const preventIOSZoom = useCallback((inputElement: HTMLInputElement | HTMLTextAreaElement) => {
    // Ensure font size is at least 16px to prevent zoom
    const currentFontSize = window.getComputedStyle(inputElement).fontSize;
    const fontSize = parseInt(currentFontSize);
    
    if (fontSize < 16) {
      inputElement.style.fontSize = '16px';
    }
  }, []);

  // Input focus handler with mobile optimizations
  const handleInputFocus = useCallback((
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const input = event.target;
    
    // Prevent iOS zoom
    preventIOSZoom(input);
    
    // Scroll into view after keyboard shows (mobile browsers)
    if (!Capacitor.isNativePlatform()) {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [preventIOSZoom]);

  return {
    keyboardInfo,
    useAutoExpandingTextarea,
    adjustLayoutForKeyboard,
    getInputSafeAreaStyle,
    handleInputFocus,
    isKeyboardVisible: keyboardInfo.isVisible,
    keyboardHeight: keyboardInfo.height,
    
    // Utility methods
    hideKeyboard: async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Keyboard.hide();
        } catch (error) {
          console.warn('Could not hide keyboard:', error);
        }
      } else {
        // Web fallback - blur active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    },

    showKeyboard: () => {
      if (Capacitor.isNativePlatform()) {
        try {
          Keyboard.show();
        } catch (error) {
          console.warn('Could not show keyboard:', error);
        }
      }
    }
  };
}

// Voice Message Recording Hook with Keyboard Integration
export function useVoiceMessageRecording(onComplete: (audioBlob: Blob) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const { hideKeyboard } = useMobileKeyboard();

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      stream.getTracks().forEach(track => track.stop()); // Clean up
      return true;
    } catch (error) {
      setHasPermission(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    // Hide keyboard before starting recording
    await hideKeyboard();
    
    if (hasPermission === null) {
      const permitted = await requestPermission();
      if (!permitted) return false;
    }

    if (hasPermission === false) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      chunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        onComplete(audioBlob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 300000);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }, [hasPermission, isRecording, requestPermission, hideKeyboard, onComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setDuration(0);
      chunksRef.current = [];
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    duration,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission
  };
}