/**
 * ID Resolver
 * Resolves IEC 61406 identification links and GS1 Digital Links
 * to AAS endpoints or passport URLs
 */

export interface ResolvedLink {
  type: 'aas' | 'passport' | 'url' | 'unknown';
  url: string;
  originalUrl: string;
  identifier?: string;
  manufacturer?: string;
  productType?: string;
}

// IEC 61406 identification link patterns
// Format: https://id.<domain>/<manufacturer>/<producttype>/<serial>
const IEC_61406_PATTERN =
  /^https?:\/\/id\.([^/]+)\/([^/]+)\/([^/]+)(?:\/([^/?#]+))?/;

// GS1 Digital Link patterns
// Format: https://id.gs1.org/01/<GTIN>/21/<serial> or https://id.gs1.org/01/<GTIN>
const GS1_DIGITAL_LINK_PATTERN = /^https?:\/\/(?:id\.gs1\.org|dlnkd\.tn\.gg)\/(\d{2})\/(\d+)/;

// Common AAS server endpoint patterns
const AAS_SERVER_PATTERNS = [
  /\/shells\//i,
  /\/submodels\//i,
  /\/aas\//i,
  /\/api\/v\d+\/aas/i,
  /\/registry\//i,
];

// Battery Passport URL patterns
const BATTERY_PASSPORT_PATTERNS = [
  /battery[-_]?passport/i,
  /dpp\..*\/passport/i,
  /digitalproductpassport/i,
];

/**
 * Check if a URL points to an AAS server endpoint
 */
function isAASServerUrl(url: string): boolean {
  return AAS_SERVER_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Check if a URL points to a battery passport
 */
function isBatteryPassportUrl(url: string): boolean {
  return BATTERY_PASSPORT_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Parse an IEC 61406 identification link
 */
function parseIEC61406(url: string): Partial<ResolvedLink> | null {
  const match = url.match(IEC_61406_PATTERN);
  if (!match) return null;

  const [, , manufacturer, productType, serial] = match;

  return {
    manufacturer,
    productType,
    identifier: serial || `${manufacturer}/${productType}`,
  };
}

/**
 * Parse a GS1 Digital Link
 */
function parseGS1DigitalLink(url: string): Partial<ResolvedLink> | null {
  const match = url.match(GS1_DIGITAL_LINK_PATTERN);
  if (!match) return null;

  const [, ai, value] = match;

  // Common Application Identifiers
  // 01 = GTIN
  // 21 = Serial Number
  const identifierType = ai === '01' ? 'GTIN' : `AI(${ai})`;

  return {
    identifier: `${identifierType}:${value}`,
  };
}

/**
 * Attempt to construct an AASX download URL from an ID link
 * Many ID servers serve AASX files at specific paths
 */
export function constructAASXUrl(idUrl: string): string | null {
  try {
    const parsed = new URL(idUrl);

    // Common AASX endpoint patterns to try:
    // 1. Add /aasx to the path
    // 2. Replace path with /aasx/<identifier>
    // 3. Add ?format=aasx query parameter

    // Pattern 1: Append .aasx extension
    if (!parsed.pathname.endsWith('.aasx')) {
      const aasxUrl = new URL(idUrl);
      aasxUrl.pathname = parsed.pathname.replace(/\/?$/, '.aasx');
      return aasxUrl.toString();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve an identification link to determine its type and extract metadata
 */
export function resolveIdLink(url: string): ResolvedLink {
  const normalizedUrl = url.trim();

  // Try to validate as URL
  try {
    new URL(normalizedUrl);
  } catch {
    // Not a valid URL
    return {
      type: 'unknown',
      url: normalizedUrl,
      originalUrl: url,
    };
  }

  // Check for AASX file link
  if (normalizedUrl.toLowerCase().endsWith('.aasx')) {
    return {
      type: 'aas',
      url: normalizedUrl,
      originalUrl: url,
    };
  }

  // Check for AAS server endpoint
  if (isAASServerUrl(normalizedUrl)) {
    return {
      type: 'aas',
      url: normalizedUrl,
      originalUrl: url,
    };
  }

  // Check for battery passport
  if (isBatteryPassportUrl(normalizedUrl)) {
    return {
      type: 'passport',
      url: normalizedUrl,
      originalUrl: url,
    };
  }

  // Try to parse as IEC 61406
  const iec61406Data = parseIEC61406(normalizedUrl);
  if (iec61406Data) {
    return {
      type: 'passport',
      url: normalizedUrl,
      originalUrl: url,
      ...iec61406Data,
    };
  }

  // Try to parse as GS1 Digital Link
  const gs1Data = parseGS1DigitalLink(normalizedUrl);
  if (gs1Data) {
    return {
      type: 'passport',
      url: normalizedUrl,
      originalUrl: url,
      ...gs1Data,
    };
  }

  // Default to generic URL
  return {
    type: 'url',
    url: normalizedUrl,
    originalUrl: url,
  };
}

/**
 * Check if a decoded QR code value looks like a valid ID link
 */
export function isValidIdLink(value: string): boolean {
  // Must be a URL
  try {
    const url = new URL(value);
    // Must be HTTPS (or HTTP for local development)
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
