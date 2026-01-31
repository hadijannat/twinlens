/**
 * Settings Module
 * Shared settings types and storage utilities
 */

// ============================================================================
// Types
// ============================================================================

export type ScanIntensity = 'none' | 'passive' | 'active';
export type Theme = 'system' | 'light' | 'dark';
export type SeverityOverride = 'default' | 'treat-warn-as-error' | 'treat-warn-as-info';

export interface GeneralSettings {
  scanIntensity: ScanIntensity;
  localOnlyMode: boolean;
  theme: Theme;
  compactMode: boolean;
}

export interface ComplianceSettings {
  enabledRulePacks: string[];
  severityOverride: SeverityOverride;
  showFutureRules: boolean;
}

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  general: 'twinlens_general_settings',
  compliance: 'twinlens_compliance_settings',
} as const;

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_GENERAL: GeneralSettings = {
  scanIntensity: 'passive',
  localOnlyMode: false,
  theme: 'system',
  compactMode: false,
};

export const DEFAULT_COMPLIANCE: ComplianceSettings = {
  enabledRulePacks: ['eu-battery-regulation'],
  severityOverride: 'default',
  showFutureRules: true,
};

// ============================================================================
// Storage Helpers
// ============================================================================

export async function loadSettings<T>(key: string, defaults: T): Promise<T> {
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

export async function saveSettings<T>(key: string, settings: T): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      await chrome.storage.sync.set({ [key]: settings });
    }
  } catch (err) {
    console.warn(`Failed to save ${key}:`, err);
  }
}

/**
 * Load general settings
 */
export async function loadGeneralSettings(): Promise<GeneralSettings> {
  return loadSettings(STORAGE_KEYS.general, DEFAULT_GENERAL);
}

/**
 * Load compliance settings
 */
export async function loadComplianceSettings(): Promise<ComplianceSettings> {
  return loadSettings(STORAGE_KEYS.compliance, DEFAULT_COMPLIANCE);
}
