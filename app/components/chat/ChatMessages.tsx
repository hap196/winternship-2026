'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  HiOutlineClipboardCopy, 
  HiPencil,
  HiChevronLeft,
  HiChevronRight,
  HiCheck
} from 'react-icons/hi';
import { Message } from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TypingIndicator } from './TypingIndicator';
import { TypingMessage } from './TypingMessage';
import { MessageActions } from './MessageActions';
import MessageContent from './MessageContent';

interface ChatMessagesProps {
  messages?: Message[];
  isLoading?: boolean;
  isTypingResponse?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
  onEditMessage?: (messageIndex: number, newContent: string) => void;
}

const PROSE_CLASSES = "prose prose-lg max-w-none prose-p:my-0 prose-p:leading-normal prose-p:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2 prose-ul:my-2 prose-ul:text-foreground prose-ol:my-2 prose-ol:text-foreground prose-li:my-0 prose-li:text-foreground prose-table:my-4 prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-thead:bg-muted prose-strong:font-semibold prose-strong:text-foreground prose-headings:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4";

const ChatMessages = ({ 
  messages = [], 
  isLoading = false, 
  isTypingResponse = false,
  hasMoreMessages = false,
  onLoadMore,
  onEditMessage
}: ChatMessagesProps) => {
  const lastMessageIndex = messages.length - 1;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [hoveredButton, setHoveredButton] = useState<{ index: number; button: string } | null>(null);
  const [messageVersions, setMessageVersions] = useState<Record<number, { history: Message[], currentIndex: number }>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<number, boolean>>({});

  const handleStartEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setEditedContent(content);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedContent('');
  };

  const handleSaveEdit = (index: number) => {
    if (onEditMessage && editedContent.trim()) {
      onEditMessage(index, editedContent);
      setEditingIndex(null);
      setEditedContent('');
    }
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const loadMessageHistory = async (messageId: string, index: number): Promise<void> => {
    if (loadingHistory[index] || messageVersions[index]) return;
    
    setLoadingHistory(prev => ({ ...prev, [index]: true }));
    try {
      // Edit history not implemented
      const history: any[] = [];
      
      // Map history items to Message type structure
      const currentMessage = messages[index];
      const mappedHistory: Message[] = history.map(h => ({
        id: h.id,
        role: currentMessage.role,
        content: h.content,
        created_at: h.edited_at
      }));

      setMessageVersions(prev => ({
        ...prev,
        [index]: {
          history: mappedHistory,
          currentIndex: mappedHistory.length
        }
      }));
    } catch (error) {
      console.error('Error loading message history:', error);
    } finally {
      setLoadingHistory(prev => ({ ...prev, [index]: false }));
    }
  };

  const navigateVersion = (index: number, direction: 'prev' | 'next') => {
    const versions = messageVersions[index];
    if (!versions) return;

    const newIndex = direction === 'prev' 
      ? Math.max(0, versions.currentIndex - 1)
      : Math.min(versions.history.length, versions.currentIndex + 1);

    setMessageVersions(prev => ({
      ...prev,
      [index]: {
        ...versions,
        currentIndex: newIndex
      }
    }));
  };

  const getCurrentContent = (message: Message, index: number) => {
    const versions = messageVersions[index];
    if (!versions || !versions.history.length) return message.content;
    
    if (versions.currentIndex === versions.history.length) {
      return message.content;
    }
    
    return versions.history[versions.currentIndex]?.content || message.content;
  };

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-5">
      {hasMoreMessages && onLoadMore && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            Load earlier messages
          </Button>
        </div>
      )}
      
      {messages.map((message, index) => {
        const isLastMessage = index === lastMessageIndex;
        const shouldType = isLastMessage && isTypingResponse && message.role === 'assistant';
        const isEditing = editingIndex === index;

        return (
          <div
            key={index}
            className={`flex flex-col ${message.role === 'user' && !isEditing ? 'items-end' : 'items-start'}`}
          >
            {message.role === 'user' ? (
              <div className={isEditing ? "w-full" : "max-w-[75%] group flex flex-col items-end"}>
                {!isEditing ? (
                  <>
                    <Card className="text-lg px-4 py-2 bg-muted/50 text-foreground border-border w-fit">
                      {message.images && message.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-2">
                          {message.images.map((image, idx) => (
                            <img
                              key={idx}
                              src={image}
                              alt={`Uploaded ${idx + 1}`}
                              className="max-w-xs rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      {message.content && (
                        <div className={PROSE_CLASSES}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {getCurrentContent(message, index)}
                          </ReactMarkdown>
                        </div>
                      )}
                    </Card>
                    {message.id && onEditMessage && (
                      <div 
                        className="flex items-center justify-end gap-1 mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseEnter={() => message.id && loadMessageHistory(message.id, index)}
                      >
                        <div className="relative">
                          <button
                            onClick={() => handleCopyMessage(message.content, index)}
                            onMouseEnter={() => setHoveredButton({ index, button: 'copy' })}
                            onMouseLeave={() => setHoveredButton(null)}
                            className={`p-2 rounded-lg transition-colors ${
                              copiedIndex === index 
                                ? 'text-green-400 cursor-default' 
                                : 'text-foreground hover:bg-accent cursor-pointer'
                            }`}
                          >
                            {copiedIndex === index ? (
                              <HiCheck className="w-5 h-5" />
                            ) : (
                              <HiOutlineClipboardCopy className="w-5 h-5" />
                            )}
                          </button>
                          {hoveredButton?.index === index && hoveredButton?.button === 'copy' && copiedIndex !== index && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50">
                              Copy
                            </div>
                          )}
                        </div>
                        {messageVersions[index] && messageVersions[index].history.length > 0 && (
                          <>
                            <button
                              onClick={() => navigateVersion(index, 'prev')}
                              disabled={messageVersions[index].currentIndex === 0}
                              className="p-2 rounded-lg text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <HiChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-3 py-1 rounded-full bg-accent text-foreground text-sm font-medium">
                              {messageVersions[index].currentIndex + 1}/{messageVersions[index].history.length + 1}
                            </div>
                            <button
                              onClick={() => navigateVersion(index, 'next')}
                              disabled={messageVersions[index].currentIndex === messageVersions[index].history.length}
                              className="p-2 rounded-lg text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <HiChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <div className="relative">
                          <button
                            onClick={() => handleStartEdit(index, getCurrentContent(message, index))}
                            onMouseEnter={() => setHoveredButton({ index, button: 'edit' })}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="p-2 rounded-lg text-foreground hover:bg-accent transition-colors cursor-pointer"
                          >
                            <HiPencil className="w-5 h-5" />
                          </button>
                          {hoveredButton?.index === index && hoveredButton?.button === 'edit' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50">
                              Edit message
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full bg-muted rounded-2xl p-4 border border-border">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full min-h-[60px] p-0 bg-transparent text-foreground resize-none outline-none focus:outline-none focus:ring-0 text-lg"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-5 py-1.5 rounded-full border-2 border-border bg-muted text-foreground hover:bg-accent transition-all font-medium text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(index)}
                        disabled={!editedContent.trim()}
                        className="px-5 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full text-lg text-foreground group">
              {shouldType ? (
                <TypingMessage content={message.content} />
              ) : (
                <MessageContent 
                  content={message.content} 
                  isError={message.id?.startsWith('error-')}
                />
              )}
              {!shouldType && (
                <MessageActions 
                  messageContent={message.content}
                />
              )}
              </div>
            )}
          </div>
        );
      })}
      
      {isLoading && !isTypingResponse && (
        <div className="flex flex-col items-start w-full">
          <div className="text-lg text-foreground py-3">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
