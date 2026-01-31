/**
 * File Utilities
 * Blob handling, MIME detection, download triggers, and preview type detection
 */

import type { PreviewableType } from '@shared/types';

// Content types that are safe for inline preview (no script execution risk)
const SAFE_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
];

const TEXT_TYPES = [
  'application/json',
  'application/xml',
  'text/plain',
  'text/xml',
  'text/csv',
];

const PDF_TYPES = ['application/pdf'];

// Content types that could contain scripts and must be blocked from preview
const UNSAFE_TYPES = [
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
];

/**
 * Determine the preview type for a given content type
 */
export function getPreviewType(contentType: string): PreviewableType {
  const normalized = contentType.toLowerCase();

  if (!isSafeForPreview(normalized)) {
    return 'unsupported';
  }

  if (SAFE_IMAGE_TYPES.some((t) => normalized.includes(t))) {
    return 'image';
  }

  if (PDF_TYPES.some((t) => normalized.includes(t))) {
    return 'pdf';
  }

  if (TEXT_TYPES.some((t) => normalized.includes(t))) {
    return 'text';
  }

  return 'unsupported';
}

/**
 * Check if a content type can be previewed
 */
export function canPreview(contentType: string): boolean {
  return getPreviewType(contentType) !== 'unsupported';
}

/**
 * Check if content type is safe for preview (no XSS risk)
 */
export function isSafeForPreview(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return !UNSAFE_TYPES.some((t) => normalized.includes(t));
}

/**
 * Create a blob URL for a blob
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Trigger a file download from a blob URL
 */
export function triggerDownload(blobUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get filename from a path
 */
export function getFilenameFromPath(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download data as a JSON file
 */
export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = createBlobUrl(blob);
  triggerDownload(url, filename);
  revokeBlobUrl(url);
}

/**
 * Download ArrayBuffer as a file
 */
export function downloadArrayBuffer(
  data: ArrayBuffer,
  filename: string,
  contentType: string
): void {
  const blob = new Blob([data], { type: contentType });
  const url = createBlobUrl(blob);
  triggerDownload(url, filename);
  revokeBlobUrl(url);
}
