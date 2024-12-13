# AI Answer Engine: Context-Aware Chat Interface with Web Scraping

![image](https://github.com/user-attachments/assets/47df5ea5-3e58-457e-b282-034597982d9c)



## Project Overview

AI Answer Engine is a sophisticated chat interface that leverages Large Language Models (LLMs) to provide context-aware responses with source citations. The system can process multiple URLs simultaneously, extract relevant information, and engage in meaningful conversations while maintaining proper attribution.

### Key Features
Users can:
- Have a normal conversations with the model
- Paste multiple URLs for context extraction
- Ask questions and receive sourced answers
- Share conversations via unique links
- Continue shared conversations
- View data visualizations when applicable

## Tech Stack

### Core Technologies
- **Next.js 14**: App Router and Server Components
- **Redis (Upstash)**: Rate limiting and data persistence
- **Google Gemini AI**: Large Language Model integration
- **Tailwind CSS**: Responsive UI design

### Libraries and Tools
- **Puppeteer**: Headless browser automation
- **Cheerio**: HTML parsing and data extraction
- **Chart.js**: Data visualization
- **React Markdown**: Content rendering

## Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/ai-answer-engine.git
cd ai-answer-engine
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
Create a `.env` file with:
```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
GEMINI_API_KEY=your_gemini_api_key
```

4. **Run the development server**:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

### Key Components

1. **UI Layer** (`src/app/page.tsx`)
   - Chat interface implementation
   - Real-time response handling
   - State management
   - Share functionality

2. **API Layer** (`src/app/api/chat/route.ts`)
   - LLM integration
   - Web scraping implementation
   - Data visualization generation
   - Response formatting

3. **Middleware** (`src/middleware.ts`)
   - Rate limiting implementation
   - Request validation
   - Error handling


## Future Enhancements

1. **Extended Content Extraction**
   - YouTube video transcription
   - PDF document parsing
   - CSV data processing
   - Image analysis and OCR

2. **Advanced Visualization**
   - Interactive charts
   - Custom visualization types
   - Real-time data updates
   - Export capabilities

3. **Hierarchical Web Crawling**
   - Deep link analysis
   - Content relevance scoring
   - Media link extraction
   - Recursive crawling


## Demo

Check out our video demo here: [YouTube Demo Link]

---

Built with ❤️ Sheick  using Next.js, Redis, and Google Gemini AI
