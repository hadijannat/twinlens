/**
 * useChat Hook
 * Manages chat state and API interactions
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, AISettings, AssetContext } from '@lib/ai/types';
import type { AIClient } from '@lib/ai/client';
import type { AASEnvironment } from '@shared/types';
import { buildAssetContext } from '@lib/ai/context';
import { loadAISettings, isProviderConfigured } from '@lib/ai/settings';
import { createAIClient } from '@lib/ai/client';
import { getConsentState, grantConsent, ConsentState } from '@lib/ai/consent';

interface UseChatResult {
  messages: ChatMessage[];
  context: AssetContext | null;
  isLoading: boolean;
  isConfigured: boolean;
  needsConsent: boolean;
  settings: AISettings | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  updateSettings: (settings: AISettings) => void;
  handleGrantConsent: () => Promise<void>;
}

export function useChat(environment: AASEnvironment | null): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<AssetContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [client, setClient] = useState<AIClient | null>(null);
  const [consentState, setConsentState] = useState<ConsentState>({ hasConsented: false });

  // Load settings and consent state on mount
  useEffect(() => {
    loadAISettings().then(setSettings);
    getConsentState().then(setConsentState);
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

  // Create client when settings change (only if configured)
  useEffect(() => {
    if (isProviderConfigured(settings)) {
      createAIClient(settings!)
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

  // Check if consent is needed (no consent or different provider)
  const needsConsent = context !== null &&
    (!consentState.hasConsented ||
     consentState.consentedProvider !== settings?.provider);

  // Handle granting consent
  const handleGrantConsent = useCallback(async () => {
    if (settings) {
      await grantConsent(settings.provider);
      setConsentState({
        hasConsented: true,
        consentedProvider: settings.provider,
        consentTimestamp: Date.now(),
      });
    }
  }, [settings]);

  return {
    messages,
    context,
    isLoading,
    isConfigured: isProviderConfigured(settings),
    needsConsent,
    settings,
    sendMessage,
    clearMessages,
    updateSettings,
    handleGrantConsent,
  };
}
