/**
 * EPUB Cache Service - Hybrid Memory + Disk Strategy
 * 
 * GDD v1.6: Combines session memory cache with persistent disk storage.
 * 24-hour retention ensures AI workflow continuity across Claude restarts.
 */

import pkg from 'flexsearch';
const { Index } = pkg;
import { EpubChapter, EpubCacheEntry, EpubIndex, PersistentCacheEntry } from '../../types/index.js';
import { PersistentCacheService } from '../persistent-cache/service.js';

export class EpubCacheService {
  private cache = new Map<string, EpubCacheEntry>();

  constructor(private persistentCache: PersistentCacheService) {}

  async getOrCreate(
    bookId: string, 
    chaptersProvider: () => Promise<EpubChapter[]>,
    bookName: string = 'Unknown Book'
  ): Promise<EpubCacheEntry> {
    
    // Check memory cache first
    const cached = this.cache.get(bookId);
    if (cached) {
      cached.lastAccessed = new Date();
      return cached;
    }

    // Check persistent disk cache
    const persistentEntry = await this.persistentCache.getFromDisk(bookId);
    if (persistentEntry) {
      console.error(`Loading EPUB from disk cache: ${bookId}`);
      const index = this.deserializeIndex(persistentEntry.indexData, persistentEntry.chapters);
      
      const entry: EpubCacheEntry = {
        chapters: persistentEntry.chapters,
        index,
        lastAccessed: new Date()
      };
      
      this.cache.set(bookId, entry);
      return entry;
    }

    // Create new entry (process EPUB)
    console.error(`Processing EPUB ${bookId}...`);
    const chapters = await chaptersProvider();
    const index = this.createSearchIndex(chapters);

    const entry: EpubCacheEntry = {
      chapters,
      index,
      lastAccessed: new Date()
    };

    this.cache.set(bookId, entry);
    console.error(`EPUB cached: ${chapters.length} chapters indexed`);

    // Save to persistent cache for future sessions
    await this.saveToPersistentCache(bookId, entry, bookName);
    
    return entry;
  }
  private createSearchIndex(chapters: EpubChapter[]): EpubIndex {
    const index = new Index({
      preset: 'performance',
      tokenize: 'forward',
      resolution: 5
    });

    chapters.forEach(chapter => {
      index.add(chapter.number, chapter.content);
    });

    return index as any; // Type compatibility
  }

  private async saveToPersistentCache(bookId: string, entry: EpubCacheEntry, bookName: string): Promise<void> {
    try {
      const serializedIndex = this.serializeIndex(entry.index, entry.chapters);
      const totalContentLength = entry.chapters.reduce((sum, ch) => sum + ch.content.length, 0);
      
      const persistentEntry: PersistentCacheEntry = {
        bookId,
        chapters: entry.chapters,
        indexData: serializedIndex,
        processedAt: new Date(),
        fileSize: totalContentLength,
        metadata: {
          bookName,
          chapterCount: entry.chapters.length,
          contentLength: totalContentLength
        }
      };

      await this.persistentCache.saveToDisk(persistentEntry);
    } catch (error) {
      console.error(`Failed to save persistent cache for ${bookId}:`, error);
    }
  }

  private serializeIndex(index: EpubIndex, chapters: EpubChapter[]): any {
    return {
      chapters: chapters.map(ch => ({ id: ch.number, content: ch.content }))
    };
  }

  private deserializeIndex(indexData: any, chapters: EpubChapter[]): EpubIndex {
    const index = new Index({
      preset: 'performance',
      tokenize: 'forward',
      resolution: 5
    });

    chapters.forEach(chapter => {
      index.add(chapter.number, chapter.content);
    });

    return index as any;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { entries: number; oldestAccess: Date | null } {
    const entries = this.cache.size;
    let oldestAccess: Date | null = null;
    
    for (const entry of this.cache.values()) {
      if (!oldestAccess || entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
      }
    }

    return { entries, oldestAccess };
  }
}
