'use client';

import { useState } from 'react';

type Props = {
  onNewChat: () => void;
  currentChatId: string | null;
  chats: { 
    id: string; 
    preview: string;
    createdAt: string | Date;
  }[];
  onSelectChat: (chatId: string) => void;
};

export default function Sidebar({ onNewChat, currentChatId, chats, onSelectChat }: Props) {
  function formatDate(date: string | Date) {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }).format(dateObj);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  }

  return (
    <div className="w-72 bg-gray-900 h-screen flex flex-col border-r border-gray-800">
      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 m-4 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors text-white font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        New Chat
      </button>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left p-3 mb-2 rounded-lg hover:bg-gray-800 transition-all ${
              currentChatId === chat.id 
                ? 'bg-gray-800 ring-1 ring-cyan-500/50' 
                : 'hover:shadow-lg hover:shadow-gray-800/50'
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400">
                  {formatDate(chat.createdAt)}
                </span>
                {currentChatId === chat.id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Current
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-sm line-clamp-2">{chat.preview}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
} 