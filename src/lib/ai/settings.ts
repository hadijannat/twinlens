/**
 * AI Settings
 * Storage and retrieval of AI configuration
 */

import type { AISettings, AIProvider } from './types';

const STORAGE_KEY = 'twinlens_ai_settings';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  temperature: 0.7,
};

export async function loadAISettings(): Promise<AISettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
      }
    }
  } catch (err) {
    console.warn('Failed to load AI settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    }
  } catch (err) {
    console.warn('Failed to save AI settings:', err);
  }
}

export function getModelsForProvider(
  provider: AIProvider
): { id: string; name: string }[] {
  switch (provider) {
    case 'anthropic':
      return [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      ];
    default:
      return [];
  }
}

export { DEFAULT_SETTINGS };
