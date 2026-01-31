/**
 * Page Scanner Content Script
 * Scans web pages for DPP/AAS indicators and reports findings
 */

import {
  JSONLD_TYPES,
  JSONLD_IDENTIFIER_PROPS,
  META_TAG_NAMES,
  matchesAASPattern,
  getMatchedPatternType,
  type DetectionResult,
  type ConfidenceLevel,
} from './patterns';

/**
 * Overall scan result sent to service worker
 */
export interface ScanResult {
  url: string;
  confidence: ConfidenceLevel;
  findings: DetectionResult[];
  timestamp: string;
}

/**
 * Scan JSON-LD script tags for product/asset data
 */
function scanJsonLd(): DetectionResult[] {
  const results: DetectionResult[] = [];
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  scripts.forEach((script) => {
    try {
      const content = script.textContent;
      if (!content) return;

      const data = JSON.parse(content);

      // Handle @graph structure
      const items = Array.isArray(data)
        ? data
        : data['@graph']
          ? data['@graph']
          : [data];

      for (const item of items) {
        // Check @type
        const types = Array.isArray(item['@type'])
          ? item['@type']
          : [item['@type']];
        const matchedType = types.find((t: string) =>
          JSONLD_TYPES.some((jt) => t?.includes(jt))
        );

        if (matchedType) {
          // Check for identifiers
          const hasIdentifier = JSONLD_IDENTIFIER_PROPS.some(
            (prop) => item[prop] !== undefined
          );

          results.push({
            type: 'jsonld',
            confidence: hasIdentifier ? 'high' : 'medium',
            description: `Found ${matchedType} with ${hasIdentifier ? 'product identifier' : 'no identifier'}`,
            data: {
              '@type': matchedType,
              identifier: JSONLD_IDENTIFIER_PROPS.find(
                (prop) => item[prop] !== undefined
              ),
            },
          });
        }
      }
    } catch {
      // Invalid JSON - ignore
    }
  });

  return results;
}

/**
 * Scan page links for AAS/DPP URLs
 */
function scanLinks(): DetectionResult[] {
  const results: DetectionResult[] = [];
  const links = document.querySelectorAll('a[href]');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Skip javascript: and # links
    if (href.startsWith('javascript:') || href === '#') return;

    try {
      // Resolve relative URLs
      const absoluteUrl = new URL(href, window.location.href).href;

      if (matchesAASPattern(absoluteUrl)) {
        const patternType = getMatchedPatternType(absoluteUrl);

        let confidence: ConfidenceLevel = 'low';
        let description = 'Link matches AAS pattern';

        if (patternType === 'aasxFile') {
          confidence = 'high';
          description = 'Link to AASX file';
        } else if (patternType === 'aasServer') {
          confidence = 'high';
          description = 'Link to AAS server endpoint';
        } else if (patternType === 'passport') {
          confidence = 'medium';
          description = 'Link to Digital Product Passport';
        } else if (patternType === 'idDomain') {
          confidence = 'medium';
          description = 'Link to ID domain';
        }

        results.push({
          type: 'link',
          confidence,
          description,
          url: absoluteUrl,
        });
      }
    } catch {
      // Invalid URL - ignore
    }
  });

  return results;
}

/**
 * Scan meta tags for product identifiers
 */
function scanMetaTags(): DetectionResult[] {
  const results: DetectionResult[] = [];

  META_TAG_NAMES.forEach((name) => {
    const meta = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`
    );
    if (meta) {
      const content = meta.getAttribute('content');
      if (content) {
        results.push({
          type: 'meta',
          confidence: 'medium',
          description: `Found ${name} meta tag`,
          data: { name, content },
        });
      }
    }
  });

  // Also check for link rel="alternate" with machine-readable types
  const alternateLinks = document.querySelectorAll('link[rel="alternate"]');
  alternateLinks.forEach((link) => {
    const type = link.getAttribute('type');
    const href = link.getAttribute('href');

    if (type && href) {
      if (
        type.includes('json') ||
        type.includes('xml') ||
        type.includes('rdf')
      ) {
        if (matchesAASPattern(href)) {
          results.push({
            type: 'link',
            confidence: 'high',
            description: 'Alternate link to machine-readable format',
            url: href,
          });
        }
      }
    }
  });

  return results;
}

/**
 * Check the current page URL for AAS patterns
 */
function checkPageUrl(): DetectionResult | null {
  const currentUrl = window.location.href;

  if (matchesAASPattern(currentUrl)) {
    const patternType = getMatchedPatternType(currentUrl);
    return {
      type: 'structured',
      confidence: 'high',
      description: `Page URL matches ${patternType || 'AAS'} pattern`,
      url: currentUrl,
    };
  }

  return null;
}

/**
 * Determine overall confidence from findings
 */
function calculateOverallConfidence(findings: DetectionResult[]): ConfidenceLevel {
  if (findings.length === 0) return 'none';

  const hasHigh = findings.some((f) => f.confidence === 'high');
  const hasMedium = findings.some((f) => f.confidence === 'medium');

  if (hasHigh) return 'high';
  if (hasMedium) return 'medium';
  return 'low';
}

/**
 * Run a full page scan
 */
export function scanPage(): ScanResult {
  const findings: DetectionResult[] = [];

  // Check page URL
  const urlResult = checkPageUrl();
  if (urlResult) {
    findings.push(urlResult);
  }

  // Scan JSON-LD
  findings.push(...scanJsonLd());

  // Scan links
  findings.push(...scanLinks());

  // Scan meta tags
  findings.push(...scanMetaTags());

  // Deduplicate findings by URL
  const seenUrls = new Set<string>();
  const uniqueFindings = findings.filter((f) => {
    if (!f.url) return true;
    if (seenUrls.has(f.url)) return false;
    seenUrls.add(f.url);
    return true;
  });

  return {
    url: window.location.href,
    confidence: calculateOverallConfidence(uniqueFindings),
    findings: uniqueFindings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Initialize the scanner and report to service worker
 */
function init() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScan);
  } else {
    runScan();
  }
}

function runScan() {
  const result = scanPage();

  // Send result to service worker
  chrome.runtime.sendMessage({
    type: 'PAGE_SCAN_RESULT',
    result,
  });
}

// Run initialization
init();

export {};
