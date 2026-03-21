/**
 * Website to Profile Converter
 * Extracts text from websites, analyzes it, builds voice profiles, and identifies UX issues
 */

import { createEnhancedFramework } from './index';
import { DocumentParser } from './parsers/document-parser';
import { VoiceProfile } from './models/voice-profile';
import { Shredder } from './analyzers/shredder';
import * as https from 'https';
import * as http from 'http';

export interface WebsiteAnalysisResult {
  url: string | string[];
  extractedText: string;
  textStats: {
    characters: number;
    words: number;
    sentences: number;
    paragraphs: number;
  };
  profile: VoiceProfile;
  profileId?: string;
  analysis: {
    errors: AnalysisError[];
    warnings: AnalysisWarning[];
    uxSuggestions: UXSuggestion[];
    qualityScore: number;
  };
  shredderAnalysis?: any;
  pagesAnalyzed?: {
    url: string;
    characters: number;
    words: number;
  }[];
}

export interface AnalysisError {
  type: 'missing_data' | 'inconsistency' | 'low_quality' | 'structure_issue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  field?: string;
  suggestion?: string;
}

/**
 * Analysis Warning Interface
 * 
 * Represents quality warnings detected during profile analysis.
 * These are NOT errors - they indicate areas where the input data
 * may be insufficient or could be improved for better profile accuracy.
 * 
 * ⚠️ IMPORTANT: Warnings with type 'incomplete' are EXPECTED and NOT bugs.
 * They indicate insufficient data for optimal analysis, not code errors.
 * 
 * Warning Types:
 * - 'incomplete': Indicates insufficient data detected (e.g., < 300 words, missing vocabulary patterns)
 *   ✅ EXPECTED BEHAVIOR: This is normal when analyzing small content samples and does not indicate a bug.
 *   The profile generation will still work with limited data, but accuracy may be reduced.
 *   Users should be encouraged to provide more content for better results.
 * - 'ambiguous': Indicates ambiguous patterns that could be interpreted multiple ways
 * - 'potential_issue': Indicates potential inconsistencies or unusual patterns worth reviewing
 * 
 * @see WebsiteToProfileConverter.QUALITY_THRESHOLDS for threshold values
 * @see WebsiteToProfileConverter.analyzeProfile() for implementation details
 */
export interface AnalysisWarning {
  type: 'incomplete' | 'ambiguous' | 'potential_issue';
  message: string;
  field?: string;
  recommendation?: string;
}

export interface UXSuggestion {
  category: 'tone' | 'structure' | 'vocabulary' | 'precision' | 'accessibility' | 'comprehensiveness';
  priority: 'high' | 'medium' | 'low';
  issue: string;
  currentState: string;
  suggestedImprovement: string;
  rationale: string;
}

export class WebsiteToProfileConverter {
  private framework: any;
  private parser: DocumentParser;
  private shredder: Shredder;
  private textStatsCache: Map<string, { characters: number; words: number; sentences: number; paragraphs: number }>;

  /**
   * Quality analysis thresholds
   * These constants define the thresholds used for profile quality analysis.
   * Warnings with type 'incomplete' are expected when content falls below these thresholds.
   * 
   * These thresholds help determine when to show quality warnings vs errors:
   * - Below MIN_WORDS_ERROR (100 words): Triggers an error (insufficient data)
   * - Below MIN_WORDS_WARNING (300 words): Triggers 'incomplete' warning (expected behavior, not a bug)
   * - Below MIN_VOICE_MARKERS (3 markers): Triggers 'incomplete' warning (needs more content)
   * 
   * @see AnalysisWarning for explanation of 'incomplete' warning type
   */
  private static readonly QUALITY_THRESHOLDS = {
    /** Minimum words required for reliable profile generation (below this triggers an error) */
    MIN_WORDS_ERROR: 100,
    /** Minimum words recommended for optimal profile accuracy (below this triggers a warning) */
    MIN_WORDS_WARNING: 300,
    /** Minimum voice markers needed to identify distinctive voice patterns */
    MIN_VOICE_MARKERS: 3,
    /** Quality score thresholds */
    QUALITY_SCORES: {
      EXCELLENT: 100,
      GOOD_MIN: 80,
      ACCEPTABLE_MIN: 60,
    },
    /** Score penalties for various quality issues */
    PENALTIES: {
      INSUFFICIENT_WORDS: 30,
      LIMITED_WORDS: 10,
      MISSING_VOCABULARY: 5,
      MISSING_DOMAIN_KNOWLEDGE: 5,
      LIMITED_VOICE_MARKERS: 5,
      STRUCTURAL_ISSUE: 3,
      TONE_INCONSISTENCY: 5,
    },
  } as const;

