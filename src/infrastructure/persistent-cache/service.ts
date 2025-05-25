/**
 * Persistent Cache Service - Core
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PersistentCacheEntry, CacheMetadata } from '../../types/index.js';

export class PersistentCacheService {
  private readonly cacheDir: string;

  constructor(customCacheDir?: string) {
    this.cacheDir = customCacheDir || path.join(os.homedir(), '.mcp-search-ebooks-cache');
  }

  async ensureCacheDirectory(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
  }

  async getFromDisk(bookId: string): Promise<PersistentCacheEntry | null> {
    try {
      const metaPath = this.getMetaPath(bookId);
      if (!await fs.pathExists(metaPath)) return null;

      const metadata: CacheMetadata = await fs.readJson(metaPath);
      const processedAt = new Date(metadata.processedAt);
      
      if (this.isExpired(processedAt)) {
        await this.removeCache(bookId);
        return null;
      }

      const chaptersPath = this.getChaptersPath(bookId);
      const indexPath = this.getIndexPath(bookId);
      
      const [chapters, indexData] = await Promise.all([
        fs.readJson(chaptersPath),
        fs.readJson(indexPath)
      ]);

      return {
        bookId: metadata.bookId,
        chapters,
        indexData,
        processedAt,
        fileSize: metadata.fileSize,
        metadata: {
          bookName: metadata.bookName,
          chapterCount: metadata.chapterCount,
          contentLength: metadata.contentLength
        }
      };

    } catch (error) {
      await this.removeCache(bookId).catch(() => {});
      return null;
    }
  }
  async saveToDisk(entry: PersistentCacheEntry): Promise<void> {
    try {
      await this.ensureCacheDirectory();

      const metadata: CacheMetadata = {
        bookId: entry.bookId,
        processedAt: entry.processedAt.toISOString(),
        fileSize: entry.fileSize,
        chapterCount: entry.metadata.chapterCount,
        contentLength: entry.metadata.contentLength,
        bookName: entry.metadata.bookName
      };

      await Promise.all([
        fs.writeJson(this.getMetaPath(entry.bookId), metadata, { spaces: 2 }),
        fs.writeJson(this.getChaptersPath(entry.bookId), entry.chapters, { spaces: 2 }),
        fs.writeJson(this.getIndexPath(entry.bookId), entry.indexData, { spaces: 2 })
      ]);

      console.error(`Cache saved: ${entry.bookId} (${entry.metadata.chapterCount} chapters)`);

    } catch (error) {
      console.error(`Failed to save cache for book ${entry.bookId}:`, error);
      await this.removeCache(entry.bookId).catch(() => {});
      throw error;
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      await this.ensureCacheDirectory();
      
      const files = await fs.readdir(this.cacheDir);
      const metaFiles = files.filter(file => file.endsWith('_meta.json'));
      
      let cleanedCount = 0;

      for (const metaFile of metaFiles) {
        try {
          const metaPath = path.join(this.cacheDir, metaFile);
          const metadata: CacheMetadata = await fs.readJson(metaPath);
          const processedAt = new Date(metadata.processedAt);

          if (this.isExpired(processedAt)) {
            await this.removeCache(metadata.bookId);
            cleanedCount++;
          }
        } catch (error) {
          const bookId = metaFile.replace('_meta.json', '');
          await this.removeCache(bookId).catch(() => {});
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.error(`Cache cleanup: removed ${cleanedCount} expired entries`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return 0;
    }
  }
  private isExpired(processedAt: Date): boolean {
    const now = new Date();
    const hoursDiff = (now.getTime() - processedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  }

  private async removeCache(bookId: string): Promise<void> {
    const paths = [
      this.getMetaPath(bookId),
      this.getChaptersPath(bookId),
      this.getIndexPath(bookId)
    ];

    await Promise.all(
      paths.map(filePath => 
        fs.remove(filePath).catch(() => {})
      )
    );
  }

  private getMetaPath(bookId: string): string {
    return path.join(this.cacheDir, `${bookId}_meta.json`);
  }

  private getChaptersPath(bookId: string): string {
    return path.join(this.cacheDir, `${bookId}_chapters.json`);
  }

  private getIndexPath(bookId: string): string {
    return path.join(this.cacheDir, `${bookId}_index.json`);
  }
}
