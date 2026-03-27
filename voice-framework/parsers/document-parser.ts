/**
 * Document Parser
 * Parses various document formats (HTML, Markdown, Text) and extracts text content
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface ParsedDocument {
  id: string;
  filename: string;
  fileType: 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code' | 'unknown';
  content: string;
  extractedText: string;
  metadata: {
    size: number;
    lines: number;
    words: number;
    characters: number;
    parsedAt: Date;
  };
}

export class DocumentParser {
  /**
   * Parse a document from file path
   */
  async parseFile(filePath: string): Promise<ParsedDocument> {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileType = this.detectFileType(ext);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    return this.parseContent(fileContent, filename, fileType, stats.size);
  }

  /**
   * Parse document content from string
   */
  parseContent(
    content: string,
    filename: string,
    fileType: 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code' | 'unknown',
    size?: number
  ): ParsedDocument {
    const extractedText = this.extractText(content, fileType);
    const lines = extractedText.split('\n').length;
    const words = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    const characters = extractedText.length;

    return {
      id: this.generateId(),
      filename,
      fileType,
      content,
      extractedText,
      metadata: {
        size: size || content.length,
        lines,
        words,
        characters,
        parsedAt: new Date()
      }
    };
  }

  /**
   * Detect file type from extension
   */
  private detectFileType(ext: string): 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code' | 'unknown' {
    const extMap: Record<string, 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code'> = {
      // Web formats
      '.html': 'html',
      '.htm': 'html',
      '.md': 'markdown',
      '.markdown': 'markdown',
      // Text formats
      '.txt': 'text',
      '.text': 'text',
      // Data formats
      '.json': 'json',
      '.xml': 'xml',
      '.csv': 'csv',
      // Code formats (treated as text for extraction)
      '.js': 'code',
      '.jsx': 'code',
      '.ts': 'code',
      '.tsx': 'code',
      '.py': 'code',
      '.java': 'code',
      '.cpp': 'code',
      '.c': 'code',
      '.cs': 'code',
      '.php': 'code',
      '.rb': 'code',
      '.go': 'code',
      '.rs': 'code',
      '.swift': 'code',
      '.kt': 'code',
      '.scala': 'code',
      '.sh': 'code',
      '.bash': 'code',
      '.zsh': 'code',
      '.ps1': 'code',
      '.yaml': 'code',
      '.yml': 'code',
      '.toml': 'code',
      '.ini': 'code',
      '.cfg': 'code',
      '.conf': 'code',
      '.log': 'text'
    };
    
    return extMap[ext.toLowerCase()] || 'unknown';
  }

  /**
   * Extract plain text from content based on file type
   */
  private extractText(content: string, fileType: 'html' | 'markdown' | 'text' | 'json' | 'xml' | 'csv' | 'code' | 'unknown'): string {
    switch (fileType) {
      case 'html':
        return this.extractFromHTML(content);
      case 'markdown':
        return this.extractFromMarkdown(content);
      case 'json':
        return this.extractFromJSON(content);
      case 'xml':
        return this.extractFromXML(content);
      case 'csv':
        return this.extractFromCSV(content);
      case 'code':
        return this.extractFromCode(content);
      case 'text':
        return content;
      default:
        return content; // Fallback to raw content
    }
  }

  /**
   * Extract text from HTML
   */
  private extractFromHTML(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags but preserve structure
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Preserve paragraph breaks
    text = text.replace(/\n\s*\n/g, '\n\n');
    
    return text;
  }

  /**
   * Extract text from Markdown (simplified - removes markdown syntax)
   */
  private extractFromMarkdown(markdown: string): string {
    let text = markdown;
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]+`/g, '');
    
    // Remove links but keep text: [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Remove images: ![alt](url) -> alt
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
    
    // Remove headers: # Header -> Header
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // Remove bold/italic: **text** -> text, *text* -> text
    text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
    text = text.replace(/\*([^\*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');
    
    // Remove list markers
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
  }

  /**
   * Parse multiple documents
   */
  async parseFiles(filePaths: string[]): Promise<ParsedDocument[]> {
    const results: ParsedDocument[] = [];
    
    for (const filePath of filePaths) {
      try {
        const parsed = await this.parseFile(filePath);
        results.push(parsed);
      } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Extract text from JSON (formatted for readability)
   */
  private extractFromJSON(json: string): string {
    try {
      const parsed = JSON.parse(json);
      // Convert to readable format
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      // If not valid JSON, return as-is
      return json;
    }
  }

  /**
   * Extract text from XML
   */
  private extractFromXML(xml: string): string {
    // Remove XML tags but preserve text content
    let text = xml.replace(/<[^>]+>/g, ' ');
    
    // Decode XML entities
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Extract text from CSV (convert to readable format)
   */
  private extractFromCSV(csv: string): string {
    // Split by lines and process
    const lines = csv.split('\n');
    const processed: string[] = [];
    
    for (const line of lines) {
      // Remove quotes and clean up
      const cleaned = line.replace(/^"|"$/g, '').replace(/","/g, ' | ');
      if (cleaned.trim()) {
        processed.push(cleaned);
      }
    }
    
    return processed.join('\n');
  }

  /**
   * Extract text from code (remove excessive formatting, keep comments and strings)
   */
  private extractFromCode(code: string): string {
    let text = code;
    
    // Extract comments (single and multi-line)
    const comments: string[] = [];
    text = text.replace(/\/\/.*$/gm, (match) => {
      comments.push(match.replace(/\/\//, '').trim());
      return '';
    });
    text = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      comments.push(match.replace(/\/\*|\*\//g, '').trim());
      return '';
    });
    
    // Extract string literals
    const strings: string[] = [];
    text = text.replace(/["'`]([^"'`]*)["'`]/g, (match, content) => {
      if (content.length > 3) {
        strings.push(content);
      }
      return '';
    });
    
    // Combine comments and strings
    const extracted = [...comments, ...strings].filter(s => s.length > 0).join('\n');
    
    // If we have extracted content, use it; otherwise return cleaned code
    return extracted || text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

