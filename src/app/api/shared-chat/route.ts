import { Redis } from "@upstash/redis";

// Add error handling for Redis initialization
let redis: Redis;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
} catch (error) {
  console.error('Failed to initialize Redis:', error);
}

export async function PUT(request: Request) {
  if (!redis) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    const { chat } = await request.json();
    
    if (!chat || !chat.id) {
      return Response.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    // Store chat with expiration (e.g., 7 days)
    await redis.set(`chat:${chat.id}`, chat);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ error: 'Failed to store chat' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!redis) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('id');

  if (!chatId) {
    return Response.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const chatData = await redis.get(`chat:${chatId}`);
    if (!chatData) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Set headers to prevent caching and keep connection alive
    return new Response(JSON.stringify(typeof chatData === 'string' ? JSON.parse(chatData) : chatData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!redis) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const { chatId, message } = await request.json();
  
  if (!chatId) {
    return Response.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const chatData = await redis.get(`chat:${chatId}`);
    if (!chatData) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chat = typeof chatData === 'string' ? JSON.parse(chatData) : chatData;
    chat.messages.push(message);
    
    // Update with the same expiration
    await redis.set(`chat:${chatId}`, chat);
    return Response.json(chat);
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ error: 'Failed to update chat' }, { status: 500 });
  }
} 