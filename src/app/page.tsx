"use client";

import { useState, useEffect } from "react";
import Sidebar from '@/components/Sidebar';
import ShareModal from '@/components/ShareModal';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  role: "user" | "ai";
  content: string;
};

type Chat = {
  id: string;
  messages: Message[];
  createdAt: Date;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentChatId(parsed[0]?.id || null);
        return parsed.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt)
        }));
      }
    }
    const initialChat = { 
      id: generateId(), 
      messages: [{ role: "ai" as const, content: "Hello! How can I help you today?" }],
      createdAt: new Date()
    };
    return [initialChat];
  });

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  const handleNewChat = () => {
    const newChat: Chat = {
      id: generateId(),
      messages: [{ role: "ai" as const, content: "Hello! How can I help you today?" }],
      createdAt: new Date()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessage("");
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setMessage("");
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !currentChatId) return;

    const userMessage = { role: "user" as const, content: message };
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          messages: currentChat?.messages || [],
          url: message.startsWith('http') ? message : null
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          localStorage.setItem('chats', JSON.stringify(chats));
          localStorage.setItem('currentChatId', currentChatId);
          const resetTime = parseInt(response.headers.get('Retry-After') || '60');
          window.location.href = `/blocked?reset=${resetTime}`;
          return;
        }
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, { 
                role: "ai" as const, 
                content: data.content || data.message || "No response received" 
              }]
            }
          : chat
      ));

    } catch (error) {
      console.error("Error:", error);
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, { 
                role: "ai" as const, 
                content: "Oops! Something went wrong. Please try again later." 
              }]
            }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handleShareChat = async () => {
    if (!currentChatId) return;
    
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;

    try {
      const response = await fetch("/api/shared-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat: {
            id: currentChat.id,
            messages: currentChat.messages,
            createdAt: currentChat.createdAt
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shared chat');
      }

      const shareUrl = `${window.location.origin}/share/${currentChat.id}`;
      setShareUrl(shareUrl);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Error sharing chat:', error);
      alert(error instanceof Error ? error.message : 'Failed to share chat');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/shared-chat/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // Immediately update state with remaining chats
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setChats(remainingChats);

      // If we're deleting the current chat
      if (chatId === currentChatId) {
        if (remainingChats.length > 0) {
          // Select the first chat from remaining chats
          setCurrentChatId(remainingChats[0].id);
        } else {
          // If no chats remain, create a new one
          const newChat = {
            id: generateId(),
            messages: [{ role: "ai" as const, content: "Hello! How can I help you today?" }],
            createdAt: new Date()
          };
          setChats([newChat]);
          setCurrentChatId(newChat.id);
          // Update localStorage with new chat
          localStorage.setItem('chats', JSON.stringify([newChat]));
          return;
        }
      }

      // Update localStorage with remaining chats
      localStorage.setItem('chats', JSON.stringify(remainingChats));

    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // TODO: Modify the color schemes, fonts, and UI as needed for a good user experience
  // Refer to the Tailwind CSS docs here: https://tailwindcss.com/docs/customizing-colors, and here: https://tailwindcss.com/docs/hover-focus-and-other-states
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
        chats={chats.map(chat => ({
          id: chat.id,
          preview: chat.messages[chat.messages.length - 1]?.content || 'New Chat',
          createdAt: chat.createdAt.toISOString()
        }))}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="w-full bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">Chat</h1>
              <span className="text-sm text-gray-400">
                - Made with <span className="text-red-500">❤️</span> by{" "}
                <a 
                  href="https://github.com/sheicky" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400"
                >
                  Sheick
                </a>
              </span>
            </div>
            {currentChatId && (
              <button
                onClick={handleShareChat}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share Chat
              </button>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto pb-32 pt-4">
          <div className="max-w-3xl mx-auto px-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 mb-4 ${
                  msg.role === "ai"
                    ? "justify-start"
                    : "justify-end flex-row-reverse"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    msg.role === "ai"
                      ? "bg-gray-800 border border-gray-700 text-gray-100 markdown-body"
                      : "bg-cyan-600 text-white ml-auto"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <ReactMarkdown
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={atomDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 11 8 11zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" />
                  </svg>
                </div>
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
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-cyan-600 text-white px-5 py-3 rounded-xl hover:bg-cyan-700 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Add the signature */}
        <div className="fixed bottom-0 right-0 p-2 text-sm text-gray-500">
          Made with <span className="text-red-500">❤️</span> by{" "}
          <a 
            href="https://github.com/sheicky" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400"
          >
            Sheick
          </a>
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
