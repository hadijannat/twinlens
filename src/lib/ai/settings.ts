/**
 * AI Settings
 * Storage, retrieval, and provider presets for AI configuration
 */

import type { AISettings, AIProvider, ProviderPreset } from './types';

const STORAGE_KEY = 'twinlens_ai_settings';

/**
 * Provider presets with metadata for UI and configuration
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude models via Anthropic API',
    baseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyDocsUrl: 'https://console.anthropic.com/settings/keys',
    supportsBaseUrl: false,
    defaultModels: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
    allowCustomModel: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT models via OpenAI API',
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    apiKeyDocsUrl: 'https://platform.openai.com/api-keys',
    supportsBaseUrl: false,
    defaultModels: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    allowCustomModel: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Access 200+ models from one API',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyDocsUrl: 'https://openrouter.ai/settings/keys',
    supportsBaseUrl: false,
    defaultModels: [
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
    ],
    allowCustomModel: true,
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-Compatible',
    description: 'Together, Groq, or any compatible endpoint',
    baseUrl: '',
    requiresApiKey: true,
    apiKeyPlaceholder: 'Your API key',
    supportsBaseUrl: true,
    defaultModels: [],
    allowCustomModel: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    description: 'Local models via Ollama',
    baseUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
    supportsBaseUrl: true,
    defaultModels: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'gemma2', name: 'Gemma 2' },
    ],
    allowCustomModel: true,
  },
];

/**
 * Get preset by provider ID
 */
export function getProviderPreset(provider: AIProvider): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === provider);
}

/**
 * Get human-readable display name for a provider
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const preset = getProviderPreset(provider);
  return preset?.label ?? provider;
}

/**
 * Get models for a provider (from preset defaults)
 */
export function getModelsForProvider(
  provider: AIProvider
): { id: string; name: string }[] {
  const preset = getProviderPreset(provider);
  return preset?.defaultModels ?? [];
}

/**
 * Check if settings are properly configured for the selected provider
 */
export function isProviderConfigured(settings: AISettings | null): boolean {
  if (!settings) return false;

  const preset = getProviderPreset(settings.provider);
  if (!preset) return false;

  // Check API key requirement
  if (preset.requiresApiKey && !settings.apiKey?.trim()) {
    return false;
  }

  // Check baseUrl for openai-compatible provider
  if (settings.provider === 'openai-compatible' && !settings.baseUrl?.trim()) {
    return false;
  }

  // Check model selection
  const model = settings.customModel?.trim() || settings.model;
  if (!model) {
    return false;
  }

  return true;
}

/**
 * Get the effective baseUrl for settings
 */
export function getEffectiveBaseUrl(settings: AISettings): string {
  if (settings.baseUrl?.trim()) {
    return settings.baseUrl.trim();
  }
  const preset = getProviderPreset(settings.provider);
  return preset?.baseUrl ?? '';
}

/**
 * Get the effective model for settings
 */
export function getEffectiveModel(settings: AISettings): string {
  return settings.customModel?.trim() || settings.model || '';
}

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

export { DEFAULT_SETTINGS };
