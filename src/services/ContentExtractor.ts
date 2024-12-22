import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import ytdl from 'ytdl-core';
//import { createWorker } from 'tesseract.js';
import Papa from 'papaparse';

// Dynamic imports to handle missing dependencies gracefully
const loadDependencies = async () => {
  try {
    const deps: any = {
      ytdl: null,
      pdf: null,
      tesseract: null,
      Chart: null
    };
    
    try { deps.ytdl = await import('ytdl-core'); } catch (e) { console.warn('ytdl-core not available'); }
    try { deps.pdf = await import('pdf-parse'); } catch (e) { console.warn('pdf-parse not available'); }
    try { deps.tesseract = await import('tesseract.js'); } catch (e) { console.warn('tesseract.js not available'); }
    try { deps.Chart = (await import('chart.js/auto')).Chart; } catch (e) { console.warn('chart.js not available'); }
    
    return deps;
  } catch (error) {
    console.error('Error loading dependencies:', error);
    return {};
  }
};

interface ExtractedData {
  content: string;
  metadata: Record<string, unknown>;
  links: string[];
  mediaUrls: string[];
  data?: Record<string, unknown>[];
}

interface YouTubeInfo {
  videoDetails: {
    title: string;
    author: {
      name: string;
    };
    lengthSeconds: string;
    description?: string | null;
    thumbnails: Array<{ url: string }>;
  };
  player_response: {
    captions?: {
      playerCaptionsRenderer?: {
        baseUrl: string;
        visibility: string;
      };
      playerCaptionsTracklistRenderer?: {
        captionTracks: Array<{
          baseUrl: string;
          languageCode: string;
          name: { simpleText: string };
          vssId: string;
        }>;
        audioTracks: any[];
        translationLanguages: any[];
        defaultAudioTrackIndex: number;
      };
    };
  };
}

type captionTrack = {
  baseUrl: string;
  languageCode: string;
  name: { simpleText: string };
  vssId: string;
};

