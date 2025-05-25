/**
 * Search Books - Service
 * 
 * Business logic for book discovery. Clean, focused, surgical.
 * Finds books, formats results, doesn't ask for what you didn't order.
 */

import { KomgaHttpClient } from '../../infrastructure/komga/client.js';
import { BookSearchResult, SearchBooksArgs } from '../../types/index.js';
import { Library, BookSearchQuery } from './types.js';
import { loadKomgaConfig } from '../../config/index.js';

export class SearchBooksService {
  constructor(private komgaClient: KomgaHttpClient) {}

  async searchBooks(args: SearchBooksArgs): Promise<BookSearchResult[]> {
    try {
      const searchBody = await this.buildSearchQuery(args);
      console.error('Search query:', JSON.stringify(searchBody));
      
      const books = await this.komgaClient.searchBooks(searchBody);
      console.error(`Found ${books.length} books`);
      
      return this.formatResults(books);
    } catch (error: any) {
      console.error('Search failed:', error.message);
      return [];
    }
  }

  private async buildSearchQuery(args: SearchBooksArgs): Promise<BookSearchQuery> {
    const config = loadKomgaConfig();
    const libraries = await this.komgaClient.getLibraries();
    
    // Filter to configured library only
    const filtered = libraries.filter(lib => 
      lib.name.toLowerCase().includes(config.defaultLibrary.toLowerCase())
    );

    return {
      fullTextSearch: args.query,
      libraryId: filtered.map(lib => lib.id)
    };
  }
  private formatResults(books: any[]): BookSearchResult[] {
    return books.slice(0, 10).map(book => ({
      id: book.id,
      title: book.name,
      series: book.seriesTitle || '',
      authors: book.metadata?.authors || [],
      year: book.metadata?.releaseDate,
      pages: book.media?.pagesCount,
      mediaType: book.media?.mediaType,
      mediaProfile: book.media?.mediaProfile,
      format: book.url?.split('.').pop(),
      size: book.size,
      sizeBytes: book.sizeBytes
    }));
  }
}
