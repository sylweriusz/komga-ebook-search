/**
 * PDF Cache Service - Session-based caching for PDF detection results, text content, and FlexSearch indexes
 * 
 * Extended for Phase 2: Full text content caching and search index management
 */

import pkg from 'flexsearch';
const { Index } = pkg;
import type { PdfQuality, PdfCacheEntry, PdfTextPage } from './types.js';

interface ExtendedPdfCacheEntry extends PdfCacheEntry {
  textContent?: string;
  searchIndex?: any; // FlexSearch.Index
  textPages?: PdfTextPage[];
  lastAccessed: Date;
}

export class PdfCacheService {
  private detectionCache = new Map<string, PdfCacheEntry>();
  private textCache = new Map<string, ExtendedPdfCacheEntry>();

  // === Detection Cache Methods (Phase 1) ===
  getCachedDetection(bookId: string): PdfQuality | null {
    const entry = this.detectionCache.get(`pdf-detection-${bookId}`);
    return entry?.quality || null;
  }

  cacheDetection(bookId: string, quality: PdfQuality): void {
    const cacheKey = `pdf-detection-${bookId}`;
    this.detectionCache.set(cacheKey, {
      bookId,
      quality,
      cacheKey,
      cachedAt: new Date()
    });
  }

  // === Text Content Cache Methods (Phase 2) ===
  getCachedTextContent(bookId: string): string | null {
    const entry = this.textCache.get(bookId);
    if (entry) {
      entry.lastAccessed = new Date();
      return entry.textContent || null;
    }
    return null;
  }

  getCachedSearchIndex(bookId: string): any | null {
    const entry = this.textCache.get(bookId);
    if (entry) {
      entry.lastAccessed = new Date();
      return entry.searchIndex || null;
    }
    return null;
  }

  async cacheTextContentWithIndex(
    bookId: string, 
    textContent: string, 
    textPages: PdfTextPage[]
  ): Promise<void> {
    // Create FlexSearch index
    const index = new Index({
      preset: 'performance',
      tokenize: 'forward',
      resolution: 5
    });

    // Index each page
    textPages.forEach(page => {
      index.add(page.pageNumber, page.content);
    });

    // Store in cache
    this.textCache.set(bookId, {
      bookId,
      quality: this.getCachedDetection(bookId)!,
      textContent,
      textPages,
      searchIndex: index,
      cacheKey: `pdf-text-${bookId}`,
      cachedAt: new Date(),
      lastAccessed: new Date()
    });
  }

  searchInPdf(bookId: string, searchTerm: string): PdfTextPage[] {
    const entry = this.textCache.get(bookId);
    if (!entry?.searchIndex || !entry.textPages) {
      return [];
    }

    entry.lastAccessed = new Date();
    
    // Search using FlexSearch
    const results = entry.searchIndex.search(searchTerm);
    
    // Return matching pages with context
    return entry.textPages.filter(page => 
      results.includes(page.pageNumber)
    );
  }

  clearCache(): void {
    this.detectionCache.clear();
    this.textCache.clear();
  }

  getCacheStats() {
    const textEntries = this.textCache.size;
    const totalTextSize = Array.from(this.textCache.values())
      .reduce((sum, entry) => sum + (entry.textContent?.length || 0), 0);

    return {
      detectionEntries: this.detectionCache.size,
      textEntries,
      totalTextSize: `~${Math.round(totalTextSize / 1024)}KB`,
      totalMemory: `~${this.detectionCache.size + textEntries * 50}KB`
    };
  }
}
