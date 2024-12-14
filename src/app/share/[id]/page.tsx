'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Message, Chat } from "@/types";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ShareModal from '@/components/ShareModal';
import Sidebar from '@/components/Sidebar';

export default function SharedChat() {
  const params = useParams();
  const chatId = params?.id as string;
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    const fetchChat = async () => {
      if (!currentChatId) return;
      
      try {
        const response = await fetch(`/api/shared-chat?id=${currentChatId}`);
        if (!response.ok) {
          throw new Error('Chat not found');
        }
        const data = await response.json();
        const chat = {
          ...data,
          createdAt: new Date(data.createdAt)
        };
        setChats([chat]);
      } catch (error) {
        console.error('Error fetching shared chat:', error);
        router.push('/');
      }
    };

    fetchChat();
  }, [currentChatId, router]);

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
    setNewMessage("");
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setNewMessage("");
  };

  const handleShareChat = async () => {
    if (!currentChat) return;
    
    try {
      const response = await fetch("/api/shared-chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: currentChat }),
      });

      if (!response.ok) {
        throw new Error('Failed to create shared chat');
      }

      const shareUrl = `${window.location.origin}/share/${currentChat.id}`;
      setShareUrl(shareUrl);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Error sharing chat:', error);
      alert('Failed to share chat');
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentChatId) return;
    
    setIsLoading(true);
    try {
      const userMessage = { role: "user" as const, content: newMessage };
      const updatedMessages = currentChat 
        ? [...currentChat.messages, userMessage]
        : [userMessage];

      setChats(prevChats => {
        const updatedChat = {
          id: currentChatId,
          messages: updatedMessages,
          createdAt: new Date(),
          isShared: true
        };
        return prevChats.map(chat => 
          chat.id === currentChatId ? updatedChat : chat
        );
      });
      setNewMessage("");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newMessage,
          messages: updatedMessages,
          url: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { content, visualizations } = await response.json();

      const newMessages = [
        ...updatedMessages,
        { role: "ai" as const, content }
      ];

      await fetch("/api/shared-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: newMessages
        }),
      });

      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChatId 
            ? {
                ...chat,
                messages: newMessages,
                visualizations
              }
            : chat
        )
      );

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header with share button */}
        <div className="w-full bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white">Shared Chat</h1>
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

        {/* Messages avec le même style que le chat principal */}
        <div className="flex-1 overflow-y-auto pb-32 pt-4">
          <div className="max-w-3xl mx-auto px-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 mb-4 ${
                  msg.role === "ai" ? "justify-start" : "justify-end flex-row-reverse"
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

        {/* Input area avec le même style */}
        <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400"
                disabled={isLoading}
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
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
} 