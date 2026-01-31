/**
 * Template Detector
 * Detects IDTA template type from Submodel semanticId
 */

import type { Submodel } from '@shared/types';
import { TemplateType } from './types';

export { TemplateType };

/**
 * Semantic ID patterns for template detection
 * Matches partial URIs to handle version variations
 */
const SEMANTIC_ID_PATTERNS: Record<string, TemplateType> = {
  'https://admin-shell.io/zvei/nameplate': TemplateType.NAMEPLATE,
  'https://admin-shell.io/idta/CarbonFootprint': TemplateType.CARBON_FOOTPRINT,
  'https://admin-shell.io/ZVEI/TechnicalData': TemplateType.TECHNICAL_DATA,
  'https://admin-shell.io/vdi/2770/1/0/Documentation': TemplateType.HANDOVER_DOCUMENTATION,
};

/**
 * Extracts the first key value from a submodel's semanticId
 */
function getSemanticIdValue(submodel: Submodel): string | undefined {
  return submodel.semanticId?.keys?.[0]?.value;
}

/**
 * Detects the template type for a given submodel based on its semanticId
 */
export function detectTemplate(submodel: Submodel): TemplateType {
  const semanticId = getSemanticIdValue(submodel);
  if (!semanticId) return TemplateType.GENERIC;

  // Check each pattern (partial match to handle version differences)
  for (const [pattern, templateType] of Object.entries(SEMANTIC_ID_PATTERNS)) {
    if (semanticId.startsWith(pattern)) {
      return templateType;
    }
  }

  return TemplateType.GENERIC;
}

/**
 * Checks if a submodel has a specific template type
 */
export function isTemplateType(submodel: Submodel, type: TemplateType): boolean {
  return detectTemplate(submodel) === type;
}
