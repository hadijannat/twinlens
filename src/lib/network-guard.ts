/**
 * Network Guard - Enforces local-only mode and network policies
 */
import { loadGeneralSettings } from './settings';

export class NetworkBlockedError extends Error {
  constructor(reason: string) {
    super(`Network blocked: ${reason}`);
    this.name = 'NetworkBlockedError';
  }
}

export interface NetworkGuardOptions {
  /** Bypass local-only mode check (for internal/system requests) */
  bypassLocalOnly?: boolean;
  /** Maximum response size in bytes */
  maxResponseSize?: number;
  /** Allowed URL schemes (default: ['https:', 'http:']) */
  allowedSchemes?: string[];
}

/**
 * Check if local-only mode is enabled
 */
export async function isLocalOnlyMode(): Promise<boolean> {
  const settings = await loadGeneralSettings();
  return settings.localOnlyMode;
}

/**
 * Perform fetch with network policy enforcement
 * Respects local-only mode and validates URL schemes
 */
export async function guardedFetch(
  url: string,
  init?: RequestInit,
  options: NetworkGuardOptions = {}
): Promise<Response> {
  // Check local-only mode unless bypassed
  if (!options.bypassLocalOnly) {
    if (await isLocalOnlyMode()) {
      throw new NetworkBlockedError(
        'Local-only mode is enabled. Disable it in Options to make network requests.'
      );
    }
  }

  // Validate URL scheme
  const allowedSchemes = options.allowedSchemes ?? ['https:', 'http:'];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new NetworkBlockedError(`Invalid URL: ${url}`);
  }

  if (!allowedSchemes.includes(parsed.protocol)) {
    throw new NetworkBlockedError(`Scheme '${parsed.protocol}' not allowed`);
  }

  return fetch(url, init);
}
