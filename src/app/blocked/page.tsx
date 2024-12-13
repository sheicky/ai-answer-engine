'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RateLimitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(parseInt(searchParams.get('reset') || '60'));

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleRedirect = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-cyan-500/20">
        <div className="text-center">
          {/* Animated Warning Icon */}
          <div className="mx-auto w-24 h-24 mb-6 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <div className="relative bg-red-500 rounded-full p-5">
              <svg className="w-14 h-14 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Rate Limit Exceeded</h1>
          <p className="text-cyan-400 text-lg mb-6">Whoa there! 🚀 Taking a quick break.</p>
          
          {/* Timer Display */}
          <div className="mb-8">
            <div className="text-6xl font-bold text-white mb-2 font-mono tracking-wider">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
              {String(timeLeft % 60).padStart(2, '0')}
            </div>
            <p className="text-gray-400">until next request available</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-8 overflow-hidden">
            <div 
              className="bg-cyan-500 h-2.5 rounded-full transition-all duration-1000 ease-linear"
              style={{ 
                width: `${(timeLeft / parseInt(searchParams.get('reset') || '60')) * 100}%`,
                boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)' 
              }}
            ></div>
          </div>

          <p className="text-gray-300 mb-8">
            To ensure the best experience for everyone, we limit requests to 2 per minute.
          </p>

          {/* Return Button */}
          <button
            onClick={handleRedirect}
            disabled={timeLeft > 0}
            className={`
              w-full py-3 px-4 rounded-xl font-medium transition-all duration-300
              ${timeLeft > 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
              }
            `}
          >
            {timeLeft > 0 ? 'Please wait...' : 'Return to Chat'}
          </button>
        </div>
      </div>
    </div>
  );
} 