/**
 * Book Overview - Service
 * 
 * Metadata extraction service. Gets the full dossier on any book.
 * No guesswork, just facts.
 */

import { KomgaHttpClient } from '../../infrastructure/komga/client.js';
import { BookOverview, BookOverviewArgs } from '../../types/index.js';

export class BookOverviewService {
  constructor(private komgaClient: KomgaHttpClient) {}

  async getOverview(args: BookOverviewArgs): Promise<BookOverview> {
    try {
      const [book, pages] = await Promise.all([
        this.komgaClient.getBook(args.book_id),
        this.komgaClient.getBookPages(args.book_id)
      ]);

      return { book, pages };
    } catch (error: any) {
      console.error('Failed to get book overview:', error.message);
      throw new Error(`Could not retrieve book overview: ${error.message}`);
    }
  }
}
