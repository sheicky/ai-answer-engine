'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ShareModal from '@/components/ShareModal';
import Sidebar from '@/components/Sidebar';

type Message = {
  role: "user" | "ai";
  content: string;
};

type SharedChat = {
  id: string;
  messages: Message[];
  createdAt: string | Date;
};

export default function SharedChat() {
  const router = useRouter();
  const params = useParams();
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shared_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('shared_chats', JSON.stringify(chats));
  }, [chats]);

  // Add new chat functionality
  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  const handleNewChat = () => {
    const newChat = {
      id: generateId(),
      messages: [{ role: "ai" as const, content: "Hello! How can I help you today?" }],
      createdAt: new Date()
    };
    setChats(prev => [newChat, ...prev]);
    router.push(`/share/${newChat.id}`);
  };

  const handleSelectChat = (chatId: string) => {
    router.push(`/share/${chatId}`);
  };

  // Fetch chat data with reconnection logic
  const fetchChat = useCallback(async () => {
    try {
      const response = await fetch(`/api/shared-chat?id=${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      const data = await response.json();
      setChat(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching chat:', error);
      setIsConnected(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  const handleShareChat = async () => {
    if (!chat) return;
    const shareUrl = `${window.location.origin}/share/${chat.id}`;
    setShareUrl(shareUrl);
    setIsShareModalOpen(true);
  };

  const handleSend = async () => {
    if (!message.trim() || !chat) return;

    setIsLoading(true);
    try {
      const newMessage = { role: "user" as const, content: message };
      setChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage]
      } : null);
      setMessage("");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          messages: chat.messages,
          chatId: chat.id
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const resetTime = parseInt(response.headers.get('Retry-After') || '60');
          window.location.href = `/blocked?reset=${resetTime}`;
          return;
        }
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { 
          role: "ai", 
          content: data.content || data.message || "No response received" 
        }]
      } : null);

      await fetchChat(); // Refresh to ensure consistency
    } catch (error) {
      console.error("Error:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!chat) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-4">
            {isConnected ? 'Loading shared chat...' : 'Connection lost. Reconnecting...'}
          </div>
          {!isConnected && (
            <button 
              onClick={fetchChat}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white text-sm transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        onNewChat={handleNewChat}
        currentChatId={params.id}
        chats={chats.map(chat => ({
          id: chat.id,
          preview: chat.messages[chat.messages.length - 1]?.content || 'New Chat',
          createdAt: chat.createdAt
        }))}
        onSelectChat={handleSelectChat}
      />

      <div className="flex-1 flex flex-col">
        {!isConnected && (
          <div className="bg-red-500/10 p-2 text-center">
            <span className="text-red-400">Connection lost. Attempting to reconnect...</span>
          </div>
        )}

        {/* Header */}
        <div className="w-full bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-white">Shared Chat</h1>
              <p className="text-sm text-gray-400">
                {chat && new Date(chat.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
              >
                New Chat
              </button>
              <button
                onClick={handleShareChat}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share Chat
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto pb-32 pt-4">
          <div className="max-w-3xl mx-auto px-4">
            {chat.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 mb-4 ${
                  msg.role === "ai" ? "justify-start" : "justify-end flex-row-reverse"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    msg.role === "ai"
                      ? "bg-gray-800 border border-gray-700 text-gray-100"
                      : "bg-cyan-600 text-white"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 mb-4">
                <div className="px-4 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-gray-100">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-cyan-600 text-white px-5 py-3 rounded-xl hover:bg-cyan-700 transition-all disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
} 