/**
 * AISettingsModal Component
 * Modal for configuring AI provider settings with multi-provider support
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Bot, Check, AlertCircle, Loader, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { AISettings, AIProvider } from '@lib/ai/types';
import {
  saveAISettings,
  getModelsForProvider,
  getProviderPreset,
  PROVIDER_PRESETS,
  getEffectiveModel,
} from '@lib/ai/settings';
import { createAIClient } from '@lib/ai/client';

interface AISettingsModalProps {
  isOpen: boolean;
  settings: AISettings | null;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
}

export function AISettingsModal({
  isOpen,
  settings,
  onClose,
  onSave,
}: AISettingsModalProps) {
  // Initialize model from settings or first model in preset
  const getInitialModel = (provider: AIProvider, savedModel?: string): string => {
    if (savedModel) return savedModel;
    const models = getModelsForProvider(provider);
    return models[0]?.id || '';
  };

  // Form state
  const [provider, setProvider] = useState<AIProvider>(settings?.provider || 'anthropic');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl || '');
  const [model, setModel] = useState(() => getInitialModel(settings?.provider || 'anthropic', settings?.model));
  const [customModel, setCustomModel] = useState(settings?.customModel || '');
  const [useCustomModel, setUseCustomModel] = useState(Boolean(settings?.customModel));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxTokens, setMaxTokens] = useState(settings?.maxTokens || 1024);
  const [temperature, setTemperature] = useState(settings?.temperature || 0.7);

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Get current provider preset
  const preset = useMemo(() => getProviderPreset(provider), [provider]);
  const models = useMemo(() => getModelsForProvider(provider), [provider]);

  // Reset form when settings change
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey || '');
      setBaseUrl(settings.baseUrl || '');
      setModel(getInitialModel(settings.provider, settings.model));
      setCustomModel(settings.customModel || '');
      setUseCustomModel(Boolean(settings.customModel));
      setMaxTokens(settings.maxTokens || 1024);
      setTemperature(settings.temperature || 0.7);
    }
  }, [settings]);

  // Reset model when provider changes
  useEffect(() => {
    const newModels = getModelsForProvider(provider);
    const firstModel = newModels[0];
    if (firstModel && !useCustomModel) {
      setModel(firstModel.id);
    }
    // Reset baseUrl to preset default when switching providers
    const newPreset = getProviderPreset(provider);
    if (newPreset && !newPreset.supportsBaseUrl) {
      setBaseUrl('');
    }
    // Clear test result on provider change
    setTestResult(null);
    setTestError(null);
  }, [provider, useCustomModel]);

  const buildSettings = useCallback((): AISettings => {
    return {
      provider,
      apiKey: apiKey.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      model: useCustomModel ? undefined : model,
      customModel: useCustomModel ? customModel.trim() : undefined,
      maxTokens,
      temperature,
    };
  }, [provider, apiKey, baseUrl, model, customModel, useCustomModel, maxTokens, temperature]);

  const handleTest = useCallback(async () => {
    const testSettings = buildSettings();

    // Validate required fields
    if (preset?.requiresApiKey && !testSettings.apiKey) {
      setTestResult('error');
      setTestError('Please enter an API key');
      return;
    }

    const effectiveModel = getEffectiveModel(testSettings);
    if (!effectiveModel) {
      setTestResult('error');
      setTestError('Please select or enter a model');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const client = await createAIClient(testSettings);
      const connected = await client.testConnection();

      if (connected) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError('Connection failed - check your settings');
      }
    } catch (err) {
      setTestResult('error');
      setTestError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }, [buildSettings, preset]);

  const handleSave = useCallback(async () => {
    const newSettings = buildSettings();

    // Validate required fields
    if (preset?.requiresApiKey && !newSettings.apiKey) {
      return;
    }

    const effectiveModel = getEffectiveModel(newSettings);
    if (!effectiveModel) {
      return;
    }

    await saveAISettings(newSettings);
    onSave(newSettings);
    onClose();
  }, [buildSettings, preset, onSave, onClose]);

  // Check if save should be disabled
  const canSave = useMemo(() => {
    const effectiveModel = useCustomModel ? customModel.trim() : model;
    if (!effectiveModel) return false;
    if (preset?.requiresApiKey && !apiKey.trim()) return false;
    return true;
  }, [useCustomModel, customModel, model, preset, apiKey]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ai-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <Bot size={18} />
          <h2>AI Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Provider Selection */}
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {preset && (
              <span className="form-hint">{preset.description}</span>
            )}
          </div>

          {/* API Key (conditional) */}
          {preset?.requiresApiKey && (
            <div className="form-group">
              <label className="form-label">API Key *</label>
              <div className="input-with-toggle">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder={preset.apiKeyPlaceholder || 'Enter API key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {preset.apiKeyDocsUrl && (
                <span className="form-hint">
                  Get your API key from{' '}
                  <a
                    href={preset.apiKeyDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {new URL(preset.apiKeyDocsUrl).hostname}
                  </a>
                </span>
              )}
            </div>
          )}

          {/* Base URL (for providers that support it) */}
          {preset?.supportsBaseUrl && (
            <div className="form-group">
              <label className="form-label">Base URL</label>
              <input
                type="text"
                className="form-input"
                placeholder={preset.baseUrl}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <span className="form-hint">
                Leave empty to use default: {preset.baseUrl}
              </span>
            </div>
          )}

          {/* Model Selection */}
          <div className="form-group">
            <label className="form-label">Model</label>
            {!useCustomModel && models.length > 0 ? (
              <select
                className="form-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-input"
                placeholder="e.g., gpt-4o, llama3.2, claude-sonnet-4"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}
            {preset?.allowCustomModel && (
              <button
                type="button"
                className="form-link-btn"
                onClick={() => {
                  setUseCustomModel(!useCustomModel);
                  if (!useCustomModel && models.length > 0) {
                    setCustomModel('');
                  }
                }}
              >
                {useCustomModel ? 'Use preset models' : 'Enter custom model'}
              </button>
            )}
          </div>

          {/* Advanced Settings */}
          <button
            type="button"
            className="form-section-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="form-advanced">
              <div className="form-group">
                <label className="form-label">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="256"
                  max="4096"
                  step="128"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div className={`form-message ${testResult}`}>
              {testResult === 'success' ? (
                <>
                  <Check size={14} />
                  <span>Connection successful!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>{testError || 'Connection failed'}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-right">
            <button
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || !canSave}
            >
              {testing ? <Loader size={14} className="spin" /> : 'Test'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
