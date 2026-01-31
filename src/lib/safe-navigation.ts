/**
 * Safe Navigation Utilities
 * Provides secure methods for opening URLs in new windows/tabs
 */

/**
 * Safely open a URL in a new tab with noopener and noreferrer
 * Prevents the new window from accessing window.opener
 */
export function safeOpenUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a blob URL in a new tab
 * Uses noopener but not noreferrer (noreferrer can break blob handling)
 */
export function openBlobUrl(blobUrl: string): void {
  if (!blobUrl.startsWith('blob:')) {
    console.warn('openBlobUrl called with non-blob URL:', blobUrl);
    return;
  }
  window.open(blobUrl, '_blank', 'noopener');
}
