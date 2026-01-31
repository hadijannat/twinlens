/**
 * Shared Constants
 *
 * Constants used across multiple modules in the TwinLens extension.
 * Module-specific constants should remain in their respective modules.
 */

// ============================================================================
// File Size Limits
// ============================================================================

/** Maximum QR image size for processing (5MB) */
export const MAX_QR_IMAGE_SIZE = 5 * 1024 * 1024;

/** Maximum cache size for file extraction (50MB) */
export const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024;

// ============================================================================
// AASX Relationship Types
// ============================================================================

/** OPC relationship type for aasx-origin */
export const AASX_ORIGIN_REL_TYPE =
  'http://admin-shell.io/aasx/relationships/aasx-origin';

/** OPC relationship type for aas-spec */
export const AAS_SPEC_REL_TYPE =
  'http://admin-shell.io/aasx/relationships/aas-spec';

/** OPC relationship type for aas-suppl (supplementary files) */
export const AAS_SUPPL_REL_TYPE =
  'http://admin-shell.io/aasx/relationships/aas-suppl';

// ============================================================================
// All AASX relationship types as an object for easier iteration
// ============================================================================

export const AASX_RELATIONSHIP_URLS = {
  origin: AASX_ORIGIN_REL_TYPE,
  spec: AAS_SPEC_REL_TYPE,
  supplementary: AAS_SUPPL_REL_TYPE,
} as const;
