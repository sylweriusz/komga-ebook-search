/**
 * Search Books - Types
 * 
 * Domain contracts for book discovery functionality.
 */

export interface Library {
  id: string;
  name: string;
}

export interface BookSearchQuery {
  fullTextSearch: string;
  libraryId?: string[];
}
