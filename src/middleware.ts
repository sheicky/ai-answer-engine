// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis
const redis = new Redis({
  url : process.env.UPSTASH_REDIS_REST_URL,
  token : process.env.UPSTASH_REDIS_REST_TOKEN
})

// Creating the rate limiter

const rateLimit = new Ratelimit({
  redis: redis,
  // Reduce the number of requests allowed
  limiter: Ratelimit.fixedWindow(2, '60 s'), // 2 requests per minute
  analytics: true,
  prefix: '@upstash/ratelimit',
  ephemeralCache: new Map()
});



export async function middleware(request: NextRequest, context: NextFetchEvent):Promise<Response | undefined> {
  // Skip the middleware for the blocked page and shared chat pages
  if (request.nextUrl.pathname === '/blocked' || request.nextUrl.pathname.startsWith('/share/')) {
    return NextResponse.next();
  }

  try {
    const ip = request.headers.get("x-real-ip") ?? 
               request.headers.get("x-forwarded-for") ?? 
               '127.0.0.1';
    const { success, pending, limit, remaining, reset } = await rateLimit.limit(ip);

    context.waitUntil(pending);

    if (!success) {
      const resetTime = Math.ceil((reset - Date.now()) / 1000);
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
          }
        }
      );
      return response;
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


// Configure which paths the middleware runs on
export const config = {
  matcher: [
    '/api/chat/:path*',
    '/((?!_next/static|_next/image|favicon.ico|blocked|share).*)',
  ],
};
