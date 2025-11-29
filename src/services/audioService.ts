/**
 * Audio Service for PrayerMap
 *
 * Provides subtle audio cues during key moments:
 * - Prayer animation phases
 * - Success states
 * - Notifications
 *
 * Features:
 * - Respects user preferences (muted state)
 * - Low volume by default (enhancement, not intrusion)
 * - Web Audio API for precise timing
 * - Graceful degradation
 */

// Audio file paths (will use tone generation as fallback)
const AUDIO_FILES = {
  prayer_start: '/sounds/prayer-start.mp3',
  prayer_connect: '/sounds/prayer-connect.mp3',
  prayer_complete: '/sounds/prayer-complete.mp3',
  soft_chime: '/sounds/soft-chime.mp3',
  gentle_whoosh: '/sounds/gentle-whoosh.mp3',
};

type SoundName = keyof typeof AUDIO_FILES;

// Audio context for Web Audio API
let audioContext: AudioContext | null = null;
let isMuted = false;
let masterVolume = 0.3; // 30% volume by default - subtle

/**
 * Initialize audio context (must be called after user interaction)
 */
export async function initAudio(): Promise<void> {
  if (audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Resume if suspended (iOS requirement)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  } catch (error) {
    console.debug('[Audio] Web Audio not available:', error);
  }
}

/**
 * Play a sound effect
 */
export async function playSound(name: SoundName, volume?: number): Promise<void> {
  if (isMuted || !audioContext) return;

  // Check reduced motion preference (also applies to audio)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const effectiveVolume = (volume ?? 1) * masterVolume;

  try {
    // Try to load and play the audio file
    const response = await fetch(AUDIO_FILES[name]);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = effectiveVolume;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      source.start(0);
    } else {
      // Fallback to generated tone
      await playGeneratedTone(name, effectiveVolume);
    }
  } catch {
    // Fallback to generated tone
    await playGeneratedTone(name, effectiveVolume);
  }
}

/**
 * Generate a simple tone as fallback
 */
async function playGeneratedTone(name: SoundName, volume: number): Promise<void> {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Configure based on sound type
  const configs: Record<SoundName, { freq: number; type: OscillatorType; duration: number }> = {
    prayer_start: { freq: 440, type: 'sine', duration: 0.3 },
    prayer_connect: { freq: 523, type: 'sine', duration: 0.2 },
    prayer_complete: { freq: 659, type: 'sine', duration: 0.5 },
    soft_chime: { freq: 880, type: 'sine', duration: 0.4 },
    gentle_whoosh: { freq: 220, type: 'sine', duration: 0.6 },
  };

  const config = configs[name];

  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.freq, audioContext.currentTime);

  // Fade in/out envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + config.duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + config.duration);
}

/**
 * Play the prayer animation sound sequence
 * Synced with the 6-second animation phases
 */
export async function playPrayerAnimationSounds(): Promise<void> {
  if (isMuted) return;

  // Phase 1 (0s): Animation starts
  await playSound('prayer_start');

  // Phase 2 (2.4s): Line reaches prayer
  setTimeout(() => playSound('prayer_connect'), 2400);

  // Phase 3 (4s): Gentle whoosh for return journey
  setTimeout(() => playSound('gentle_whoosh', 0.5), 4000);

  // Phase 4 (6s): Completion chime
  setTimeout(() => playSound('prayer_complete'), 5800);
}

/**
 * Set muted state
 */
export function setMuted(muted: boolean): void {
  isMuted = muted;
  localStorage.setItem('prayermap_audio_muted', String(muted));
}

/**
 * Get muted state
 */
export function getMuted(): boolean {
  const stored = localStorage.getItem('prayermap_audio_muted');
  return stored === 'true';
}

/**
 * Set master volume (0-1)
 */
export function setVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('prayermap_audio_volume', String(masterVolume));
}

/**
 * Initialize from stored preferences
 */
export function loadAudioPreferences(): void {
  const storedMuted = localStorage.getItem('prayermap_audio_muted');
  const storedVolume = localStorage.getItem('prayermap_audio_volume');

  if (storedMuted !== null) isMuted = storedMuted === 'true';
  if (storedVolume !== null) masterVolume = parseFloat(storedVolume);
}

// Export service object
export const audioService = {
  init: initAudio,
  play: playSound,
  playPrayerAnimation: playPrayerAnimationSounds,
  setMuted,
  getMuted,
  setVolume,
  loadPreferences: loadAudioPreferences
};
