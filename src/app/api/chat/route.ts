// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

// Importing libraries
import { Groq } from 'groq-sdk';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// Implementing the chat API with Groq  

const client = new Groq({
  apiKey: process.env['GROQ_API_KEY'],
}
);

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
// Applying the scraping to the chat request
export async function POST(req: Request) {
  try {
    const { messages, url } = await req.json();
    let contextFromWeb = ''; 
    if (url) {
      contextFromWeb = await scrapeWebsite(url); 
    }
    const messagesWithContext = contextFromWeb 
      ? [...messages, { role: 'system', content: `Context from web: ${contextFromWeb}` }]
      : messages;

    const completion = await client.chat.completions.create({
      messages: messagesWithContext,
      model: "llama3-70b-8192"
    });

    return Response.json({
      content: completion.choices[0].message.content,
    });


  } catch (error: unknown) {
    if (error instanceof Groq.APIError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}





