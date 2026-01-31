/**
 * AISettingsModal Component
 * Modal for configuring AI provider settings
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Bot, Check, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import type { AISettings } from '@lib/ai/types';
import { saveAISettings, getModelsForProvider } from '@lib/ai/settings';
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
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [model, setModel] = useState(settings?.model || 'claude-sonnet-4-20250514');
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Reset form when settings change
  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey || '');
      setModel(settings.model || 'claude-sonnet-4-20250514');
    }
  }, [settings]);

  const handleTest = useCallback(async () => {
    if (!apiKey.trim()) {
      setTestResult('error');
      setTestError('Please enter an API key');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const testSettings: AISettings = {
        provider: 'anthropic',
        apiKey: apiKey.trim(),
        model,
      };

      const client = await createAIClient(testSettings);
      const connected = await client.testConnection();

      if (connected) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError('Connection failed - check your API key');
      }
    } catch (err) {
      setTestResult('error');
      setTestError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }, [apiKey, model]);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) return;

    const newSettings: AISettings = {
      provider: 'anthropic',
      apiKey: apiKey.trim(),
      model,
      maxTokens: settings?.maxTokens || 1024,
      temperature: settings?.temperature || 0.7,
    };

    await saveAISettings(newSettings);
    onSave(newSettings);
    onClose();
  }, [apiKey, model, settings, onSave, onClose]);

  const models = getModelsForProvider('anthropic');

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
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="form-select" value="anthropic" disabled>
              <option value="anthropic">Anthropic Claude</option>
            </select>
            <span className="form-hint">More providers coming soon</span>
          </div>

          <div className="form-group">
            <label className="form-label">API Key *</label>
            <div className="input-with-toggle">
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                placeholder="sk-ant-..."
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
            <span className="form-hint">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                console.anthropic.com
              </a>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Model</label>
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
          </div>

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
              disabled={testing || !apiKey.trim()}
            >
              {testing ? <Loader size={14} className="spin" /> : 'Test'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!apiKey.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
