/**
 * Normalization Layer
 * Unified internal model for consistent AAS data access
 */

// Core types
export type {
  SourceType,
  Provenance,
  AssetIdentity,
  TypedValue,
  TechnicalFact,
  TechnicalFacts,
  CarbonFootprint,
  Sustainability,
  DocumentCategory,
  NormalizedDocument,
  Documents,
  NormalizedAsset,
} from './types';

// Main normalizer
export { normalizeEnvironment } from './normalizer';
export type { NormalizationOptions } from './normalizer';

// Semantic mapping utilities
export {
  resolveSemanticId,
  canonicalizeIdShort,
  generateDisplayLabel,
  SEMANTIC_MAPPINGS,
} from './semantic-mapping';
export type { SemanticMapping } from './semantic-mapping';

// Unit conversion utilities
export {
  normalizeUnit,
  formatValue,
  formatOriginalValue,
  areComparable,
  compareValues,
  parseValueWithUnit,
} from './units';
export type { NormalizedValue, UnitConversion } from './units';

// Individual builders (for advanced use cases)
export { buildTechnicalFacts } from './facts-builder';
export { buildSustainability } from './sustainability-builder';
export { buildDocuments } from './documents-builder';
