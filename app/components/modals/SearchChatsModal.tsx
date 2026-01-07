'use client';

import { useState, useEffect, useCallback } from 'react';
import { HiX, HiOutlineSearch } from 'react-icons/hi';
import { useChatContext } from '../../providers/ChatProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../providers/LanguageProvider';
import { Conversation } from '../../types';

interface SearchChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchChatsModal({ isOpen, onClose }: SearchChatsModalProps) {
  const { loadConversation, startNewChat } = useChatContext();
  const router = useRouter();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations/list');
      const { conversations: convs } = await response.json();
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      setSearchQuery('');
    }
  }, [isOpen, loadConversations]);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatClick = (conversationId: string) => {
    loadConversation(conversationId);
    router.push('/');
    onClose();
  };

  const handleNewChat = () => {
    startNewChat();
    router.push('/');
    onClose();
  };

  const getTimeGroup = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return t('Previous 7 Days');
    if (diffDays < 30) return t('Previous 30 Days');
    return t('Older');
  };

  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    const group = getTimeGroup(conv.updatedAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
          <HiOutlineSearch className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t('Search chats...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground text-foreground"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
          >
            <HiX className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm">✏️</span>
              </div>
              <span className="text-sm text-foreground font-medium">{t('New chat')}</span>
            </button>

            {Object.entries(groupedConversations).map(([group, chats]) => (
              <div key={group} className="mt-4">
                <div className="px-4 py-1">
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {group}
                  </h2>
                </div>
                {chats.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleChatClick(conversation.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">💬</span>
                    </div>
                    <span className="text-sm text-foreground truncate">{conversation.title}</span>
                  </button>
                ))}
              </div>
            ))}

            {filteredConversations.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <HiOutlineSearch className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('No chats found')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

