/**
 * Well-Known Path Resolution Strategy
 * Discovers AAS endpoints by probing standard well-known paths
 */

import type {
  ResolvedEndpoint,
  EndpointType,
} from '../types';
import { WELL_KNOWN_PATHS } from '../types';
import type { ResolutionStrategy } from './direct';
import { guardedFetch, NetworkBlockedError } from '../../network-guard';

/** Content types that indicate AAS-related responses */
const AAS_CONTENT_TYPES = [
  'application/json',
  'application/ld+json',
  'application/aas+json',
];

/** Response body patterns that indicate AAS content */
const AAS_BODY_INDICATORS = [
  '"assetAdministrationShells"',
  '"submodels"',
  '"idShort"',
  '"semanticId"',
  '"modelType"',
  '"AssetAdministrationShell"',
];

/**
 * Infer endpoint type from well-known path
 */
function inferTypeFromPath(path: string): EndpointType {
  if (path.includes('shell-descriptors')) {
    return 'registry';
  }
  if (path.includes('aas')) {
    return 'aas-api';
  }
  return 'unknown';
}

/**
 * Check if response body contains AAS indicators
 */
function hasAASIndicators(body: string): boolean {
  return AAS_BODY_INDICATORS.some((indicator) => body.includes(indicator));
}

/**
 * Well-known path discovery strategy
 * Probes standard paths in parallel to find AAS endpoints
 */
export const wellKnownStrategy: ResolutionStrategy = {
  name: 'well-known',
  priority: 2,

  canHandle(url, parsedLink) {
    // Use for passport-type links or URLs starting with id.
    return parsedLink.type === 'passport' || /^https?:\/\/id\./i.test(url);
  },

  async resolve(url, _parsedLink, options): Promise<ResolvedEndpoint[]> {
    if (options.skipWellKnown) {
      return [];
    }

    const endpoints: ResolvedEndpoint[] = [];
    const timeout = options.timeout ?? 10000;

    // Extract base URL (protocol + host)
    let baseUrl: string;
    try {
      const parsed = new URL(url);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      return [];
    }

    // Create abort controller linked to parent signal
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    // Probe all well-known paths in parallel
    const probePromises = WELL_KNOWN_PATHS.map(async (path) => {
      const probeUrl = baseUrl + path;

      try {
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await guardedFetch(probeUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json, application/ld+json, */*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return null;
        }

        const contentType = response.headers.get('Content-Type') ?? '';
        const isJSONType = AAS_CONTENT_TYPES.some((t) =>
          contentType.includes(t)
        );

        if (!isJSONType) {
          return null;
        }

        // Read a small portion of the body to check for AAS indicators
        const text = await response.text();
        const hasIndicators = hasAASIndicators(text);

        if (hasIndicators) {
          return {
            url: probeUrl,
            type: inferTypeFromPath(path),
            contentType,
            discoveryMethod: 'well-known' as const,
            confidence: 0.85,
          };
        }

        return null;
      } catch (error) {
        // Rethrow NetworkBlockedError so caller knows local-only mode is active
        if (error instanceof NetworkBlockedError) {
          throw error;
        }
        // Probe failed, continue with others
        return null;
      }
    });

    const results = await Promise.allSettled(probePromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        endpoints.push(result.value);
      }
    }

    return endpoints;
  },
};
