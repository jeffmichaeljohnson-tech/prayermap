import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioRecorder } from '../AudioRecorder';
import * as useAudioRecorderModule from '../../hooks/useAudioRecorder';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the useAudioRecorder hook
vi.mock('../../hooks/useAudioRecorder');

describe('AudioRecorder', () => {
  const mockOnRecordingComplete = vi.fn();
  const mockOnCancel = vi.fn();

  let mockUseAudioRecorder: ReturnType<typeof useAudioRecorderModule.useAudioRecorder>;

  beforeEach(() => {
    mockUseAudioRecorder = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      resetRecording: vi.fn(),
    };

    vi.mocked(useAudioRecorderModule.useAudioRecorder).mockReturnValue(mockUseAudioRecorder);
    vi.mocked(useAudioRecorderModule.formatDuration).mockImplementation((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render recording visualization area', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Check for visualization container
      const container = document.querySelector('.bg-white\\/30');
      expect(container).toBeInTheDocument();
    });

    it('should show microphone icon in idle state', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const micIcon = document.querySelector('svg');
      expect(micIcon).toBeInTheDocument();
    });

    it('should show "Tap to record" message initially', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/tap to record/i)).toBeInTheDocument();
    });
  });

  describe('recording', () => {
    it('should start recording when record button clicked', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);

      expect(mockUseAudioRecorder.startRecording).toHaveBeenCalled();
    });

    it('should show waveform animation during recording', () => {
      mockUseAudioRecorder.isRecording = true;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Check for waveform animation divs
      const waveformBars = document.querySelectorAll('.bg-purple-500');
      expect(waveformBars.length).toBeGreaterThan(0);
    });

    it('should show duration counter', () => {
      mockUseAudioRecorder.isRecording = true;
      mockUseAudioRecorder.duration = 45;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={120} />);

      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should show max duration', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={120} />);

      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });

    it('should auto-stop at maxDuration', () => {
      mockUseAudioRecorder.isRecording = true;
      mockUseAudioRecorder.duration = 120;

      const { rerender } = render(
        <AudioRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={120} />
      );

      // Simulate duration reaching max
      mockUseAudioRecorder.duration = 120;
      rerender(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} maxDuration={120} />);

      expect(mockUseAudioRecorder.stopRecording).toHaveBeenCalled();
    });

    it('should show recording state with red duration', () => {
      mockUseAudioRecorder.isRecording = true;
      mockUseAudioRecorder.duration = 30;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const durationElement = screen.getByText('0:30');
      expect(durationElement).toHaveClass('text-red-500');
    });
  });

  describe('controls', () => {
    beforeEach(() => {
      mockUseAudioRecorder.isRecording = true;
    });

    it('should show pause/resume buttons during recording', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const pauseButton = screen.getByRole('button', { name: /pause recording/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should show stop button during recording', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      expect(stopButton).toBeInTheDocument();
    });

    it('should pause recording when pause clicked', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const pauseButton = screen.getByRole('button', { name: /pause recording/i });
      await user.click(pauseButton);

      expect(mockUseAudioRecorder.pauseRecording).toHaveBeenCalled();
    });

    it('should show paused indicator when paused', () => {
      mockUseAudioRecorder.isPaused = true;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/paused/i)).toBeInTheDocument();
    });

    it('should resume recording when play clicked', async () => {
      const user = userEvent.setup();
      mockUseAudioRecorder.isPaused = true;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const playButton = screen.getByRole('button', { name: /resume recording/i });
      await user.click(playButton);

      expect(mockUseAudioRecorder.resumeRecording).toHaveBeenCalled();
    });

    it('should stop recording when stop clicked', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await user.click(stopButton);

      expect(mockUseAudioRecorder.stopRecording).toHaveBeenCalled();
    });
  });

  describe('playback preview', () => {
    beforeEach(() => {
      const blob = new Blob(['test'], { type: 'audio/webm' });
      mockUseAudioRecorder.audioBlob = blob;
      mockUseAudioRecorder.audioUrl = 'blob:mock-url';
    });

    it('should show audio element after recording', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const audio = document.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', 'blob:mock-url');
      expect(audio).toHaveAttribute('controls');
    });

    it('should show confirm and reset buttons', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const confirmButton = screen.getByRole('button', { name: /confirm recording/i });
      const resetButton = screen.getByRole('button', { name: /reset recording/i });

      expect(confirmButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });

    it('should call onRecordingComplete on confirm', async () => {
      const user = userEvent.setup();
      mockUseAudioRecorder.duration = 45;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const confirmButton = screen.getByRole('button', { name: /confirm recording/i });
      await user.click(confirmButton);

      expect(mockOnRecordingComplete).toHaveBeenCalledWith(mockUseAudioRecorder.audioBlob, 45);
    });

    it('should reset recording on reset button click', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const resetButton = screen.getByRole('button', { name: /reset recording/i });
      await user.click(resetButton);

      expect(mockUseAudioRecorder.resetRecording).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error message on permission denied', () => {
      mockUseAudioRecorder.error = 'Microphone access denied. Please allow microphone access in your browser settings.';
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
    });

    it('should show error message on recording error', () => {
      mockUseAudioRecorder.error = 'Recording error occurred';
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText(/recording error occurred/i)).toBeInTheDocument();
    });

    it('should style error message appropriately', () => {
      mockUseAudioRecorder.error = 'Test error';
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const errorElement = screen.getByText(/test error/i);
      expect(errorElement).toHaveClass('text-red-700');
    });

    it('should hide error when not present', () => {
      const { rerender } = render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      mockUseAudioRecorder.error = 'Error';
      rerender(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);
      expect(screen.getByText(/error/i)).toBeInTheDocument();

      mockUseAudioRecorder.error = null;
      rerender(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('cancel functionality', () => {
    it('should show cancel button when onCancel provided', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should not show cancel button when onCancel not provided', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const cancelButton = screen.queryByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should call onCancel when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByRole('button', { name: /start recording/i });
      expect(recordButton).toBeVisible();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Tab through focusable elements
      await user.tab();
      expect(document.activeElement?.tagName).toBe('BUTTON');
    });
  });

  describe('duration formatting', () => {
    it('should format zero duration correctly', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should format seconds correctly', () => {
      mockUseAudioRecorder.duration = 45;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should format minutes correctly', () => {
      mockUseAudioRecorder.duration = 90;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByText('1:30')).toBeInTheDocument();
    });
  });

  describe('waveform animation', () => {
    it('should not show waveform when not recording', () => {
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const waveformBars = document.querySelectorAll('.bg-purple-500');
      expect(waveformBars.length).toBe(0);
    });

    it('should show waveform when recording', () => {
      mockUseAudioRecorder.isRecording = true;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const waveformBars = document.querySelectorAll('.bg-purple-500');
      expect(waveformBars.length).toBe(12);
    });

    it('should not show waveform when paused', () => {
      mockUseAudioRecorder.isRecording = true;
      mockUseAudioRecorder.isPaused = true;
      render(<AudioRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const waveformBars = document.querySelectorAll('.bg-purple-500');
      expect(waveformBars.length).toBe(0);
    });
  });
});
