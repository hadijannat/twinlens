/**
 * Core Resolution Engine
 * Orchestrates ID Link resolution using multiple strategies
 */

import { resolveIdLink } from '../id-resolver';
import type {
  ResolutionResult,
  ResolutionOptions,
  ResolvedEndpoint,
} from './types';
import { DEFAULT_RESOLUTION_OPTIONS } from './types';
import { ResolutionCache } from './cache';
import {
  directStrategy,
  wellKnownStrategy,
  gs1ResolverStrategy,
  type ResolutionStrategy,
} from './strategies';

/** All available strategies, sorted by priority */
const strategies: ResolutionStrategy[] = [
  directStrategy,
  wellKnownStrategy,
  gs1ResolverStrategy,
].sort((a, b) => a.priority - b.priority);

/** Shared cache instance */
const cache = new ResolutionCache();

/**
 * Deduplicate endpoints by URL
 */
function dedupeEndpoints(endpoints: ResolvedEndpoint[]): ResolvedEndpoint[] {
  const seen = new Map<string, ResolvedEndpoint>();

  for (const endpoint of endpoints) {
    const existing = seen.get(endpoint.url);
    // Keep the one with higher confidence
    if (!existing || endpoint.confidence > existing.confidence) {
      seen.set(endpoint.url, endpoint);
    }
  }

  return Array.from(seen.values());
}

/**
 * Actively resolve an ID Link using HTTP fetching and discovery
 *
 * Unlike resolveIdLink() which only parses URLs, this function:
 * - Follows redirects to find final endpoints
 * - Probes well-known paths for AAS discovery
 * - Queries GS1 resolver services
 * - Caches results for performance
 */
export async function resolveIdLinkActive(
  url: string,
  options: ResolutionOptions = {}
): Promise<ResolutionResult> {
  const startTime = Date.now();
  const mergedOptions = { ...DEFAULT_RESOLUTION_OPTIONS, ...options };

  // Check cache first
  const cached = await cache.get(url);
  if (cached) {
    return cached;
  }

  // Parse the URL with existing resolver
  const parsedLink = resolveIdLink(url);

  // If URL is invalid, return immediately
  if (parsedLink.type === 'unknown') {
    const result: ResolutionResult = {
      status: 'failed',
      originalUrl: url,
      parsedLink,
      endpoints: [],
      error: 'Invalid or unrecognized URL format',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
    await cache.set(url, result);
    return result;
  }

  // Collect endpoints from all applicable strategies
  const allEndpoints: ResolvedEndpoint[] = [];
  let finalUrl: string | undefined;
  let lastError: string | undefined;

  for (const strategy of strategies) {
    // Check if cancelled
    if (mergedOptions.signal?.aborted) {
      const result: ResolutionResult = {
        status: 'cancelled',
        originalUrl: url,
        parsedLink,
        endpoints: dedupeEndpoints(allEndpoints),
        finalUrl,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      // Don't cache cancelled results
      return result;
    }

    // Check if strategy can handle this URL
    if (!strategy.canHandle(url, parsedLink)) {
      continue;
    }

    try {
      const endpoints = await strategy.resolve(url, parsedLink, mergedOptions);
      allEndpoints.push(...endpoints);

      // Track final URL from redirect strategy
      if (strategy.name === 'direct' && endpoints.length > 0) {
        const redirectEndpoint = endpoints.find(
          (e) => e.discoveryMethod === 'redirect'
        );
        if (redirectEndpoint) {
          finalUrl = redirectEndpoint.url;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Propagate cancellation
          const result: ResolutionResult = {
            status: 'cancelled',
            originalUrl: url,
            parsedLink,
            endpoints: dedupeEndpoints(allEndpoints),
            finalUrl,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
          return result;
        }
        lastError = error.message;
      }
      // Continue with other strategies
    }
  }

  // Dedupe and sort by confidence
  const endpoints = dedupeEndpoints(allEndpoints).sort(
    (a, b) => b.confidence - a.confidence
  );

  // Determine final status
  const status = endpoints.length > 0 ? 'resolved' : 'failed';

  const result: ResolutionResult = {
    status,
    originalUrl: url,
    parsedLink,
    endpoints,
    finalUrl,
    error: status === 'failed' ? lastError ?? 'No endpoints discovered' : undefined,
    duration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  // Cache the result
  await cache.set(url, result);

  return result;
}

/**
 * Create a cancellable resolution handle
 *
 * @example
 * const handle = createResolutionHandle(url);
 * // Later, if needed:
 * handle.cancel();
 * // Or await the result:
 * const result = await handle.promise;
 */
export function createResolutionHandle(
  url: string,
  options?: ResolutionOptions
) {
  const controller = new AbortController();

  return {
    promise: resolveIdLinkActive(url, { ...options, signal: controller.signal }),
    cancel: () => controller.abort(),
  };
}

/**
 * Clear the resolution cache
 */
export async function clearResolutionCache(): Promise<void> {
  await cache.clear();
}

/**
 * Invalidate a specific URL from cache
 */
export async function invalidateCacheEntry(url: string): Promise<void> {
  await cache.invalidate(url);
}
