/**
 * PDF Text Extraction Service
 * 
 * Handles PDF text extraction using pdf-parse library.
 * Conservative approach - extracts text cleanly or fails gracefully.
 */

import type { KomgaHttpClient } from '../komga/client.js';
import type { PdfTextPage, PdfExtractionResult, PdfQuality } from './types.js';

export class PdfTextExtractor {
  constructor(
    private komgaClient: KomgaHttpClient
  ) {}

  /**
   * Extract all text from a PDF book
   */
  async extractAllText(bookId: string): Promise<PdfExtractionResult> {
    try {
      // Dynamic import to avoid ES module issues
      const pdfParse = (await import('pdf-parse')).default;
      
      // Download PDF file from Komga
      const pdfBuffer = await this.komgaClient.getBookFile(bookId);
      
      // Parse PDF with pdf-parse
      const pdfData = await pdfParse(pdfBuffer);
      
      // Analyze quality
      const quality = this.analyzeTextQuality(pdfData.text, pdfData.numpages);
      
      return {
        text: pdfData.text,
        totalPages: pdfData.numpages,
        extractedPages: pdfData.numpages,
        quality
      };
    } catch (error) {
      throw new Error(`PDF text extraction failed: ${error}`);
    }
  }

  /**
   * Extract text from specific page range
   */
  async extractPageRange(
    bookId: string, 
    startPage: number, 
    endPage: number
  ): Promise<PdfTextPage[]> {    try {
      const result = await this.extractAllText(bookId);
      
      // For now, we extract all text and simulate pagination
      // Real page-by-page extraction would require different PDF library
      return this.simulatePagination(result.text, startPage, endPage);
    } catch (error) {
      throw new Error(`PDF page extraction failed: ${error}`);
    }
  }

  /**
   * Analyze text quality for detection purposes
   * Adjusted thresholds based on real-world academic content testing
   */
  private analyzeTextQuality(text: string, pageCount: number): PdfQuality {
    const textLength = text.length;
    const textDensity = pageCount > 0 ? textLength / pageCount : 0;
    
    // Word analysis
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const avgWordLength = words.length > 0 
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length 
      : 0;
    
    // Calculate noise ratio (non-alphabetic chars)
    const alphaChars = text.replace(/[^a-zA-Z]/g, '').length;
    const noiseRatio = textLength > 0 ? (textLength - alphaChars) / textLength : 1;
    
    return {
      type: this.classifyQuality(textDensity, wordCount, avgWordLength, noiseRatio),
      confidence: this.calculateConfidence(textDensity, wordCount, avgWordLength),
      textDensity,
      wordQuality: avgWordLength,
      detectedAt: new Date()
    };
  }

  private classifyQuality(
    density: number, 
    wordCount: number, 
    avgWordLength: number, 
    noiseRatio: number
  ): PdfQuality['type'] {
    // Adjusted thresholds based on testing with real academic content
    // Bruno Latour abstract: 675 chars, 101 words, 5.69 avg, 16.7% noise = should be "good"
    if (density >= 300 && wordCount >= 80 && 
        avgWordLength >= 3 && avgWordLength <= 15 && 
        noiseRatio <= 0.25) {
      return 'good-text';
    }
    
    if (density >= 120 && wordCount >= 30 && 
        avgWordLength >= 2 && avgWordLength <= 20 && 
        noiseRatio <= 0.35) {
      return 'fair-text';
    }
    
    if (density > 30) {
      return 'poor-text';
    }
    
    return 'image-only';
  }  private calculateConfidence(
    density: number, 
    wordCount: number, 
    avgWordLength: number
  ): number {
    // Simple confidence calculation (0-1)
    let confidence = 0;
    
    if (density >= 400) confidence += 0.4;
    else if (density >= 150) confidence += 0.2;
    else if (density >= 50) confidence += 0.1;
    
    if (wordCount >= 100) confidence += 0.3;
    else if (wordCount >= 50) confidence += 0.2;
    else if (wordCount >= 10) confidence += 0.1;
    
    if (avgWordLength >= 3 && avgWordLength <= 12) confidence += 0.3;
    else if (avgWordLength >= 2 && avgWordLength <= 15) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Simulate pagination for display purposes
   */
  private simulatePagination(
    text: string, 
    startPage: number, 
    endPage: number
  ): PdfTextPage[] {
    const wordsPerPage = 500;
    const words = text.split(/\s+/);
    const pages: PdfTextPage[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
      const startIndex = (page - 1) * wordsPerPage;
      const endIndex = startIndex + wordsPerPage;
      const pageWords = words.slice(startIndex, endIndex);
      
      if (pageWords.length === 0) break;
      
      pages.push({
        pageNumber: page,
        content: pageWords.join(' '),
        wordCount: pageWords.length
      });
    }
    
    return pages;
  }
}
