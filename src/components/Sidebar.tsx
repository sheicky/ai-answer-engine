'use client';

import { useState } from 'react';

type Chat = {
  id: string;
  preview: string;
  createdAt: string | Date;
};

interface SidebarProps {
  onNewChat: () => void;
  currentChatId: string | null;
  chats: Chat[];
  onSelectChat: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteModal({ isOpen, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-xl font-semibold text-white mb-4">Delete Conversation</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onNewChat, currentChatId, chats, onSelectChat, onDeleteChat }: SidebarProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (chatToDelete && onDeleteChat) {
      await onDeleteChat(chatToDelete);
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    }
  };

  return (
    <>
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={onNewChat}
            className="w-full bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 px-4 py-2 rounded-xl hover:bg-cyan-600/20 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`
                group relative p-4 cursor-pointer border-b border-gray-800
                hover:bg-gray-800/50 transition-all
                ${currentChatId === chat.id ? 'bg-gray-800 hover:bg-gray-800' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 text-sm truncate">{chat.preview}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-700 rounded-lg"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {currentChatId === chat.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
} 