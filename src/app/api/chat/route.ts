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

type Message = {
  role: "user" | "ai";
  content: string;
};

// Applying the scraping to the chat request
export async function POST(req: Request) {
  try {
    const { message, messages, url } = await req.json();
    
    let contextFromWeb = '';
    if (url) {
      try {
        contextFromWeb = await scrapeWebsite(url);
        if (contextFromWeb.length > 1000) {
          contextFromWeb = contextFromWeb.substring(0, 1000) + '...';
        }
      } catch (error) {
        console.error('Scraping error:', error);
      }
    }

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...(contextFromWeb ? [{ role: "system", content: `Context: ${contextFromWeb}` }] : []),
        ...messages.map((msg: Message) => ({
          role: msg.role === "ai" ? "assistant" : "user",
          content: msg.content
        })),
        { role: "user", content: message }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 1,
      max_tokens: 1000,
    });

    return Response.json({
      content: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}





