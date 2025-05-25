/**
 * EPUB Processing Service
 * 
 * Extract chapters from those zipped XHTML files.
 * Clean text extraction without the HTML noise.
 */

import AdmZip, { IZipEntry } from 'adm-zip';
import { EpubChapter } from '../../types/index.js';

export class EpubProcessingService {

  async extractChapters(epubBuffer: Buffer): Promise<EpubChapter[]> {
    console.error(`[EPUB] Received buffer: type=${typeof epubBuffer}, length=${epubBuffer?.length}, constructor=${epubBuffer?.constructor?.name}`);
    
    if (!epubBuffer || !Buffer.isBuffer(epubBuffer)) {
      throw new Error(`Invalid EPUB buffer: received ${typeof epubBuffer}`);
    }
    
    const zip = new AdmZip(epubBuffer);
    const entries = zip.getEntries();
    
    console.error(`[EPUB] Found ${entries.length} entries in ZIP:`);
    entries.slice(0, 10).forEach(entry => {
      console.error(`  - ${entry.entryName} (${entry.header.size} bytes)`);
    });
    
    // Find XHTML chapter files
    const chapterFiles = entries
      .filter((entry: IZipEntry) => this.isChapterFile(entry.entryName))
      .sort((a: IZipEntry, b: IZipEntry) => a.entryName.localeCompare(b.entryName));

    console.error(`[EPUB] Found ${chapterFiles.length} chapter files`);

    const chapters: EpubChapter[] = [];
    
    for (let i = 0; i < chapterFiles.length; i++) {
      const entry = chapterFiles[i];
      try {
        const content = entry.getData();
        const htmlContent = content.toString('utf8');
        const textContent = this.extractTextFromHtml(htmlContent);
        
        chapters.push({
          number: i + 1,
          title: `Chapter ${i + 1}`,
          content: textContent,
          filename: entry.entryName
        });
      } catch (error) {
        console.error(`Failed to extract chapter ${entry.entryName}:`, error);
      }
    }

    return chapters;
  }
  private isChapterFile(filename: string): boolean {
    return (filename.endsWith('.xhtml') || filename.endsWith('.html')) 
           && !filename.endsWith('nav.xhtml')
           && !filename.endsWith('toc.xhtml')
           && !filename.includes('META-INF/');
  }

  private extractTextFromHtml(html: string): string {
    // Clean HTML extraction - surgical precision
    return html
      .replace(/<[^>]*>/g, ' ')     // Strip all HTML tags
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .replace(/&nbsp;/g, ' ')      // HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
