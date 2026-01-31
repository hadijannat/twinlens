/**
 * Header Sanitizer
 * Blocks dangerous header overrides in AI client requests
 */

/**
 * Headers that should never be overridden by user configuration
 * These control authentication, connection behavior, or could be used for attacks
 */
const BLOCKED_HEADERS = new Set([
  'host',
  'content-length',
  'transfer-encoding',
  'connection',
  'cookie',
  'set-cookie',
  'origin',
  'authorization',
  'x-api-key',
  'anthropic-version',
]);

/**
 * Sanitize extra headers by removing blocked headers and unsafe values
 * @param extraHeaders - User-provided extra headers
 * @returns Sanitized headers safe to use in requests
 */
export function sanitizeHeaders(
  extraHeaders: Record<string, string> | undefined
): Record<string, string> {
  if (!extraHeaders) return {};

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(extraHeaders)) {
    const lowerKey = key.toLowerCase();

    // Skip blocked headers
    if (BLOCKED_HEADERS.has(lowerKey)) {
      console.warn(`Blocked header override attempt: ${key}`);
      continue;
    }

    // Skip if value contains CRLF (header injection attempt)
    if (/[\r\n]/.test(value)) {
      console.warn(`Blocked CRLF injection attempt in header: ${key}`);
      continue;
    }

    result[key] = value;
  }

  return result;
}
