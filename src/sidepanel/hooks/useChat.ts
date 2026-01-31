/**
 * useChat Hook
 * Manages chat state and API interactions
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, AISettings, AssetContext } from '@lib/ai/types';
import type { AIClient } from '@lib/ai/client';
import type { AASEnvironment } from '@shared/types';
import { buildAssetContext } from '@lib/ai/context';
import { loadAISettings } from '@lib/ai/settings';
import { createAIClient } from '@lib/ai/client';

interface UseChatResult {
  messages: ChatMessage[];
  context: AssetContext | null;
  isLoading: boolean;
  isConfigured: boolean;
  settings: AISettings | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  updateSettings: (settings: AISettings) => void;
}

export function useChat(environment: AASEnvironment | null): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<AssetContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [client, setClient] = useState<AIClient | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadAISettings().then(setSettings);
  }, []);

  // Build context when environment changes
  useEffect(() => {
    if (environment) {
      setContext(buildAssetContext(environment));
      setMessages([]); // Clear messages for new asset
    } else {
      setContext(null);
    }
  }, [environment]);

  // Create client when settings change
  useEffect(() => {
    if (settings?.apiKey) {
      createAIClient(settings)
        .then(setClient)
        .catch((err) => {
          console.error('Failed to create AI client:', err);
          setClient(null);
        });
    } else {
      setClient(null);
    }
  }, [settings]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!client || !context) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const allMessages = [...messages, userMsg];
        const response = await client.chat(allMessages, context, (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: response.content || m.content,
                  isStreaming: false,
                  citations: response.citations,
                }
              : m
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: `Error: ${errorMessage}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [client, context, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateSettings = useCallback((newSettings: AISettings) => {
    setSettings(newSettings);
  }, []);

  return {
    messages,
    context,
    isLoading,
    isConfigured: Boolean(settings?.apiKey),
    settings,
    sendMessage,
    clearMessages,
    updateSettings,
  };
}
