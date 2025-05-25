/**
 * PDF Quality Detection Service
 * Conservative detection of PDF text quality using GDD v1.6 approach.
 */

import type { KomgaHttpClient } from '../komga/client.js';
import type { PdfTextExtractor } from './text-extractor.js';
import type { PdfQuality } from './types.js';

export class PdfQualityDetector {
  constructor(
    private komgaClient: KomgaHttpClient,
    private textExtractor: PdfTextExtractor
  ) {}

  /**
   * Detect PDF quality using conservative approach
   */
  async detectPdfQuality(bookId: string): Promise<PdfQuality> {
    try {
      const result = await this.textExtractor.extractAllText(bookId);
      return result.quality;
    } catch (error) {
      // Conservative fallback on any extraction error
      return {
        type: 'image-only',
        confidence: 0,
        textDensity: 0,
        wordQuality: 0,
        detectedAt: new Date()
      };
    }
  }
}
