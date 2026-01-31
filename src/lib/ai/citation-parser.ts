/**
 * Citation Parser
 * Extracts citations from AI responses in the format [Label](Submodel.PropertyPath)
 * and maps them to property sources for grounding.
 */

import type { Citation, AssetContext } from './types';

/**
 * Property source tracking for citation lookup
 */
export interface PropertySource {
  path: string;
  submodelIdShort: string;
  semanticId?: string;
  value: string;
}

/**
 * Build a lookup map of property paths to their sources
 */
export function buildPropertySourceMap(context: AssetContext): Map<string, PropertySource> {
  const sourceMap = new Map<string, PropertySource>();

  for (const sm of context.submodelSummaries) {
    for (const [key, value] of Object.entries(sm.keyProperties)) {
      // Create multiple path variants for flexible matching
      const fullPath = `${sm.idShort}.${key}`;
      const lowerPath = fullPath.toLowerCase();

      const source: PropertySource = {
        path: fullPath,
        submodelIdShort: sm.idShort,
        semanticId: sm.semanticId,
        value: String(value),
      };

      // Store by full path and lowercase variant
      sourceMap.set(fullPath, source);
      sourceMap.set(lowerPath, source);

      // Also store by just the property name for simpler references
      sourceMap.set(key.toLowerCase(), source);
    }
  }

  return sourceMap;
}

/**
 * Citation pattern: [Label](Path)
 * Examples:
 *   [Siemens AG](Nameplate.ManufacturerName)
 *   [1234.5 kg CO2eq](CarbonFootprint.PCFCO2eq)
 */
const CITATION_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse citations from AI response content
 */
export function parseCitations(
  content: string,
  sourceMap: Map<string, PropertySource>
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = CITATION_PATTERN.exec(content)) !== null) {
    const label = match[1];
    const path = match[2];

    if (!label || !path) continue;

    // Skip duplicates
    const key = `${label}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Look up source by path (try exact match, then lowercase)
    const source = sourceMap.get(path) || sourceMap.get(path.toLowerCase());

    citations.push({
      path,
      label,
      value: source?.value ?? label,
      semanticId: source?.semanticId,
    });
  }

  return citations;
}

/**
 * Remove citation markdown from content for display
 * Converts [Label](Path) to just Label
 */
export function stripCitationMarkdown(content: string): string {
  return content.replace(CITATION_PATTERN, '$1');
}

/**
 * Extract and process citations from AI response
 * Returns both the cleaned content and the citations array
 */
export function extractCitations(
  content: string,
  context: AssetContext
): { cleanedContent: string; citations: Citation[] } {
  const sourceMap = buildPropertySourceMap(context);
  const citations = parseCitations(content, sourceMap);
  const cleanedContent = stripCitationMarkdown(content);

  return { cleanedContent, citations };
}
