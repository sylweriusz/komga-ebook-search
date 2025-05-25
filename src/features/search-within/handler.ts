/**
 * Search Within Book - Handler
 * 
 * Entry point for content search. Clean validation,
 * delegate to service, return what was asked for.
 */

import { SearchWithinArgs } from '../../types/index.js';
import { SearchWithinService } from './service.js';

export class SearchWithinHandler {
  constructor(private service: SearchWithinService) {}

  async handle(args: SearchWithinArgs): Promise<any> {
    this.validateArgs(args);
    return await this.service.searchWithin(args);
  }

  private validateArgs(args: SearchWithinArgs): void {
    if (!args.book_id || typeof args.book_id !== 'string') {
      throw new Error('Book ID is required and must be a string');
    }

    if (!args.search_term || typeof args.search_term !== 'string') {
      throw new Error('Search term is required and must be a string');
    }

    if (args.search_term.trim().length === 0) {
      throw new Error('Search term cannot be empty');
    }
  }
}
