import { Redis } from "@upstash/redis";

type Message = {
  role: "user" | "ai";
  content: string;
};

type Chat = {
  id: string;
  messages: Message[];
  createdAt: Date;
  isShared?: boolean;
};

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

    // Create a clean chat object for sharing
    const sharedChat: Chat = {
      id: chat.id,
      messages: chat.messages as Message[],
      createdAt: new Date(),
      isShared: true
    };

    // Store the stringified chat data
    await redis.set(`chat:${chat.id}`, JSON.stringify(sharedChat), {
      ex: 60 * 60 * 24 * 7 // 7 days expiration
    });

    return Response.json({ 
      success: true,
      sharedId: chat.id
    });
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ error: 'Failed to store chat' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!redis) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const chatData = await redis.get(`chat:${id}`);
    
    if (!chatData) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Handle different types of Redis responses
    let parsedChat;
    if (typeof chatData === 'string') {
      try {
        parsedChat = JSON.parse(chatData);
      } catch {
        parsedChat = chatData;
      }
    } else {
      parsedChat = chatData;
    }

    return Response.json(parsedChat);
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

    const chat = JSON.parse(chatData.toString());
    chat.messages.push(message);
    
    // Update with stringified data and same expiration
    await redis.set(`chat:${chatId}`, JSON.stringify(chat), {
      ex: 60 * 60 * 24 * 7 // maintain 7 days expiration
    });
    
    return Response.json(chat);
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json({ error: 'Failed to update chat' }, { status: 500 });
  }
} 