  constructor() {
    this.parser = new DocumentParser();
    this.shredder = new Shredder();
    this.textStatsCache = new Map();
  }

  /**
   * Initialize the framework
   */
  async initialize() {
    this.framework = await createEnhancedFramework();
  }

  /**
   * Extract hostname from URL (helper method to avoid repeated parsing)
   */
  private extractHostname(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is localhost or local IP (optimized with regex)
   */
  private isLocalhost(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for localhost and loopback addresses
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return true;
      }
      
      // Check for private IP ranges using regex:
      // - 192.168.x.x
      // - 10.x.x.x
      // - 172.16-31.x.x
      return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
    } catch {
      return false;
    }
  }

  /**
   * Check if error is a protocol error that might be resolved by switching to HTTP
   */
  private isProtocolError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('packet length too long') ||
      message.includes('eproto') ||
      message.includes('wrong version number') ||
      message.includes('fetch failed')
    );
  }

  /**
   * Fetch HTML content from a URL with retry logic
   * Handles self-signed certificates for localhost URLs
   * Auto-detects HTTP/HTTPS and retries with HTTP if HTTPS fails
   */
  async fetchWebsite(url: string, retries: number = 1): Promise<string> {
    try {
      const isLocal = this.isLocalhost(url);
      
      // For localhost, use Node.js https/http modules to handle self-signed certificates
      if (isLocal) {
        try {
          return await this.fetchLocalhost(url);
        } catch (error: unknown) {
          // If HTTPS fails with protocol error, try HTTP instead
          if (this.isProtocolError(error)) {
            const httpUrl = url.replace(/^https:/i, 'http:');
            console.log(`HTTPS failed, trying HTTP: ${httpUrl}`);
            return await this.fetchLocalhost(httpUrl);
          }
          throw error;
        }
      }
      
      // For regular URLs, use fetch
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      // If HTTPS fails with protocol error, try HTTP instead
      if (this.isProtocolError(error) && retries > 0) {
        try {
          const httpUrl = url.replace(/^https:/i, 'http:');
          console.log(`HTTPS failed, trying HTTP: ${httpUrl}`);
          return await this.fetchWebsite(httpUrl, retries - 1);
        } catch (retryError) {
          // If HTTP also fails, throw original error with context
          const originalMessage = error instanceof Error ? error.message : String(error);
          const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
          throw new Error(`Failed to fetch website after retry: ${originalMessage} (retry: ${retryMessage})`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch website: ${errorMessage}`);
    }
  }

  /**
   * Fetch from localhost with SSL certificate verification disabled
   */
  private async fetchLocalhost(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options: any = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        };

        // Disable SSL verification for localhost (self-signed certificates)
        if (isHttps) {
          options.rejectUnauthorized = false;
        }

        const req = client.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extract text from website HTML
   */
  async extractTextFromWebsite(url: string): Promise<string> {
    const html = await this.fetchWebsite(url);
    const parsed = this.parser.parseContent(html, url, 'html', html.length);
    return parsed.extractedText;
  }

  /**
   * Extract internal links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    // Match all href attributes
    const hrefRegex = /href=["']([^"']+)["']/gi;
    const matches = html.matchAll(hrefRegex);
    
    const seen = new Set<string>();
    
    for (const match of matches) {
      const href = match[1];
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }
      
      try {
        let fullUrl: string;
        if (href.startsWith('http://') || href.startsWith('https://')) {
          fullUrl = href;
        } else if (href.startsWith('//')) {
          fullUrl = `${baseUrlObj.protocol}${href}`;
        } else if (href.startsWith('/')) {
          fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
        } else {
          fullUrl = new URL(href, baseUrl).href;
        }
        
        // Only include links from the same domain
        const urlObj = new URL(fullUrl);
        if (urlObj.hostname === baseUrlObj.hostname && !seen.has(fullUrl)) {
          seen.add(fullUrl);
          links.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
    
    return links;
  }

  /**
   * Process a single page (helper method for parallel processing)
   */
  private async processPage(url: string, index: number, total: number): Promise<{
    url: string;
    text: string;
    stats: { characters: number; words: number };
    shredderAnalysis: any;
  } | null> {
    try {
      console.log(`[${index + 1}/${total}] Fetching: ${url}`);
      const text = await this.extractTextFromWebsite(url);
      const stats = this.calculateTextStats(text);
      
      // Perform Shredder analysis for each page
      const shredderAnalysis = this.shredder.shred(text);
      
      console.log(`  ✓ Extracted ${stats.words} words, ${stats.characters} characters`);
      
      return {
        url,
        text,
        stats: {
          characters: stats.characters,
          words: stats.words
        },
        shredderAnalysis
      };
    } catch (error) {
      console.warn(`  ✗ Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Limit concurrency using semaphore pattern
   * Preserves order of results matching input tasks order
   */
  private async limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    maxConcurrency: number
  ): Promise<(T | null)[]> {
    const results: (T | null)[] = new Array(tasks.length).fill(null);
    const executing: Array<{ promise: Promise<void>; index: number }> = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const index = i;
      
      const promise = task().then(result => {
        results[index] = result;
        const execIndex = executing.findIndex(e => e.index === index);
        if (execIndex !== -1) {
          executing.splice(execIndex, 1);
        }
      }).catch(() => {
        results[index] = null;
        const execIndex = executing.findIndex(e => e.index === index);
        if (execIndex !== -1) {
          executing.splice(execIndex, 1);
        }
      });

      executing.push({ promise, index });

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing.map(e => e.promise));
      }
    }

    await Promise.all(executing.map(e => e.promise));
    return results; // Return with nulls preserved for order, caller can filter
  }

  /**
   * Convert multiple pages to a single profile (optimized with parallel fetching and concurrency control)
   */
  async convertMultiplePagesToProfile(
    urls: string[],
    profileName?: string,
    maxPages: number = 10,
    maxConcurrency: number = 5
  ): Promise<WebsiteAnalysisResult> {
    if (!this.framework) {
      await this.initialize();
    }

    console.log(`Analyzing ${urls.length} page(s) with max concurrency of ${maxConcurrency}...`);
    
    // Limit number of pages to analyze
    const pagesToAnalyze = urls.slice(0, maxPages);
    
    // Extract hostname once to avoid repeated parsing
    const hostname = pagesToAnalyze.length > 0 
      ? this.extractHostname(pagesToAnalyze[0]) || 'unknown'
      : 'unknown';

    // Process pages in parallel with concurrency control
    const pageTasks = pagesToAnalyze.map((url, index) => 
      () => this.processPage(url, index, pagesToAnalyze.length)
    );

    const pageResults = await this.limitConcurrency(pageTasks, maxConcurrency);
    
    // Filter out failed pages
    const successfulPages = pageResults.filter((result): result is NonNullable<typeof result> => result !== null);

    if (successfulPages.length === 0) {
      throw new Error('No pages could be fetched');
    }

    // Extract data from successful pages
    const pagesAnalyzed = successfulPages.map(p => ({
      url: p.url,
      characters: p.stats.characters,
      words: p.stats.words
    }));
    
    const allTexts = successfulPages.map(p => p.text);
    const allShredderAnalyses = successfulPages.map(p => p.shredderAnalysis);

    // Warn about memory usage for large sites
    const totalChars = allTexts.reduce((sum, text) => sum + text.length, 0);
    if (totalChars > 10 * 1024 * 1024) { // 10MB
      console.warn(`Warning: Processing large dataset (${(totalChars / 1024 / 1024).toFixed(2)}MB). Consider reducing maxPages.`);
    }

    const combinedText = allTexts.join('\n\n---\n\n');
    const combinedStats = this.calculateTextStats(combinedText);

    console.log(`\nCombining ${successfulPages.length} page(s) (${combinedStats.words} total words)...`);

    // Build profile from combined text
    const profile = await this.framework.profileBuilder.buildFromSamples(
      allTexts,
      {
        name: profileName || `Website Profile: ${hostname} (${successfulPages.length} pages)`,
        description: `Voice profile generated from ${successfulPages.length} page(s)`,
        sourceDocument: pagesToAnalyze.join(', ')
      }
    );
    
    if (!profile) {
      throw new Error('Failed to build profile from combined text');
    }

    // Combine Shredder analyses
    const combinedShredderAnalysis = this.combineShredderAnalyses(allShredderAnalyses);

    // Analyze profile
    const analysis = this.analyzeProfile(profile, combinedText, combinedStats);
    const uxSuggestions = this.generateUXSuggestions(profile, combinedText, analysis);

    // Save profile
    let profileId: string | undefined;
    try {
      if (this.framework?.profileManager && profile?.voiceName) {
        const metadata = await this.framework.profileManager.createProfile(profile, {
          name: profile.voiceName,
          description: `Generated from ${successfulPages.length} page(s)`,
          version: '1.0.0',
          sourceDocument: pagesToAnalyze.join(', '),
          tags: ['website', 'auto-generated', 'multi-page', hostname],
          isDefault: false
        });
        profileId = metadata?.id;
      }
    } catch (error) {
      console.warn('Failed to save profile:', error instanceof Error ? error.message : String(error));
    }

    return {
      url: pagesToAnalyze,
      extractedText: combinedText,
      textStats: combinedStats,
      profile,
      profileId,
      analysis: {
        ...analysis,
        uxSuggestions
      },
      shredderAnalysis: combinedShredderAnalysis,
      pagesAnalyzed
    };
  }

  /**
   * Combine multiple Shredder analyses
   */
  private combineShredderAnalyses(analyses: any[]): any {
    if (analyses.length === 0) return null;
    if (analyses.length === 1) return analyses[0];

    const allTruths = analyses.flatMap(a => a.truths || []);
    const totalTruths = allTruths.length;
    const factCount = allTruths.filter(t => t.type === 'fact').length;
    const assertionCount = allTruths.filter(t => t.type === 'assertion').length;
    const definitionCount = allTruths.filter(t => t.type === 'definition').length;
    const avgConfidence = allTruths.length > 0
      ? allTruths.reduce((sum, t) => sum + (t.confidence || 0), 0) / allTruths.length
      : 0;

    // Combine key entities (unique)
    const allEntities = new Set<string>();
    analyses.forEach(a => {
      if (a.summary?.keyEntities) {
        a.summary.keyEntities.forEach((e: string) => allEntities.add(e));
      }
    });

    // Combine key values (unique)
    const allValues = new Set<number>();
    analyses.forEach(a => {
      if (a.summary?.keyValues) {
        a.summary.keyValues.forEach((v: number) => allValues.add(v));
      }
    });

    return {
      input: `Combined analysis from ${analyses.length} pages`,
      truths: allTruths,
      summary: {
        totalTruths,
        factCount,
        assertionCount,
        definitionCount,
        averageConfidence: avgConfidence,
        keyEntities: Array.from(allEntities).slice(0, 20),
        keyValues: Array.from(allValues).slice(0, 20)
      },
      objectiveVoice: analyses[0]?.objectiveVoice || {}
    };
  }

  /**
   * Discover and analyze multiple pages from a website
   */
  async discoverAndAnalyzePages(
    startUrl: string,
    profileName?: string,
    maxPages: number = 10,
    maxDepth: number = 2,
    maxConcurrency: number = 5
  ): Promise<WebsiteAnalysisResult> {
    console.log(`Discovering pages starting from: ${startUrl}`);
    const discoveredUrls = new Set<string>([startUrl]);
    const urlsToVisit = [startUrl];
    const visited = new Set<string>();

    // Simple discovery: fetch start page and extract links
    try {
      const html = await this.fetchWebsite(startUrl);
      const links = this.extractLinks(html, startUrl);
      
      // Add unique links up to maxPages
      for (const link of links) {
        if (discoveredUrls.size >= maxPages) break;
        if (!visited.has(link) && !link.includes('#') && !link.includes('?')) {
          discoveredUrls.add(link);
          urlsToVisit.push(link);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to discover links from ${startUrl}: ${errorMessage}`);
    }

    const urlsArray = Array.from(discoveredUrls).slice(0, maxPages);
    console.log(`Found ${urlsArray.length} page(s) to analyze\n`);

    return await this.convertMultiplePagesToProfile(urlsArray, profileName, maxPages, maxConcurrency);
  }

  /**
   * Analyze text and build profile
   */
  async analyzeAndBuildProfile(
    text: string,
    url: string,
    profileName?: string
  ): Promise<WebsiteAnalysisResult> {
    if (!this.framework) {
      await this.initialize();
    }

    // Input validation
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }
    
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    // Calculate text statistics
    const textStats = this.calculateTextStats(text);

    // Extract hostname once to avoid repeated parsing
    const hostname = this.extractHostname(url) || 'unknown';

    const profile = await this.framework.profileBuilder.buildFromSamples(
      [text],
      {
        name: profileName || `Website Profile: ${hostname}`,
        description: `Voice profile generated from ${url}`,
        sourceDocument: url
      }
    );
    
    if (!profile) {
      throw new Error('Failed to build profile from text');
    }

    // Perform Shredder analysis for objective truths
    const shredderAnalysis = this.shredder.shred(text);

    // Analyze profile for errors and issues
    const analysis = this.analyzeProfile(profile, text, textStats);

    // Generate UX suggestions
    const uxSuggestions = this.generateUXSuggestions(profile, text, analysis);

    // Save profile
    let profileId: string | undefined;
    try {
      if (this.framework?.profileManager && profile?.voiceName) {
        const metadata = await this.framework.profileManager.createProfile(profile, {
          name: profile.voiceName,
          description: `Generated from ${url}`,
          version: '1.0.0',
          sourceDocument: url,
          tags: ['website', 'auto-generated', hostname],
          isDefault: false
        });
        profileId = metadata?.id;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Failed to save profile:', errorMessage);
    }

    return {
      url,
      extractedText: text,
      textStats,
      profile,
      profileId,
      analysis: {
        ...analysis,
        uxSuggestions
      },
      shredderAnalysis
    };
  }

  /**
   * Main method: Convert website to profile with full analysis
   */
  async convertWebsiteToProfile(
    url: string,
    profileName?: string
  ): Promise<WebsiteAnalysisResult> {
    // Input validation
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }
    
    // Basic URL format validation
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    
    console.log(`Fetching website: ${url}`);
    const text = await this.extractTextFromWebsite(url);
    
    if (!text || text.length === 0) {
      throw new Error('No text could be extracted from the website');
    }
    
    console.log(`Extracted ${text.length} characters, analyzing...`);
    const result = await this.analyzeAndBuildProfile(text, url, profileName);
    
    if (!result || !result.profile) {
      throw new Error('Failed to analyze and build profile');
    }
    
    return result;
  }

  /**
   * Calculate text statistics (with caching to avoid redundant calculations)
   */
  private calculateTextStats(text: string) {
    // Use text hash as cache key (simple hash for performance)
    const cacheKey = `${text.length}-${text.substring(0, 50)}`;
    
    if (this.textStatsCache.has(cacheKey)) {
      return this.textStatsCache.get(cacheKey)!;
    }

    // Optimized single-pass calculation where possible
    const characters = text.length;
    
    // Use optimized regex patterns
    const sentences = text.match(/[.!?]+/g)?.length || 0;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    const stats = {
      characters,
      words,
      sentences,
      paragraphs
    };

    // Cache result (limit cache size to prevent memory issues)
    if (this.textStatsCache.size < 100) {
      this.textStatsCache.set(cacheKey, stats);
    }

    return stats;
  }

  /**
   * Analyze profile for errors and issues
   * 
   * This method checks the generated profile for quality issues and data completeness.
   * 
   * IMPORTANT: Warnings with type 'incomplete' are EXPECTED and NOT bugs. They indicate:
   * - Insufficient input data for optimal analysis (e.g., < 300 words)
   * - Missing patterns that require more content to detect (e.g., vocabulary, voice markers)
   * - Areas where additional content would improve profile accuracy
   * 
   * These warnings help users understand when they should provide more content,
   * but the profile generation will still work with limited data.
   * 
   * Quality Score Thresholds:
   * - 100: Excellent (all checks passed)
   * - 80-99: Good (minor warnings)
   * - 60-79: Acceptable (some data gaps)
   * - < 60: Low quality (significant data issues)
   */
  private analyzeProfile(
    profile: VoiceProfile,
    originalText: string,
    textStats: { characters: number; words: number; sentences: number; paragraphs: number }
  ): { errors: AnalysisError[]; warnings: AnalysisWarning[]; qualityScore: number } {
    const errors: AnalysisError[] = [];
    const warnings: AnalysisWarning[] = [];
    let qualityScore = 100;

    // Check for minimum text requirements
    // Note: 'incomplete' warnings here are expected when analyzing small content samples
    const { MIN_WORDS_ERROR, MIN_WORDS_WARNING, PENALTIES } = WebsiteToProfileConverter.QUALITY_THRESHOLDS;
    
    if (textStats.words < MIN_WORDS_ERROR) {
      errors.push({
        type: 'low_quality',
        severity: 'high',
        message: 'Insufficient text content for reliable profile generation',
        field: 'textStats.words',
        suggestion: `Provide at least ${MIN_WORDS_ERROR} words of content for better analysis`
      });
      qualityScore -= PENALTIES.INSUFFICIENT_WORDS;
    } else if (textStats.words < MIN_WORDS_WARNING) {
      // This warning is expected for small content samples - not a bug
      // The 'incomplete' type indicates insufficient data, not a code error
      warnings.push({
        type: 'incomplete',
        message: 'Limited text content may result in less accurate profile',
        field: 'textStats.words',
        recommendation: `Consider providing more content (${MIN_WORDS_WARNING}+ words recommended)`
      });
      qualityScore -= PENALTIES.LIMITED_WORDS;
    }

    // Check vocabulary completeness
    // Expected warning when content is too short or generic to extract vocabulary patterns
    // The 'incomplete' type indicates insufficient data, not a code error
    const vocab = profile.characteristics.linguisticPatterns.vocabulary;
    if (vocab.technicalTerms.length === 0 && vocab.descriptiveTerms.length === 0) {
      warnings.push({
        type: 'incomplete', // Expected - indicates need for more content, not a bug
        message: 'No distinctive vocabulary patterns detected',
        field: 'vocabulary',
        recommendation: 'Content may be too generic or insufficient for vocabulary analysis'
      });
      qualityScore -= PENALTIES.MISSING_VOCABULARY;
    }

    // Check for missing domain knowledge
    // Expected warning when content lacks domain-specific terminology
    // The 'incomplete' type indicates insufficient data, not a code error
    const domain = profile.characteristics.domainKnowledge;
    const totalConcepts = 
      domain.mathematicalConcepts.length +
      domain.designConcepts.length +
      domain.technicalConcepts.length;
    
    if (totalConcepts === 0) {
      warnings.push({
        type: 'incomplete', // Expected - indicates need for domain-specific content, not a bug
        message: 'No domain-specific concepts identified',
        field: 'domainKnowledge',
        recommendation: 'Content may lack domain-specific terminology'
      });
      qualityScore -= PENALTIES.MISSING_DOMAIN_KNOWLEDGE;
    }

    // Check voice markers
    // Expected warning when content is insufficient to identify voice patterns
    // The 'incomplete' type indicates insufficient data, not a code error
    const markers = profile.characteristics.voiceMarkers;
    const totalMarkers = 
      markers.openingPhrases.length +
      markers.connectingPhrases.length +
      markers.emphasisPhrases.length +
      markers.closingPhrases.length;
    
    if (totalMarkers < WebsiteToProfileConverter.QUALITY_THRESHOLDS.MIN_VOICE_MARKERS) {
      warnings.push({
        type: 'incomplete', // Expected - indicates need for more content, not a bug
        message: 'Limited voice markers detected',
        field: 'voiceMarkers',
        recommendation: 'More content may be needed to identify distinctive voice patterns'
      });
      qualityScore -= PENALTIES.LIMITED_VOICE_MARKERS;
    }

    // Check for structural issues
    if (!profile.characteristics.structuralPatterns.organization.hierarchical && 
        textStats.paragraphs > 5) {
      warnings.push({
        type: 'potential_issue',
        message: 'Content has multiple paragraphs but no hierarchical structure detected',
        field: 'structuralPatterns',
        recommendation: 'Consider using headers and sections for better organization'
      });
      qualityScore -= PENALTIES.STRUCTURAL_ISSUE;
    }

    // Check tone consistency
    const tone = profile.characteristics.tone;
    if (tone.formality === 'casual' && tone.technicality === 'very_high') {
      warnings.push({
        type: 'potential_issue',
        message: 'Unusual combination: casual formality with very high technicality',
        field: 'tone',
        recommendation: 'Review if this accurately reflects the intended voice'
      });
      qualityScore -= PENALTIES.TONE_INCONSISTENCY;
    }

    // Check accessibility vs technicality balance
    if (tone.technicality === 'very_high' && tone.accessibility === 'low') {
      warnings.push({
        type: 'potential_issue',
        message: 'Very high technicality with low accessibility may limit audience',
        field: 'tone',
        recommendation: 'Consider balancing technical depth with accessibility'
      });
      qualityScore -= 3;
    }

    // Check numerical precision
    // Expected warning when number patterns are inconsistent
    const numPrecision = profile.characteristics.linguisticPatterns.numericalPrecision;
    if (numPrecision.specificValues && numPrecision.commonValues.length === 0) {
      warnings.push({
        type: 'incomplete', // Expected - indicates inconsistent number usage, not a bug
        message: 'Numerical precision detected but no common values extracted',
        field: 'numericalPrecision',
        recommendation: 'May indicate inconsistent number usage'
      });
      qualityScore -= 2;
    }

    // Check comprehensiveness
    if (tone.comprehensiveness === 'low' && textStats.words > 500) {
      errors.push({
        type: 'inconsistency',
        severity: 'medium',
        message: 'Large text volume but low comprehensiveness score',
        field: 'tone.comprehensiveness',
        suggestion: 'Content may need better structure or more detailed coverage'
      });
      qualityScore -= 10;
    }

    return {
      errors,
      warnings,
      qualityScore: Math.max(0, qualityScore)
    };
  }

  /**
   * Generate UX refinement suggestions
   */
  private generateUXSuggestions(
    profile: VoiceProfile,
    originalText: string,
    analysis: { errors: AnalysisError[]; warnings: AnalysisWarning[]; qualityScore: number }
  ): UXSuggestion[] {
    const suggestions: UXSuggestion[] = [];
    const tone = profile.characteristics.tone;
    const structure = profile.characteristics.structuralPatterns;
    const vocab = profile.characteristics.linguisticPatterns.vocabulary;

    // Tone suggestions
    if (tone.accessibility === 'low' && tone.technicality === 'very_high') {
      suggestions.push({
        category: 'accessibility',
        priority: 'high',
        issue: 'Content may be too technical for general audience',
        currentState: `Technicality: ${tone.technicality}, Accessibility: ${tone.accessibility}`,
        suggestedImprovement: 'Add explanations, examples, or simplified versions of technical concepts',
        rationale: 'Balancing technical depth with accessibility improves user understanding and engagement'
      });
    }

    if (tone.precision === 'low' && tone.technicality === 'high') {
      suggestions.push({
        category: 'precision',
        priority: 'medium',
        issue: 'High technicality but low precision may reduce credibility',
        currentState: `Technicality: ${tone.technicality}, Precision: ${tone.precision}`,
        suggestedImprovement: 'Include specific values, measurements, or concrete examples',
        rationale: 'Technical content benefits from precise details and specific data points'
      });
    }

    // Structure suggestions
    if (!structure.organization.hierarchical) {
      suggestions.push({
        category: 'structure',
        priority: 'medium',
        issue: 'Content lacks hierarchical organization',
        currentState: 'No hierarchical structure detected',
        suggestedImprovement: 'Use headers, sections, and subsections to organize content',
        rationale: 'Hierarchical structure improves readability and helps users navigate content'
      });
    }

    if (structure.contentFlow.overviewFirst === false) {
      suggestions.push({
        category: 'structure',
        priority: 'low',
        issue: 'Content may not start with an overview',
        currentState: 'Overview-first pattern not detected',
        suggestedImprovement: 'Consider starting with an overview or introduction',
        rationale: 'Starting with an overview helps users understand context before diving into details'
      });
    }

    // Vocabulary suggestions
    if (vocab.technicalTerms.length < 5 && tone.technicality !== 'low') {
      suggestions.push({
        category: 'vocabulary',
        priority: 'medium',
        issue: 'Limited technical vocabulary detected',
        currentState: `Only ${vocab.technicalTerms.length} technical terms identified`,
        suggestedImprovement: 'Use more domain-specific terminology consistently',
        rationale: 'Consistent use of technical terms reinforces domain expertise and voice'
      });
    }

    // Comprehensiveness suggestions
    if (tone.comprehensiveness === 'low') {
      suggestions.push({
        category: 'comprehensiveness',
        priority: 'high',
        issue: 'Content may lack depth or detail',
        currentState: `Comprehensiveness: ${tone.comprehensiveness}`,
        suggestedImprovement: 'Add more detailed explanations, examples, and supporting information',
        rationale: 'Comprehensive content provides better value and demonstrates expertise'
      });
    }

    // Sentence structure suggestions
    const sentenceStruct = profile.characteristics.linguisticPatterns.sentenceStructure;
    if (sentenceStruct.complexity === 'high' && sentenceStruct.averageLength === 'long') {
      suggestions.push({
        category: 'accessibility',
        priority: 'medium',
        issue: 'Sentences may be too complex and long',
        currentState: `Complexity: ${sentenceStruct.complexity}, Length: ${sentenceStruct.averageLength}`,
        suggestedImprovement: 'Break down complex sentences into shorter, clearer statements',
        rationale: 'Shorter, clearer sentences improve readability and comprehension'
      });
    }

    return suggestions;
  }

  /**
   * Generate a detailed report
   */
  generateReport(result: WebsiteAnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('WEBSITE TO PROFILE ANALYSIS REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    const urlDisplay = Array.isArray(result.url) 
      ? `${result.url.length} page(s): ${result.url[0]}${result.url.length > 1 ? ' + ' + (result.url.length - 1) + ' more' : ''}`
      : result.url;
    lines.push(`URL: ${urlDisplay}`);
    lines.push(`Profile Name: ${result.profile.voiceName}`);
    if (result.profileId) {
      lines.push(`Profile ID: ${result.profileId}`);
    }
    lines.push('');
    
    lines.push('TEXT STATISTICS');
    lines.push('-'.repeat(80));
    lines.push(`Characters: ${result.textStats.characters.toLocaleString()}`);
    lines.push(`Words: ${result.textStats.words.toLocaleString()}`);
    lines.push(`Sentences: ${result.textStats.sentences.toLocaleString()}`);
    lines.push(`Paragraphs: ${result.textStats.paragraphs.toLocaleString()}`);
    
    if (result.pagesAnalyzed && result.pagesAnalyzed.length > 1) {
      lines.push('');
      lines.push(`Pages Analyzed: ${result.pagesAnalyzed.length}`);
      result.pagesAnalyzed.forEach((page, i) => {
        lines.push(`  ${i + 1}. ${page.url} (${page.words} words, ${page.characters} chars)`);
      });
    }
    lines.push('');
    
    lines.push('PROFILE CHARACTERISTICS');
    lines.push('-'.repeat(80));
    const tone = result.profile.characteristics.tone;
    lines.push(`Formality: ${tone.formality}`);
    lines.push(`Technicality: ${tone.technicality}`);
    lines.push(`Accessibility: ${tone.accessibility}`);
    lines.push(`Precision: ${tone.precision}`);
    lines.push(`Comprehensiveness: ${tone.comprehensiveness}`);
    lines.push('');
    
    lines.push('QUALITY ANALYSIS');
    lines.push('-'.repeat(80));
    lines.push(`Quality Score: ${result.analysis.qualityScore}/100`);
    lines.push('');
    
    if (result.analysis.errors.length > 0) {
      lines.push('ERRORS');
      lines.push('-'.repeat(80));
      result.analysis.errors.forEach((error, i) => {
        lines.push(`${i + 1}. [${error.severity.toUpperCase()}] ${error.message}`);
        if (error.field) {
          lines.push(`   Field: ${error.field}`);
        }
        if (error.suggestion) {
          lines.push(`   Suggestion: ${error.suggestion}`);
        }
        lines.push('');
      });
    }
    
    if (result.analysis.warnings.length > 0) {
      lines.push('WARNINGS');
      lines.push('-'.repeat(80));
      result.analysis.warnings.forEach((warning, i) => {
        lines.push(`${i + 1}. ${warning.message}`);
        if (warning.field) {
          lines.push(`   Field: ${warning.field}`);
        }
        if (warning.recommendation) {
          lines.push(`   Recommendation: ${warning.recommendation}`);
        }
        lines.push('');
      });
    }
    
    if (result.analysis.uxSuggestions.length > 0) {
      lines.push('UX REFINEMENT SUGGESTIONS');
      lines.push('-'.repeat(80));
      result.analysis.uxSuggestions.forEach((suggestion, i) => {
        lines.push(`${i + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.issue}`);
        lines.push(`   Category: ${suggestion.category}`);
        lines.push(`   Current State: ${suggestion.currentState}`);
        lines.push(`   Suggested Improvement: ${suggestion.suggestedImprovement}`);
        lines.push(`   Rationale: ${suggestion.rationale}`);
        lines.push('');
      });
    }
    
    if (result.shredderAnalysis) {
      lines.push('OBJECTIVE TRUTHS (SHREDDER ANALYSIS)');
      lines.push('-'.repeat(80));
      const summary = result.shredderAnalysis.summary;
      lines.push(`Total Truths Extracted: ${summary.totalTruths}`);
      const typeCounts: string[] = [];
      if (summary.factCount > 0) typeCounts.push(`Facts: ${summary.factCount}`);
      if (summary.assertionCount > 0) typeCounts.push(`Assertions: ${summary.assertionCount}`);
      if (summary.definitionCount > 0) typeCounts.push(`Definitions: ${summary.definitionCount}`);
      if (typeCounts.length > 0) {
        lines.push(`Truth Types: ${typeCounts.join(', ')}`);
      }
      if (summary.averageConfidence !== undefined) {
        lines.push(`Average Confidence: ${(summary.averageConfidence * 100).toFixed(1)}%`);
      }
      if (summary.keyEntities && summary.keyEntities.length > 0) {
        lines.push(`Key Entities: ${summary.keyEntities.slice(0, 10).join(', ')}`);
      }
      lines.push('');
    }
    
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}

// CLI usage
async function main() {
  const converter = new WebsiteToProfileConverter();
  const url = process.argv[2];
  const profileName = process.argv[3];

  if (!url) {
    console.error('Usage: tsx website-to-profile.ts <url> [profile-name]');
    process.exit(1);
  }

  try {
    const result = await converter.convertWebsiteToProfile(url, profileName);
    const report = converter.generateReport(result);
    console.log(report);
    
    // Save report to file
    const fs = await import('fs/promises');
    const reportPath = `./website-profile-report-${Date.now()}.txt`;
    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`\nReport saved to: ${reportPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly (check if this file is being run as a script)
const isMainModule = process.argv[1] && (
  process.argv[1].includes('website-to-profile') ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
);

if (isMainModule) {
  main();
}

