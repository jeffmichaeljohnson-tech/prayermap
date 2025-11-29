import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestPrayerModal } from '../RequestPrayerModal';
import * as useAuthModule from '../../hooks/useAuth';
import * as storageService from '../../services/storageService';

// Mock dependencies
vi.mock('../../hooks/useAuth');
vi.mock('../../services/storageService');
vi.mock('../AudioRecorder', () => ({
  AudioRecorder: ({ onRecordingComplete }: { onRecordingComplete: (blob: Blob, duration: number) => void }) => (
    <div data-testid="audio-recorder">
      <button onClick={() => onRecordingComplete(new Blob(['audio'], { type: 'audio/webm' }), 45)}>
        Complete Audio Recording
      </button>
    </div>
  ),
}));
vi.mock('../VideoRecorder', () => ({
  VideoRecorder: ({ onRecordingComplete }: { onRecordingComplete: (blob: Blob, duration: number) => void }) => (
    <div data-testid="video-recorder">
      <button onClick={() => onRecordingComplete(new Blob(['video'], { type: 'video/webm' }), 30)}>
        Complete Video Recording
      </button>
    </div>
  ),
}));

describe('RequestPrayerModal', () => {
  const mockUserLocation = { lat: 40.7128, lng: -74.0060 };
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    // Ensure matchMedia is properly mocked for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      session: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      isLoading: false,
    } as ReturnType<typeof useAuthModule.useAuth>);

    vi.mocked(storageService.uploadAudio).mockResolvedValue('https://example.com/audio.mp3');
    vi.mocked(storageService.uploadVideo).mockResolvedValue('https://example.com/video.mp4');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with header', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/request prayer/i)).toBeInTheDocument();
      expect(screen.getByText('🙏')).toBeInTheDocument();
    });

    it('should show content type selector', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
    });

    it('should show title input', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText(/health and healing/i)).toBeInTheDocument();
    });

    it('should show anonymous toggle', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/post anonymously/i)).toBeInTheDocument();
      expect(screen.getByText(/hide your identity/i)).toBeInTheDocument();
    });

    it('should show submit button', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('button', { name: /add to map/i })).toBeInTheDocument();
    });
  });

  describe('content type selection', () => {
    it('should default to text type', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText(/share what's on your heart/i)).toBeInTheDocument();
    });

    it('should show textarea for text type', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('textbox', { name: /prayer request/i })).toBeInTheDocument();
    });

    it('should show AudioRecorder for audio type', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
      expect(screen.getByText(/record your prayer request/i)).toBeInTheDocument();
    });

    it('should show VideoRecorder for video type', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const videoButton = screen.getByText('Video').closest('button');
      await user.click(videoButton!);

      expect(screen.getByTestId('video-recorder')).toBeInTheDocument();
      expect(screen.getByText(/record your video prayer/i)).toBeInTheDocument();
    });

    it('should highlight selected content type', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textButton = screen.getByText('Text').closest('button');
      expect(textButton).toHaveClass('from-yellow-300');

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      expect(audioButton).toHaveClass('from-yellow-300');
    });

    it('should reset content when switching types', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Enter text
      const textarea = screen.getByPlaceholderText(/share what's on your heart/i);
      await user.type(textarea, 'Test prayer');

      // Switch to audio
      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      // Switch back to text
      const textButton = screen.getByText('Text').closest('button');
      await user.click(textButton!);

      // Content should be cleared
      expect(screen.getByPlaceholderText(/share what's on your heart/i)).toHaveValue('');
    });
  });

  describe('text prayer submission', () => {
    it('should enable submit when content entered', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      expect(submitButton).toBeDisabled();

      const textarea = screen.getByPlaceholderText(/share what's on your heart/i);
      await user.type(textarea, 'Please pray for my family');

      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit when content empty', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      expect(submitButton).toBeDisabled();
    });

    it('should call onSubmit with prayer data', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const titleInput = screen.getByPlaceholderText(/health and healing/i);
      await user.type(titleInput, 'Healing');

      const textarea = screen.getByPlaceholderText(/share what's on your heart/i);
      await user.type(textarea, 'Please pray for my family');

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Healing',
        content: 'Please pray for my family',
        content_type: 'text',
        location: mockUserLocation,
        is_anonymous: false,
      });
    });

    it('should include anonymous flag when toggled', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/share what's on your heart/i);
      await user.type(textarea, 'Prayer request');

      const anonymousSwitch = screen.getByRole('switch');
      await user.click(anonymousSwitch);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          is_anonymous: true,
        })
      );
    });
  });

  describe('audio prayer submission', () => {
    it('should enable submit when audio recorded', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      expect(submitButton).toBeDisabled();

      const completeButton = screen.getByText('Complete Audio Recording');
      await user.click(completeButton);

      expect(submitButton).not.toBeDisabled();
    });

    it('should upload audio on submit', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      const completeButton = screen.getByText('Complete Audio Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(storageService.uploadAudio).toHaveBeenCalled();
      });
    });

    it('should show loading state during upload', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.uploadAudio).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('url'), 100))
      );

      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      const completeButton = screen.getByText('Complete Audio Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should show error on upload failure', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.uploadAudio).mockRejectedValue(new Error('Upload failed'));

      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      const completeButton = screen.getByText('Complete Audio Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      // Wait for the upload to fail and error to be set
      await waitFor(() => {
        expect(storageService.uploadAudio).toHaveBeenCalled();
      });

      // Verify onSubmit was not called due to error
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Check that the submit button is enabled again (not in uploading state)
      await waitFor(() => {
        expect(submitButton).not.toHaveTextContent('Uploading');
      });
    });

    it('should call onSubmit with audio URL', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const audioButton = screen.getByText('Audio').closest('button');
      await user.click(audioButton!);

      const completeButton = screen.getByText('Complete Audio Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content_type: 'audio',
            content_url: 'https://example.com/audio.mp3',
          })
        );
      });
    });
  });

  describe('video prayer submission', () => {
    it('should enable submit when video recorded', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const videoButton = screen.getByText('Video').closest('button');
      await user.click(videoButton!);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      expect(submitButton).toBeDisabled();

      const completeButton = screen.getByText('Complete Video Recording');
      await user.click(completeButton);

      expect(submitButton).not.toBeDisabled();
    });

    it('should upload video on submit', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const videoButton = screen.getByText('Video').closest('button');
      await user.click(videoButton!);

      const completeButton = screen.getByText('Complete Video Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(storageService.uploadVideo).toHaveBeenCalled();
      });
    });

    it('should call onSubmit with video URL', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const videoButton = screen.getByText('Video').closest('button');
      await user.click(videoButton!);

      const completeButton = screen.getByText('Complete Video Recording');
      await user.click(completeButton);

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content_type: 'video',
            content_url: 'https://example.com/video.mp4',
          })
        );
      });
    });
  });

  describe('modal behavior', () => {
    it('should close when X button clicked', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('w-5')
      );
      await user.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when backdrop clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const backdrop = container.querySelector('.fixed.inset-0');
      await user.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when modal content clicked', async () => {
      const user = userEvent.setup();
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const modalContent = screen.getByText(/request prayer/i).closest('div');
      await user.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should prevent close during upload', () => {
      render(
        <RequestPrayerModal
          userLocation={mockUserLocation}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /add to map/i });
      expect(submitButton).toHaveAttribute('disabled');
    });
  });
});
