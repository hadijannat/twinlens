/**
 * Permission Utilities
 * Handles runtime permission requests for cross-origin access
 */

/**
 * Extract origin from URL for permission request
 */
function getOriginPattern(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return url;
  }
}

/**
 * Check if we have permission for a URL
 */
export async function hasPermission(url: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    // Not in extension context, assume allowed
    return true;
  }

  try {
    const origin = getOriginPattern(url);
    return await chrome.permissions.contains({ origins: [origin] });
  } catch {
    return false;
  }
}

/**
 * Request permission for a URL if not already granted
 * Returns true if permission was already granted or user approved
 */
export async function requestPermission(url: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    // Not in extension context, assume allowed
    return true;
  }

  try {
    const origin = getOriginPattern(url);

    // Check if already have permission
    const hasIt = await chrome.permissions.contains({ origins: [origin] });
    if (hasIt) {
      return true;
    }

    // Request permission
    return await chrome.permissions.request({ origins: [origin] });
  } catch (err) {
    console.warn('Permission request failed:', err);
    return false;
  }
}

/**
 * Perform fetch with permission check
 * Throws if permission denied
 */
export async function fetchWithPermission(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const hasIt = await hasPermission(url);

  if (!hasIt) {
    const granted = await requestPermission(url);
    if (!granted) {
      throw new Error(
        `Permission denied for ${new URL(url).origin}. Please grant access in the extension popup.`
      );
    }
  }

  return fetch(url, options);
}
