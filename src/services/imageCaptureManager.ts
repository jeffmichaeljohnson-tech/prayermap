/**
 * Image Capture Manager with Native Camera Integration
 * Handles camera access, image capture, and editing capabilities
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import type { ImageCaptureOptions, MediaErrorDetails, MediaError } from '../types/media';

export class ImageCaptureManager {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Capture an image from camera or gallery
   */
  async captureImage(options: ImageCaptureOptions): Promise<File> {
    try {
      if (this.isNative) {
        return this.captureWithCapacitor(options);
      } else {
        return this.captureWithWeb(options);
      }
    } catch (error) {
      console.error('Image capture failed:', error);
      throw this.createError('PERMISSION_DENIED', error instanceof Error ? error.message : 'Image capture failed');
    }
  }

  /**
   * Capture multiple images (for gallery selection)
   */
  async captureMultipleImages(options: ImageCaptureOptions, maxCount: number = 10): Promise<File[]> {
    if (this.isNative) {
      // For native, we'll call single capture multiple times
      // In a full implementation, you'd use a multi-select plugin
      const images: File[] = [];
      for (let i = 0; i < maxCount; i++) {
        try {
          const image = await this.captureWithCapacitor(options);
          images.push(image);
        } catch (error) {
          break; // User cancelled or error occurred
        }
      }
      return images;
    } else {
      return this.captureMultipleWithWeb(options, maxCount);
    }
  }

  /**
   * Get user's camera permissions status
   */
  async checkCameraPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    if (this.isNative) {
      try {
        const permissions = await Camera.checkPermissions();
        return permissions.camera;
      } catch (error) {
        return 'denied';
      }
    } else {
      // Web - check using navigator.permissions if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          return permission.state as 'granted' | 'denied' | 'prompt';
        } catch (error) {
          return 'prompt';
        }
      }
      return 'prompt';
    }
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    if (this.isNative) {
      try {
        const permissions = await Camera.requestPermissions();
        return permissions.camera === 'granted';
      } catch (error) {
        return false;
      }
    } else {
      // For web, permissions are requested when accessing getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Close stream immediately
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  /**
   * Native image capture using Capacitor Camera plugin
   */
  private async captureWithCapacitor(options: ImageCaptureOptions): Promise<File> {
    try {
      // Configure camera options
      const cameraOptions = {
        quality: options.quality || 90,
        allowEditing: options.allowEditing,
        resultType: CameraResultType.DataUrl,
        source: this.getCameraSource(options.source),
        width: options.maxSize,
        height: options.maxSize,
        correctOrientation: true,
        saveToGallery: false
      };

      // Handle aspect ratio if specified
      if (options.aspectRatio && options.aspectRatio !== 'original') {
        const aspectRatios = {
          'square': { width: 1080, height: 1080 },
          '16:9': { width: 1920, height: 1080 },
          '4:3': { width: 1440, height: 1080 }
        };
        
        if (aspectRatios[options.aspectRatio]) {
          cameraOptions.width = aspectRatios[options.aspectRatio].width;
          cameraOptions.height = aspectRatios[options.aspectRatio].height;
        }
      }

      const image: Photo = await Camera.getPhoto(cameraOptions);

      if (!image.dataUrl) {
        throw new Error('Failed to capture image');
      }

      // Convert DataURL to File
      const file = await this.dataUrlToFile(
        image.dataUrl, 
        `image_${Date.now()}.jpg`,
        'image/jpeg'
      );

      return file;

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        throw this.createError('PERMISSION_DENIED', 'Image capture was cancelled');
      }
      throw this.createError('PERMISSION_DENIED', error instanceof Error ? error.message : 'Camera access failed');
    }
  }

  /**
   * Web-based image capture using file input
   */
  private async captureWithWeb(options: ImageCaptureOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      // Configure capture attribute for camera access
      if (options.source === 'camera') {
        input.capture = options.preferredCameraDirection === 'front' ? 'user' : 'environment';
      }

      // Handle file selection
      input.onchange = async (event) => {
        try {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(this.createError('PERMISSION_DENIED', 'No image selected'));
            return;
          }

          // Validate file size if specified
          if (options.maxSize && file.size > options.maxSize) {
            reject(this.createError('FILE_TOO_LARGE', `Image size ${this.formatFileSize(file.size)} exceeds limit`));
            return;
          }

          resolve(file);
        } catch (error) {
          reject(this.createError('PERMISSION_DENIED', error instanceof Error ? error.message : 'Image capture failed'));
        }
      };

      // Handle cancellation
      input.oncancel = () => {
        reject(this.createError('PERMISSION_DENIED', 'Image capture was cancelled'));
      };

      // Trigger file picker
      input.click();
    });
  }

  /**
   * Web-based multiple image capture
   */
  private async captureMultipleWithWeb(options: ImageCaptureOptions, maxCount: number): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      
      if (options.source === 'camera') {
        input.capture = options.preferredCameraDirection === 'front' ? 'user' : 'environment';
      }

      input.onchange = async (event) => {
        try {
          const files = Array.from((event.target as HTMLInputElement).files || []);
          
          if (files.length === 0) {
            reject(this.createError('PERMISSION_DENIED', 'No images selected'));
            return;
          }

          // Limit number of files
          const selectedFiles = files.slice(0, maxCount);

          // Validate each file
          for (const file of selectedFiles) {
            if (!file.type.startsWith('image/')) {
              reject(this.createError('UNSUPPORTED_FORMAT', `File ${file.name} is not a valid image`));
              return;
            }
            
            if (options.maxSize && file.size > options.maxSize) {
              reject(this.createError('FILE_TOO_LARGE', `Image ${file.name} is too large`));
              return;
            }
          }

          resolve(selectedFiles);
        } catch (error) {
          reject(this.createError('PERMISSION_DENIED', error instanceof Error ? error.message : 'Image capture failed'));
        }
      };

      input.oncancel = () => {
        reject(this.createError('PERMISSION_DENIED', 'Image capture was cancelled'));
      };

      input.click();
    });
  }

  /**
   * Create image from camera stream (for custom camera UI)
   */
  async createCameraStream(options: {
    preferredCamera?: 'front' | 'rear';
    idealWidth?: number;
    idealHeight?: number;
  } = {}): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.preferredCamera === 'front' ? 'user' : 'environment',
          width: { ideal: options.idealWidth || 1280 },
          height: { ideal: options.idealHeight || 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', 'Camera access denied');
    }
  }

  /**
   * Capture image from video stream
   */
  async captureFromStream(
    video: HTMLVideoElement, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<File> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas dimensions
    canvas.width = options.width || video.videoWidth;
    canvas.height = options.height || video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File(
              [blob], 
              `capture_${Date.now()}.${options.format || 'jpg'}`,
              { type: `image/${options.format || 'jpeg'}` }
            );
            resolve(file);
          } else {
            reject(this.createError('PROCESSING_TIMEOUT', 'Failed to create image'));
          }
        },
        `image/${options.format || 'jpeg'}`,
        (options.quality || 0.9) / 100
      );
    });
  }

  /**
   * Apply basic image editing (crop, rotate, filters)
   */
  async editImage(
    file: File,
    edits: {
      crop?: { x: number; y: number; width: number; height: number };
      rotate?: number; // degrees
      brightness?: number; // -100 to 100
      contrast?: number; // -100 to 100
      saturation?: number; // -100 to 100
    }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        try {
          // Set up canvas with rotation if needed
          const rotation = (edits.rotate || 0) * (Math.PI / 180);
          const cos = Math.abs(Math.cos(rotation));
          const sin = Math.abs(Math.sin(rotation));
          
          canvas.width = img.width * cos + img.height * sin;
          canvas.height = img.width * sin + img.height * cos;

          // Apply transformations
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rotation);

          // Apply filters
          if (edits.brightness || edits.contrast || edits.saturation) {
            const brightness = ((edits.brightness || 0) + 100) / 100;
            const contrast = ((edits.contrast || 0) + 100) / 100;
            const saturation = ((edits.saturation || 0) + 100) / 100;
            
            ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
          }

          // Draw image
          if (edits.crop) {
            ctx.drawImage(
              img,
              edits.crop.x,
              edits.crop.y,
              edits.crop.width,
              edits.crop.height,
              -edits.crop.width / 2,
              -edits.crop.height / 2,
              edits.crop.width,
              edits.crop.height
            );
          } else {
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
          }

          ctx.restore();

          // Convert to file
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const editedFile = new File([blob], file.name, { type: file.type });
                resolve(editedFile);
              } else {
                reject(this.createError('PROCESSING_TIMEOUT', 'Failed to edit image'));
              }
            },
            file.type,
            0.9
          );
        } catch (error) {
          reject(this.createError('PROCESSING_TIMEOUT', error instanceof Error ? error.message : 'Image editing failed'));
        }
      };

      img.onerror = () => {
        reject(this.createError('UNSUPPORTED_FORMAT', 'Failed to load image for editing'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Utility methods
  private getCameraSource(source: ImageCaptureOptions['source']): CameraSource {
    switch (source) {
      case 'camera':
        return CameraSource.Camera;
      case 'gallery':
        return CameraSource.Photos;
      default:
        return CameraSource.Prompt;
    }
  }

  private async dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }

  private createError(type: MediaError, message: string): MediaErrorDetails {
    return {
      type,
      message,
      retryable: ['NETWORK_ERROR', 'PROCESSING_TIMEOUT'].includes(type)
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}