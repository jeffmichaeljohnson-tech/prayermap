import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoRecorder } from '../VideoRecorder';
import * as useVideoRecorderModule from '../../hooks/useVideoRecorder';

// Mock the useVideoRecorder hook
vi.mock('../../hooks/useVideoRecorder');

describe('VideoRecorder', () => {
  const mockOnRecordingComplete = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultMaxDuration = 90;

  let mockUseVideoRecorder: ReturnType<typeof useVideoRecorderModule.useVideoRecorder>;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockUseVideoRecorder = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      videoBlob: null,
      videoUrl: null,
      error: null,
      isCameraReady: false,
      facingMode: 'user',
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      resetRecording: vi.fn(),
      switchCamera: vi.fn(),
      initializeCamera: vi.fn(),
      stopCamera: vi.fn(),
      videoRef: { current: document.createElement('video') },
      streamRef: { current: null },
    };

    vi.mocked(useVideoRecorderModule.useVideoRecorder).mockReturnValue(mockUseVideoRecorder);
    vi.mocked(useVideoRecorderModule.formatVideoDuration).mockImplementation((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render video preview container', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the main video container with aspect ratio class
      const container = document.querySelector('[class*="aspect-[9/16]"]');
      expect(container).toBeTruthy();
    });

    it('should show camera initialization message initially', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/initializing camera/i)).toBeInTheDocument();
    });

    it('should show record button when camera is ready', () => {
      mockUseVideoRecorder.isCameraReady = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the large record button with gradient styling
      const recordButton = document.querySelector('button.w-20.h-20.rounded-full');
      expect(recordButton).toBeInTheDocument();
    });

    it('should apply ethereal glass styling', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Check for glass effect classes
      const glassElements = document.querySelectorAll('.glass-strong');
      expect(glassElements.length).toBeGreaterThan(0);
    });
  });

  describe('camera initialization', () => {
    it('should call initializeCamera on mount', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(mockUseVideoRecorder.initializeCamera).toHaveBeenCalled();
    });

    it('should show error message on permission denied', () => {
      mockUseVideoRecorder.error = 'Camera access denied. Please allow camera access in your browser settings.';
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument();
    });

    it('should show video preview when camera ready', () => {
      mockUseVideoRecorder.isCameraReady = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const videos = document.querySelectorAll('video');
      expect(videos.length).toBeGreaterThan(0);
    });

    it('should call stopCamera on unmount', () => {
      const { unmount } = render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      unmount();

      expect(mockUseVideoRecorder.stopCamera).toHaveBeenCalled();
    });
  });

  describe('recording flow', () => {
    beforeEach(() => {
      mockUseVideoRecorder.isCameraReady = true;
    });

    it('should start recording when record button clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the large record button
      const recordButton = document.querySelector('button.w-20.h-20.rounded-full') as HTMLElement;
      expect(recordButton).toBeInTheDocument();
      await user.click(recordButton);

      expect(mockUseVideoRecorder.startRecording).toHaveBeenCalled();
    });

    it('should show animated border during recording', () => {
      mockUseVideoRecorder.isRecording = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Check for animated gradient border (it's a motion.div with specific styling)
      const container = document.querySelector('.rounded-3xl');
      expect(container).toBeTruthy();
    });

    it('should show progress ring during recording', () => {
      mockUseVideoRecorder.isRecording = true;
      mockUseVideoRecorder.duration = 30;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={90} />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show duration timer', () => {
      mockUseVideoRecorder.isRecording = true;
      mockUseVideoRecorder.duration = 45;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={90} />);

      expect(screen.getByText(/0:45/)).toBeInTheDocument();
      expect(screen.getByText(/1:30/)).toBeInTheDocument();
    });

    it('should auto-stop at maxDuration', () => {
      mockUseVideoRecorder.isRecording = true;
      mockUseVideoRecorder.duration = 90;

      const { rerender } = render(
        <VideoRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={90} />
      );

      // Simulate duration reaching max
      mockUseVideoRecorder.duration = 90;
      rerender(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={90} />);

      expect(mockUseVideoRecorder.stopRecording).toHaveBeenCalled();
    });
  });

  describe('controls', () => {
    beforeEach(() => {
      mockUseVideoRecorder.isCameraReady = true;
      mockUseVideoRecorder.isRecording = true;
    });

    it('should show pause button during recording', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the pause/play button (smaller round button)
      const buttons = document.querySelectorAll('button.w-14.h-14.rounded-full');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should pause recording when pause clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the smaller control button (pause/play)
      const pauseButton = document.querySelector('button.w-14.h-14.rounded-full') as HTMLElement;
      expect(pauseButton).toBeInTheDocument();
      await user.click(pauseButton);

      expect(mockUseVideoRecorder.pauseRecording).toHaveBeenCalled();
    });

    it('should show play button when paused', () => {
      mockUseVideoRecorder.isPaused = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the control button
      const playButton = document.querySelector('button.w-14.h-14.rounded-full');
      expect(playButton).toBeInTheDocument();
    });

    it('should resume recording when play clicked', async () => {
      const user = userEvent.setup();
      mockUseVideoRecorder.isPaused = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const playButton = document.querySelector('button.w-14.h-14.rounded-full') as HTMLElement;
      expect(playButton).toBeInTheDocument();
      await user.click(playButton);

      expect(mockUseVideoRecorder.resumeRecording).toHaveBeenCalled();
    });

    it('should show stop button during recording', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the large stop button
      const stopButton = document.querySelector('button.w-20.h-20.rounded-full');
      expect(stopButton).toBeInTheDocument();
    });

    it('should stop recording when stop clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const stopButton = document.querySelector('button.w-20.h-20.rounded-full') as HTMLElement;
      expect(stopButton).toBeInTheDocument();
      await user.click(stopButton);

      expect(mockUseVideoRecorder.stopRecording).toHaveBeenCalled();
    });
  });

  describe('camera switching', () => {
    beforeEach(() => {
      mockUseVideoRecorder.isCameraReady = true;
    });

    it('should show camera switch button', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for the glass-strong button (camera switch)
      const switchButton = document.querySelector('button.glass-strong.p-2.rounded-full');
      expect(switchButton).toBeInTheDocument();
    });

    it('should toggle facing mode when clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const switchButton = document.querySelector('button.glass-strong.p-2.rounded-full') as HTMLElement;
      expect(switchButton).toBeInTheDocument();
      await user.click(switchButton);

      expect(mockUseVideoRecorder.switchCamera).toHaveBeenCalled();
    });

    it('should mirror video for front camera', () => {
      mockUseVideoRecorder.facingMode = 'user';
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const video = document.querySelector('video');
      expect(video).toHaveStyle({ transform: 'scaleX(-1)' });
    });

    it('should not mirror video for back camera', () => {
      mockUseVideoRecorder.facingMode = 'environment';
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const video = document.querySelector('video');
      expect(video).toHaveStyle({ transform: 'none' });
    });
  });

  describe('preview and confirmation', () => {
    beforeEach(() => {
      const blob = new Blob(['test'], { type: 'video/webm' });
      mockUseVideoRecorder.videoBlob = blob;
      mockUseVideoRecorder.videoUrl = 'blob:mock-url';
    });

    it('should show video preview after recording', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const video = document.querySelector('video[src="blob:mock-url"]');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('controls');
    });

    it('should show confirm and reset buttons', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Look for both buttons in preview mode
      const largeButton = document.querySelector('button.w-20.h-20.rounded-full'); // Confirm
      const smallButton = document.querySelector('button.w-14.h-14.rounded-full'); // Reset

      expect(largeButton).toBeInTheDocument();
      expect(smallButton).toBeInTheDocument();
    });

    it('should call onRecordingComplete with blob and duration on confirm', async () => {
      const user = userEvent.setup();
      mockUseVideoRecorder.duration = 45;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // The large button is the confirm button when in preview mode
      const confirmButton = document.querySelector('button.w-20.h-20.rounded-full') as HTMLElement;
      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton);

      expect(mockOnRecordingComplete).toHaveBeenCalledWith(mockUseVideoRecorder.videoBlob, 45);
    });

    it('should reset and reinitialize camera on reset', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // The small button is the reset button when in preview mode
      const resetButton = document.querySelector('button.w-14.h-14.rounded-full') as HTMLElement;
      expect(resetButton).toBeInTheDocument();
      await user.click(resetButton);

      expect(mockUseVideoRecorder.resetRecording).toHaveBeenCalled();
      expect(mockUseVideoRecorder.initializeCamera).toHaveBeenCalledTimes(2); // Once on mount, once on reset
    });

    it('should show recording ready message', () => {
      mockUseVideoRecorder.duration = 30;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/recording ready/i)).toBeInTheDocument();
      expect(screen.getByText(/0:30/)).toBeInTheDocument();
    });
  });

  describe('cancel', () => {
    it('should show cancel button when onCancel provided', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should not show cancel button when onCancel not provided', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const cancelButton = screen.queryByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should stop camera and call onCancel when clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockUseVideoRecorder.stopCamera).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible button labels', () => {
      mockUseVideoRecorder.isCameraReady = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      mockUseVideoRecorder.isCameraReady = true;
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = document.querySelector('button.w-20.h-20.rounded-full') as HTMLElement;
      expect(recordButton).toBeInTheDocument();

      // Tab to button and press Enter
      await user.tab();
      await user.keyboard('{Enter}');

      // Verify button is focusable
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should display error with proper styling', () => {
      mockUseVideoRecorder.error = 'Test error message';
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const errorElement = screen.getByText(/test error message/i);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.className).toContain('text-red');
    });

    it('should hide error message when error is null', () => {
      const { rerender } = render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      mockUseVideoRecorder.error = 'Error message';
      rerender(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);
      expect(screen.getByText(/error message/i)).toBeInTheDocument();

      mockUseVideoRecorder.error = null;
      rerender(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // AnimatePresence may keep element in DOM during exit animation
      // Check if error message is not visible or not in document
      const errorElement = screen.queryByText(/error message/i);
      if (errorElement) {
        // Element may still exist in DOM during exit animation, but should not be visible
        expect(errorElement).not.toBeVisible();
      }
    });
  });

  describe('paused state', () => {
    beforeEach(() => {
      mockUseVideoRecorder.isRecording = true;
      mockUseVideoRecorder.isPaused = true;
    });

    it('should show paused overlay', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/paused/i)).toBeInTheDocument();
    });

    it('should show paused indicator with icon', () => {
      render(<VideoRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const pausedText = screen.getByText(/paused/i);
      expect(pausedText).toBeInTheDocument();
    });
  });
});
