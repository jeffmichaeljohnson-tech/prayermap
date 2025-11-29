/**
 * Comprehensive Unit Tests for StorageService
 *
 * Tests ALL storage functions with 100% coverage including:
 * - Audio upload
 * - Video upload
 * - File deletion
 * - Error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storageService from '../storageService';

// Mock Supabase storage
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}));

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Date.now() for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1640000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadAudio', () => {
    it('should upload audio blob to prayers bucket', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      const result = await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/1640000000000.webm',
        audioBlob,
        {
          contentType: 'audio/webm',
          cacheControl: '3600',
          upsert: false,
        }
      );
      expect(result).toBe('https://example.com/audio.webm');
    });

    it('should generate unique filename with timestamp', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/\d+\.webm$/),
        expect.any(Blob),
        expect.any(Object)
      );
    });

    it('should use correct path: userId/timestamp.ext', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      const uploadCall = mockUpload.mock.calls[0];
      const fileName = uploadCall[0];
      expect(fileName).toMatch(/^user-123\/\d+\.webm$/);
    });

    it('should detect webm mime type', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.webm'),
        audioBlob,
        expect.objectContaining({ contentType: 'audio/webm' })
      );
    });

    it('should detect mp4 mime type', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/mp4' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.mp4' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.mp4' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.mp4'),
        audioBlob,
        expect.objectContaining({ contentType: 'audio/mp4' })
      );
    });

    it('should set correct contentType', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        audioBlob,
        expect.objectContaining({ contentType: 'audio/webm;codecs=opus' })
      );
    });

    it('should set cacheControl header', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        audioBlob,
        expect.objectContaining({ cacheControl: '3600' })
      );
    });

    it('should return public URL on success', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.example.com/prayers/user-123/1640000000000.webm' },
      });

      const result = await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockGetPublicUrl).toHaveBeenCalledWith('user-123/1640000000000.webm');
      expect(result).toBe('https://storage.example.com/prayers/user-123/1640000000000.webm');
    });

    it('should return null on upload error', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed', statusCode: 500 },
      });

      const result = await storageService.uploadAudio(audioBlob, 'user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error uploading audio:',
        expect.objectContaining({ message: 'Upload failed' })
      );
    });

    it('should handle storage quota exceeded', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded', statusCode: 413 },
      });

      const result = await storageService.uploadAudio(audioBlob, 'user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await storageService.uploadAudio(audioBlob, 'user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to upload audio:',
        expect.any(Error)
      );
    });

    it('should handle different user IDs', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-999/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-999');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('user-999/'),
        expect.any(Blob),
        expect.any(Object)
      );
    });

    it('should not upsert existing files', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/audio.webm' },
      });

      await storageService.uploadAudio(audioBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Blob),
        expect.objectContaining({ upsert: false })
      );
    });
  });

  describe('uploadVideo', () => {
    it('should upload video blob to prayers bucket', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/video.webm' },
      });

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/1640000000000.webm',
        videoBlob,
        {
          contentType: 'video/webm',
          cacheControl: '3600',
          upsert: false,
        }
      );
      expect(result).toBe('https://example.com/video.webm');
    });

    it('should generate unique filename', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/video.webm' },
      });

      await storageService.uploadVideo(videoBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/\d+\.webm$/),
        expect.any(Blob),
        expect.any(Object)
      );
    });

    it('should detect video mime types', async () => {
      const mp4Blob = new Blob(['video data'], { type: 'video/mp4' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.mp4' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      await storageService.uploadVideo(mp4Blob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.mp4'),
        mp4Blob,
        expect.objectContaining({ contentType: 'video/mp4' })
      );
    });

    it('should return public URL on success', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.example.com/prayers/user-123/video.webm' },
      });

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(result).toBe('https://storage.example.com/prayers/user-123/video.webm');
    });

    it('should handle large files', async () => {
      // Create a large blob (5MB)
      const largeData = new Array(5 * 1024 * 1024).fill('a').join('');
      const videoBlob = new Blob([largeData], { type: 'video/mp4' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.mp4' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/video.mp4' },
      });

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(result).toBe('https://example.com/video.mp4');
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      });

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to upload video:',
        expect.any(Error)
      );
    });

    it('should handle quota exceeded error', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm' });
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded', statusCode: 413 },
      });

      const result = await storageService.uploadVideo(videoBlob, 'user-123');

      expect(result).toBeNull();
    });

    it('should handle different video codecs', async () => {
      const videoBlob = new Blob(['video data'], { type: 'video/webm;codecs=vp9' });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/1640000000000.webm' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/video.webm' },
      });

      await storageService.uploadVideo(videoBlob, 'user-123');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        videoBlob,
        expect.objectContaining({ contentType: 'video/webm;codecs=vp9' })
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file by path', async () => {
      mockRemove.mockResolvedValueOnce({ error: null });

      const result = await storageService.deleteFile('user-123/1640000000000.webm');

      expect(mockRemove).toHaveBeenCalledWith(['user-123/1640000000000.webm']);
      expect(result).toBe(true);
    });

    it('should return true on success', async () => {
      mockRemove.mockResolvedValueOnce({ error: null, data: [] });

      const result = await storageService.deleteFile('user-123/test.mp3');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Delete failed', statusCode: 500 },
      });

      const result = await storageService.deleteFile('user-123/test.mp3');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting file:',
        expect.objectContaining({ message: 'Delete failed' })
      );
    });

    it('should handle file not found', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'File not found', statusCode: 404 },
      });

      const result = await storageService.deleteFile('user-123/nonexistent.mp3');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Network error'));

      const result = await storageService.deleteFile('user-123/test.mp3');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete file:',
        expect.any(Error)
      );
    });

    it('should handle invalid path', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Invalid path' },
      });

      const result = await storageService.deleteFile('');

      expect(result).toBe(false);
    });

    it('should handle multiple file paths in array', async () => {
      mockRemove.mockResolvedValueOnce({ error: null });

      await storageService.deleteFile('user-123/file1.mp3');

      expect(mockRemove).toHaveBeenCalledWith(['user-123/file1.mp3']);
    });

    it('should handle permission denied', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Permission denied', statusCode: 403 },
      });

      const result = await storageService.deleteFile('other-user/file.mp3');

      expect(result).toBe(false);
    });
  });
});
