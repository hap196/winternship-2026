'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Message, Conversation } from '../types';
import { sendMessageToLLM } from '../services/llmService';
import { formatFullDataForLLM } from '../services/fileParser';
import { ParsedDataset } from '../types';
import { DEFAULT_MODEL } from '../constants/models';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  isTypingResponse: boolean;
  currentConversationId: string | null;
  currentConversationTitle: string | null;
  currentProjectId: string | null;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  pendingMessage: string | null;
  pendingImages: string[] | undefined;
  typingTitleId: string | null;
  sendMessage: (message: string, activeDatasets: ParsedDataset[], images?: string[]) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewChat: () => void;
  clearPendingMessage: () => void;
  stopGeneration: () => void;
  renameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTypingResponse, setIsTypingResponse] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedModel') || DEFAULT_MODEL;
    }
    return DEFAULT_MODEL;
  });
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[] | undefined>(undefined);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [typingTitleId, setTypingTitleId] = useState<string | null>(null);
  const justCreatedConvIdRef = useRef<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const urlConversationId = params?.conversationId as string | undefined;

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (urlConversationId && urlConversationId !== 'new') {
      if (urlConversationId === justCreatedConvIdRef.current) {
        justCreatedConvIdRef.current = null;
        return;
      }
      loadConversation(urlConversationId);
    } else if (!urlConversationId || urlConversationId === 'new') {
      startNewChat();
    }
  }, [urlConversationId]);

  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/list`);
      const { conversations }: { conversations: Conversation[] } = await response.json();
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (conversation) {
        setCurrentConversationId(conversation.id);
        setCurrentConversationTitle(conversation.title);
        setCurrentProjectId(conversation.projectId || null);
        setMessages(conversation.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setCurrentConversationTitle(null);
    setCurrentProjectId(null);
    setPendingMessage(null);
    setPendingImages(undefined);
  };

  const createNewConversation = async (title?: string, projectId?: string) => {
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, projectId }),
    });
    
    const { conversation }: { conversation: Conversation } = await response.json();
    return conversation;
  };

  const saveMessageToServer = async (conversationId: string, message: Message) => {
    const response = await fetch('/api/conversations/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        updates: { messages: [...messages, message] }
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save message');
    }
  };

  const sendMessage = async (
    message: string,
    activeDatasets: ParsedDataset[],
    images?: string[]
  ) => {
    if (!message.trim() && (!images || images.length === 0)) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      images,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      let convId = currentConversationId;
      
      if (!convId) {
        const conversation = await createNewConversation('New Chat', currentProjectId || undefined);
        convId = conversation.id;
        setCurrentConversationId(convId);
        setCurrentConversationTitle(conversation.title);
        justCreatedConvIdRef.current = convId;
        router.push(`/chat/${convId}`);
      }

      const isFirstMessage = messages.length === 0;
      const datasetContent = (isFirstMessage && activeDatasets.length > 0)
        ? formatFullDataForLLM(activeDatasets)
        : '';

      const conversationHistory = messages;

      const responseStream = await sendMessageToLLM(
        message,
        datasetContent,
        conversationHistory,
        selectedModel,
        images,
        controller.signal
      );

      let fullResponse = '';
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTypingResponse(true);

      const reader = responseStream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;
          
          const text = decoder.decode(value, { stream: true });
          fullResponse += text;
          
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...assistantMessage,
              content: fullResponse,
            };
            return updated;
          });
        }
      } finally {
        reader.releaseLock();
      }

      const finalMessages = [...messages, userMessage, { ...assistantMessage, content: fullResponse }];
      
      setMessages(finalMessages);

      if (convId) {
        try {
          await fetch('/api/conversations/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              updates: { messages: finalMessages }
            }),
          });
        } catch (error) {
          console.error('Failed to save messages:', error);
        }
      }

      if (convId && messages.length === 0) {
        try {
          const titleResponse = await fetch('/api/chat/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstMessage: message }),
          });
          
          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            
            setTypingTitleId(convId);
            
            await fetch('/api/conversations/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: convId, title }),
            });
            setCurrentConversationTitle(title);
            
            setTimeout(() => {
              setTypingTitleId(null);
            }, title.length * 30 + 500);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
          setTypingTitleId(null);
        }
      }

      setRefreshTrigger(prev => prev + 1);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Failed to send message. Please try again.',
            id: `msg_error_${Date.now()}`,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setIsTypingResponse(false);
      setAbortController(null);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsTypingResponse(false);
      setIsLoading(false);
    }
  };

  const clearPendingMessage = () => {
    setPendingMessage(null);
    setPendingImages(undefined);
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    await fetch('/api/conversations/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, title: newTitle }),
    });
    
    if (conversationId === currentConversationId) {
      setCurrentConversationTitle(newTitle);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const refreshConversations = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        isTypingResponse,
        currentConversationId,
        currentConversationTitle,
        currentProjectId,
        selectedModel,
        setSelectedModel,
        pendingMessage,
        pendingImages,
        typingTitleId,
        sendMessage,
        loadConversation,
        startNewChat,
        clearPendingMessage,
        stopGeneration,
        renameConversation,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
