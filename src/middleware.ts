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

  redis : redis,
  limiter : Ratelimit.slidingWindow(3, '60 s'),
  analytics : true,
  prefix : '@upstash/ratelimit',
  ephemeralCache : new Map()

})



export async function middleware(request: NextRequest, context: NextFetchEvent):Promise<Response | undefined> {

  try {

    const ip = request.headers.get("x-real-ip") ?? 
               request.headers.get("x-forwarded-for") ?? 
               '127.0.0.1';
    const { success, pending, limit,remaining } = await rateLimit.limit(ip);

    context.waitUntil(pending); 


    const response = success ? NextResponse.next() : NextResponse.redirect(new URL('/api/blocked', request.url));
    response.headers.set("X-RateLimit-Success", success.toString());
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());

    return response;



  } catch (error) {


  }
}


// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
