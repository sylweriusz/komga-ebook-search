/**
 * Komga HTTP Client - Infrastructure
 * 
 * Clean HTTP wrapper for Komga API. No business logic, just transport.
 */

import axios, { AxiosInstance } from 'axios';
import { KomgaConfig } from '../../config/index.js';
import { Book, BookOverview } from '../../types/index.js';

export class KomgaHttpClient {
  private client: AxiosInstance;

  constructor(config: KomgaConfig) {
    this.client = axios.create({
      baseURL: config.url,
      auth: {
        username: config.username,
        password: config.password
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async getLibraries(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.client.get('/api/v1/libraries');
    return response.data;
  }

  async searchBooks(searchBody: any): Promise<Book[]> {
    const response = await this.client.post('/api/v1/books/list', searchBody);
    return response.data.content || [];
  }

  async getBook(bookId: string): Promise<Book> {
    const response = await this.client.get(`/api/v1/books/${bookId}`);
    return response.data;
  }

  async getBookPages(bookId: string): Promise<any[]> {
    const response = await this.client.get(`/api/v1/books/${bookId}/pages`);
    return response.data;
  }
  async getBookFile(bookId: string): Promise<Buffer> {
    const response = await this.client.get(`/api/v1/books/${bookId}/file`, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': '*/*',
        'Content-Type': undefined  // Remove JSON content type for binary requests
      }
    });
    return Buffer.from(response.data);
  }

  async getBookPage(bookId: string, pageNumber: number): Promise<Buffer> {
    const response = await this.client.get(
      `/api/v1/books/${bookId}/pages/${pageNumber}`,
      {
        responseType: 'arraybuffer',
        headers: { 'Accept': 'image/*' }
      }
    );
    return Buffer.from(response.data);
  }
}
