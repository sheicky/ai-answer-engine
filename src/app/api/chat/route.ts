// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

// libraries
//import { Groq } from 'groq-sdk';
//import puppeteer from 'puppeteer';
//import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentExtractor } from '@/services/ContentExtractor';
import { Visualizer } from '@/services/Visualizer';
//import { WebCrawler } from '@/services/WebCrawler';
import type { ChartConfiguration } from 'chart.js';
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
// async function scrapeWebsite(url: string) {
//   const browser = await puppeteer.launch({ headless: true }); 
//   try {
//     const page = await browser.newPage(); 
//     await page.goto(url);
//     const content = await page.content(); 
//
//     // Using cheerio to parse the HTML 
//     const parsedHTML = cheerio.load(content); 
//     const text = parsedHTML('body').text().trim(); 
//     return text; 
//
//   } finally {
//     await browser.close(); 
//   }
// }

// Supprimer ou commenter la fonction inutilisée
/* async function summarizeText(model: any, text: string) {
  try {
    const summaryPrompt = `Please summarize this text while keeping the important information (max 1000 characters): \n\n${text}`;
    const result = await model.generateContent(summaryPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Summarization error:', error);
    return text.substring(0, 1000) + '...';
  }
} */

type Message = {
  role: "user" | "ai";
  content: string;
};

// Add this helper function
async function shouldCreateVisualization(content: string, data: Record<string, unknown>[] | undefined): Promise<boolean> {
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

// Modifier le type Visualization
type Visualization = ChartConfiguration;

// Applying the scraping to the chat request
export async function POST(req: Request) {
  try {
    const { message, messages, url } = await req.json();
    
    let contextFromWeb = '';
    let visualizations: Visualization[] = [];

    if (url) {
      try {
        const extractor = new ContentExtractor();
        await extractor.init();
        
        const result = await extractor.extractFromUrl(url);
        contextFromWeb = result.content;

        // Clean up resources
        await extractor.close();

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
        `You are a helpful AI assistant. When providing answers:
        1. Always cite sources using numbered references [1], [2], etc.
        2. Format source links at the end of your response using markdown:
           [1]: https://example.com "Title of source"
           [2]: https://another-example.com "Another title"
        3. Make sure all links are complete URLs (starting with http:// or https://)
        4. If analyzing a video:
           - Summarize key points from the transcript
           - Include relevant quotes when appropriate
           - Reference video timestamps if available
        5. If extracting from the provided context, cite it as [Context] and include relevant quotes
        `,
        contextFromWeb ? `Context: ${contextFromWeb}` : "",
        ...messages.map((msg: Message) => `${msg.role}: ${msg.content}`),
        `user: ${message}`
      ].join("\n\n");

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
    
      // Format the response text
      let formattedText = response.text()
        .replace(/```(\w+)\n/g, '```$1\n') // Ensure proper code block formatting
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .trim();

      // Add spacing around headers
      formattedText = formattedText.replace(/^(#{1,6} .+)$/gm, '\n$1\n');

      return Response.json({
        content: formattedText,
        visualizations: visualizations.length > 0 ? visualizations : undefined
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Allow-HTML': 'true'
        }
      });

    } catch (error: unknown) {
      if (error instanceof Error && (error.message?.includes('429') || error.message?.includes('quota'))) {
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





