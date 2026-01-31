/**
 * GS1 Resolver Strategy
 * Queries GS1 Digital Link resolvers for link sets containing AAS/DPP endpoints
 */

import type { ResolvedEndpoint, EndpointType } from '../types';
import type { ResolutionStrategy } from './direct';
import { guardedFetch, NetworkBlockedError } from '../../network-guard';

/** GS1 resolver domains */
const GS1_RESOLVER_PATTERNS = [
  /^https?:\/\/id\.gs1\.org\//i,
  /^https?:\/\/dlnkd\.tn\.gg\//i,
  /^https?:\/\/[^/]+\.gs1\.[^/]+\//i,
];

/** Link types that indicate AAS/DPP content */
const DPP_LINK_TYPES = [
  'gs1:hasDigitalTwin',
  'gs1:sustainabilityInfo',
  'gs1:productDataSheet',
  'gs1:certificationInfo',
  'gs1:traceability',
  'gs1:regulatoryInfo',
  'https://gs1.org/voc/hasDigitalTwin',
  'https://gs1.org/voc/sustainabilityInfo',
  'https://gs1.org/voc/productDataSheet',
];

/** GS1 Link Set response structure */
interface GS1LinkSet {
  linkset?: Array<{
    anchor?: string;
    [key: string]: unknown;
  }>;
}

/** Individual link in a GS1 linkset */
interface GS1Link {
  href?: string;
  type?: string;
  title?: string;
  hreflang?: string;
}

/**
 * Infer endpoint type from GS1 link type
 */
function inferTypeFromLinkType(linkType: string): EndpointType {
  const lower = linkType.toLowerCase();

  if (lower.includes('digitaltwin') || lower.includes('digital-twin')) {
    return 'aas-api';
  }
  if (lower.includes('sustainability') || lower.includes('productdata')) {
    return 'dpp-portal';
  }
  if (lower.includes('certification') || lower.includes('regulatory')) {
    return 'dpp-portal';
  }

  return 'unknown';
}

/**
 * Parse GS1 linkset response to extract endpoints
 */
function parseLinkSet(data: GS1LinkSet): ResolvedEndpoint[] {
  const endpoints: ResolvedEndpoint[] = [];

  if (!data.linkset || !Array.isArray(data.linkset)) {
    return endpoints;
  }

  for (const item of data.linkset) {
    // Each item has an anchor and then link types as keys
    for (const [key, value] of Object.entries(item)) {
      if (key === 'anchor') continue;

      // Check if this is a DPP-relevant link type
      const isDPPType = DPP_LINK_TYPES.some(
        (t) => key === t || key.includes(t.split(':')[1] ?? '')
      );

      if (!isDPPType) continue;

      // Value should be an array of links
      const links = Array.isArray(value) ? value : [value];

      for (const link of links) {
        const gs1Link = link as GS1Link;
        if (gs1Link.href) {
          endpoints.push({
            url: gs1Link.href,
            type: inferTypeFromLinkType(key),
            contentType: gs1Link.type,
            discoveryMethod: 'gs1-resolver',
            confidence: 0.9,
          });
        }
      }
    }
  }

  return endpoints;
}

/**
 * GS1 resolver strategy
 * Queries GS1 Digital Link resolvers for link sets
 */
export const gs1ResolverStrategy: ResolutionStrategy = {
  name: 'gs1-resolver',
  priority: 3,

  canHandle(url) {
    return GS1_RESOLVER_PATTERNS.some((pattern) => pattern.test(url));
  },

  async resolve(url, _parsedLink, options): Promise<ResolvedEndpoint[]> {
    if (options.skipGS1Resolver) {
      return [];
    }

    const endpoints: ResolvedEndpoint[] = [];
    const timeout = options.timeout ?? 10000;

    // Create abort controller linked to parent signal
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      // Construct resolver query URL
      const resolverUrl = new URL(url);
      resolverUrl.searchParams.set('linkType', 'all');

      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await guardedFetch(resolverUrl.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/linkset+json, application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return endpoints;
      }

      const contentType = response.headers.get('Content-Type') ?? '';

      // Check for linkset or JSON response
      if (!contentType.includes('json')) {
        return endpoints;
      }

      const data = (await response.json()) as GS1LinkSet;
      const discovered = parseLinkSet(data);
      endpoints.push(...discovered);

    } catch (error) {
      // Rethrow NetworkBlockedError so caller knows local-only mode is active
      if (error instanceof NetworkBlockedError) {
        throw error;
      }
      // Query failed, return empty
    }

    return endpoints;
  },
};
