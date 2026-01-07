export interface ParsedDataset {
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  data: Record<string, any>[];
  columns: string[];
  errors?: any[];
}

// Chat message interfaces
export interface MessageEditHistory {
  id: string;
  message_id: string;
  content: string;
  edited_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  id?: string;
  created_at?: string;
  edit_history?: MessageEditHistory[];
  current_version?: number;
}

export interface DatabaseMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Project {
  id: string;
  sessionId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Model configuration interface
export interface ModelOption {
  id: string;
  name: string;
  description: string;
  contextLength?: number;
  costTier: 'low' | 'medium' | 'high';
}

