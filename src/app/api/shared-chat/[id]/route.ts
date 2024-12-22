import { Redis } from "@upstash/redis";
import { NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { [key: string]: string } }
) {
  if (!redis) {
    return Response.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    const { id } = params;
    
    await Promise.all([
      redis.del(`chat:${id}`),
      redis.del(`chat:${id}:messages`),
      redis.del(`chat:${id}:metadata`)
    ]);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Redis error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete chat' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 