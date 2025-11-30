/**
 * Prayer Media Processor for Spiritual Context Detection
 * Handles scripture recognition, location extraction, and prayer overlays
 */

import type { 
  SpiritualContext, 
  GeoLocation, 
  MediaErrorDetails, 
  MediaError,
  SCRIPTURE_PATTERNS 
} from '../types/media';

interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ScriptureReference {
  book: string;
  chapter: number;
  verse: string;
  text?: string;
  confidence: number;
}

export class PrayerMediaProcessor {
  private ocrApiKey?: string;
  private scriptureApiKey?: string;

  constructor(config?: {
    ocrApiKey?: string;
    scriptureApiKey?: string;
  }) {
    this.ocrApiKey = config?.ocrApiKey;
    this.scriptureApiKey = config?.scriptureApiKey;
  }

  /**
   * Detect scripture text in images using OCR
   */
  async detectScriptureInImage(imageFile: File): Promise<{
    hasScripture: boolean;
    verses: Array<{
      text: string;
      reference?: string;
      confidence: number;
    }>;
  }> {
    try {
      // Extract text from image
      const extractedText = await this.performOCR(imageFile);
      
      if (!extractedText) {
        return { hasScripture: false, verses: [] };
      }

      // Detect scripture patterns
      const verses = await this.extractVerses(extractedText);

      return {
        hasScripture: verses.length > 0,
        verses
      };

    } catch (error) {
      console.warn('Scripture detection failed:', error);
      return { hasScripture: false, verses: [] };
    }
  }

  /**
   * Generate prayer location from image metadata
   */
  async extractPrayerLocation(imageFile: File): Promise<GeoLocation | null> {
    try {
      const exifData = await this.extractExifData(imageFile);
      
      if (exifData?.gps) {
        return {
          latitude: exifData.gps.latitude,
          longitude: exifData.gps.longitude,
          accuracy: exifData.gps.accuracy || 10
        };
      }

      return null;
    } catch (error) {
      console.warn('Could not extract location from image:', error);
      return null;
    }
  }

  /**
   * Analyze image for spiritual and emotional context
   */
  async analyzeSpiritualContext(imageFile: File): Promise<SpiritualContext> {
    try {
      const [scriptureResult, location, emotionalTone] = await Promise.all([
        this.detectScriptureInImage(imageFile),
        this.extractPrayerLocation(imageFile),
        this.detectEmotionalTone(imageFile)
      ]);

      const context: SpiritualContext = {
        isPrayerImage: this.isPrayerRelatedImage(imageFile.name),
        containsScripture: scriptureResult.hasScripture,
        scriptureVerses: scriptureResult.verses,
        prayerLocation: location,
        emotionalTone: emotionalTone,
        hasPrayerOverlay: false
      };

      return context;

    } catch (error) {
      console.warn('Spiritual context analysis failed:', error);
      return {
        isPrayerImage: false,
        containsScripture: false,
        scriptureVerses: [],
        emotionalTone: 'hopeful'
      };
    }
  }

