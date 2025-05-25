/**
 * Search Within Book - Service
 * 
 * The text detective. EPUBs get the full FlexSearch treatment,
 * PDFs get practical guidance. Clean separation, clean results.
 */

import { KomgaHttpClient } from '../../infrastructure/komga/client.js';
import { EpubProcessingService } from '../../infrastructure/epub/processor.js';
import { EpubCacheService } from '../../infrastructure/cache/service.js';
import { PdfQualityDetector } from '../../infrastructure/pdf/detector.js';
import { PdfCacheService } from '../../infrastructure/pdf/cache-service.js';
import { PdfTextExtractor } from '../../infrastructure/pdf/text-extractor.js';
import { SearchWithinArgs, SearchWithinBookResponse, SearchResult } from '../../types/index.js';

export class SearchWithinService {
  constructor(
    private komgaClient: KomgaHttpClient,
    private epubProcessor: EpubProcessingService,
    private epubCache: EpubCacheService,
    private pdfQualityDetector: PdfQualityDetector,
    private pdfCacheService: PdfCacheService,
    private pdfTextExtractor: PdfTextExtractor
  ) {}

  async searchWithin(args: SearchWithinArgs): Promise<SearchWithinBookResponse | any> {
    // Check book format
    const book = await this.komgaClient.getBook(args.book_id);
    const isEpub = book.media?.mediaType === 'application/epub+zip';

    if (isEpub) {
      return await this.searchEpubContent(args);
    } else {
      // Enhanced PDF routing - check if text searchable
      return await this.searchPdfContent(args);
    }
  }
  private async searchEpubContent(args: SearchWithinArgs): Promise<SearchWithinBookResponse> {
    // Get book metadata for cache naming
    const book = await this.komgaClient.getBook(args.book_id);
    const bookName = book.name || 'Unknown Book';
    
    // Get cached EPUB data
    const cacheEntry = await this.epubCache.getOrCreate(args.book_id, async () => {
      const epubBuffer = await this.komgaClient.getBookFile(args.book_id);
      return await this.epubProcessor.extractChapters(epubBuffer);
    }, bookName);

    // Search using FlexSearch index
    const results = cacheEntry.index.search(args.search_term);
    const searchResults: SearchResult[] = [];

    for (const chapterNum of results) {
      const chapter = cacheEntry.chapters.find(c => c.number === chapterNum);
      if (!chapter) continue;

      // Find context around matches
      const content = chapter.content.toLowerCase();
      const term = args.search_term.toLowerCase();
      const termIndex = content.indexOf(term);
      
      if (termIndex !== -1) {
        const contextStart = Math.max(0, termIndex - 100);
        const contextEnd = Math.min(content.length, termIndex + term.length + 100);
        const context = chapter.content.slice(contextStart, contextEnd);
        
        searchResults.push({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          context: context.trim(),
          highlights: [args.search_term],
          score: 1.0
        });
      }
    }

    return {
      searchTerm: args.search_term,
      totalResults: searchResults.length,
      results: searchResults
    };
  }

  /**
   * Enhanced PDF search - routes between text search and guidance based on quality
   */
  private async searchPdfContent(args: SearchWithinArgs): Promise<SearchWithinBookResponse | any> {
    try {
      // Check cached quality first
      const cachedQuality = this.pdfCacheService.getCachedDetection(args.book_id);
      
      let quality;
      if (cachedQuality) {
        quality = cachedQuality;
      } else {
        // Detect PDF quality
        quality = await this.pdfQualityDetector.detectPdfQuality(args.book_id);
        this.pdfCacheService.cacheDetection(args.book_id, quality);
      }

      // Route based on quality
      if (quality.type === 'good-text' || quality.type === 'fair-text') {
        return await this.searchPdfTextContent(args);
      } else {
        return await this.providePdfGuidance(args);
      }
    } catch (error) {
      console.error(`PDF search failed for ${args.book_id}, providing guidance:`, error);
      return await this.providePdfGuidance(args);
    }
  }

  /**
   * Search within text-based PDF using FlexSearch
   */
  private async searchPdfTextContent(args: SearchWithinArgs): Promise<SearchWithinBookResponse> {
    // Check if text content is already cached
    const cachedIndex = this.pdfCacheService.getCachedSearchIndex(args.book_id);
    
    if (!cachedIndex) {
      // Extract and cache text content with search index
      await this.extractAndCachePdfText(args.book_id);
    }

    // Search using cached FlexSearch index
    const matchingPages = this.pdfCacheService.searchInPdf(args.book_id, args.search_term);
    const searchResults: SearchResult[] = [];

    for (const page of matchingPages) {
      // Find context around matches
      const content = page.content.toLowerCase();
      const term = args.search_term.toLowerCase();
      const termIndex = content.indexOf(term);
      
      if (termIndex !== -1) {
        const contextStart = Math.max(0, termIndex - 100);
        const contextEnd = Math.min(content.length, termIndex + term.length + 100);
        const context = page.content.slice(contextStart, contextEnd);
        
        searchResults.push({
          chapterNumber: page.pageNumber,
          chapterTitle: `Page ${page.pageNumber}`,
          context: context.trim(),
          highlights: [args.search_term],
          score: 1.0
        });
      }
    }

    return {
      searchTerm: args.search_term,
      totalResults: searchResults.length,
      results: searchResults
    };
  }

  /**
   * Extract PDF text and create search index
   */
  private async extractAndCachePdfText(bookId: string): Promise<void> {
    try {
      // Extract all text from PDF
      const extractionResult = await this.pdfTextExtractor.extractAllText(bookId);
      
      // Convert to pages format for search indexing
      const words = extractionResult.text.split(' ');
      const wordsPerPage = 500; // Approximate page size
      const textPages = [];
      
      for (let pageNum = 1; pageNum <= extractionResult.totalPages; pageNum++) {
        const startIdx = (pageNum - 1) * wordsPerPage;
        const endIdx = Math.min(startIdx + wordsPerPage, words.length);
        const pageContent = words.slice(startIdx, endIdx).join(' ');
        
        if (pageContent.trim()) {
          textPages.push({
            pageNumber: pageNum,
            content: pageContent,
            wordCount: endIdx - startIdx
          });
        }
      }

      // Cache with FlexSearch index
      await this.pdfCacheService.cacheTextContentWithIndex(
        bookId, 
        extractionResult.text, 
        textPages
      );
    } catch (error) {
      console.error(`Failed to extract and cache PDF text for ${bookId}:`, error);
      throw error;
    }
  }

  private async providePdfGuidance(args: SearchWithinArgs): Promise<any> {
    const overview = await this.komgaClient.getBook(args.book_id);
    return {
      bookTitle: overview.name,
      searchTerm: args.search_term,
      message: `To search for "${args.search_term}" in this PDF book, use read_book_pages to examine specific sections`
    };
  }
}
