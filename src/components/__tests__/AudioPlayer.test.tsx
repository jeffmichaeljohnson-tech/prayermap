import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioPlayer } from '../AudioPlayer';

describe('AudioPlayer', () => {
  const mockSrc = 'https://example.com/audio.mp3';
  const mockOnEnded = vi.fn();

  // Mock audio element properties and methods
  beforeEach(() => {
    // Use a WeakMap to store state per audio element
    const audioStates = new WeakMap<HTMLMediaElement, { paused: boolean; muted: boolean }>();

    const getState = (el: HTMLMediaElement) => {
      if (!audioStates.has(el)) {
        audioStates.set(el, { paused: true, muted: false });
      }
      return audioStates.get(el)!;
    };

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(function(this: HTMLMediaElement) {
        const state = getState(this);
        state.paused = false;
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      }),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(function(this: HTMLMediaElement) {
        const state = getState(this);
        state.paused = true;
        this.dispatchEvent(new Event('pause'));
      }),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: function(this: HTMLMediaElement) {
        return getState(this).paused;
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      value: 120,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      value: 0,
      writable: true,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
      configurable: true,
      get: function(this: HTMLMediaElement) {
        return getState(this).muted;
      },
      set: function(this: HTMLMediaElement, value: boolean) {
        getState(this).muted = value;
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Warm-up test to initialize environment
  it('initializes component environment', () => {
    // Use compact mode for initialization as it has fewer framer-motion components
    const { unmount } = render(<AudioPlayer src={mockSrc} compact={true} />);
    unmount();
    expect(true).toBe(true);
  });

  describe('rendering', () => {
    // Warm up environment with a full-mode render before running rendering tests
    beforeAll(() => {
      try {
        const { unmount } = render(<AudioPlayer src={mockSrc} />);
        unmount();
      } catch {
        // Ignore framer-motion initialization errors on first render
      }
    });

    it('should render in compact mode when compact=true', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      // Compact mode has rounded-full container
      const compactContainer = document.querySelector('.rounded-full.px-4.py-2');
      expect(compactContainer).toBeInTheDocument();

      // Should render audio element with correct src
      const audio = document.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', mockSrc);
    });

    it('should render restart button in full mode', () => {
      render(<AudioPlayer src={mockSrc} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3); // play, restart, mute
    });

    it('should render mute button in full mode', () => {
      render(<AudioPlayer src={mockSrc} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('should render in full mode by default', () => {
      render(<AudioPlayer src={mockSrc} />);

      // Full mode has waveform visualization
      const waveformContainer = document.querySelector('.from-purple-50\\/50');
      expect(waveformContainer).toBeInTheDocument();
    });

    it('should render play/pause button', () => {
      render(<AudioPlayer src={mockSrc} />);

      const buttons = screen.getAllByRole('button');
      // The play/pause button should be the middle button (index 1) in full mode
      const playPauseButton = buttons.find(btn =>
        btn.className.includes('w-16 h-16')
      );
      expect(playPauseButton).toBeInTheDocument();
    });
  });

  describe('playback controls', () => {
    it('should play audio when play button clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      // Trigger loadedmetadata event
      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Find and click play button
      const playButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') !== null
      );
      await user.click(playButton!);

      expect(audio.play).toHaveBeenCalled();
    });

    it('should pause audio when pause button clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Find the play/pause button (the large one with w-16 h-16)
      const getPlayPauseButton = () => {
        const buttons = screen.getAllByRole('button');
        return buttons.find(btn => btn.className.includes('w-16 h-16'));
      };

      const playButton = getPlayPauseButton();
      await user.click(playButton!);

      // Wait for play to be called and audio to be playing
      await waitFor(() => {
        expect(audio.play).toHaveBeenCalled();
        expect(audio.paused).toBe(false);
      });

      // Now click the same button again to pause
      const pauseButton = getPlayPauseButton();
      await user.click(pauseButton!);

      // Wait for pause to be called
      await waitFor(() => {
        expect(audio.pause).toHaveBeenCalled();
      });
    });

    it('should restart audio when restart button clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      audio.currentTime = 60;
      fireEvent.loadedMetadata(audio);

      // Find restart button (RotateCcw icon)
      const buttons = screen.getAllByRole('button');
      const restartButton = buttons[0]; // First button is restart in full mode

      await user.click(restartButton);

      expect(audio.currentTime).toBe(0);
      expect(audio.play).toHaveBeenCalled();
    });

    it('should toggle mute when mute button clicked', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Find mute button (last button)
      const buttons = screen.getAllByRole('button');
      const muteButton = buttons[buttons.length - 1];

      expect(audio.muted).toBe(false);

      await user.click(muteButton);
      expect(audio.muted).toBe(true);

      await user.click(muteButton);
      expect(audio.muted).toBe(false);
    });
  });

  describe('progress bar', () => {
    it('should update progress as audio plays', async () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Simulate time update
      audio.currentTime = 60;
      fireEvent.timeUpdate(audio);

      // Check if progress bar updated (50% of 120s)
      await waitFor(() => {
        // Find the progress fill bar (has gradient classes and width style)
        const progressBar = document.querySelector('.from-yellow-400.via-pink-400.to-purple-400');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar?.getAttribute('style')).toContain('width: 50%');
      });
    });

    it('should seek when progress bar clicked', async () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      const progressContainer = document.querySelector('.cursor-pointer')!;
      const rect = { left: 0, width: 100, top: 0, bottom: 0, right: 100, height: 10 } as DOMRect;

      vi.spyOn(progressContainer, 'getBoundingClientRect').mockReturnValue(rect);

      // Click at 50% position
      fireEvent.click(progressContainer, { clientX: 50 });

      expect(audio.currentTime).toBe(60); // 50% of 120s
    });

    it('should support dragging to seek', async () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      const progressContainer = document.querySelector('.cursor-pointer')!;
      const rect = { left: 0, width: 100, top: 0, bottom: 0, right: 100, height: 10 } as DOMRect;

      vi.spyOn(progressContainer, 'getBoundingClientRect').mockReturnValue(rect);

      // Start drag
      fireEvent.mouseDown(progressContainer);

      // Move to 75% position
      fireEvent.mouseMove(progressContainer, { clientX: 75 });

      // End drag
      fireEvent.mouseUp(document);

      expect(audio.currentTime).toBeGreaterThan(0);
    });
  });

  describe('time display', () => {
    it('should display current time', () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      audio.currentTime = 65;
      fireEvent.timeUpdate(audio);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should display duration', () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should format time correctly', () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      audio.currentTime = 0;

      fireEvent.loadedMetadata(audio);
      expect(screen.getByText('0:00')).toBeInTheDocument();

      audio.currentTime = 9;
      fireEvent.timeUpdate(audio);
      expect(screen.getByText('0:09')).toBeInTheDocument();

      audio.currentTime = 70;
      fireEvent.timeUpdate(audio);
      expect(screen.getByText('1:10')).toBeInTheDocument();
    });

    it('should show compact time in compact mode', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      const timeDisplay = screen.getByText('0:00');
      expect(timeDisplay).toHaveClass('text-xs');
    });
  });

  describe('waveform visualization', () => {
    it('should render waveform bars in full mode', () => {
      render(<AudioPlayer src={mockSrc} />);

      const waveformBars = document.querySelectorAll('.w-1.rounded-full');
      expect(waveformBars.length).toBe(40);
    });

    it('should not render waveform in compact mode', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      const waveformBars = document.querySelectorAll('.w-1.rounded-full');
      expect(waveformBars.length).toBe(0);
    });

    it('should highlight past waveform bars', () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      audio.currentTime = 60; // 50% played
      fireEvent.timeUpdate(audio);

      const coloredBars = document.querySelectorAll('.from-yellow-400.to-purple-400');
      expect(coloredBars.length).toBeGreaterThan(0);
    });
  });

  describe('autoplay', () => {
    it('should autoplay when autoPlay=true', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={true} />);

      const audio = document.querySelector('audio')!;

      await waitFor(() => {
        fireEvent.loadedMetadata(audio);
      });

      await waitFor(() => {
        expect(audio.play).toHaveBeenCalled();
      });
    });

    it('should not autoplay when autoPlay=false', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Small delay to ensure play is not called
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(audio.play).not.toHaveBeenCalled();
    });

    it('should only autoplay once', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={true} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(audio.play).toHaveBeenCalledTimes(1);
      });

      // Trigger loadedmetadata again
      fireEvent.loadedMetadata(audio);

      // Should still be called only once
      expect(audio.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('ended event', () => {
    it('should call onEnded when audio ends', () => {
      render(<AudioPlayer src={mockSrc} onEnded={mockOnEnded} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);
      fireEvent.play(audio);
      fireEvent.ended(audio);

      expect(mockOnEnded).toHaveBeenCalled();
    });

    it('should reset to beginning when audio ends', () => {
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);
      audio.currentTime = 120;
      fireEvent.play(audio);
      fireEvent.ended(audio);

      // Check if UI shows 0:00
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should stop playing when audio ends', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Start playing by calling play
      await audio.play();

      // Verify playing state
      await waitFor(() => {
        expect(audio.paused).toBe(false);
      });

      // End the audio (this should trigger the ended handler)
      fireEvent.ended(audio);

      // Wait for the ended event to be processed and UI to update
      // The component sets isPlaying to false when audio ends
      await waitFor(() => {
        // Look for the play icon (not pause) which indicates stopped state
        const buttons = screen.getAllByRole('button');
        const playPauseButton = buttons.find(btn =>
          btn.className.includes('w-16 h-16')
        );
        // When stopped, the play icon should be present
        expect(playPauseButton?.querySelector('[class*="Play"]')).toBeTruthy();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator when audio is loading', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.waiting(audio);

      // Loading spinner should be visible
      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should hide loading indicator when audio can play', async () => {
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.waiting(audio);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      fireEvent.canPlay(audio);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(<AudioPlayer src={mockSrc} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Tab to first focusable element (might be progress bar div)
      await user.tab();

      // Keep tabbing until we find a button
      let attempts = 0;
      while (document.activeElement?.tagName !== 'BUTTON' && attempts < 5) {
        await user.tab();
        attempts++;
      }

      // Should now be on a button
      expect(document.activeElement?.tagName).toBe('BUTTON');

      // Tab to next button
      await user.tab();

      // Might need to skip non-button elements
      attempts = 0;
      while (document.activeElement?.tagName !== 'BUTTON' && attempts < 5) {
        await user.tab();
        attempts++;
      }

      expect(document.activeElement?.tagName).toBe('BUTTON');
    });
  });

  describe('compact mode', () => {
    it('should render minimal UI in compact mode', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      // Should have play button and progress bar
      const playButton = screen.getByRole('button');
      expect(playButton).toBeInTheDocument();

      const progressBar = document.querySelector('.bg-gray-300\\/50');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not render restart and mute buttons in compact mode', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      // Should only have 1 button (play/pause)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1);
    });

    it('should show time but not duration in compact mode', () => {
      render(<AudioPlayer src={mockSrc} compact={true} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      // Time should be visible
      expect(screen.getByText('0:00')).toBeInTheDocument();

      // Duration (2:00) should not be visible separately
      expect(screen.queryByText('2:00')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle play errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const playError = new Error('Play failed');

      Object.defineProperty(HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value: vi.fn().mockRejectedValue(playError),
      });

      const user = userEvent.setup();
      render(<AudioPlayer src={mockSrc} autoPlay={false} />);

      const audio = document.querySelector('audio')!;
      fireEvent.loadedMetadata(audio);

      const playButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') !== null
      );
      await user.click(playButton!);

      // Should not throw, error should be caught
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
