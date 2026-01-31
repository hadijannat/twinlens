/**
 * AI Consent Management
 * Handles user consent for sending asset data to AI providers
 */

const CONSENT_KEY = 'twinlens_ai_consent';

export interface ConsentState {
  hasConsented: boolean;
  consentedProvider?: string;
  consentTimestamp?: number;
}

/**
 * Get the current consent state
 */
export async function getConsentState(): Promise<ConsentState> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      const result = await chrome.storage.local.get(CONSENT_KEY);
      return result[CONSENT_KEY] || { hasConsented: false };
    }
  } catch {
    // Fall through to default
  }
  return { hasConsented: false };
}

/**
 * Grant consent for a specific provider
 */
export async function grantConsent(provider: string): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      await chrome.storage.local.set({
        [CONSENT_KEY]: {
          hasConsented: true,
          consentedProvider: provider,
          consentTimestamp: Date.now(),
        },
      });
    }
  } catch (err) {
    console.warn('Failed to save consent:', err);
  }
}

/**
 * Revoke consent
 */
export async function revokeConsent(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      await chrome.storage.local.remove(CONSENT_KEY);
    }
  } catch (err) {
    console.warn('Failed to revoke consent:', err);
  }
}
