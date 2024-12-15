import type { Browser } from 'puppeteer';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import ytdl from 'ytdl-core';
//import { createWorker } from 'tesseract.js';

// Dynamic imports to handle missing dependencies gracefully
const loadDependencies = async () => {
  try {
    return {
      ytdl: await import('ytdl-core'),
      pdf: await import('pdf-parse'),
      csv: await import('csv-parse'),
      tesseract: await import('tesseract.js'),
      Chart: (await import('chart.js/auto')).Chart
    };
  } catch (error) {
    console.error('Error loading dependencies:', error);
    return {};
  }
};

export class ContentExtractor {
  private browser: puppeteer.Browser | null = null;

  async init() {
    this.browser = await puppeteer.launch({ headless: true });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async extractFromUrl(url: string) {
    const urlType = this.detectUrlType(url);
    
    // Default to webpage extraction if dependencies are missing
    if (urlType !== 'webpage') {
      const deps = await loadDependencies();
      if (!deps.ytdl && urlType === 'youtube') return this.extractWebpage(url);
      if (!deps.pdf && urlType === 'pdf') return this.extractWebpage(url);
      if (!deps.csv && urlType === 'csv') return this.extractWebpage(url);
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

  private async extractYouTube(url: string) {
    const info = await ytdl.getInfo(url);
    const captions = await this.getYouTubeCaptions(info);
    const transcript = this.formatTranscript(captions);

    return {
      content: transcript,
      metadata: {
        title: info.videoDetails.title,
        author: info.videoDetails.author,
        duration: info.videoDetails.lengthSeconds,
      },
      links: [],
      mediaUrls: [url],
      data: undefined
    };
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

  private async extractCSV(url: string) {
    const deps = await loadDependencies();
    if (!deps.csv) throw new Error('CSV parser not available');

    const response = await fetch(url);
    const text = await response.text();
    const records: any[] = [];

    await new Promise((resolve) => {
      deps.csv.parse(text, {
        columns: true,
        skip_empty_lines: true,
      })
        .on('data', (data) => records.push(data))
        .on('end', resolve);
    });

    return {
      content: this.formatCSVContent(records),
      metadata: {
        rows: records.length,
        columns: Object.keys(records[0] || {}).length,
      },
      links: [],
      mediaUrls: [],
      data: records
    };
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

  private async extractWebpage(url: string) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Remove unnecessary elements
    $('script, style, noscript, iframe, img').remove();
    
    const links = new Set<string>();
    const mediaUrls = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#')) {
        links.add(new URL(href, url).toString());
      }
    });

    $('img, video, audio, source').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        mediaUrls.add(new URL(src, url).toString());
      }
    });

    return {
      content: $('body').text().trim(),
      metadata: {
        title: $('title').text(),
        description: $('meta[name="description"]').attr('content'),
      },
      links: Array.from(links),
      mediaUrls: Array.from(mediaUrls),
      data: undefined
    };
  }

  private async getYouTubeCaptions(info: any) {
    try {
      const captions = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captions?.length) return '';
      
      const caption = captions[0];
      const response = await fetch(caption.baseUrl);
      return await response.text();
    } catch (error) {
      console.error('Error getting captions:', error);
      return '';
    }
  }

  private formatTranscript(captionText: string): string {
    return captionText
      .replace(/<[^>]*>/g, '')  // Remove XML/HTML tags
      .replace(/\n\n/g, '\n')   // Remove double line breaks
      .trim();
  }

  private extractLinksFromText(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return Array.from(text.match(urlRegex) || []);
  }

  private formatCSVContent(records: any[]): string {
    return records.map(record => 
      Object.entries(record)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    ).join('\n');
  }

  // Helper methods...
} 