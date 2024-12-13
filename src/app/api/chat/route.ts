// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

// Importing libraries
import { Groq } from 'groq-sdk';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentExtractor } from '@/services/ContentExtractor';
import { Visualizer } from '@/services/Visualizer';
import { WebCrawler } from '@/services/WebCrawler';
// Implementing the chat API with Groq  

/*
const client = new Groq({
  apiKey: process.env['GROQ_API_KEY'],
}
);
*/
if (!process.env['GEMINI_API_KEY']) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const client = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']);
//  Web Scraping  
async function scrapeWebsite(url: string) {
  const browser = await puppeteer.launch({ headless: true }); 
  try {
    const page = await browser.newPage(); 
    await page.goto(url);
    const content = await page.content(); 

    // Using cheerio to parse the HTML 
    const parsedHTML = cheerio.load(content); 
    const text = parsedHTML('body').text().trim(); 
    return text; 

  } finally {
    await browser.close(); 
  }
}

async function summarizeText(model: any, text: string) {
  try {
    const summaryPrompt = `Please summarize this text while keeping the important information (max 1000 characters): \n\n${text}`;
    const result = await model.generateContent(summaryPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Summarization error:', error);
    // Fallback to truncation if summarization fails
    return text.substring(0, 1000) + '...';
  }
}

type Message = {
  role: "user" | "ai";
  content: string;
};

// Add this helper function
async function shouldCreateVisualization(content: string, data: any[] | undefined): Promise<boolean> {
  if (!data) return false;

  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const prompt = `
    Analyze this content and data to determine if a visualization would be helpful.
    Consider factors like:
    - Is this numerical/statistical data?
    - Would a visual representation add value?
    - Is the data suitable for charting?

    Content: ${content.substring(0, 500)}...
    Data Sample: ${JSON.stringify(data.slice(0, 3))}

    Reply with only "true" or "false".
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().toLowerCase().includes('true');
  } catch (error) {
    console.error('Error determining visualization need:', error);
    return false;
  }
}

// Applying the scraping to the chat request
export async function POST(req: Request) {
  try {
    const { message, messages, url } = await req.json();
    
    let contextFromWeb = '';
    let visualizations = [];

    if (url) {
      try {
        const extractor = new ContentExtractor();
        await extractor.init();
        
        const result = await extractor.extractFromUrl(url);
        contextFromWeb = result.content;

        // Only generate visualizations if the LLM determines it's useful
        if (result.data && await shouldCreateVisualization(result.content, result.data)) {
          const visualizer = new Visualizer();
          visualizations = [
            visualizer.generateChart(result.data, 'bar', {
              xAxis: Object.keys(result.data[0])[0],
              yAxis: Object.keys(result.data[0])[1],
              title: 'Data Visualization'
            })
          ];
        }

      
      } catch (error) {
        console.error('Extraction error:', error);
      }
    }

    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    try {
      const prompt = [
        `You are a helpful assistant. When providing answers, ensure to cite reliable
         and verifiable sources. Use a conventional citation style by referring to 
         sources with numbered references in the text (e.g., [1], [2]) and listing 
         the corresponding sources at the end of your response. Strive for accuracy, clarity, 
        and a professional tone in your writing. In your response, please make beautiful paragraphs.`,
        contextFromWeb ? `Context: ${contextFromWeb}` : "",
        ...messages.map((msg: Message) => `${msg.role}: ${msg.content}`),
        `user: ${message}`
      ].join("\n");

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return Response.json({
        content: response.text(),
      });
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return Response.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}





