// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create separate rate limiters for different types of chats
const mainRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '60 s'),  // 5 requests per minute for main chats
  analytics: true,
  prefix: '@upstash/ratelimit/main',
});

const sharedRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),  // 10 requests per minute for shared chats
  analytics: true,
  prefix: '@upstash/ratelimit/shared',
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/blocked') {
    return NextResponse.next();
  }

  try {
    const ip = request.headers.get("x-real-ip") ?? 
               request.headers.get("x-forwarded-for") ?? 
               '127.0.0.1';

    // Check if this is a shared chat request
    const isSharedChat = request.nextUrl.pathname.startsWith('/share/');
    
    // Create unique identifiers for each user's chat session
    const identifier = `${ip}:${isSharedChat ? 'shared' : 'main'}`;
    
    // Use appropriate rate limiter based on chat type
    const limiter = isSharedChat ? sharedRateLimit : mainRateLimit;
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      const resetTime = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    return response;

  } catch (error) {
    console.error('Rate limiting error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/api/chat/:path*',
    '/((?!_next/static|_next/image|favicon.ico|blocked).*)',
  ],
};