export class ContentExtractor {
  private browser: puppeteer.Browser | null = null;

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: true,  // Chang de "new" à true
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
  }

  async extractFromUrl(url: string): Promise<ExtractedData> {
    const urlType = this.detectUrlType(url);
    
    // Default to webpage extraction if dependencies are missing
    if (urlType !== 'webpage') {
      const deps = await loadDependencies();
      if (!deps.ytdl && urlType === 'youtube') return this.extractWebpage(url);
      if (!deps.pdf && urlType === 'pdf') return this.extractWebpage(url);
      if (!deps.tesseract && urlType === 'image') return this.extractWebpage(url);
    }

    switch (urlType) {
      case 'youtube':
        return await this.extractYouTube(url);
      case 'pdf':
        return await this.extractPDF(url);
      case 'csv':
        return await this.extractCSV(url);
      case 'image':
        return await this.extractImage(url);
      default:
        return await this.extractWebpage(url);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private detectUrlType(url: string): 'youtube' | 'pdf' | 'csv' | 'image' | 'webpage' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.endsWith('.pdf')) {
      return 'pdf';
    }
    if (url.endsWith('.csv')) {
      return 'csv';
    }
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      return 'image';
    }
    return 'webpage';
  }

  private async extractYouTube(url: string): Promise<ExtractedData> {
    try {
      const info = await ytdl.getInfo(url);
      const transcript = await this.getYouTubeCaptions(url);

      // Create a rich content summary
      const content = `
Title: ${info.videoDetails.title}
Channel: ${info.videoDetails.author.name}
Duration: ${Math.floor(parseInt(info.videoDetails.lengthSeconds) / 60)}m ${parseInt(info.videoDetails.lengthSeconds) % 60}s
Description: ${info.videoDetails.description || 'No description available'}

Transcript:
${transcript}
      `.trim();

      return {
        content,
        metadata: {
          title: info.videoDetails.title,
          author: info.videoDetails.author.name,
          duration: info.videoDetails.lengthSeconds,
          description: info.videoDetails.description,
          url: url,
          thumbnailUrl: info.videoDetails.thumbnails[0]?.url
        },
        links: [url],
        mediaUrls: [url],
        data: undefined
      };
    } catch (error) {
      console.error('YouTube extraction error:', error);
      // Fallback to webpage extraction if YouTube-specific extraction fails
      return this.extractWebpage(url);
    }
  }

  private async extractPDF(url: string) {
    const deps = await loadDependencies();
    if (!deps.pdf) throw new Error('PDF parser not available');

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const data = await deps.pdf.default(buffer);

    return {
      content: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
      links: this.extractLinksFromText(data.text),
      mediaUrls: [],
      data: undefined
    };
  }

  private async extractCSV(url: string): Promise<ExtractedData> {
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        return new Promise<ExtractedData>((resolve, reject) => {
            Papa.parse<Record<string, unknown>>(text, {
                header: true,
                complete: (results) => {
                    const records = results.data;
                    resolve({
                        content: this.formatCSVContent(records),
                        metadata: {
                            rows: records.length,
                            columns: results.meta.fields?.length || 0,
                            fields: results.meta.fields,
                            errors: results.errors
                        },
                        links: [],
                        mediaUrls: [],
                        data: records as Record<string, unknown>[]
                    });
                },
                error: (error: Error, file?: any) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                }
            });
        });
    } catch (error) {
        console.error('Error processing CSV:', error);
        throw error;
    }
  }

  private async extractImage(url: string) {
    const deps = await loadDependencies();
    if (!deps.tesseract) throw new Error('OCR not available');

    const worker = await deps.tesseract.createWorker();
    const { data } = await worker.recognize(url);
    await worker.terminate();

    return {
      content: data.text,
      metadata: { type: 'image', url },
      links: [],
      mediaUrls: [url],
      data: undefined
    };
  }

  private async extractWebpage(url: string): Promise<ExtractedData> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    try {
      // Set a shorter timeout and handle navigation errors
      await Promise.race([
        page.goto(url, { 
          waitUntil: 'domcontentloaded', // Changed from networkidle0 to domcontentloaded
          timeout: 15000 // Reduced timeout to 15 seconds
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 15000)
        )
      ]).catch(error => {
        console.warn(`Navigation warning for ${url}:`, error.message);
        // Continue execution even if navigation times out
      });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Clean up content
      $('script, style, noscript, iframe').remove();
      
      // Extract main content
      const mainContent = $('article, main, .content, #content, .post, .article')
        .first()
        .text()
        .trim() || $('body').text().trim();

      // Extract links and media
      const links = new Set<string>();
      const mediaUrls = new Set<string>();

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#')) {
          try {
            links.add(new URL(href, url).toString());
          } catch (e) {}
        }
      });

      return {
        content: mainContent || 'No content could be extracted',
        metadata: {
          title: $('title').text(),
          description: $('meta[name="description"]').attr('content'),
          url: url
        },
        links: Array.from(links),
        mediaUrls: Array.from(mediaUrls),
        data: undefined
      };
    } catch (error: any) {
      console.error('Webpage extraction error:', error);
      return {
        content: 'Failed to extract content',
        metadata: { url, error: error.message },
        links: [],
        mediaUrls: [],
        data: undefined
      };
    } finally {
      await page.close().catch(console.error);
    }
  }

  private async getYouTubeCaptions(url: string): Promise<string> {
    try {
        const videoId = ytdl.getVideoID(url);
        const response = await fetch(`http://localhost:3001/transcript/${videoId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to get transcript');
        }
        
        return data.transcript;
    } catch (error) {
        console.error('Error getting captions:', error);
        return 'No transcript available for this video.';
    }
  }

  private extractLinksFromText(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return Array.from(text.match(urlRegex) || []);
  }

  private formatCSVContent(records: any[]): string {
    return records
        .map(record => 
            Object.entries(record)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
        )
        .join('\n');
  }

  // Helper methods...
} 