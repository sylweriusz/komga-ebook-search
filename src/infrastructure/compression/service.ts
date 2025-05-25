/**
 * Image Compression Service
 * 
 * Sharp-based compression for those monster archival scans.
 * Keep it under Claude's 1MB limit without losing OCR quality.
 */

import sharp from 'sharp';

export class ImageCompressionService {
  
  async compressForClaude(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .jpeg({ 
        quality: 80,           // 80% - sweet spot for OCR vs size
        progressive: true,     // Progressive loading
        mozjpeg: true         // Better compression algorithm
      })
      .resize(1568, null, {    // Claude Vision optimal width
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toBuffer();
  }

  async compressToBase64(imageBuffer: Buffer): Promise<string> {
    const compressed = await this.compressForClaude(imageBuffer);
    return compressed.toString('base64');
  }
}
