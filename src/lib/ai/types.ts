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

export type AIProvider = 'anthropic' | 'openai' | 'local';

export interface AISettings {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  citations?: Citation[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
