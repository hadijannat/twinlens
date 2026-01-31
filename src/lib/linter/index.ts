/**
 * Linter Module
 * Re-exports for convenient imports
 */

export * from './types';
export * from './engine';
export * from './registry';

// Import rule packs to trigger registration
import './rules/battery';
import './rules/electronics';

// Re-export for backward compatibility
export { batteryPassportRules } from './rules/battery';
export { electronicsWEEERules } from './rules/electronics';
