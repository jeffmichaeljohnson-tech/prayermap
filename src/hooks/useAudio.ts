/**
 * useAudio Hook
 *
 * React hook for audio playback
 */

import { useCallback, useEffect, useState } from 'react';
import { audioService } from '@/services/audioService';

export function useAudio() {
  const [isMuted, setIsMuted] = useState(audioService.getMuted());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    audioService.loadPreferences();
    setIsMuted(audioService.getMuted());
  }, []);

  // Initialize audio context on first user interaction
  const init = useCallback(async () => {
    if (isInitialized) return;
    await audioService.init();
    setIsInitialized(true);
  }, [isInitialized]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    audioService.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const playPrayerAnimation = useCallback(async () => {
    if (!isInitialized) await init();
    audioService.playPrayerAnimation();
  }, [isInitialized, init]);

  return {
    isMuted,
    isInitialized,
    init,
    toggleMute,
    playPrayerAnimation,
    play: audioService.play
  };
}
