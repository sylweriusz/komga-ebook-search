/**
 * Read Pages - Handler
 * 
 * Entry point for page/chapter reading. Validates inputs,
 * ensures limits, returns clean discriminated results.
 */

import { ReadPagesArgs, BookPageContent } from '../../types/index.js';
import { ReadPagesService } from './service.js';

export class ReadPagesHandler {
  constructor(private service: ReadPagesService) {}

  async handle(args: ReadPagesArgs): Promise<BookPageContent[]> {
    this.validateArgs(args);
    return await this.service.readPages(args);
  }

  private validateArgs(args: ReadPagesArgs): void {
    if (!args.book_id || typeof args.book_id !== 'string') {
      throw new Error('Book ID is required and must be a string');
    }

    if (typeof args.start_page !== 'number' || args.start_page < 1) {
      throw new Error('Start page must be a positive number');
    }

    if (typeof args.end_page !== 'number' || args.end_page < args.start_page) {
      throw new Error('End page must be greater than or equal to start page');
    }

    // Enforce 15-page limit
    if (args.end_page - args.start_page + 1 > 15) {
      throw new Error('Cannot request more than 15 pages at once');
    }
  }
}
