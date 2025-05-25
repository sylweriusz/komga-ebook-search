/**
 * Read Pages - Service
 * 
 * The core decision point. PDF or EPUB? Images or text?
 * Clean routing, no guesswork.
 */

import { KomgaHttpClient } from '../../infrastructure/komga/client.js';
import { ImageCompressionService } from '../../infrastructure/compression/service.js';
import { EpubProcessingService } from '../../infrastructure/epub/processor.js';
import { EpubCacheService } from '../../infrastructure/cache/service.js';
import { PdfQualityDetector } from '../../infrastructure/pdf/detector.js';
import { PdfCacheService } from '../../infrastructure/pdf/cache-service.js';
import { PdfTextExtractor } from '../../infrastructure/pdf/text-extractor.js';
import { BookPageContent, ReadPagesArgs, PdfPage, EpubChapterData, PdfTextContent } from '../../types/index.js';

export class ReadPagesService {
  constructor(
    private komgaClient: KomgaHttpClient,
    private compressionService: ImageCompressionService,
    private epubProcessor: EpubProcessingService,
    private epubCache: EpubCacheService,
    private pdfQualityDetector: PdfQualityDetector,
    private pdfCacheService: PdfCacheService,
    private pdfTextExtractor: PdfTextExtractor
  ) {}

  async readPages(args: ReadPagesArgs): Promise<BookPageContent[]> {
    // Determine book format first
    const book = await this.komgaClient.getBook(args.book_id);
    const isEpub = book.media?.mediaType === 'application/epub+zip';

    if (isEpub) {
      return await this.readEpubChapters(args);
    } else {
      // Enhanced PDF routing with quality detection
      return await this.readPdfPagesWithDetection(args);
    }
  }

  /**
   * Enhanced PDF reading with text quality detection
   */
  private async readPdfPagesWithDetection(args: ReadPagesArgs): Promise<BookPageContent[]> {
    try {
      // Check cache first
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
        return await this.readPdfTextContent(args);
      } else {
        // Fall back to image path for poor quality or image-only PDFs
        return await this.readPdfPages(args);
      }
    } catch (error) {
      console.error(`PDF detection failed for ${args.book_id}, falling back to image path:`, error);
      return await this.readPdfPages(args);
    }
  }

  /**
   * Read PDF as text content (for good quality text PDFs)
   */
  private async readPdfTextContent(args: ReadPagesArgs): Promise<PdfTextContent[]> {
    try {
      const textPages = await this.pdfTextExtractor.extractPageRange(
        args.book_id, 
        args.start_page, 
        args.end_page
      );

      const allText = textPages.map(page => page.content).join('\n\n');

      return [{
        type: 'pdf-text',
        content: allText,
        searchable: true,
        pageCount: textPages.length
      }];
    } catch (error) {
      console.error(`PDF text extraction failed, treating as image-only:`, error);
      // Return empty array rather than falling back to different type
      return [];
    }
  }
  private async readPdfPages(args: ReadPagesArgs): Promise<PdfPage[]> {
    const maxPages = Math.min(args.end_page - args.start_page + 1, 15);
    const pages: PdfPage[] = [];

    for (let i = 0; i < maxPages; i++) {
      const pageNum = args.start_page + i;
      try {
        const imageBuffer = await this.komgaClient.getBookPage(args.book_id, pageNum);
        const compressedData = await this.compressionService.compressToBase64(imageBuffer);

        pages.push({
          type: 'pdf-image',
          pageNumber: pageNum,
          data: compressedData,
          mimeType: 'image/jpeg',
          searchable: false
        });
      } catch (error) {
        console.error(`Failed to fetch page ${pageNum}:`, error);
      }
    }

    return pages;
  }

  private async readEpubChapters(args: ReadPagesArgs): Promise<EpubChapterData[]> {
    const maxChapters = Math.min(args.end_page - args.start_page + 1, 15);
    
    // Get book metadata for cache naming
    const book = await this.komgaClient.getBook(args.book_id);
    const bookName = book.name || 'Unknown Book';
    
    // Get cached or process EPUB
    const cacheEntry = await this.epubCache.getOrCreate(args.book_id, async () => {
      const epubBuffer = await this.komgaClient.getBookFile(args.book_id);
      return await this.epubProcessor.extractChapters(epubBuffer);
    }, bookName);

    const requestedChapters: EpubChapterData[] = [];

    for (let i = 0; i < maxChapters; i++) {
      const chapterNum = args.start_page + i;
      const chapter = cacheEntry.chapters.find(c => c.number === chapterNum);
      
      if (chapter) {
        requestedChapters.push({
          type: 'epub',
          chapterNumber: chapterNum,
          title: chapter.title,
          content: chapter.content.slice(0, 10000), // Token limit protection
          searchable: true
        });
      }
    }

    return requestedChapters;
  }
}
