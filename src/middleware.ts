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

// Configure rate limiter with sliding window
const mainRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "30 s"), // 5 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit',
  ephemeralCache: new Map(), // Add cache for better performance
});

export async function middleware(request: NextRequest) {
  // Skip rate limiting for share endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/shared-chat') || 
    request.nextUrl.pathname.startsWith('/share/') ||
    request.nextUrl.pathname === '/blocked'
  ) {
    return NextResponse.next();
  }

  try {
    const ip = request.headers.get("x-real-ip") ?? 
               request.headers.get("x-forwarded-for") ?? 
               '127.0.0.1';
    
    const { success, limit, remaining, reset } = await mainRateLimit.limit(ip);

    // If rate limit is exceeded
    if (!success) {
      const now = Date.now();
      
      // If the reset time has passed, allow the request and reset counter
      if (now >= reset) {
        await redis.del(`@upstash/ratelimit:${ip}`);
        return NextResponse.next();
      }

      // Otherwise, return rate limit error
      const resetTime = Math.ceil((reset - now) / 1000);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetIn: resetTime,
          nextRequestAt: new Date(reset).toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
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
