/**
 * Search Books - Handler
 * 
 * MCP tool entry point. Validates, delegates, responds.
 * No business logic here - just a professional doorman.
 */

import { SearchBooksArgs, BookSearchResult } from '../../types/index.js';
import { SearchBooksService } from './service.js';

export class SearchBooksHandler {
  constructor(private service: SearchBooksService) {}

  async handle(args: SearchBooksArgs): Promise<BookSearchResult[]> {
    this.validateArgs(args);
    return await this.service.searchBooks(args);
  }

  private validateArgs(args: SearchBooksArgs): void {
    if (!args.query || typeof args.query !== 'string') {
      throw new Error('Query parameter is required and must be a string');
    }
    
    if (args.library_filter && typeof args.library_filter !== 'string') {
      throw new Error('Library filter must be a string if provided');
    }
  }
}
