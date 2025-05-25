/**
 * PDF-specific Types
 * 
 * Domain contracts for PDF text detection and processing
 */

export interface PdfQuality {
  type: 'good-text' | 'fair-text' | 'poor-text' | 'image-only';
  confidence: number;
  textDensity: number;
  wordQuality: number;
  detectedAt: Date;
}

export interface PdfDetectionThresholds {
  GOOD_TEXT: {
    minTextDensity: number;
    minWordCount: number;
    avgWordLength: [number, number];
    maxNoiseRatio: number;
  };
  FAIR_TEXT: {
    minTextDensity: number;
    minWordCount: number;
    avgWordLength: [number, number];
    maxNoiseRatio: number;
  };
  IMAGE_FALLBACK: {
    maxTextDensity: number;
  };
}

export interface PdfCacheEntry {
  bookId: string;
  quality: PdfQuality;
  textContent?: string;
  searchIndex?: any; // FlexSearch.Document type will be imported when needed
  cacheKey: string;
  cachedAt: Date;
}

export interface PdfTextPage {
  pageNumber: number;
  content: string;
  wordCount: number;
}

export interface PdfExtractionResult {
  text: string;
  totalPages: number;
  extractedPages: number;
  quality: PdfQuality;
}
