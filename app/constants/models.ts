import { ModelOption } from '../types';

export const AVAILABLE_MODELS: ModelOption[] = [
  { 
    id: 'gpt-5.1', 
    name: 'GPT-5.1', 
    description: 'Fast and efficient',
    contextLength: 128000,
    costTier: 'low'
  },
  { 
    id: 'gpt-5-mini', 
    name: 'GPT-5 Mini', 
    description: 'Most capable',
    contextLength: 128000,
    costTier: 'high'
  },
  { 
    id: 'gpt-5', 
    name: 'GPT-5', 
    description: 'High performance',
    contextLength: 128000,
    costTier: 'medium'
  },
  // not supported by chat completions API
  // { 
  //   id: 'gpt-5-pro', 
  //   name: 'GPT-5 Pro', 
  //   description: 'Fast and affordable',
  //   contextLength: 16385,
  //   costTier: 'low'
  // },
];

export const DEFAULT_MODEL = 'gpt-5.1';

export const isValidModel = (modelId: string): boolean => {
  return AVAILABLE_MODELS.some(model => model.id === modelId);
};

export const getModelById = (modelId: string): ModelOption | null => {
  return AVAILABLE_MODELS.find(model => model.id === modelId) || null;
};