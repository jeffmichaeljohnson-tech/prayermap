/**
 * Advanced Media Upload Manager with Instagram/WhatsApp-level functionality
 * Handles compression, thumbnail generation, progress tracking, and spiritual context
 */

import { supabase } from '../lib/supabase';
import type { 
  MediaUpload, 
  MediaProcessingOptions, 
  ProgressCallback, 
  MediaErrorDetails,
  MediaError,
  GeoLocation,
  MEDIA_CONSTANTS
} from '../types/media';

export class MediaUploadManager {
  private uploadQueue = new Map<string, MediaUpload>();
  private compressionWorker?: Worker;
  private progressCallbacks = new Map<string, ProgressCallback>();

  constructor() {
    this.initializeCompressionWorker();
  }

  private initializeCompressionWorker(): void {
    // Create a web worker for heavy compression tasks to keep UI responsive
    try {
      const workerBlob = new Blob([`
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          if (type === 'COMPRESS_IMAGE') {
            compressImage(data).then(result => {
              self.postMessage({ type: 'COMPRESSION_COMPLETE', result });
            }).catch(error => {
              self.postMessage({ type: 'COMPRESSION_ERROR', error: error.message });
            });
          }
        };

        async function compressImage({ imageData, options }) {
          const canvas = new OffscreenCanvas(options.maxWidth, options.maxHeight);
          const ctx = canvas.getContext('2d');
          
          const bitmap = await createImageBitmap(imageData);
          
          // Calculate scaled dimensions maintaining aspect ratio
          const { width, height } = calculateScaledDimensions(
            bitmap.width, 
            bitmap.height, 
            options.maxWidth, 
            options.maxHeight
          );
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(bitmap, 0, 0, width, height);
          
          const blob = await canvas.convertToBlob({
            type: 'image/' + options.format,
            quality: options.quality
          });
          
          return {
            blob,
            dimensions: { width, height }
          };
        }

        function calculateScaledDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
          const aspectRatio = originalWidth / originalHeight;
          
          if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
            return { width: originalWidth, height: originalHeight };
          }
          
          if (originalWidth > originalHeight) {
            const width = Math.min(originalWidth, maxWidth);
            return { width, height: Math.round(width / aspectRatio) };
          } else {
            const height = Math.min(originalHeight, maxHeight);
            return { width: Math.round(height * aspectRatio), height };
          }
        }
      `], { type: 'application/javascript' });

      this.compressionWorker = new Worker(URL.createObjectURL(workerBlob));
    } catch (error) {
      console.warn('Could not create compression worker, falling back to main thread:', error);
    }
  }

  async uploadMedia(
    file: File,
    conversationId: string,
    options: MediaProcessingOptions = {}
  ): Promise<MediaUpload> {
    const mediaUpload: MediaUpload = {
      id: crypto.randomUUID(),
      file,
      type: this.determineMediaType(file),
      metadata: {
        size: file.size,
        mimeType: file.type,
        fileName: file.name
      },
      uploadProgress: 0,
      status: 'uploading',
      compressionLevel: options.compress ? 'medium' : 'none'
    };

    this.uploadQueue.set(mediaUpload.id, mediaUpload);

    try {
      // Validate file size and type
      this.validateFile(file, mediaUpload.type);

      // Update progress: Starting processing
      this.updateProgress(mediaUpload.id, 10, 'Preparing media...');

      // 1. Extract metadata (dimensions, duration, EXIF data)
      mediaUpload.metadata = await this.extractMediaMetadata(file, mediaUpload.type);
      this.updateProgress(mediaUpload.id, 20, 'Analyzing media...');

      // 2. Compress media if needed (mobile optimization)
      let processedFile = file;
      if (options.compress && this.shouldCompress(file, mediaUpload.type)) {
        processedFile = await this.compressMedia(file, mediaUpload.type, options);
        mediaUpload.compressionLevel = this.getCompressionLevel(file.size, processedFile.size);
        this.updateProgress(mediaUpload.id, 40, 'Optimizing for mobile...');
      }

      // 3. Generate thumbnail for images/videos
      if (options.generateThumbnail && ['image', 'video'].includes(mediaUpload.type)) {
        mediaUpload.thumbnailUrl = await this.generateThumbnail(processedFile, mediaUpload.type);
        this.updateProgress(mediaUpload.id, 60, 'Creating thumbnail...');
      }

      // 4. Detect spiritual content if requested
      if (options.detectSpiritual && mediaUpload.type === 'image') {
        mediaUpload.spiritualContext = await this.detectSpiritualContext(processedFile);
        this.updateProgress(mediaUpload.id, 70, 'Analyzing spiritual content...');
      }

      // 5. Add prayer overlay if requested
      if (options.addPrayerOverlay && options.overlayText && mediaUpload.type === 'image') {
        processedFile = await this.addPrayerOverlay(processedFile, options.overlayText);
        this.updateProgress(mediaUpload.id, 80, 'Adding prayer overlay...');
      }

      // 6. Upload to Supabase Storage with progress tracking
      mediaUpload.url = await this.uploadToStorage(
        processedFile,
        conversationId,
        mediaUpload.type,
        (progress) => this.updateProgress(mediaUpload.id, 80 + (progress * 0.2), 'Uploading...')
      );

      // 7. Upload thumbnail separately if generated
      if (mediaUpload.thumbnailUrl && mediaUpload.thumbnailUrl.startsWith('data:')) {
        const thumbnailBlob = await this.dataUrlToBlob(mediaUpload.thumbnailUrl);
        const thumbnailUrl = await this.uploadToStorage(
          new File([thumbnailBlob], `thumb_${mediaUpload.metadata.fileName}`, { type: thumbnailBlob.type }),
          conversationId,
          'image'
        );
        mediaUpload.thumbnailUrl = thumbnailUrl;
      }

      mediaUpload.status = 'ready';
      mediaUpload.uploadProgress = 100;
      this.updateProgress(mediaUpload.id, 100, 'Complete!');

      return mediaUpload;

    } catch (error) {
      mediaUpload.status = 'failed';
      mediaUpload.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Media upload failed:', error);
      throw this.createMediaError('UPLOAD_FAILED', error instanceof Error ? error.message : 'Upload failed');
    }
  }

