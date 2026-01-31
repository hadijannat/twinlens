/**
 * Shared Utility Functions
 *
 * Common utility functions used across the TwinLens extension.
 * Centralizing these prevents duplication and ensures consistent behavior.
 */

/**
 * Ensures a value is always returned as an array.
 *
 * Handles multiple input formats:
 * - null/undefined → empty array
 * - Array → returns as-is
 * - Object (Record) → returns Object.values()
 * - Single value → wraps in array
 *
 * This is particularly useful for parsing XML/JSON data where
 * single items may be represented as objects rather than arrays.
 *
 * @example
 * ensureArray(null)                    // []
 * ensureArray([1, 2, 3])               // [1, 2, 3]
 * ensureArray({ a: 1, b: 2 })          // [1, 2]
 * ensureArray('single')                // ['single']
 */
export function ensureArray<T>(value: T | T[] | Record<string, T> | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    // Convert object to array of values
    return Object.values(value as Record<string, T>);
  }
  return [value];
}

/**
 * Safely retrieves a nested property from an object using a dot-notation path.
 *
 * Returns undefined if any part of the path doesn't exist,
 * avoiding "cannot read property of undefined" errors.
 *
 * @example
 * const obj = { a: { b: { c: 42 } } };
 * safeGet<number>(obj, 'a.b.c')        // 42
 * safeGet<number>(obj, 'a.x.y')        // undefined
 * safeGet<string>(obj, 'a.b.c')        // 42 (but typed as string | undefined)
 */
export function safeGet<T>(obj: unknown, path: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current as T | undefined;
}
