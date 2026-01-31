/**
 * ID Resolution Module
 * Active ID Link resolution with HTTP fetching and endpoint discovery
 */

export * from './types';
export {
  resolveIdLinkActive,
  createResolutionHandle,
  clearResolutionCache,
  invalidateCacheEntry,
} from './resolver';
export { ResolutionCache } from './cache';
