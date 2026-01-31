/**
 * useSettings Hook
 * Provides access to app settings in the sidepanel
 */

import { useState, useEffect } from 'react';
import {
  loadGeneralSettings,
  loadComplianceSettings,
  DEFAULT_GENERAL,
  DEFAULT_COMPLIANCE,
  STORAGE_KEYS,
} from '@lib/settings';
import type { GeneralSettings, ComplianceSettings } from '@lib/settings';

export interface AppSettings {
  general: GeneralSettings;
  compliance: ComplianceSettings;
  loaded: boolean;
}

export function useSettings(): AppSettings {
  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [compliance, setCompliance] = useState<ComplianceSettings>(DEFAULT_COMPLIANCE);
  const [loaded, setLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const [loadedGeneral, loadedCompliance] = await Promise.all([
        loadGeneralSettings(),
        loadComplianceSettings(),
      ]);
      setGeneral(loadedGeneral);
      setCompliance(loadedCompliance);
      setLoaded(true);
    }
    load();
  }, []);

  // Listen for settings changes from options page
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
      return;
    }

    const handleChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'sync') return;

      const generalChange = changes[STORAGE_KEYS.general];
      const complianceChange = changes[STORAGE_KEYS.compliance];

      if (generalChange?.newValue) {
        setGeneral({ ...DEFAULT_GENERAL, ...generalChange.newValue });
      }
      if (complianceChange?.newValue) {
        setCompliance({ ...DEFAULT_COMPLIANCE, ...complianceChange.newValue });
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  return { general, compliance, loaded };
}
