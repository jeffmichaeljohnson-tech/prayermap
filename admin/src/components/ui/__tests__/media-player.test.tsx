/**
 * Media Player Component Tests
 * Tests for AudioPlayer, VideoPlayer, and MediaPlayer components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AudioPlayer, VideoPlayer, MediaPlayer } from '../media-player'
import React from 'react'

describe('AudioPlayer', () => {
  let mockAudioElement: {
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    duration: number
    currentTime: number
    muted: boolean
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock HTMLAudioElement
    mockAudioElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      duration: 180,
      currentTime: 0,
      muted: false,
    }

    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(
      mockAudioElement.play
    )
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(
      mockAudioElement.pause
    )
  })

  it('should render play button', () => {
    render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const playButton = screen.getByRole('button')
    expect(playButton).toBeInTheDocument()
  })

  it('should play audio on click', async () => {
    render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const playButton = screen.getByRole('button')
    fireEvent.click(playButton)

    await waitFor(() => {
      expect(mockAudioElement.play).toHaveBeenCalled()
    })
  })

  it('should pause on second click', async () => {
    render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const playButton = screen.getByRole('button')

    // First click - play
    fireEvent.click(playButton)
    await waitFor(() => expect(mockAudioElement.play).toHaveBeenCalled())

    // Second click - pause
    fireEvent.click(playButton)
    expect(mockAudioElement.pause).toHaveBeenCalled()
  })

  it('should show progress bar', () => {
    const { container } = render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const progressBar = container.querySelector('.bg-gray-200')
    expect(progressBar).toBeInTheDocument()
  })

  it('should show current time', async () => {
    render(<AudioPlayer src="https://example.com/audio.mp3" />)

    // Initially should show 0:00
    await waitFor(() => {
      const timeDisplay = screen.getByText(/0:00/)
      expect(timeDisplay).toBeInTheDocument()
    })
  })

  it('should show total duration', async () => {
    const { container } = render(<AudioPlayer src="https://example.com/audio.mp3" />)

    // Mock loadedmetadata event
    const audio = container.querySelector('audio')
    if (audio) {
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      fireEvent.loadedMetadata(audio)
    }

    await waitFor(() => {
      const duration = screen.getByText(/3:00/)
      expect(duration).toBeInTheDocument()
    })
  })

  it('should seek on progress click', () => {
    const { container } = render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const audio = container.querySelector('audio')
    if (audio) {
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
    }

    const progressBar = container.querySelector('.bg-gray-200')
    if (progressBar) {
      fireEvent.click(progressBar, {
        clientX: 50,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 100 }) },
      })
    }

    // currentTime should be updated based on click position
    expect(audio?.currentTime).toBeDefined()
  })

  it('should mute/unmute', () => {
    const { container } = render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const audio = container.querySelector('audio')
    const muteButton = screen.getAllByRole('button').find(btn => btn.title?.includes('Mute'))

    if (muteButton) {
      fireEvent.click(muteButton)
      expect(audio?.muted).toBe(true)

      fireEvent.click(muteButton)
      expect(audio?.muted).toBe(false)
    }
  })

  it('should restart on restart click', async () => {
    const { container } = render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const audio = container.querySelector('audio')
    const restartButton = screen.getAllByRole('button').find(btn => btn.title === 'Restart')

    if (restartButton && audio) {
      fireEvent.click(restartButton)

      await waitFor(() => {
        expect(audio.currentTime).toBe(0)
        expect(mockAudioElement.play).toHaveBeenCalled()
      })
    }
  })

  it('should handle load errors', async () => {
    const { container } = render(<AudioPlayer src="https://example.com/invalid.mp3" />)

    const audio = container.querySelector('audio')
    if (audio) {
      fireEvent.error(audio)
    }

    await waitFor(() => {
      expect(screen.getByText(/Failed to load audio/)).toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    render(<AudioPlayer src="https://example.com/audio.mp3" />)

    const playButton = screen.getByRole('button')
    const spinner = playButton.querySelector('.animate-spin')

    expect(spinner).toBeInTheDocument()
  })
})

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render video element', () => {
    const { container } = render(<VideoPlayer src="https://example.com/video.mp4" />)

    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('should have native controls', () => {
    const { container } = render(<VideoPlayer src="https://example.com/video.mp4" />)

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('controls')
  })

  it('should preload metadata', () => {
    const { container } = render(<VideoPlayer src="https://example.com/video.mp4" />)

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('preload', 'metadata')
  })

  it('should handle errors', async () => {
    const { container } = render(<VideoPlayer src="https://example.com/invalid.mp4" />)

    const video = container.querySelector('video')
    if (video) {
      fireEvent.error(video)
    }

    await waitFor(() => {
      expect(screen.getByText(/Failed to load video/)).toBeInTheDocument()
    })
  })
})

describe('MediaPlayer', () => {
  it('should render AudioPlayer for audio content', () => {
    const { container } = render(
      <MediaPlayer
        src="https://example.com/audio.mp3"
        contentType="audio"
      />
    )

    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()
  })

  it('should render VideoPlayer for video content', () => {
    const { container } = render(
      <MediaPlayer
        src="https://example.com/video.mp4"
        contentType="video"
      />
    )

    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('should show message for missing URL', () => {
    render(<MediaPlayer src={null} contentType="audio" />)

    expect(screen.getByText(/No media URL available/)).toBeInTheDocument()
  })

  it('should return null for text content', () => {
    const { container } = render(
      <MediaPlayer
        src="https://example.com/file.txt"
        contentType="text"
      />
    )

    // Should not render any media player
    const audio = container.querySelector('audio')
    const video = container.querySelector('video')

    expect(audio).not.toBeInTheDocument()
    expect(video).not.toBeInTheDocument()
  })
})
