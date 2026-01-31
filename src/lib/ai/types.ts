/**
 * AI Chat Types
 * Type definitions for the chat with asset feature
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface Citation {
  path: string;
  label: string;
  value: string;
  semanticId?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface AssetContext {
  assetId: string;
  assetIdShort?: string;
  assetKind?: string;
  shellId: string;
  shellIdShort?: string;
  submodelSummaries: SubmodelSummary[];
  estimatedTokens: number;
}

export interface SubmodelSummary {
  id: string;
  idShort: string;
  semanticId?: string;
  templateType?: string;
  keyProperties: Record<string, string>;
  fullContent?: string;
}

/**
 * Provider types:
 * - 'anthropic': Native Anthropic API (different format)
 * - 'openai': OpenAI API
 * - 'openai-compatible': Any OpenAI-compatible endpoint (OpenRouter, Together, Groq, etc.)
 * - 'ollama': Local Ollama instance (OpenAI-compatible)
 */
export type AIProvider = 'anthropic' | 'openai' | 'openai-compatible' | 'ollama';

/**
 * Provider metadata for UI and configuration
 */
export interface ProviderPreset {
  id: AIProvider;
  label: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  apiKeyDocsUrl?: string;
  supportsBaseUrl: boolean;
  defaultModels: { id: string; name: string }[];
  allowCustomModel: boolean;
}

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  customModel?: string; // For free-form model input
  maxTokens?: number;
  temperature?: number;
  extraHeaders?: Record<string, string>;
}

export interface AIResponse {
  content: string;
  citations?: Citation[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
