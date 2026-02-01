// src/lib/markdown-chunker.ts

interface ChunkOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
}

interface Chunk {
  content: string;
  metadata: {
    headers: string[];
    type: 'heading' | 'paragraph' | 'list' | 'code' | 'mixed';
  };
}

export class MarkdownChunker {
  private maxChunkSize: number;
  private minChunkSize: number;
  private overlapSize: number;

  constructor(options: ChunkOptions = {}) {
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.minChunkSize = options.minChunkSize || 100;
    this.overlapSize = options.overlapSize || 100;
  }

  /**
   * Main chunking method that respects markdown structure
   */
  public chunkMarkdown(content: string): Chunk[] {
    const sections = this.splitByHeaders(content);
    const chunks: Chunk[] = [];

    for (const section of sections) {
      const sectionChunks = this.chunkSection(section);
      chunks.push(...sectionChunks);
    }

    // Add overlap between chunks for better context
    return this.addOverlap(chunks);
  }

  /**
   * Split content by markdown headers (h1-h6)
   */
  private splitByHeaders(content: string): Array<{
    headers: string[];
    content: string;
  }> {
    const lines = content.split('\n');
    const sections: Array<{ headers: string[]; content: string }> = [];
    let currentHeaders: string[] = [];
    let currentContent: string[] = [];
    let headerStack: Array<{ level: number; text: string }> = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section if it has content
        if (currentContent.length > 0) {
          sections.push({
            headers: [...currentHeaders],
            content: currentContent.join('\n').trim(),
          });
          currentContent = [];
        }

        const level = headerMatch[1].length;
        const text = headerMatch[2].trim();

        // Update header stack based on level
        headerStack = headerStack.filter(h => h.level < level);
        headerStack.push({ level, text });

        // Update current headers from stack
        currentHeaders = headerStack.map(h => h.text);
        
        // Add the header itself to content
        currentContent.push(line);
      } else {
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentContent.length > 0) {
      sections.push({
        headers: currentHeaders,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections;
  }

  /**
   * Chunk a section while respecting markdown elements
   */
  private chunkSection(section: {
    headers: string[];
    content: string;
  }): Chunk[] {
    const chunks: Chunk[] = [];
    const elements = this.parseMarkdownElements(section.content);
    
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const element of elements) {
      const elementSize = element.content.length;

      // If single element is too large, split it further
      if (elementSize > this.maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(currentChunk.join('\n\n'), section.headers));
          currentChunk = [];
          currentSize = 0;
        }
        
        // Split large element by paragraphs or sentences
        const subChunks = this.splitLargeElement(element.content);
        for (const subChunk of subChunks) {
          chunks.push(this.createChunk(subChunk, section.headers));
        }
        continue;
      }

      // Check if adding this element would exceed max size
      if (currentSize + elementSize > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.join('\n\n'), section.headers));
        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(element.content);
      currentSize += elementSize;
    }

    // Add remaining content
    if (currentChunk.length > 0 && currentSize >= this.minChunkSize) {
      chunks.push(this.createChunk(currentChunk.join('\n\n'), section.headers));
    }

    return chunks;
  }

  /**
   * Parse markdown into semantic elements
   */
  private parseMarkdownElements(content: string): Array<{
    type: 'heading' | 'paragraph' | 'list' | 'code';
    content: string;
  }> {
    const elements: Array<{ type: any; content: string }> = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const codeLines = [line];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) codeLines.push(lines[i]);
        elements.push({ type: 'code', content: codeLines.join('\n') });
        i++;
        continue;
      }

      // List item
      if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
        const listLines = [line];
        i++;
        while (i < lines.length && 
               (lines[i].match(/^[\s]*[-*+]\s/) || 
                lines[i].match(/^[\s]*\d+\.\s/) ||
                (lines[i].trim() !== '' && lines[i].startsWith('  ')))) {
          listLines.push(lines[i]);
          i++;
        }
        elements.push({ type: 'list', content: listLines.join('\n') });
        continue;
      }

      // Header
      if (line.match(/^#{1,6}\s/)) {
        elements.push({ type: 'heading', content: line });
        i++;
        continue;
      }

      // Paragraph
      if (line.trim() !== '') {
        const paraLines = [line];
        i++;
        while (i < lines.length && 
               lines[i].trim() !== '' && 
               !lines[i].match(/^#{1,6}\s/) &&
               !lines[i].match(/^[\s]*[-*+]\s/) &&
               !lines[i].trim().startsWith('```')) {
          paraLines.push(lines[i]);
          i++;
        }
        elements.push({ type: 'paragraph', content: paraLines.join('\n') });
        continue;
      }

      i++;
    }

    return elements;
  }

  /**
   * Split large elements by sentences
   */
  private splitLargeElement(content: string): string[] {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Create a chunk with metadata
   */
  private createChunk(content: string, headers: string[]): Chunk {
    const type = this.detectChunkType(content);
    return {
      content: content.trim(),
      metadata: {
        headers,
        type,
      },
    };
  }

  /**
   * Detect the primary type of content in a chunk
   */
  private detectChunkType(content: string): 'heading' | 'paragraph' | 'list' | 'code' | 'mixed' {
    const hasCode = content.includes('```');
    const hasList = /^[\s]*[-*+]\s/m.test(content) || /^[\s]*\d+\.\s/m.test(content);
    const hasHeading = /^#{1,6}\s/m.test(content);
    
    const types = [hasCode, hasList, hasHeading].filter(Boolean).length;
    
    if (types > 1) return 'mixed';
    if (hasCode) return 'code';
    if (hasList) return 'list';
    if (hasHeading) return 'heading';
    return 'paragraph';
  }

  /**
   * Add overlap between chunks for better context continuity
   */
  private addOverlap(chunks: Chunk[]): Chunk[] {
    if (chunks.length <= 1 || this.overlapSize === 0) return chunks;

    const overlappedChunks: Chunk[] = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const prevContent = chunks[i - 1].content;
      const currentContent = chunks[i].content;
      
      // Get last N characters from previous chunk
      const overlapText = prevContent.slice(-this.overlapSize);
      
      // Add overlap to current chunk
      const newContent = `${overlapText}\n\n${currentContent}`;
      
      overlappedChunks.push({
        content: newContent,
        metadata: chunks[i].metadata,
      });
    }

    return overlappedChunks;
  }
}

// Example usage
export function chunkMarkdownContent(
  content: string,
  options?: ChunkOptions
): Chunk[] {
  const chunker = new MarkdownChunker(options);
  return chunker.chunkMarkdown(content);
}