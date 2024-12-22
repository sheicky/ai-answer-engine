'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BlockedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeLeft, setTimeLeft] = useState(parseInt(searchParams.get('reset') || '60'));
  const returnUrl = searchParams.get('returnUrl') || '/';

  useEffect(() => {
    if (timeLeft <= 0) {
      router.push(returnUrl);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, router, returnUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700/50">
        <div className="text-center">
          <div className="mb-6 relative">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
              <svg 
                className="w-10 h-10 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="relative">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {timeLeft}
                </div>
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3 font-display">
            Rate Limit Exceeded ✨
          </h1>
          
          <p className="text-gray-300 mb-8 leading-relaxed">
            Time for a quick breather! 🌟 We'll be ready to chat again in a moment.
          </p>

          <div className="w-full h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          <button
            onClick={() => router.push(returnUrl)}
            disabled={timeLeft > 0}
            className={`
              w-full py-3 px-6 rounded-xl font-medium transition-all duration-200
              ${timeLeft > 0 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 transform hover:-translate-y-0.5'
              }
            `}
          >
            {timeLeft > 0 
              ? `Resume chat in ${timeLeft}s` 
              : 'Resume chat'
            }
          </button>

          <p className="mt-4 text-sm text-gray-400">
            Magic happens while you wait &apos;✨&apos;
          </p>
        </div>
      </div>
    </div>
  );
} 