/**
 * TwinLens Options Page
 * User preferences for discovery, compliance, and AI settings
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Shield,
  Cpu,
  Monitor,
  CheckCircle,
  AlertCircle,
  EyeOff,
} from 'lucide-react';
import type { AISettings, AIProvider } from '@lib/ai/types';
import {
  loadAISettings,
  saveAISettings,
  getModelsForProvider,
  getProviderPreset,
  PROVIDER_PRESETS,
} from '@lib/ai/settings';

// ============================================================================
// Types
// ============================================================================

type ScanIntensity = 'none' | 'passive' | 'active';
type Theme = 'system' | 'light' | 'dark';
type SeverityOverride = 'default' | 'treat-warn-as-error' | 'treat-warn-as-info';
type ValidationMode = 'strict' | 'lenient';

interface GeneralSettings {
  scanIntensity: ScanIntensity;
  localOnlyMode: boolean;
  theme: Theme;
  compactMode: boolean;
  validationMode: ValidationMode;
}

interface ComplianceSettings {
  enabledRulePacks: string[];
  severityOverride: SeverityOverride;
  showFutureRules: boolean;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  general: 'twinlens_general_settings',
  compliance: 'twinlens_compliance_settings',
};

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_GENERAL: GeneralSettings = {
  scanIntensity: 'passive',
  localOnlyMode: false,
  theme: 'system',
  compactMode: false,
  validationMode: 'strict',
};

const DEFAULT_COMPLIANCE: ComplianceSettings = {
  enabledRulePacks: ['eu-battery-regulation'],
  severityOverride: 'default',
  showFutureRules: true,
};

// Available rule packs
const AVAILABLE_RULE_PACKS = [
  { id: 'eu-battery-regulation', name: 'EU Battery Regulation', description: 'Battery passport compliance (2023/1542) - 11 rules' },
  { id: 'weee-electronics', name: 'WEEE Electronics', description: 'Electronic waste directive (2012/19/EU) - 6 rules' },
];

// ============================================================================
// Storage Helpers
// ============================================================================

async function loadSettings<T>(key: string, defaults: T): Promise<T> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      const result = await chrome.storage.sync.get(key);
      if (result[key]) {
        return { ...defaults, ...result[key] };
      }
    }
  } catch (err) {
    console.warn(`Failed to load ${key}:`, err);
  }
  return defaults;
}

async function saveSettings<T>(key: string, settings: T): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      await chrome.storage.sync.set({ [key]: settings });
    }
  } catch (err) {
    console.warn(`Failed to save ${key}:`, err);
  }
}

// ============================================================================
// Components
// ============================================================================

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <section className="options-section">
      <div className="options-section-header">
        <div className="options-section-icon">{icon}</div>
        <div className="options-section-info">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="options-section-content">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="options-setting">
      <div className="options-setting-info">
        <span className="options-setting-label">{label}</span>
        {description && <span className="options-setting-desc">{description}</span>}
      </div>
      <div className="options-setting-control">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`options-toggle ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span className="options-toggle-thumb" />
    </button>
  );
}

// ============================================================================
// Main App
// ============================================================================

export default function App() {
  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [compliance, setCompliance] = useState<ComplianceSettings>(DEFAULT_COMPLIANCE);
  const [ai, setAI] = useState<AISettings>({ provider: 'anthropic' });
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loaded, setLoaded] = useState(false);

  // Get current provider preset
  const preset = useMemo(() => getProviderPreset(ai.provider), [ai.provider]);
  const models = useMemo(() => getModelsForProvider(ai.provider), [ai.provider]);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const [loadedGeneral, loadedCompliance, loadedAI] = await Promise.all([
        loadSettings(STORAGE_KEYS.general, DEFAULT_GENERAL),
        loadSettings(STORAGE_KEYS.compliance, DEFAULT_COMPLIANCE),
        loadAISettings(),
      ]);
      setGeneral(loadedGeneral);
      setCompliance(loadedCompliance);
      setAI(loadedAI);
      setUseCustomModel(Boolean(loadedAI.customModel));
      setLoaded(true);
    }
    load();
  }, []);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!loaded) return;

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await Promise.all([
          saveSettings(STORAGE_KEYS.general, general),
          saveSettings(STORAGE_KEYS.compliance, compliance),
          saveAISettings(ai),
        ]);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [general, compliance, ai, loaded]);

  const updateGeneral = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setGeneral((prev) => ({ ...prev, [key]: value }));
  };

  const updateCompliance = <K extends keyof ComplianceSettings>(key: K, value: ComplianceSettings[K]) => {
    setCompliance((prev) => ({ ...prev, [key]: value }));
  };

  const updateAI = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setAI((prev) => ({ ...prev, [key]: value }));
  };

  const handleProviderChange = (provider: AIProvider) => {
    const newModels = getModelsForProvider(provider);
    const firstModel = newModels[0];

    setAI((prev) => ({
      ...prev,
      provider,
      model: firstModel?.id,
      customModel: undefined,
      baseUrl: undefined, // Reset to use preset default
    }));
    setUseCustomModel(false);
  };

  const toggleRulePack = (packId: string) => {
    setCompliance((prev) => {
      const enabled = prev.enabledRulePacks.includes(packId);
      return {
        ...prev,
        enabledRulePacks: enabled
          ? prev.enabledRulePacks.filter((id) => id !== packId)
          : [...prev.enabledRulePacks, packId],
      };
    });
  };

  if (!loaded) {
    return (
      <div className="options-loading">
        <div className="spinner" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="options-page">
      <header className="options-header">
        <div className="options-header-left">
          <Eye size={28} color="var(--color-primary)" />
          <div>
            <h1>TwinLens Options</h1>
            <p>Configure your Digital Product Passport viewer</p>
          </div>
        </div>
        <div className="options-header-right">
          {saveStatus === 'saving' && (
            <span className="options-save-status saving">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="options-save-status saved">
              <CheckCircle size={14} /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="options-save-status error">
              <AlertCircle size={14} /> Error saving
            </span>
          )}
        </div>
      </header>

      <main className="options-main">
        {/* General Settings */}
        <Section
          icon={<Monitor size={20} />}
          title="General"
          description="Discovery, privacy, and display preferences"
        >
          <SettingRow
            label="Page Scanning"
            description="How aggressively to scan pages for DPP content"
          >
            <select
              className="form-select options-select"
              value={general.scanIntensity}
              onChange={(e) => updateGeneral('scanIntensity', e.target.value as ScanIntensity)}
            >
              <option value="none">Disabled</option>
              <option value="passive">Passive (on navigation)</option>
              <option value="active">Active (continuous)</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Local-Only Mode"
            description="Disable all network calls (registry, AI, URL resolution)"
          >
            <Toggle
              checked={general.localOnlyMode}
              onChange={(v) => updateGeneral('localOnlyMode', v)}
            />
          </SettingRow>

          <SettingRow label="Theme" description="Color scheme preference">
            <select
              className="form-select options-select"
              value={general.theme}
              onChange={(e) => updateGeneral('theme', e.target.value as Theme)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Compact Mode"
            description="Reduce spacing for smaller screens"
          >
            <Toggle
              checked={general.compactMode}
              onChange={(v) => updateGeneral('compactMode', v)}
            />
          </SettingRow>

          <SettingRow
            label="Validation Mode"
            description="How strictly to validate AAS files"
          >
            <select
              className="form-select options-select"
              value={general.validationMode}
              onChange={(e) => updateGeneral('validationMode', e.target.value as ValidationMode)}
            >
              <option value="strict">Strict (full verification)</option>
              <option value="lenient">Lenient (parse-only)</option>
            </select>
          </SettingRow>
        </Section>

        {/* Compliance Settings */}
        <Section
          icon={<Shield size={20} />}
          title="Compliance"
          description="Rule packs and validation preferences"
        >
          <div className="options-subsection">
            <h3>Enabled Rule Packs</h3>
            <div className="options-rule-packs">
              {AVAILABLE_RULE_PACKS.map((pack) => (
                <label key={pack.id} className="options-rule-pack">
                  <input
                    type="checkbox"
                    checked={compliance.enabledRulePacks.includes(pack.id)}
                    onChange={() => toggleRulePack(pack.id)}
                  />
                  <div className="options-rule-pack-info">
                    <span className="options-rule-pack-name">{pack.name}</span>
                    <span className="options-rule-pack-desc">{pack.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <SettingRow
            label="Severity Override"
            description="How to treat warning-level issues"
          >
            <select
              className="form-select options-select"
              value={compliance.severityOverride}
              onChange={(e) =>
                updateCompliance('severityOverride', e.target.value as SeverityOverride)
              }
            >
              <option value="default">Default</option>
              <option value="treat-warn-as-error">Treat warnings as errors</option>
              <option value="treat-warn-as-info">Treat warnings as info</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Show Future Rules"
            description="Display rules not yet in force"
          >
            <Toggle
              checked={compliance.showFutureRules}
              onChange={(v) => updateCompliance('showFutureRules', v)}
            />
          </SettingRow>
        </Section>

        {/* AI Settings */}
        <Section
          icon={<Cpu size={20} />}
          title="AI Chat"
          description="Configure AI assistant for asset questions"
        >
          <SettingRow
            label="Provider"
            description={preset?.description || 'AI service provider'}
          >
            <select
              className="form-select options-select"
              value={ai.provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              disabled={general.localOnlyMode}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </SettingRow>

          {/* API Key (conditional) */}
          {preset?.requiresApiKey && (
            <SettingRow
              label="API Key"
              description={
                preset.apiKeyDocsUrl
                  ? `Get from ${new URL(preset.apiKeyDocsUrl).hostname}`
                  : 'Your API key for the selected provider'
              }
            >
              <div className="input-with-toggle">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="form-input"
                  value={ai.apiKey || ''}
                  onChange={(e) => updateAI('apiKey', e.target.value)}
                  placeholder={preset.apiKeyPlaceholder || 'Enter API key'}
                  disabled={general.localOnlyMode}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </SettingRow>
          )}

          {/* Base URL (for providers that support it) */}
          {preset?.supportsBaseUrl && (
            <SettingRow
              label="Base URL"
              description={`Default: ${preset.baseUrl}`}
            >
              <input
                type="text"
                className="form-input"
                value={ai.baseUrl || ''}
                onChange={(e) => updateAI('baseUrl', e.target.value)}
                placeholder={preset.baseUrl}
                disabled={general.localOnlyMode}
              />
            </SettingRow>
          )}

          {/* Model Selection */}
          <SettingRow
            label="Model"
            description="Which model to use for responses"
          >
            <div className="options-model-control">
              {!useCustomModel && models.length > 0 ? (
                <select
                  className="form-select options-select"
                  value={ai.model || ''}
                  onChange={(e) => updateAI('model', e.target.value)}
                  disabled={general.localOnlyMode}
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
                  value={ai.customModel || ''}
                  onChange={(e) => updateAI('customModel', e.target.value)}
                  placeholder="e.g., gpt-4o, llama3.2, claude-sonnet-4"
                  disabled={general.localOnlyMode}
                />
              )}
              {preset?.allowCustomModel && (
                <button
                  type="button"
                  className="options-model-toggle"
                  onClick={() => {
                    if (useCustomModel) {
                      // Switching back to presets
                      updateAI('customModel', undefined);
                      const firstModel = models[0];
                      if (firstModel) {
                        updateAI('model', firstModel.id);
                      }
                    } else {
                      updateAI('model', undefined);
                    }
                    setUseCustomModel(!useCustomModel);
                  }}
                  disabled={general.localOnlyMode}
                >
                  {useCustomModel ? 'Use preset' : 'Custom'}
                </button>
              )}
            </div>
          </SettingRow>

          <SettingRow
            label="Max Tokens"
            description={`Response length limit: ${ai.maxTokens || 1024}`}
          >
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={ai.maxTokens || 1024}
              onChange={(e) => updateAI('maxTokens', parseInt(e.target.value, 10))}
              className="options-slider"
              disabled={general.localOnlyMode}
            />
          </SettingRow>

          <SettingRow
            label="Temperature"
            description={`Creativity level: ${(ai.temperature || 0.7).toFixed(1)}`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ai.temperature || 0.7}
              onChange={(e) => updateAI('temperature', parseFloat(e.target.value))}
              className="options-slider"
              disabled={general.localOnlyMode}
            />
          </SettingRow>

          {general.localOnlyMode && (
            <div className="options-warning">
              <AlertCircle size={14} />
              AI features are disabled in Local-Only Mode
            </div>
          )}
        </Section>
      </main>

      <footer className="options-footer">
        <p>
          TwinLens v0.1.0 - Privacy-first Digital Product Passport viewer
        </p>
        <a
          href="https://github.com/YOUR_USERNAME/twinlens/blob/main/docs/PRIVACY.md"
          target="_blank"
          rel="noopener noreferrer"
          className="options-footer-link"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
