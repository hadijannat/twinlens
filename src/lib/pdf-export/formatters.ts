/**
 * PDF Value Formatters
 * Utilities for formatting values for PDF display
 */

import type { TypedValue } from '@lib/normalized';

/**
 * Format a TypedValue for PDF display
 */
export function formatTypedValue(value: TypedValue, preferredLang = 'en'): string {
  switch (value.type) {
    case 'string':
      return value.value;
    case 'number':
      return formatNumber(value.value, value.unit);
    case 'boolean':
      return value.value ? 'Yes' : 'No';
    case 'date':
      return formatDate(value.value);
    case 'multilang':
      return selectLanguage(value.values, preferredLang);
    default:
      return String(value);
  }
}

/**
 * Format a number with optional unit
 */
function formatNumber(value: number, unit?: string): string {
  // Use locale-aware formatting with reasonable precision
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 3 });

  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Select the best language from a multilang array
 */
export function selectLanguage(
  values: { lang: string; text: string }[],
  preferred: string
): string {
  if (values.length === 0) return '';

  // Try exact match first
  const exact = values.find((v) => v.lang.toLowerCase() === preferred.toLowerCase());
  if (exact) return exact.text;

  // Try language prefix match (e.g., 'en' matches 'en-US')
  const prefixMatch = values.find((v) =>
    v.lang.toLowerCase().startsWith(preferred.toLowerCase().split('-')[0] ?? '')
  );
  if (prefixMatch) return prefixMatch.text;

  // Fallback to English
  const english = values.find(
    (v) => v.lang.toLowerCase() === 'en' || v.lang.toLowerCase().startsWith('en')
  );
  if (english) return english.text;

  // Return first available
  return values[0]?.text ?? '';
}

/**
 * Format an ISO date string for display
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a category name for display (title case)
 */
export function formatCategoryName(category: string): string {
  return category
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get unit string from a TypedValue if present
 */
export function getUnit(value: TypedValue): string | undefined {
  if (value.type === 'string' || value.type === 'number') {
    return value.unit;
  }
  return undefined;
}

/**
 * Format a value for table display (no unit, separate column)
 */
export function formatValueOnly(value: TypedValue, preferredLang = 'en'): string {
  switch (value.type) {
    case 'string':
      return value.value;
    case 'number':
      return Number.isInteger(value.value)
        ? value.value.toLocaleString()
        : value.value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    case 'boolean':
      return value.value ? 'Yes' : 'No';
    case 'date':
      return formatDate(value.value);
    case 'multilang':
      return selectLanguage(value.values, preferredLang);
    default:
      return String(value);
  }
}
