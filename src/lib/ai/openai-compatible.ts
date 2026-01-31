/**
 * OpenAI-Compatible Client
 * Works with OpenAI, OpenRouter, Together, Groq, Ollama, and any OpenAI-compatible endpoint
 */

import type { AISettings, AIResponse, AssetContext, ChatMessage } from './types';
import type { AIClient } from './client';
import { getEffectiveBaseUrl, getEffectiveModel } from './settings';
import { formatContextForPrompt } from './context';
import { guardedFetch } from '../network-guard';
import { sanitizeHeaders } from './header-sanitizer';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  message: {
    content: string;
  };
  delta?: {
    content?: string;
  };
  finish_reason: string | null;
}

interface OpenAIResponse {
  id: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenAICompatibleClient implements AIClient {
  private settings: AISettings;
  private baseUrl: string;
  private model: string;

  constructor(settings: AISettings) {
    this.settings = settings;
    this.baseUrl = getEffectiveBaseUrl(settings);
    this.model = getEffectiveModel(settings);
  }

  async chat(
    messages: ChatMessage[],
    context: AssetContext,
    onStream?: (chunk: string) => void
  ): Promise<AIResponse> {
    const systemPrompt = formatContextForPrompt(context);

    const openAIMessages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided
    if (this.settings.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey.trim()}`;
    }

    // Add extra headers if provided (sanitized)
    const safeExtraHeaders = sanitizeHeaders(this.settings.extraHeaders);
    Object.assign(headers, safeExtraHeaders);

    // Add OpenRouter-specific headers for app attribution
    if (this.settings.provider === 'openrouter' || this.baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://twinlens.app';
      headers['X-Title'] = 'TwinLens';
    }

    const body = {
      model: this.model,
      messages: openAIMessages,
      max_tokens: this.settings.maxTokens || 1024,
      temperature: this.settings.temperature ?? 0.7,
      stream: Boolean(onStream),
    };

    const endpoint = `${this.baseUrl}/chat/completions`;

    if (onStream) {
      return this.streamChat(endpoint, headers, body, onStream);
    } else {
      return this.nonStreamChat(endpoint, headers, body);
    }
  }

  private async nonStreamChat(
    endpoint: string,
    headers: Record<string, string>,
    body: object
  ): Promise<AIResponse> {
    const response = await guardedFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices[0]?.message?.content || '';

    return {
      content,
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }

  private async streamChat(
    endpoint: string,
    headers: Record<string, string>,
    body: object,
    onStream: (chunk: string) => void
  ): Promise<AIResponse> {
    const response = await guardedFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as OpenAIResponse;
            const delta = parsed.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onStream(delta);
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }

    return {
      content: fullContent,
    };
  }

  isConfigured(): boolean {
    // Check if we have the necessary configuration
    if (!this.model) return false;
    if (!this.baseUrl) return false;

    // For providers that require API key
    const requiresKey = this.settings.provider !== 'ollama';
    if (requiresKey && !this.settings.apiKey?.trim()) {
      return false;
    }

    return true;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try a minimal request to test the connection
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.settings.apiKey?.trim()) {
        headers['Authorization'] = `Bearer ${this.settings.apiKey.trim()}`;
      }

      const safeExtraHeaders = sanitizeHeaders(this.settings.extraHeaders);
      Object.assign(headers, safeExtraHeaders);

      const response = await guardedFetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
