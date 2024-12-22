import { Redis } from "@upstash/redis";
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Use the correct type from Next.js
type Props = {
  params: { id: string }
}

export async function DELETE(
  request: NextRequest,
  props: Props  // Use the Props type here
) {
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    const { id } = props.params;
    
    await Promise.all([
      redis.del(`chat:${id}`),
      redis.del(`chat:${id}:messages`),
      redis.del(`chat:${id}:metadata`)
    ]);
    
    return NextResponse.json({ success: true }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Redis error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 