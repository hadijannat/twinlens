/**
 * Anthropic Client Tests
 * Tests the Anthropic Claude API client implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicClient } from '../../../../src/lib/ai/anthropic';
import type { AISettings, AssetContext, ChatMessage } from '../../../../src/lib/ai/types';

// Mock fetchWithPermission to avoid actual network calls
vi.mock('../../../../src/lib/permissions', () => ({
  fetchWithPermission: vi.fn(),
}));

import { fetchWithPermission } from '../../../../src/lib/permissions';
const mockedFetch = vi.mocked(fetchWithPermission);

describe('AnthropicClient', () => {
  const mockSettings: AISettings = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: 'sk-ant-test-key',
    maxTokens: 1024,
    temperature: 0.7,
  };

  const mockContext: AssetContext = {
    assetId: 'urn:test:asset:1',
    assetIdShort: 'TestAsset',
    shellId: 'urn:test:aas:1',
    submodelSummaries: [],
    estimatedTokens: 100,
  };

  const mockMessages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'What is this asset?', timestamp: Date.now() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      const client = new AnthropicClient(mockSettings);
      expect(client.isConfigured()).toBe(true);
    });

    it('returns false when API key is missing', () => {
      const client = new AnthropicClient({ ...mockSettings, apiKey: '' });
      expect(client.isConfigured()).toBe(false);
    });

    it('returns false when API key is undefined', () => {
      const client = new AnthropicClient({ ...mockSettings, apiKey: undefined });
      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('returns true when API call succeeds', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ text: 'Hi' }] }),
      } as Response);

      const client = new AnthropicClient(mockSettings);
      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test-key',
          }),
        })
      );
    });

    it('returns false when API call fails', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const client = new AnthropicClient(mockSettings);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('returns false when not configured', async () => {
      const client = new AnthropicClient({ ...mockSettings, apiKey: '' });
      const result = await client.testConnection();

      expect(result).toBe(false);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('returns false when fetch throws', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new AnthropicClient(mockSettings);
      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('chat', () => {
    it('returns response content on success', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'This is a test asset.' }],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        }),
      } as Response);

      const client = new AnthropicClient(mockSettings);
      const response = await client.chat(mockMessages, mockContext);

      expect(response.content).toBe('This is a test asset.');
      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it('throws error when not configured', async () => {
      const client = new AnthropicClient({ ...mockSettings, apiKey: '' });

      await expect(client.chat(mockMessages, mockContext)).rejects.toThrow(
        'Anthropic API key not configured'
      );
    });

    it('throws error on API error response', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Rate limit exceeded',
      } as Response);

      const client = new AnthropicClient(mockSettings);

      await expect(client.chat(mockMessages, mockContext)).rejects.toThrow(
        'Anthropic API error: Rate limit exceeded'
      );
    });

    it('handles empty response content', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [],
        }),
      } as Response);

      const client = new AnthropicClient(mockSettings);
      const response = await client.chat(mockMessages, mockContext);

      expect(response.content).toBe('');
    });

    it('filters system messages from conversation', async () => {
      const messagesWithSystem: ChatMessage[] = [
        { id: '0', role: 'system', content: 'You are helpful.', timestamp: Date.now() },
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ];

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
        }),
      } as Response);

      const client = new AnthropicClient(mockSettings);
      await client.chat(messagesWithSystem, mockContext);

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]'),
        })
      );
    });

    it('sets correct headers including browser access flag', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
        }),
      } as Response);

      const client = new AnthropicClient(mockSettings);
      await client.chat(mockMessages, mockContext);

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-test-key',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          }),
        })
      );
    });
  });

  describe('streaming', () => {
    it('calls onStream callback for each content chunk', async () => {
      const chunks = [
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n',
        'data: {"type":"content_block_delta","delta":{"text":" world"}}\n',
        'data: [DONE]\n',
      ];

      const mockStream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const onStream = vi.fn();
      const client = new AnthropicClient(mockSettings);
      const response = await client.chat(mockMessages, mockContext, onStream);

      expect(response.content).toBe('Hello world');
      expect(onStream).toHaveBeenCalledWith('Hello');
      expect(onStream).toHaveBeenCalledWith(' world');
      expect(onStream).toHaveBeenCalledTimes(2);
    });

    it('handles malformed JSON in stream gracefully', async () => {
      const chunks = [
        'data: {"type":"content_block_delta","delta":{"text":"Good"}}\n',
        'data: invalid json\n',
        'data: {"type":"content_block_delta","delta":{"text":" response"}}\n',
      ];

      const mockStream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const onStream = vi.fn();
      const client = new AnthropicClient(mockSettings);
      const response = await client.chat(mockMessages, mockContext, onStream);

      expect(response.content).toBe('Good response');
      expect(onStream).toHaveBeenCalledTimes(2);
    });
  });
});
