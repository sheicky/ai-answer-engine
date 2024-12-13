import { ContentExtractor } from './ContentExtractor';

export class WebCrawler {
  private visited = new Set<string>();
  private queue: string[] = [];
  private contentExtractor: ContentExtractor;

  constructor() {
    this.contentExtractor = new ContentExtractor();
  }

  async crawl(startUrl: string, options: {
    maxDepth: number;
    maxPages: number;
    allowedDomains?: string[];
  }) {
    await this.contentExtractor.init();
    this.queue.push(startUrl);
    
    const results = new Map<string, any>();
    let depth = 0;
    let pagesProcessed = 0;

    while (this.queue.length > 0 && depth < options.maxDepth && pagesProcessed < options.maxPages) {
      const currentUrls = [...this.queue];
      this.queue = [];

      for (const url of currentUrls) {
        if (this.visited.has(url)) continue;
        if (options.allowedDomains && !this.isAllowedDomain(url, options.allowedDomains)) continue;

        try {
          const result = await this.contentExtractor.extractFromUrl(url);
          results.set(url, result);
          this.visited.add(url);
          pagesProcessed++;

          // Add new URLs to queue
          result.links.forEach(link => {
            if (!this.visited.has(link)) {
              this.queue.push(link);
            }
          });
        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
        }
      }

      depth++;
    }

    await this.contentExtractor.close();
    return results;
  }

  private isAllowedDomain(url: string, allowedDomains: string[]): boolean {
    try {
      const hostname = new URL(url).hostname;
      return allowedDomains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }
} 