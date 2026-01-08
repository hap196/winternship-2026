import fs from 'fs';
import path from 'path';
import { Message, Conversation, Project } from '@/app/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const DATASETS_DIR = path.join(DATA_DIR, 'datasets');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initStorage() {
  ensureDir(DATA_DIR);
  ensureDir(CONVERSATIONS_DIR);
  ensureDir(PROJECTS_DIR);
  ensureDir(DATASETS_DIR);
  ensureDir(UPLOADS_DIR);
}

export interface Dataset {
  id: string;
  sessionId: string;
  name: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export async function getSessionConversations(sessionId: string): Promise<Conversation[]> {
  initStorage();
  const files = fs.readdirSync(CONVERSATIONS_DIR);
  const conversations: Conversation[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(CONVERSATIONS_DIR, file), 'utf-8'));
      if (data.sessionId === sessionId) {
        conversations.push(data);
      }
    }
  }
  
  return conversations.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  initStorage();
  const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function createConversation(sessionId: string, title?: string, projectId?: string): Promise<Conversation> {
  initStorage();
  const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const conversation: Conversation = {
    id,
    sessionId,
    title: title || 'New Conversation',
    createdAt: now,
    updatedAt: now,
    projectId,
    messages: [],
  };
  
  fs.writeFileSync(
    path.join(CONVERSATIONS_DIR, `${id}.json`),
    JSON.stringify(conversation, null, 2)
  );
  
  return conversation;
}

export async function updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
  initStorage();
  const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Conversation not found');
  }
  
  const conversation = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const updated = {
    ...conversation,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  initStorage();
  const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function saveMessage(conversationId: string, message: Message): Promise<void> {
  initStorage();
  const conversation = await getConversation(conversationId);
  
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  
  conversation.messages = conversation.messages || [];
  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(
    path.join(CONVERSATIONS_DIR, `${conversationId}.json`),
    JSON.stringify(conversation, null, 2)
  );
}

export async function getSessionProjects(sessionId: string): Promise<Project[]> {
  initStorage();
  const files = fs.readdirSync(PROJECTS_DIR);
  const projects: Project[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8'));
      if (data.sessionId === sessionId) {
        projects.push(data);
      }
    }
  }
  
  return projects.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export async function createProject(sessionId: string, name: string): Promise<Project> {
  initStorage();
  const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const project: Project = {
    id,
    sessionId,
    name,
    createdAt: now,
    updatedAt: now,
  };
  
  fs.writeFileSync(
    path.join(PROJECTS_DIR, `${id}.json`),
    JSON.stringify(project, null, 2)
  );
  
  return project;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  initStorage();
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Project not found');
  }
  
  const project = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const updated = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
}

export async function deleteProject(projectId: string): Promise<void> {
  initStorage();
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function getSessionDatasets(sessionId: string): Promise<Dataset[]> {
  initStorage();
  const files = fs.readdirSync(DATASETS_DIR);
  const datasets: Dataset[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, file), 'utf-8'));
      if (data.sessionId === sessionId) {
        datasets.push(data);
      }
    }
  }
  
  return datasets.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveDataset(sessionId: string, fileName: string, fileBuffer: Buffer, metadata?: Record<string, any>): Promise<Dataset> {
  initStorage();
  const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const filePath = path.join(UPLOADS_DIR, `${id}_${fileName}`);
  
  fs.writeFileSync(filePath, fileBuffer);
  
  const dataset: Dataset = {
    id,
    sessionId,
    name: fileName,
    fileName,
    fileSize: fileBuffer.length,
    filePath,
    createdAt: new Date().toISOString(),
    metadata,
  };
  
  fs.writeFileSync(
    path.join(DATASETS_DIR, `${id}.json`),
    JSON.stringify(dataset, null, 2)
  );
  
  return dataset;
}

export async function getDatasetFile(datasetId: string): Promise<Buffer | null> {
  initStorage();
  const metaPath = path.join(DATASETS_DIR, `${datasetId}.json`);
  
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  
  const dataset: Dataset = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  
  if (!fs.existsSync(dataset.filePath)) {
    return null;
  }
  
  return fs.readFileSync(dataset.filePath);
}

export async function deleteDataset(datasetId: string): Promise<void> {
  initStorage();
  const metaPath = path.join(DATASETS_DIR, `${datasetId}.json`);
  
  if (fs.existsSync(metaPath)) {
    const dataset: Dataset = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    
    if (fs.existsSync(dataset.filePath)) {
      fs.unlinkSync(dataset.filePath);
    }
    
    fs.unlinkSync(metaPath);
  }
}

