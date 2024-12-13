'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

  // Fetch chat data
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const response = await fetch(`/api/shared-chat?id=${params.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch chat');
        }
        
        setChat(data);
      } catch (error) {
        console.error('Error fetching chat:', error);
        setChat(null);
      }
    };

    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  const handleSend = async () => {
    if (!message.trim() || !chat) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          messages: chat.messages,
          chatId: chat.id
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setChat(prevChat => ({
        ...prevChat!,
        messages: [...prevChat!.messages, { role: "user", content: message }]
      }));
      
      // Update shared chat
      await fetch("/api/shared-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          message: { role: "user", content: message }
        }),
      });

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setMessage("");
      setIsLoading(false);
    }
  };

  if (!chat) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-4">Loading shared chat...</div>
          <div className="text-gray-400 text-sm">
            If this takes too long, the chat might not exist or has expired.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-white">Shared Chat</h1>
            <p className="text-sm text-gray-400 mt-1">
              Shared on {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-4">
            {chat.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 ${
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
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
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
  );
} 