#!/usr/bin/env node
/**
 * MCP Search Ebooks Server - v0.4.0
 * 
 * GDD v1.6 Implementation: Hybrid Memory + Persistent Disk Cache
 * Clean LAM architecture with 24-hour cache retention for AI workflow continuity.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';

// Configuration
import { loadKomgaConfig, getServerConfig, isConfigured } from './config/index.js';

// Types
import type { 
  BookPageContent, 
  EpubChapterData, 
  PdfPage, 
  PdfTextContent 
} from './types/index.js';

// PDF Infrastructure (GDD v1.6)
import { PdfQualityDetector } from './infrastructure/pdf/detector.js';
import { PdfCacheService } from './infrastructure/pdf/cache-service.js';
import { PdfTextExtractor } from './infrastructure/pdf/text-extractor.js';

// Infrastructure  
import { KomgaHttpClient } from './infrastructure/komga/client.js';
import { ImageCompressionService } from './infrastructure/compression/service.js';
import { EpubProcessingService } from './infrastructure/epub/processor.js';
import { EpubCacheService } from './infrastructure/cache/service.js';
import { PersistentCacheService } from './infrastructure/persistent-cache/service.js';

// Features
import { SearchBooksHandler } from './features/search-books/handler.js';
import { SearchBooksService } from './features/search-books/service.js';
import { BookOverviewHandler } from './features/book-overview/handler.js';
import { BookOverviewService } from './features/book-overview/service.js';
import { ReadPagesHandler } from './features/read-pages/handler.js';
import { ReadPagesService } from './features/read-pages/service.js';
import { SearchWithinHandler } from './features/search-within/handler.js';
import { SearchWithinService } from './features/search-within/service.js';

class EbookSearchServer {
  private server: Server;
  private persistentCache!: PersistentCacheService;
  
  // Feature handlers
  private searchBooksHandler!: SearchBooksHandler;
  private bookOverviewHandler!: BookOverviewHandler;
  private readPagesHandler!: ReadPagesHandler;
  private searchWithinHandler!: SearchWithinHandler;

  constructor() {
    const serverConfig = getServerConfig();
    
    this.server = new Server(
      {
        name: serverConfig.name,
        version: serverConfig.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeDependencies();
    this.setupHandlers();
  }
  private initializeDependencies(): void {
    // Infrastructure layer - injected dependencies
    const komgaConfig = loadKomgaConfig();
    const komgaClient = new KomgaHttpClient(komgaConfig);
    const compressionService = new ImageCompressionService();
    const epubProcessor = new EpubProcessingService();
    this.persistentCache = new PersistentCacheService();
    const epubCache = new EpubCacheService(this.persistentCache);
    
    // PDF Infrastructure (GDD v1.6)
    const pdfTextExtractor = new PdfTextExtractor(komgaClient);
    const pdfQualityDetector = new PdfQualityDetector(komgaClient, pdfTextExtractor);
    const pdfCacheService = new PdfCacheService();

    // Service layer - business logic
    const searchBooksService = new SearchBooksService(komgaClient);
    const bookOverviewService = new BookOverviewService(komgaClient);
    const readPagesService = new ReadPagesService(
      komgaClient,
      compressionService,
      epubProcessor,
      epubCache,
      pdfQualityDetector,
      pdfCacheService,
      pdfTextExtractor
    );
    const searchWithinService = new SearchWithinService(
      komgaClient,
      epubProcessor,
      epubCache,
      pdfQualityDetector,
      pdfCacheService,
      pdfTextExtractor
    );

    // Handler layer - MCP entry points
    this.searchBooksHandler = new SearchBooksHandler(searchBooksService);
    this.bookOverviewHandler = new BookOverviewHandler(bookOverviewService);
    this.readPagesHandler = new ReadPagesHandler(readPagesService);
    this.searchWithinHandler = new SearchWithinHandler(searchWithinService);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolDefinitions(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await this.handleToolCall(name, args);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    if (!isConfigured()) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Komga credentials not configured. Set KOMGA_USERNAME and KOMGA_PASSWORD in Claude Desktop config.'
        }]
      };
    }

    switch (name) {
      case 'search_library_books':
        const searchResults = await this.searchBooksHandler.handle(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(searchResults, null, 2),
          }],
        };

      case 'get_book_overview':
        const overview = await this.bookOverviewHandler.handle(args);
        const formattedOverview = {
          title: overview.book.name,
          series: overview.book.seriesTitle,
          metadata: overview.book.metadata,
          totalPages: overview.pages.length,
          pageInfo: overview.pages.slice(0, 5).map(p => ({
            number: p.number,
            fileName: p.fileName,
            mediaType: p.mediaType,
          })),
        };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(formattedOverview, null, 2),
          }],
        };
      case 'read_book_pages':
        const pageData = await this.readPagesHandler.handle(args);
        
        if (pageData.length > 0 && pageData[0].type === 'epub') {
          // EPUB chapters as text
          return {
            content: pageData
              .filter((item): item is EpubChapterData => item.type === 'epub')
              .map(chapter => ({
                type: 'text',
                text: `=== ${chapter.title} ===\n\n${chapter.content}`,
              })),
          };
        } else {
          // PDF pages as images
          return {
            content: pageData
              .filter((item): item is PdfPage => item.type === 'pdf-image')
              .map(page => ({
                type: 'image',
                data: page.data,
                mimeType: page.mimeType,
              })),
          };
        }

      case 'search_within_book':
        const searchResult = await this.searchWithinHandler.handle(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(searchResult, null, 2),
          }],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_library_books',
        description: 'Search for books in the Komga library',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for books',
            },
            library_filter: {
              type: 'string',
              description: 'Optional library name filter',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_book_overview',
        description: 'Get detailed metadata and page list for a specific book',
        inputSchema: {
          type: 'object',
          properties: {
            book_id: {
              type: 'string',
              description: 'Book ID from search results',
            },
          },
          required: ['book_id'],
        },
      },
      {
        name: 'read_book_pages',
        description: 'Read specific pages from a book (max 15 pages per request)',
        inputSchema: {
          type: 'object',
          properties: {
            book_id: {
              type: 'string',
              description: 'Book ID',
            },
            start_page: {
              type: 'number',
              description: 'Starting page number (1-based)',
            },
            end_page: {
              type: 'number',
              description: 'Ending page number (inclusive, max 15 pages from start)',
            },
          },
          required: ['book_id', 'start_page', 'end_page'],
        },
      },
      {
        name: 'search_within_book',
        description: 'Search for specific content within a book',
        inputSchema: {
          type: 'object',
          properties: {
            book_id: {
              type: 'string',
              description: 'Book ID',
            },
            search_term: {
              type: 'string',
              description: 'Term to search for within the book',
            },
          },
          required: ['book_id', 'search_term'],
        },
      },
    ];
  }

  async run(): Promise<void> {
    // Perform startup cleanup of expired cache files
    await this.performStartupCleanup();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Search Ebooks Server running on stdio');
  }

  private async performStartupCleanup(): Promise<void> {
    try {
      console.error('Performing cache cleanup...');
      const cleanedCount = await this.persistentCache.cleanupExpired();
      if (cleanedCount > 0) {
        console.error(`Startup cleanup complete: ${cleanedCount} expired entries removed`);
      } else {
        console.error('Startup cleanup complete: no expired entries found');
      }
    } catch (error) {
      console.error('Startup cleanup failed:', error);
      // Continue without cleanup if it fails
    }
  }
}

// Entry point
const server = new EbookSearchServer();
server.run().catch(console.error);