  private determineMediaType(file: File): MediaUpload['type'] {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) {
      // Distinguish between regular audio and voice messages
      return file.name.toLowerCase().includes('voice') ? 'voice_message' : 'audio';
    }
    
    throw this.createMediaError('UNSUPPORTED_FORMAT', `Unsupported file type: ${file.type}`);
  }

  private validateFile(file: File, type: MediaUpload['type']): void {
    const maxSize = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB  
      audio: 25 * 1024 * 1024, // 25MB
      voice_message: 10 * 1024 * 1024 // 10MB
    }[type];

    if (file.size > maxSize) {
      throw this.createMediaError(
        'FILE_TOO_LARGE', 
        `File size ${this.formatFileSize(file.size)} exceeds limit of ${this.formatFileSize(maxSize)}`
      );
    }
  }

  private shouldCompress(file: File, type: MediaUpload['type']): boolean {
    const compressionThresholds = {
      image: 2 * 1024 * 1024, // 2MB
      video: 50 * 1024 * 1024, // 50MB
      audio: 10 * 1024 * 1024, // 10MB
      voice_message: 5 * 1024 * 1024 // 5MB
    };

    return file.size > compressionThresholds[type];
  }

  private async extractMediaMetadata(file: File, type: MediaUpload['type']): Promise<MediaUpload['metadata']> {
    const metadata: MediaUpload['metadata'] = {
      size: file.size,
      mimeType: file.type,
      fileName: file.name
    };

    try {
      if (type === 'image') {
        const dimensions = await this.getImageDimensions(file);
        metadata.dimensions = dimensions;
        
        // Extract EXIF data for orientation and location
        const exifData = await this.extractExifData(file);
        if (exifData) {
          metadata.orientation = exifData.orientation;
        }
      } else if (type === 'video' || type === 'audio' || type === 'voice_message') {
        const audioContext = await this.getMediaDuration(file);
        if (audioContext) {
          metadata.duration = audioContext.duration;
          if (type === 'video') {
            metadata.dimensions = await this.getVideoDimensions(file);
          }
        }
      }
    } catch (error) {
      console.warn('Could not extract full metadata:', error);
    }

    return metadata;
  }

  private async compressMedia(
    file: File, 
    type: MediaUpload['type'], 
    options: MediaProcessingOptions
  ): Promise<File> {
    if (type === 'image') {
      return this.compressImage(file, {
        maxWidth: options.maxDimensions?.width || 1920,
        maxHeight: options.maxDimensions?.height || 1920,
        quality: options.compressionQuality || 0.8,
        format: 'webp'
      });
    } else if (type === 'video') {
      // For video, we'll use a simplified approach since full video compression
      // requires complex codecs. In a production app, you'd use FFmpeg.wasm
      return file; // Placeholder - would implement video compression
    } else if (type === 'audio' || type === 'voice_message') {
      return this.compressAudio(file, {
        bitrate: type === 'voice_message' ? 64000 : 128000,
        sampleRate: 44100
      });
    }
    
    return file;
  }

  private async compressImage(file: File, options: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
  }): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate scaled dimensions maintaining aspect ratio
        const { width, height } = this.calculateScaledDimensions(
          img.width, 
          img.height, 
          options.maxWidth, 
          options.maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw image with high quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified format and quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: `image/${options.format}`,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${options.format}`,
          options.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async compressAudio(file: File, options: {
    bitrate: number;
    sampleRate: number;
  }): Promise<File> {
    // Simplified audio compression - in production would use Web Audio API
    // with more sophisticated compression
    return file;
  }

  private async generateThumbnail(file: File, type: MediaUpload['type']): Promise<string> {
    if (type === 'image') {
      return this.generateImageThumbnail(file);
    } else if (type === 'video') {
      return this.generateVideoThumbnail(file);
    }
    return '';
  }

  private async generateImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const size = 200; // Thumbnail size
        canvas.width = size;
        canvas.height = size;

        // Calculate crop area for square thumbnail
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/webp', 0.7);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 4); // Capture at 25% of video
      };

      video.onseeked = () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;

        // Calculate crop area for square thumbnail
        const sourceSize = Math.min(video.videoWidth, video.videoHeight);
        const sourceX = (video.videoWidth - sourceSize) / 2;
        const sourceY = (video.videoHeight - sourceSize) / 2;

        ctx.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/webp', 0.7);
        resolve(dataUrl);
      };

      video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
      video.src = URL.createObjectURL(file);
    });
  }

  private async detectSpiritualContext(file: File): Promise<MediaUpload['spiritualContext']> {
    // This would integrate with OCR service in production
    // For now, return a basic structure
    return {
      isPrayerImage: false,
      containsScripture: false,
      scriptureVerses: [],
      emotionalTone: 'hopeful'
    };
  }

  private async addPrayerOverlay(file: File, overlayText: string): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Add ethereal glass overlay
        const overlayHeight = 80;
        const gradient = ctx.createLinearGradient(0, img.height - overlayHeight, 0, img.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, img.height - overlayHeight, img.width, overlayHeight);

        // Add prayer text
        ctx.fillStyle = '#333333';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        const maxWidth = img.width - 40;
        const lines = this.wrapText(ctx, overlayText, maxWidth);
        const lineHeight = 20;
        const startY = img.height - overlayHeight + 20;

        lines.forEach((line, index) => {
          ctx.fillText(line, img.width / 2, startY + (index * lineHeight));
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const overlayFile = new File([blob], file.name, { type: 'image/png' });
            resolve(overlayFile);
          } else {
            reject(new Error('Failed to add prayer overlay'));
          }
        }, 'image/png', 0.9);
      };

      img.onerror = () => reject(new Error('Failed to load image for overlay'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async uploadToStorage(
    file: File,
    conversationId: string,
    type: MediaUpload['type'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!supabase) {
      throw this.createMediaError('NETWORK_ERROR', 'Supabase client not initialized');
    }

    try {
      // Generate organized file path
      const timestamp = Date.now();
      const extension = this.getFileExtension(file);
      const fileName = `conversations/${conversationId}/${type}/${timestamp}.${extension}`;

      // Upload with progress tracking
      const { data, error } = await supabase.storage
        .from('message-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            onProgress?.(percentage);
          }
        });

      if (error) {
        throw this.createMediaError('UPLOAD_FAILED', error.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-media')
        .getPublicUrl(data.path);

      return publicUrl;

    } catch (error) {
      if (error instanceof Error && error.message.includes('storage_full')) {
        throw this.createMediaError('STORAGE_FULL', 'Storage quota exceeded');
      }
      throw error;
    }
  }

  // Utility methods
  private calculateScaledDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    
    if (originalWidth > originalHeight) {
      const width = Math.min(originalWidth, maxWidth);
      return { width, height: Math.round(width / aspectRatio) };
    } else {
      const height = Math.min(originalHeight, maxHeight);
      return { width: Math.round(height * aspectRatio), height };
    }
  }

  private updateProgress(uploadId: string, progress: number, stage: string): void {
    const upload = this.uploadQueue.get(uploadId);
    if (upload) {
      upload.uploadProgress = progress;
      const callback = this.progressCallbacks.get(uploadId);
      callback?.(progress, stage);
    }
  }

  private getCompressionLevel(originalSize: number, compressedSize: number): MediaUpload['compressionLevel'] {
    const ratio = compressedSize / originalSize;
    if (ratio > 0.8) return 'low';
    if (ratio > 0.5) return 'medium';
    return 'high';
  }

  private createMediaError(type: MediaError, message: string): MediaErrorDetails {
    return {
      type,
      message,
      retryable: ['NETWORK_ERROR', 'UPLOAD_FAILED'].includes(type)
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileExtension(file: File): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a'
    };
    return mimeToExt[file.type] || 'bin';
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  }

  private async getMediaDuration(file: File): Promise<{ duration: number } | null> {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.onloadedmetadata = () => {
        resolve({ duration: audio.duration });
      };
      audio.onerror = () => resolve(null);
      audio.src = URL.createObjectURL(file);
    });
  }

  private async extractExifData(file: File): Promise<{ orientation?: number } | null> {
    // Simplified EXIF extraction - in production would use a library like piexifjs
    return null;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  // Public methods for managing uploads
  setProgressCallback(uploadId: string, callback: ProgressCallback): void {
    this.progressCallbacks.set(uploadId, callback);
  }

  getUpload(uploadId: string): MediaUpload | undefined {
    return this.uploadQueue.get(uploadId);
  }

  cancelUpload(uploadId: string): void {
    this.uploadQueue.delete(uploadId);
    this.progressCallbacks.delete(uploadId);
  }

  cleanup(): void {
    this.compressionWorker?.terminate();
    this.uploadQueue.clear();
    this.progressCallbacks.clear();
  }
}