/**
 * Domain Types - Shared Contracts
 * 
 * Type definitions for the entire system. These are the immutable truths 
 * that bind our architecture together.
 */

// Book Media Types
export type MediaType = 'application/epub+zip' | 'application/pdf' | string;
export type MediaProfile = 'EPUB' | 'PDF' | string;

// Base Book Interface
export interface Book {
  id: string;
  name: string;
  seriesTitle: string;
  url?: string;
  size?: number;
  sizeBytes?: number;
  metadata?: {
    authors?: string[];
    releaseDate?: string;
    [key: string]: any;
  };
  media?: {
    mediaType: MediaType;
    mediaProfile?: MediaProfile;
    pagesCount?: number;
  };
}

// Search Results
export interface BookSearchResult {
  id: string;
  title: string;
  series: string;
  authors: string[];
  year?: string;
  pages?: number;
  mediaType?: MediaType;
  mediaProfile?: MediaProfile;
  format?: string;
  size?: number;
  sizeBytes?: number;
}

// Page/Chapter Data (Enhanced Discriminated Union)
export interface PdfPage {
  type: 'pdf-image';
  pageNumber: number;
  data: string;
  mimeType: string;
  searchable: false;
}

export interface PdfTextContent {
  type: 'pdf-text';
  content: string;
  searchable: true;
  pageCount?: number;
}

export interface EpubChapterData {
  type: 'epub';
  chapterNumber: number;
  title: string;
  content: string;
  searchable: true;
}

export type BookPageContent = PdfPage | PdfTextContent | EpubChapterData;

// EPUB Processing
export interface EpubChapter {
  number: number;
  title: string;
  content: string;
  filename: string;
}

export interface EpubCacheEntry {
  chapters: EpubChapter[];
  index: EpubIndex;
  lastAccessed: Date;
}

// Persistent Cache Types (GDD v1.6)
export interface PersistentCacheEntry {
  bookId: string;
  chapters: EpubChapter[];
  indexData: any; // Serialized FlexSearch index
  processedAt: Date;
  fileSize: number;
  metadata: {
    bookName: string;
    chapterCount: number;
    contentLength: number;
  };
}

export interface CacheMetadata {
  bookId: string;
  processedAt: string; // ISO timestamp
  fileSize: number;
  chapterCount: number;
  contentLength: number;
  bookName: string;
}

export interface CacheStats {
  entries: number;
  totalSize: number;
  oldestEntry: Date | null;
  cacheDirectory: string;
}

export interface EpubIndex {
  search: (query: string) => any[];
  add: (id: number, content: string) => void;
}

// Search Within Book
export interface SearchResult {
  chapterNumber: number;
  chapterTitle: string;
  context: string;
  highlights: string[];
  score: number;
}

export interface SearchWithinBookResponse {
  searchTerm: string;
  totalResults: number;
  results: SearchResult[];
}

// Book Overview
export interface BookOverview {
  book: Book;
  pages: Array<{
    number: number;
    fileName: string;
    mediaType: string;
    size?: number;
    width?: number;
    height?: number;
  }>;
}

// MCP Tool Arguments
export interface SearchBooksArgs {
  query: string;
  library_filter?: string;
}

export interface BookOverviewArgs {
  book_id: string;
}

export interface ReadPagesArgs {
  book_id: string;
  start_page: number;
  end_page: number;
}

export interface SearchWithinArgs {
  book_id: string;
  search_term: string;
}
