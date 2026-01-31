/**
 * AI Client Abstraction
 * Factory for creating AI clients based on provider settings
 */

import type { AISettings, AIResponse, AssetContext, ChatMessage } from './types';

export interface AIClient {
  chat(
    messages: ChatMessage[],
    context: AssetContext,
    onStream?: (chunk: string) => void
  ): Promise<AIResponse>;
  isConfigured(): boolean;
  testConnection(): Promise<boolean>;
}

export async function createAIClient(settings: AISettings): Promise<AIClient> {
  switch (settings.provider) {
    case 'anthropic': {
      const { AnthropicClient } = await import('./anthropic');
      return new AnthropicClient(settings);
    }
    case 'openai':
    case 'openrouter':
    case 'openai-compatible':
    case 'ollama': {
      const { OpenAICompatibleClient } = await import('./openai-compatible');
      return new OpenAICompatibleClient(settings);
    }
    default:
      throw new Error(`Unsupported AI provider: ${settings.provider}`);
  }
}
