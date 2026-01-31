/**
 * Direct Resolution Strategy
 * Resolves ID Links by directly fetching the URL and following redirects
 */

import type { ResolvedLink } from '../../id-resolver';
import type {
  ResolvedEndpoint,
  ResolutionOptions,
  EndpointType,
} from '../types';

/** Strategy interface for resolution methods */
export interface ResolutionStrategy {
  /** Strategy name for logging/debugging */
  name: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Check if this strategy can handle the URL */
  canHandle(url: string, parsedLink: ResolvedLink): boolean;
  /** Resolve the URL and return discovered endpoints */
  resolve(
    url: string,
    parsedLink: ResolvedLink,
    options: ResolutionOptions
  ): Promise<ResolvedEndpoint[]>;
}

/** Content types that indicate AAS-related responses */
const AAS_CONTENT_TYPES = [
  'application/json',
  'application/ld+json',
  'application/aas+json',
  'application/aasx',
  'application/asset-administration-shell-package',
  'application/zip',
];

/** URL patterns that indicate AAS endpoints */
const AAS_URL_PATTERNS = [
  /\.aasx$/i,
  /\/shells\//i,
  /\/submodels\//i,
  /\/aas\//i,
  /\/api\/v\d+\/aas/i,
  /\/registry\//i,
  /\/shell-descriptors/i,
];

/**
 * Determine endpoint type from URL and content-type
 */
function inferEndpointType(url: string, contentType?: string): EndpointType {
  const lowerUrl = url.toLowerCase();
  const lowerContentType = contentType?.toLowerCase() ?? '';

  if (
    lowerUrl.endsWith('.aasx') ||
    lowerContentType.includes('aasx') ||
    lowerContentType.includes('asset-administration-shell-package')
  ) {
    return 'aasx';
  }

  if (/\/shells\//i.test(url) || /\/shell-descriptors/i.test(url)) {
    return 'aas-api';
  }

  if (/\/submodels\//i.test(url)) {
    return 'submodel-api';
  }

  if (/\/registry\//i.test(url)) {
    return 'registry';
  }

  if (
    /passport/i.test(url) ||
    /dpp\./i.test(url) ||
    /digitalproduct/i.test(url)
  ) {
    return 'dpp-portal';
  }

  return 'unknown';
}

/**
 * Parse Link header for alternate representations
 * Format: <url>; rel="alternate"; type="application/json"
 */
function parseLinkHeader(header: string): ResolvedEndpoint[] {
  const endpoints: ResolvedEndpoint[] = [];
  const links = header.split(',');

  for (const link of links) {
    const parts = link.trim().split(';');
    if (parts.length < 2) continue;

    // Extract URL from <url>
    const firstPart = parts[0];
    if (!firstPart) continue;
    const urlMatch = firstPart.match(/<([^>]+)>/);
    if (!urlMatch || !urlMatch[1]) continue;

    const linkUrl = urlMatch[1];
    const params: Record<string, string> = {};

    // Parse parameters
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const paramMatch = part.trim().match(/(\w+)="?([^"]+)"?/);
      if (paramMatch && paramMatch[1] && paramMatch[2]) {
        params[paramMatch[1].toLowerCase()] = paramMatch[2];
      }
    }

    // Only process alternate links
    if (params.rel === 'alternate' || params.rel === 'describedby') {
      endpoints.push({
        url: linkUrl,
        type: inferEndpointType(linkUrl, params.type),
        contentType: params.type,
        discoveryMethod: 'link-header',
        confidence: 0.8,
      });
    }
  }

  return endpoints;
}

/**
 * Direct resolution strategy
 * Follows redirects and inspects response headers
 */
export const directStrategy: ResolutionStrategy = {
  name: 'direct',
  priority: 1,

  canHandle() {
    // This strategy can handle any URL
    return true;
  },

  async resolve(url, _parsedLink, options): Promise<ResolvedEndpoint[]> {
    const endpoints: ResolvedEndpoint[] = [];
    const controller = new AbortController();
    const timeout = options.timeout ?? 10000;

    // Link parent signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use HEAD request first for efficiency
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept:
            'application/json, application/ld+json, application/aasx, */*',
        },
      });

      clearTimeout(timeoutId);

      const finalUrl = response.url;
      const contentType = response.headers.get('Content-Type') ?? undefined;

      // Check if we were redirected
      if (finalUrl !== url) {
        endpoints.push({
          url: finalUrl,
          type: inferEndpointType(finalUrl, contentType),
          contentType,
          discoveryMethod: 'redirect',
          confidence: 0.9,
        });
      }

      // Check if response indicates AAS content
      const isAASUrl = AAS_URL_PATTERNS.some((p) => p.test(finalUrl));
      const isAASContentType = contentType
        ? AAS_CONTENT_TYPES.some((t) => contentType.includes(t))
        : false;

      if (isAASUrl || isAASContentType) {
        // Avoid duplicate if we already added from redirect
        if (finalUrl === url) {
          endpoints.push({
            url: finalUrl,
            type: inferEndpointType(finalUrl, contentType),
            contentType,
            discoveryMethod: 'direct',
            confidence: isAASContentType ? 0.95 : 0.7,
          });
        }
      }

      // Parse Link headers for alternates
      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const linkEndpoints = parseLinkHeader(linkHeader);
        endpoints.push(...linkEndpoints);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      // Rethrow abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      // Silently fail for network errors - other strategies may succeed
    }

    return endpoints;
  },
};
