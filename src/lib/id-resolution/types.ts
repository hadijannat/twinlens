/**
 * ID Resolution Types
 * Types for active ID Link resolution with HTTP fetching
 */

import type { ResolvedLink } from '../id-resolver';

/** Current state of a resolution operation */
export type ResolutionStatus =
  | 'pending'
  | 'resolving'
  | 'resolved'
  | 'failed'
  | 'cancelled';

/** Type of endpoint discovered during resolution */
export type EndpointType =
  | 'aasx'
  | 'aas-api'
  | 'submodel-api'
  | 'registry'
  | 'dpp-portal'
  | 'unknown';

/** A discovered endpoint from ID Link resolution */
export interface ResolvedEndpoint {
  /** The endpoint URL */
  url: string;
  /** Type of endpoint */
  type: EndpointType;
  /** Content-Type from HTTP response, if available */
  contentType?: string;
  /** How this endpoint was discovered */
  discoveryMethod:
    | 'direct'
    | 'redirect'
    | 'well-known'
    | 'gs1-resolver'
    | 'link-header';
  /** Confidence score 0-1 */
  confidence: number;
}

/** Result of resolving an ID Link */
export interface ResolutionResult {
  /** Current status of the resolution */
  status: ResolutionStatus;
  /** The original URL that was resolved */
  originalUrl: string;
  /** Parsed link metadata from id-resolver */
  parsedLink: ResolvedLink;
  /** Discovered endpoints, sorted by confidence */
  endpoints: ResolvedEndpoint[];
  /** Final URL after following redirects */
  finalUrl?: string;
  /** Error message if resolution failed */
  error?: string;
  /** Time taken in milliseconds */
  duration?: number;
  /** ISO timestamp of when resolution completed */
  timestamp: string;
}

/** Options for resolution operations */
export interface ResolutionOptions {
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Skip well-known path discovery */
  skipWellKnown?: boolean;
  /** Skip GS1 resolver service query */
  skipGS1Resolver?: boolean;
  /** Maximum redirects to follow (default: 5) */
  maxRedirects?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/** Well-known paths to check for AAS discovery */
export const WELL_KNOWN_PATHS = [
  '/.well-known/aas',
  '/.well-known/aas.json',
  '/aas.json',
  '/aas',
  '/shell-descriptors',
] as const;

/** Default resolution options */
export const DEFAULT_RESOLUTION_OPTIONS: Required<
  Omit<ResolutionOptions, 'signal'>
> = {
  timeout: 10000,
  skipWellKnown: false,
  skipGS1Resolver: false,
  maxRedirects: 5,
};
