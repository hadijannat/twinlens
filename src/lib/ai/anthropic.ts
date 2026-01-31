/**
 * Anthropic Client Implementation
 * Handles communication with the Anthropic Claude API
 */

import type { AIClient } from './client';
import type { AISettings, AIResponse, AssetContext, ChatMessage } from './types';
import { buildSystemPrompt } from './prompts';
import { fetchWithPermission } from '../permissions';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AnthropicClient implements AIClient {
  private settings: AISettings;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return Boolean(this.settings.apiKey);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetchWithPermission(
        `${this.baseUrl}/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: this.settings.model || 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(
    messages: ChatMessage[],
    context: AssetContext,
    onStream?: (chunk: string) => void
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key not configured');
    }

    const systemPrompt = buildSystemPrompt(context);
    const anthropicMessages = this.convertMessages(messages);

    const response = await fetchWithPermission(
      `${this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.settings.model || 'claude-sonnet-4-20250514',
          max_tokens: this.settings.maxTokens || 1024,
          system: systemPrompt,
          messages: anthropicMessages,
          stream: Boolean(onStream),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${errorText}`);
    }

    if (onStream && response.body) {
      return this.handleStream(response.body, onStream);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          }
        : undefined,
    };
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.settings.apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  private convertMessages(messages: ChatMessage[]): AnthropicMessage[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private async handleStream(
    body: ReadableStream<Uint8Array>,
    onStream: (chunk: string) => void
  ): Promise<AIResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullContent += parsed.delta.text;
                onStream(parsed.delta.text);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { content: fullContent };
  }
}
