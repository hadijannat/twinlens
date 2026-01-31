/**
 * AAS/DPP Detection Patterns
 * URL and semantic patterns for detecting Asset Administration Shell
 * and Digital Product Passport content on web pages
 */

/**
 * URL patterns that suggest AAS/DPP content
 */
export const URL_PATTERNS = {
  // AAS server endpoints
  aasServer: [
    /\/shells\//i,
    /\/submodels\//i,
    /\/aas\//i,
    /\/api\/v\d+\/aas/i,
    /\/registry\//i,
    /\/repository\//i,
    /\/lookup\//i,
  ],

  // ID link domains
  idDomains: [
    /^https?:\/\/id\./i,
    /^https?:\/\/[^/]+\/id\//i,
    /digitallink/i,
    /gs1/i,
  ],

  // AASX file links
  aasxFile: [/\.aasx$/i, /\.aasx\?/i],

  // Battery passport and DPP
  passport: [
    /battery[-_]?passport/i,
    /digital[-_]?product[-_]?passport/i,
    /dpp\./i,
    /\/passport\//i,
  ],
};

/**
 * JSON-LD types that indicate product/asset data
 */
export const JSONLD_TYPES = [
  'Product',
  'IndividualProduct',
  'SomeProducts',
  'Vehicle',
  'Car',
  'MotorizedBicycle',
  'OfferCatalog',
  'ItemList',
  'HowTo',
  'Recipe',
  'TechArticle',
  // Schema.org product types
  'ProductModel',
  'ProductGroup',
];

/**
 * JSON-LD properties that indicate product identifiers
 */
export const JSONLD_IDENTIFIER_PROPS = [
  'gtin',
  'gtin13',
  'gtin14',
  'gtin8',
  'sku',
  'mpn',
  'serialNumber',
  'productID',
  'identifier',
  'vehicleIdentificationNumber',
];

/**
 * Meta tag names that might contain DPP identifiers
 */
export const META_TAG_NAMES = [
  'product:gtin',
  'product:sku',
  'product:upc',
  'og:product:gtin',
  'product:retailer_item_id',
  'product:brand',
];

/**
 * Link rel values that might indicate AAS/DPP resources
 */
export const LINK_REL_VALUES = [
  'alternate', // Often used for machine-readable versions
  'describedby', // Links to description documents
  'canonical', // May link to authoritative ID
];

/**
 * Confidence levels for detection
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Detection result from a single check
 */
export interface DetectionResult {
  type: 'jsonld' | 'link' | 'meta' | 'script' | 'structured';
  confidence: ConfidenceLevel;
  description: string;
  url?: string;
  data?: unknown;
}

/**
 * Check if a URL matches any AAS/DPP patterns
 */
export function matchesAASPattern(url: string): boolean {
  for (const patterns of Object.values(URL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the pattern type that a URL matches
 */
export function getMatchedPatternType(
  url: string
): 'aasServer' | 'idDomain' | 'aasxFile' | 'passport' | null {
  for (const [type, patterns] of Object.entries(URL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return type as 'aasServer' | 'idDomain' | 'aasxFile' | 'passport';
      }
    }
  }
  return null;
}
