import { ModelOption } from "../types";

/**
 * These are model IDs you can pass to the Chat Completions API.
 * Note: availability depends on your OpenAI account/org permissions.
 */
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Fast + cheap (good default)",
    contextLength: 128000,
    costTier: "low",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Stronger general model",
    contextLength: 128000,
    costTier: "high",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    description: "Small reasoning model",
    contextLength: 200000,
    costTier: "medium",
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    description: "Latest flagship",
    contextLength: 400000,
    costTier: "high",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    description: "Cheaper GPT-5 variant",
    contextLength: 400000,
    costTier: "medium",
  },
];

export const DEFAULT_MODEL = "gpt-4o-mini";

export const isValidModel = (modelId: string): boolean => {
  return AVAILABLE_MODELS.some((model) => model.id === modelId);
};

export const getModelById = (modelId: string): ModelOption | null => {
  return AVAILABLE_MODELS.find((model) => model.id === modelId) || null;
};