  /**
   * Add ethereal prayer overlay to images
   */
  async addPrayerOverlay(
    imageFile: File, 
    prayerText: string,
    options: {
      style?: 'ethereal' | 'minimal' | 'bold';
      position?: 'bottom' | 'top' | 'center';
      opacity?: number;
    } = {}
  ): Promise<File> {
    const { style = 'ethereal', position = 'bottom', opacity = 0.9 } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Add prayer overlay based on style
          this.drawPrayerOverlay(ctx, prayerText, {
            width: img.width,
            height: img.height,
            style,
            position,
            opacity
          });

          // Convert back to file
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const overlayFile = new File(
                  [blob], 
                  `prayer_${imageFile.name}`, 
                  { type: 'image/png' }
                );
                resolve(overlayFile);
              } else {
                reject(new Error('Failed to create prayer overlay'));
              }
            },
            'image/png',
            0.9
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Create scripture verse image with ethereal styling
   */
  async createScriptureImage(
    verse: string,
    reference: string,
    dimensions: { width: number; height: number } = { width: 800, height: 600 }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      try {
        // Create ethereal gradient background
        const gradient = ctx.createRadialGradient(
          dimensions.width / 2, 
          dimensions.height / 2, 
          0,
          dimensions.width / 2, 
          dimensions.height / 2, 
          Math.max(dimensions.width, dimensions.height) / 2
        );
        
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.1)'); // Light purple center
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)'); // Light blue middle
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)'); // White edge

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Add subtle texture
        this.addTextureOverlay(ctx, dimensions);

        // Draw verse text
        this.drawScriptureText(ctx, verse, reference, dimensions);

        // Convert to file
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const scriptureFile = new File(
                [blob], 
                `scripture_${Date.now()}.png`, 
                { type: 'image/png' }
              );
              resolve(scriptureFile);
            } else {
              reject(new Error('Failed to create scripture image'));
            }
          },
          'image/png',
          0.9
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Perform OCR on image using Web API or fallback
   */
  private async performOCR(imageFile: File): Promise<string> {
    // In a production environment, you would integrate with services like:
    // - Google Cloud Vision API
    // - Azure Computer Vision
    // - AWS Textract
    // - Tesseract.js for client-side OCR

    if (this.ocrApiKey) {
      return this.performCloudOCR(imageFile);
    } else {
      return this.performClientOCR(imageFile);
    }
  }

  /**
   * Cloud-based OCR (Google Vision API example)
   */
  private async performCloudOCR(imageFile: File): Promise<string> {
    try {
      // Convert image to base64
      const base64 = await this.fileToBase64(imageFile);
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.ocrApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64.split(',')[1] // Remove data:image/jpeg;base64, prefix
            },
            features: [{ type: 'TEXT_DETECTION' }]
          }]
        })
      });

      const result = await response.json();
      
      if (result.responses?.[0]?.textAnnotations?.[0]?.description) {
        return result.responses[0].textAnnotations[0].description;
      }

      return '';
    } catch (error) {
      console.warn('Cloud OCR failed, falling back to client-side:', error);
      return this.performClientOCR(imageFile);
    }
  }

  /**
   * Client-side OCR using Tesseract.js (would require installation)
   */
  private async performClientOCR(imageFile: File): Promise<string> {
    // For now, return empty string
    // In production, you would use Tesseract.js:
    /*
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();
    return text;
    */
    
    console.warn('Client-side OCR not implemented. Install tesseract.js for offline OCR support.');
    return '';
  }

  /**
   * Extract scripture verses from text using pattern matching
   */
  private async extractVerses(text: string): Promise<Array<{
    text: string;
    reference?: string;
    confidence: number;
  }>> {
    const verses: Array<{ text: string; reference?: string; confidence: number }> = [];
    
    // Scripture reference patterns
    const patterns = [
      /\b\d*\s*([A-Z][a-z]+)\s+(\d+):(\d+(?:-\d+)?)\b/g, // "John 3:16" format
      /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song\s*of\s*Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s*Corinthians|2\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s*Thessalonians|2\s*Thessalonians|1\s*Timothy|2\s*Timothy|Titus|Philemon|Hebrews|James|1\s*Peter|2\s*Peter|1\s*John|2\s*John|3\s*John|Jude|Revelation)\s+(\d+):(\d+(?:-\d+)?)\b/ig
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const reference = match[0];
        const book = match[1];
        const chapter = match[2];
        const verse = match[3];

        // Extract surrounding context as the verse text
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 200);
        const context = text.substring(contextStart, contextEnd).trim();

        verses.push({
          text: context,
          reference: reference,
          confidence: this.calculateScriptureConfidence(reference, context)
        });
      }
    }

    // Also look for common biblical phrases without explicit references
    const biblicalPhrases = [
      /\b(for god so loved the world|the lord is my shepherd|i can do all things|be still and know|trust in the lord|blessed are|our father who art in heaven)\b/ig,
      /\b(faith hope and love|love thy neighbor|forgive us our trespasses|thy kingdom come|in the beginning was the word)\b/ig
    ];

    for (const phrasePattern of biblicalPhrases) {
      let match;
      while ((match = phrasePattern.exec(text)) !== null) {
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
        const context = text.substring(contextStart, contextEnd).trim();

        verses.push({
          text: context,
          confidence: 0.7 // Lower confidence for phrases without explicit references
        });
      }
    }

    // Remove duplicates and sort by confidence
    return verses
      .filter((verse, index, self) => 
        index === self.findIndex(v => v.text === verse.text)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 matches
  }

  /**
   * Calculate confidence score for scripture detection
   */
  private calculateScriptureConfidence(reference: string, context: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for well-formed references
    if (/\b\d*\s*[A-Z][a-z]+\s+\d+:\d+(-\d+)?\b/.test(reference)) {
      confidence += 0.3;
    }

    // Increase confidence for known biblical books
    const biblicalBooks = [
      'Genesis', 'Exodus', 'Matthew', 'Mark', 'Luke', 'John', 'Romans', 'Psalms'
    ];
    
    if (biblicalBooks.some(book => reference.includes(book))) {
      confidence += 0.2;
    }

    // Increase confidence for biblical language in context
    const biblicalWords = ['lord', 'god', 'jesus', 'christ', 'blessed', 'righteousness', 'salvation'];
    const contextLower = context.toLowerCase();
    const biblicalWordCount = biblicalWords.filter(word => contextLower.includes(word)).length;
    
    confidence += Math.min(0.2, biblicalWordCount * 0.05);

    return Math.min(1.0, confidence);
  }

  /**
   * Detect emotional tone from image (simplified implementation)
   */
  private async detectEmotionalTone(imageFile: File): Promise<SpiritualContext['emotionalTone']> {
    // In production, this would use image analysis AI
    // For now, return based on file name or default
    const fileName = imageFile.name.toLowerCase();
    
    if (fileName.includes('joy') || fileName.includes('happy') || fileName.includes('celebrate')) {
      return 'joyful';
    } else if (fileName.includes('peace') || fileName.includes('calm') || fileName.includes('serene')) {
      return 'peaceful';
    } else if (fileName.includes('urgent') || fileName.includes('help') || fileName.includes('emergency')) {
      return 'urgent';
    } else if (fileName.includes('thank') || fileName.includes('grateful') || fileName.includes('praise')) {
      return 'grateful';
    } else if (fileName.includes('sad') || fileName.includes('grief') || fileName.includes('loss')) {
      return 'sad';
    } else {
      return 'hopeful'; // Default
    }
  }

  /**
   * Check if image is prayer-related based on metadata
   */
  private isPrayerRelatedImage(fileName: string): boolean {
    const prayerKeywords = ['prayer', 'pray', 'bible', 'scripture', 'verse', 'church', 'worship', 'faith'];
    const lowerFileName = fileName.toLowerCase();
    return prayerKeywords.some(keyword => lowerFileName.includes(keyword));
  }

  /**
   * Extract EXIF GPS data from image
   */
  private async extractExifData(imageFile: File): Promise<{
    gps?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  } | null> {
    // Simplified EXIF extraction
    // In production, you would use a library like exif-js or piexifjs
    return null;
  }

  /**
   * Draw prayer overlay on canvas with ethereal styling
   */
  private drawPrayerOverlay(
    ctx: CanvasRenderingContext2D,
    prayerText: string,
    config: {
      width: number;
      height: number;
      style: 'ethereal' | 'minimal' | 'bold';
      position: 'bottom' | 'top' | 'center';
      opacity: number;
    }
  ): void {
    const { width, height, style, position, opacity } = config;

    // Calculate overlay dimensions and position
    const overlayHeight = Math.min(120, height * 0.25);
    let overlayY = 0;
    
    switch (position) {
      case 'top':
        overlayY = 0;
        break;
      case 'center':
        overlayY = (height - overlayHeight) / 2;
        break;
      case 'bottom':
      default:
        overlayY = height - overlayHeight;
    }

    // Create ethereal gradient background
    if (style === 'ethereal') {
      const gradient = ctx.createLinearGradient(0, overlayY, 0, overlayY + overlayHeight);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.1})`);
      gradient.addColorStop(0.5, `rgba(168, 85, 247, ${opacity * 0.2})`); // Purple
      gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.9})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, overlayY, width, overlayHeight);

      // Add subtle border
      ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, overlayY, width, overlayHeight);
    } else if (style === 'minimal') {
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.7})`;
      ctx.fillRect(0, overlayY, width, overlayHeight);
    } else { // bold
      ctx.fillStyle = `rgba(168, 85, 247, ${opacity})`;
      ctx.fillRect(0, overlayY, width, overlayHeight);
    }

    // Draw text
    const fontSize = Math.max(16, Math.min(24, width / 30));
    ctx.font = `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = style === 'bold' ? '#ffffff' : '#333333';

    // Wrap text to fit
    const maxWidth = width - 40;
    const lines = this.wrapText(ctx, prayerText, maxWidth);
    const lineHeight = fontSize * 1.4;
    const totalTextHeight = lines.length * lineHeight;
    const textStartY = overlayY + (overlayHeight - totalTextHeight) / 2 + fontSize;

    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, textStartY + (index * lineHeight));
    });
  }

  /**
   * Draw scripture text with ethereal styling
   */
  private drawScriptureText(
    ctx: CanvasRenderingContext2D,
    verse: string,
    reference: string,
    dimensions: { width: number; height: number }
  ): void {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Draw main verse
    const verseFontSize = Math.max(20, Math.min(32, dimensions.width / 25));
    ctx.font = `${verseFontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2d3748';

    const verseLines = this.wrapText(ctx, verse, dimensions.width - 100);
    const verseLineHeight = verseFontSize * 1.5;
    const verseStartY = centerY - ((verseLines.length - 1) * verseLineHeight) / 2;

    verseLines.forEach((line, index) => {
      ctx.fillText(line, centerX, verseStartY + (index * verseLineHeight));
    });

    // Draw reference
    const refFontSize = verseFontSize * 0.7;
    ctx.font = `italic ${refFontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#718096';
    
    const refY = verseStartY + (verseLines.length * verseLineHeight) + 30;
    ctx.fillText(`— ${reference}`, centerX, refY);
  }

  /**
   * Add subtle texture overlay for ethereal effect
   */
  private addTextureOverlay(ctx: CanvasRenderingContext2D, dimensions: { width: number; height: number }): void {
    // Create subtle noise texture
    const imageData = ctx.createImageData(dimensions.width, dimensions.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 10; // Very subtle noise
      data[i] = 255; // Red
      data[i + 1] = 255; // Green
      data[i + 2] = 255; // Blue
      data[i + 3] = noise; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Wrap text to fit within specified width
   */
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

  /**
   * Convert file to base64 for API calls
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}