# Komga Ebook Library

**Search and read your Komga ebook collection through AI using Model Context Protocol**

[![NPM Version](https://img.shields.io/npm/v/@sylweriusz/komga-ebook-search)](https://www.npmjs.com/package/@sylweriusz/komga-ebook-search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Connect your [Komga](https://komga.org/) digital library to AI assistants like Claude, enabling intelligent book discovery, content reading, and full-text search across your ebook collection.

## 🎯 Purpose

Bridge AI assistants with digital library infrastructure to provide authoritative source access for research, fact-checking, and academic citation. **Core philosophy: Komga finds books, we search IN books.**

## ✨ Key Features

- **Smart Format Detection**: Automatic EPUB vs PDF handling
- **Full-Text Search**: FlexSearch integration for instant content discovery  
- **Claude Vision OCR**: Intelligent PDF processing for non-text content
- **Session Caching**: Optimized performance for repeated access
- **Conservative Fallbacks**: Graceful degradation prevents poor user experience

## 📚 Format Support Matrix

| Format | Content Extraction | Search Capability | Performance |
|--------|-------------------|-------------------|-------------|
| **EPUB** | XHTML text extraction | FlexSearch full-text search | <1s after indexing |
| **PDF (Text)** | pdf-parse extraction | FlexSearch full-text search | 2-5s initial, <1s cached |
| **PDF (Image)** | Sharp compression + Claude Vision | Guidance to specific pages | Real-time |

## 🚀 Quick Start

### Installation

```bash
# Via NPM (recommended)
npx @sylweriusz/komga-book-search

# Via Smithery (for Claude Desktop)
npx @smithery/cli install @sylweriusz/komga-book-search --client claude
```

### Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "komga-ebook-search": {
      "command": "npx",
      "args": ["@sylweriusz/komga-book-search"],
      "env": {
        "KOMGA_URL": "http://your-komga-server:25600",
        "KOMGA_USERNAME": "your-username",
        "KOMGA_PASSWORD": "your-password",
        "KOMGA_LIBRARY": "your-library-filter"
      }
    }
  }
}
```

## 🛠️ MCP Tools

### `search_library_books(query, library_filter?)`
Discover books across library collections with format detection.

```typescript
// Find academic books on specific topics
{
  "query": "artificial intelligence",
  "library_filter": "academic"  // optional
}
```

### `get_book_overview(book_id)`
Retrieve complete book metadata including page count and format information.

```typescript
{
  "book_id": "0K79C4PQAEH7J"
}
```

### `read_book_pages(book_id, start_page, end_page)`
Access book content with intelligent format routing (max 15 pages).

- **EPUBs**: Returns clean text with chapter delimiters  
- **PDFs**: Returns compressed images optimized for Claude Vision OCR

### `search_within_book(book_id, search_term)`
Full-text search within individual books.

- **EPUBs & Text PDFs**: FlexSearch with context and highlights
- **Image PDFs**: Guidance to use `read_book_pages` with Claude Vision

## 💡 Use Cases

- **Academic Research**: Search scholarly books for citations and references
- **Fact Verification**: Cross-reference claims against authoritative sources  
- **Language Learning**: Find conversation examples and vocabulary in context
- **Technical Documentation**: Navigate complex technical manuals efficiently

## 🏗️ Architecture

Built with **Lean Architectural Methodology (LAM)**:
- **Vertical Feature Slicing**: Each MCP tool as self-contained feature
- **Dependency Injection**: Constructor-based, no singletons
- **Strict Type Safety**: Zero `any` types, comprehensive TypeScript
- **Single Responsibility**: One file, one purpose
- **No Circular Dependencies**: Clear dependency direction

## 📋 Requirements

- **Node.js**: 18.0.0 or higher
- **Komga Server**: Running instance with API access
- **TypeScript**: Included in dependencies

## 🔧 Development

```bash
# Clone and setup
git clone https://github.com/sylweriusz/komga-ebook-search.git
cd komga-ebook-search
npm install

# Build and run
npm run build
npm start

# Development mode
npm run dev
```

## 📝 Configuration Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `KOMGA_URL` | Komga server URL | ✅ | `http://localhost:25600` |
| `KOMGA_USERNAME` | Authentication username | ✅ | `admin@example.com` |
| `KOMGA_PASSWORD` | Authentication password | ✅ | `your-password` |
| `KOMGA_LIBRARY` | Library filter (partial match) | ✅ | `academic` |

## 🐛 Troubleshooting

### Connection Issues
- Verify Komga server is accessible
- Check authentication credentials
- Ensure user has PAGE_STREAMING role

### Search Problems  
- Confirm `KOMGA_LIBRARY` filter matches existing libraries
- Check book format support (EPUB preferred for text search)

### Performance Issues
- EPUBs index on first access (2-4 seconds)
- Subsequent searches use cached indexes (<1 second)
- Large PDFs may require patience for initial processing

## 📄 License

MIT © [sylweriusz](https://github.com/sylweriusz)

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and follow the LAM architectural principles.

## 🔗 Related Projects

- [Komga](https://komga.org/) - Comic/ebook server and web reader
- [Model Context Protocol](https://modelcontextprotocol.io/) - Open standard for AI tool integration
- [Smithery](https://smithery.ai/) - MCP server registry and marketplace

---

**Built for researchers, academics, and digital library enthusiasts who need AI-powered access to their book collections.**