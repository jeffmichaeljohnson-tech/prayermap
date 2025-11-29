import { vi } from 'vitest';

// Mock useAuth
export const mockUseAuth = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  },
  session: {
    access_token: 'test-token',
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  isLoading: false,
};

// Mock useAudioRecorder
export const mockUseAudioRecorder = {
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

// Mock useVideoRecorder
export const mockUseVideoRecorder = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  videoBlob: null,
  videoUrl: null,
  error: null,
  isCameraReady: true,
  facingMode: 'user' as const,
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  resetRecording: vi.fn(),
  switchCamera: vi.fn(),
  initializeCamera: vi.fn(),
  stopCamera: vi.fn(),
  videoRef: { current: document.createElement('video') },
};

// Mock usePrayers
export const mockUsePrayers = {
  prayers: [],
  isLoading: false,
  error: null,
  createPrayer: vi.fn(),
  updatePrayer: vi.fn(),
  deletePrayer: vi.fn(),
  refetch: vi.fn(),
};

// Mock useInbox
export const mockUseInbox = {
  inboxItems: [],
  unreadCount: 0,
  isLoading: false,
  markAsRead: vi.fn(),
  deleteItem: vi.fn(),
};

// Mock framer-motion for faster tests
export const mockFramerMotion = {
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    p: 'p',
    video: 'video',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
};

// Reset all mocks
export function resetAllMocks() {
  Object.values(mockUseAuth).forEach(value => {
    if (typeof value === 'function') {
      vi.mocked(value).mockClear();
    }
  });
  Object.values(mockUseAudioRecorder).forEach(value => {
    if (typeof value === 'function') {
      vi.mocked(value).mockClear();
    }
  });
  Object.values(mockUseVideoRecorder).forEach(value => {
    if (typeof value === 'function') {
      vi.mocked(value).mockClear();
    }
  });
  Object.values(mockUsePrayers).forEach(value => {
    if (typeof value === 'function') {
      vi.mocked(value).mockClear();
    }
  });
  Object.values(mockUseInbox).forEach(value => {
    if (typeof value === 'function') {
      vi.mocked(value).mockClear();
    }
  });
}
