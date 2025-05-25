/**
 * Book Overview - Handler
 * 
 * Entry point for metadata operations. Clean validation,
 * clean delegation, clean responses.
 */

import { BookOverviewArgs, BookOverview } from '../../types/index.js';
import { BookOverviewService } from './service.js';

export class BookOverviewHandler {
  constructor(private service: BookOverviewService) {}

  async handle(args: BookOverviewArgs): Promise<BookOverview> {
    this.validateArgs(args);
    return await this.service.getOverview(args);
  }

  private validateArgs(args: BookOverviewArgs): void {
    if (!args.book_id || typeof args.book_id !== 'string') {
      throw new Error('Book ID is required and must be a string');
    }
  }
}
